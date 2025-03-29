// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Tranche.sol";
import "./ITranche.sol";
import "./ILendingAdapter.sol";

/// @title MultiTranche Insurance - A decentralized DeFi insurance protocol
/// @notice Deposited funds are managed through lending adapters with three-tranche risk allocation
contract Insurance is Ownable {
    /* Internal and external contract addresses */
    address public A; // Tranche A token contract
    address public B; // Tranche B token contract
    address public C; // Tranche C token contract

    address public immutable usdc; // USDC token
    ILendingAdapter[] public lendingAdapters; // Array of platform adapters

    /* Math helper for decimal numbers */
    uint256 constant RAY = 1e27; // Used for floating point math
    uint256 constant TRANCHE_ALLOCATION = RAY / 3; // Equal 33.33% allocation per tranche

    /* Time periods */
    uint256 public immutable S;  // Start/split end
    uint256 public immutable T1; // Insurance end
    uint256 public immutable T2; // Claim start
    uint256 public immutable T3; // Final claim end

    /* State tracking */
    uint256 public totalTranches; // Total A + B + C tokens
    bool public isInvested; // True if funds have been deposited to platforms
    bool public inLiquidMode; // True: distribute USDC, False: platform tokens claimable

    /* Liquid mode payouts */
    uint256 public usdcPayoutA; // Payout in USDC per A tranche
    uint256 public usdcPayoutB; // Payout in USDC per B tranche
    uint256 public usdcPayoutC; // Payout in USDC per C tranche

    /* Events */
    event RiskSplit(address indexed splitter, uint256 amountUsdc);
    event Invest(uint256 amountUsdc);
    event Divest(uint256 amountUsdc);
    event AdapterAdded(address adapter);
    event AdapterRemoved(address adapter);
    event Claim(
        address indexed claimant,
        uint256 amountA,
        uint256 amountB,
        uint256 amountC,
        uint256 amountUsdc
    );
    event LendingError(
        address indexed adapter,
        address asset,
        uint256 amount,
        uint256 errorCode
    );

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = _usdc;

        // Create tranche tokens
        A = address(new Tranche("CM Tranche A", "CM-A"));
        B = address(new Tranche("CM Tranche B", "CM-B"));
        C = address(new Tranche("CM Tranche C", "CM-C"));

        // Set time periods
        S = block.timestamp + 7 days;
        T1 = S + 28 days;
        T2 = T1 + 1 days;
        T3 = T2 + 3 days;
    }

    /// @notice Add a new lending adapter
    /// @param adapter The address of the lending adapter to add
    function addLendingAdapter(address adapter) external onlyOwner {
        require(block.timestamp < S, "Insurance: past issuance period");
        require(adapter != address(0), "Insurance: invalid adapter");
        lendingAdapters.push(ILendingAdapter(adapter));
        emit AdapterAdded(adapter);
    }

    /// @notice Remove a lending adapter
    /// @param index The index of the adapter to remove
    function removeLendingAdapter(uint256 index) external onlyOwner {
        require(block.timestamp < S, "Insurance: past issuance period");
        require(index < lendingAdapters.length, "Insurance: invalid index");
        emit AdapterRemoved(address(lendingAdapters[index]));
        lendingAdapters[index] = lendingAdapters[lendingAdapters.length - 1];
        lendingAdapters.pop();
    }

    /// @notice Deposit USDC into the protocol. Receive equal amounts of A, B and C tranches.
    /// @dev Requires approval for USDC
    /// @param amountUsdc The amount of USDC to invest into the protocol
    function splitRisk(uint256 amountUsdc) external {
        require(block.timestamp < S, "Insurance: issuance ended");
        require(amountUsdc > 2, "Insurance: amount too low");
        require(
            amountUsdc % 3 == 0,
            "Insurance: amount must be divisible by 3"
        );

        require(
            IERC20(usdc).transferFrom(msg.sender, address(this), amountUsdc),
            "Insurance: USDC transfer failed"
        );

        uint256 trancheAmount = amountUsdc / 3;
        ITranche(A).mint(msg.sender, trancheAmount);
        ITranche(B).mint(msg.sender, trancheAmount);
        ITranche(C).mint(msg.sender, trancheAmount);

        emit RiskSplit(msg.sender, amountUsdc);
    }

    /// @notice Invest deposited funds across lending platforms
    function invest() external {
        require(!isInvested, "Insurance: already invested");
        require(block.timestamp >= S, "Insurance: still in issuance");
        require(block.timestamp < T1, "Insurance: past insurance period");
        require(lendingAdapters.length > 0, "Insurance: no adapters");

        IERC20 usdcToken = IERC20(usdc);
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "Insurance: no USDC");

        totalTranches = ITranche(A).totalSupply() * 3;
        uint256 amountPerAdapter = balance / lendingAdapters.length;

        for (uint i = 0; i < lendingAdapters.length; i++) {
            // Reset any existing approvals
            require(
                IERC20(usdc).approve(address(lendingAdapters[i]), 0),
                "Insurance: USDC approval reset failed"
            );
            // Approve the adapter to spend USDC
            require(
                IERC20(usdc).approve(
                    address(lendingAdapters[i]),
                    amountPerAdapter
                ),
                "Insurance: USDC approval failed"
            );

            try lendingAdapters[i].deposit(usdc, amountPerAdapter) returns (
                uint256
            ) {
                // Deposit succeeded
            } catch Error(string memory reason) {
                // Log the error and continue to next adapter
                emit LendingError(
                    address(lendingAdapters[i]),
                    usdc,
                    amountPerAdapter,
                    1
                );
                // Reset approval
                IERC20(usdc).approve(address(lendingAdapters[i]), 0);
                continue;
            }
        }

        isInvested = true;
        emit Invest(balance);
    }

    /// @notice Withdraw funds from lending platforms and calculate tranche payouts
    function divest() external {
        require(block.timestamp >= T1, "Insurance: still in insurance period");
        require(block.timestamp < T2, "Insurance: in claim period");

        uint256 totalRecovered = 0;
        uint256 trancheSupply = totalTranches / 3;

        if (!isInvested) {
            // If never invested, funds are still held by the contract
            totalRecovered = IERC20(usdc).balanceOf(address(this));
        } else {
            // Withdraw from lending adapters
            for (uint i = 0; i < lendingAdapters.length; i++) {
                try
                    lendingAdapters[i].withdraw(usdc, type(uint256).max)
                returns (uint256 amount) {
                    totalRecovered += amount;
                } catch Error(string memory reason) {
                    // Log the error and continue to next adapter
                    emit LendingError(
                        address(lendingAdapters[i]),
                        usdc,
                        type(uint256).max,
                        2
                    );
                    continue;
                }
            }
        }

        inLiquidMode = true;

        // Calculate payouts based on losses
        if (!isInvested) {
            // Return original amounts untouched
            usdcPayoutA = RAY;
            usdcPayoutB = RAY;
            usdcPayoutC = RAY;
            emit Divest(totalRecovered);
            return;
        }

        // For losses, start filling tranches from A to C
        if (totalRecovered >= totalTranches) {
            // No losses, equal distribution
            uint256 payout = (RAY * totalRecovered) / totalTranches;
            usdcPayoutA = payout;
            usdcPayoutB = payout;
            usdcPayoutC = payout;
        } else {
            if (totalRecovered >= trancheSupply) {
                usdcPayoutA = RAY; // A gets full payment
                uint256 remaining = totalRecovered - trancheSupply;

                if (remaining >= trancheSupply) {
                    usdcPayoutB = RAY; // B gets full payment
                    remaining -= trancheSupply;
                    usdcPayoutC = remaining > 0
                        ? (RAY * remaining) / trancheSupply
                        : 0;
                } else {
                    usdcPayoutB = (RAY * remaining) / trancheSupply; // B gets partial
                    usdcPayoutC = 0; // C gets nothing
                }
            } else {
                // Not enough to cover A
                usdcPayoutA = (RAY * totalRecovered) / trancheSupply;
                usdcPayoutB = 0;
                usdcPayoutC = 0;
            }
        }

        emit Divest(totalRecovered);
    }

    /// @notice Internal function to handle claiming USDC for tranche tokens
    /// @param amountA Amount of A tranche tokens to redeem
    /// @param amountB Amount of B tranche tokens to redeem
    /// @param amountC Amount of C tranche tokens to redeem
    function _claim(
        uint256 amountA,
        uint256 amountB,
        uint256 amountC
    ) internal {
        // Special case: after T1, if never invested, allow direct claims
        if (block.timestamp >= T1 && !isInvested && !inLiquidMode) {
            this.divest();
        }

        require(inLiquidMode, "Insurance: not in liquid mode");
        require(
            amountA > 0 || amountB > 0 || amountC > 0,
            "Insurance: no amount specified"
        );

        uint256 payout = 0;

        if (amountA > 0) {
            require(
                ITranche(A).balanceOf(msg.sender) >= amountA,
                "Insurance: insufficient A balance"
            );
            ITranche(A).burn(msg.sender, amountA);
            payout += (usdcPayoutA * amountA) / RAY;
        }

        if (amountB > 0) {
            require(
                ITranche(B).balanceOf(msg.sender) >= amountB,
                "Insurance: insufficient B balance"
            );
            ITranche(B).burn(msg.sender, amountB);
            payout += (usdcPayoutB * amountB) / RAY;
        }

        if (amountC > 0) {
            require(
                ITranche(C).balanceOf(msg.sender) >= amountC,
                "Insurance: insufficient C balance"
            );
            ITranche(C).burn(msg.sender, amountC);
            payout += (usdcPayoutC * amountC) / RAY;
        }

        if (payout > 0) {
            require(
                IERC20(usdc).transfer(msg.sender, payout),
                "Insurance: USDC transfer failed"
            );
        }

        emit Claim(msg.sender, amountA, amountB, amountC, payout);
    }

    /// @notice Claim USDC for tranche tokens
    /// @param amountA Amount of A tranche tokens to redeem
    /// @param amountB Amount of B tranche tokens to redeem
    /// @param amountC Amount of C tranche tokens to redeem
    function claim(uint256 amountA, uint256 amountB, uint256 amountC) external {
        _claim(amountA, amountB, amountC);
    }

    /// @notice Claim all available tranche tokens
    function claimAll() external {
        uint256 balanceA = ITranche(A).balanceOf(msg.sender);
        uint256 balanceB = ITranche(B).balanceOf(msg.sender);
        uint256 balanceC = ITranche(C).balanceOf(msg.sender);

        require(
            balanceA > 0 || balanceB > 0 || balanceC > 0,
            "Insurance: no balance"
        );

        _claim(balanceA, balanceB, balanceC);
    }
}
