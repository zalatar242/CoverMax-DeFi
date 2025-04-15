// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Tranche.sol";
import "./ITranche.sol";
import "./ILendingAdapter.sol";

/// @title MultiTranche Insurance - A decentralized DeFi insurance protocol
/// @notice Deposited funds are managed through lending adapters with two-tranche risk allocation
contract Insurance is Ownable {
    /* Internal and external contract addresses */
    address public AAA; // Tranche AAA token contract
    address public AA; // Tranche AA token contract

    address public immutable usdc; // USDC token
    ILendingAdapter[] public lendingAdapters; // Array of platform adapters

    /* Math helper for decimal numbers */
    uint256 constant RAY = 1e27; // Used for floating point math
    uint256 constant TRANCHE_ALLOCATION = RAY / 2; // Equal 50% allocation per tranche

    /* Time periods */
    uint256 public immutable S; // Start/split end
    uint256 public immutable T1; // Insurance end
    uint256 public immutable T2; // AAA tokens claim start
    uint256 public immutable T3; // Final claim end (AAA and AA)

    /* State tracking */
    uint256 public totalTranches; // Total AAA + AA tokens
    bool public isInvested; // True if funds have been invested in platforms, false after divest

    /* Liquid mode payouts */
    uint256 public usdcPayoutAAA; // Payout in USDC per AAA tranche
    uint256 public usdcPayoutAA; // Payout in USDC per AA tranche

    /* Events */
    event RiskSplit(address indexed splitter, uint256 amountUsdc);
    event Invest(uint256 amountUsdc);
    event Divest(uint256 amountUsdc);
    event AdapterAdded(address adapter);
    event AdapterRemoved(address adapter);
    event Claim(
        address indexed claimant,
        uint256 amountAAA,
        uint256 amountAA,
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
        AAA = address(new Tranche("CM Tranche AAA", "CM-AAA"));
        AA = address(new Tranche("CM Tranche AA", "CM-AA"));

        // Set time periods
        S = block.timestamp + 2 days;
        T1 = S + 5 days;
        T2 = T1 + 1 days;
        T3 = T2 + 1 days; // Combined previous T3 and T4 periods
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

    /// @notice Deposit USDC into the protocol. Receive equal amounts of AAA and AA tranches.
    /// @dev Requires approval for USDC
    /// @param amountUsdc The amount of USDC to invest into the protocol
    function splitRisk(uint256 amountUsdc) external {
        require(block.timestamp < S, "Insurance: issuance ended");
        require(amountUsdc > 1, "Insurance: amount too low");
        require(
            amountUsdc % 2 == 0,
            "Insurance: amount must be divisible by 2"
        );

        require(
            IERC20(usdc).transferFrom(msg.sender, address(this), amountUsdc),
            "Insurance: USDC transfer failed"
        );

        uint256 trancheAmount = amountUsdc / 2;
        ITranche(AAA).mint(msg.sender, trancheAmount);
        ITranche(AA).mint(msg.sender, trancheAmount);

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

        totalTranches = ITranche(AAA).totalSupply() * 2;
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

        uint256 totalRecovered = 0;
        uint256 trancheSupply = totalTranches / 2;

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
        isInvested = false;

        // Calculate payouts based on losses
        if (!isInvested) {
            // Return original amounts untouched
            usdcPayoutAAA = RAY;
            usdcPayoutAA = RAY;
            emit Divest(totalRecovered);
            return;
        }

        // For losses, start filling tranches from AAA to AA
        if (totalRecovered >= totalTranches) {
            // No losses, equal distribution
            uint256 payout = (RAY * totalRecovered) / totalTranches;
            usdcPayoutAAA = payout;
            usdcPayoutAA = payout;
        } else {
            if (totalRecovered >= trancheSupply) {
                usdcPayoutAAA = RAY; // AAA gets full payment
                uint256 remaining = totalRecovered - trancheSupply;
                usdcPayoutAA = remaining > 0
                    ? (RAY * remaining) / trancheSupply
                    : 0;
            } else {
                // Not enough to cover AAA
                usdcPayoutAAA = (RAY * totalRecovered) / trancheSupply;
                usdcPayoutAA = 0;
            }
        }

        emit Divest(totalRecovered);
    }

    /// @notice Check if the contract is in pre-investment period
    function isPreInvestmentPeriod() public view returns (bool) {
        return block.timestamp < T1 && !isInvested;
    }

    /// @notice Check if the contract is in normal claim period after successful divest
    function isNormalClaimPeriod() public view returns (bool) {
        return
            block.timestamp >= T2 &&
            block.timestamp <= T3 &&
            !isInvested &&
            usdcPayoutAAA == RAY &&
            usdcPayoutAA == RAY;
    }

    /// @notice Validate withdrawal based on current period and amounts
    /// @param amountAAA Amount of AAA tranche tokens to redeem
    /// @param amountAA Amount of AA tranche tokens to redeem
    function validateWithdrawal(
        uint256 amountAAA,
        uint256 amountAA
    ) internal view {
        require(
            amountAAA > 0 || amountAA > 0,
            "Insurance: no amount specified"
        );

        if (isPreInvestmentPeriod()) {
            // Pre-investment: Allow withdrawing any tokens
            return;
        }

        require(!isInvested, "Insurance: funds still invested");
        require(block.timestamp >= T2, "Insurance: claim period not started");
        require(block.timestamp <= T3, "Insurance: claim period ended");

        if (!isNormalClaimPeriod()) {
            // Emergency mode - tiered withdrawal system
            if (block.timestamp < T3) {
                require(amountAA == 0, "Insurance: only AAA claims allowed");
            }
        }
    }

    /// @notice Process withdrawal by burning tokens and calculating payout
    /// @param amountAAA Amount of AAA tranche tokens to redeem
    /// @param amountAA Amount of AA tranche tokens to redeem
    /// @return payout The amount of USDC to be paid out
    function calculateWithdrawalAmount(
        uint256 amountAAA,
        uint256 amountAA
    ) internal returns (uint256) {
        uint256 payout = 0;

        if (amountAAA > 0) {
            require(
                ITranche(AAA).balanceOf(msg.sender) >= amountAAA,
                "Insurance: insufficient AAA balance"
            );
            ITranche(AAA).burn(msg.sender, amountAAA);
            payout += isPreInvestmentPeriod()
                ? amountAAA
                : (usdcPayoutAAA * amountAAA) / RAY;
        }

        if (amountAA > 0) {
            require(
                ITranche(AA).balanceOf(msg.sender) >= amountAA,
                "Insurance: insufficient AA balance"
            );
            ITranche(AA).burn(msg.sender, amountAA);
            payout += isPreInvestmentPeriod()
                ? amountAA
                : (usdcPayoutAA * amountAA) / RAY;
        }

        return payout;
    }

    /// @notice Internal function to handle claiming USDC for tranche tokens
    /// @param amountAAA Amount of AAA tranche tokens to redeem
    /// @param amountAA Amount of AA tranche tokens to redeem
    function _claim(uint256 amountAAA, uint256 amountAA) internal {
        // Special case: after T1, if never invested, allow direct claims (via divest)
        if (block.timestamp >= T1 && !isInvested) {
            this.divest();
        }

        validateWithdrawal(amountAAA, amountAA);
        uint256 payout = calculateWithdrawalAmount(amountAAA, amountAA);

        if (payout > 0) {
            require(
                IERC20(usdc).transfer(msg.sender, payout),
                "Insurance: USDC transfer failed"
            );
        }

        emit Claim(msg.sender, amountAAA, amountAA, payout);
    }

    /// @notice Claim USDC for tranche tokens
    /// @param amountAAA Amount of AAA tranche tokens to redeem
    /// @param amountAA Amount of AA tranche tokens to redeem
    function claim(uint256 amountAAA, uint256 amountAA) external {
        _claim(amountAAA, amountAA);
    }

    /// @notice Claim all available tranche tokens
    function claimAll() external {
        uint256 balanceAAA = ITranche(AAA).balanceOf(msg.sender);
        uint256 balanceAA = ITranche(AA).balanceOf(msg.sender);

        require(balanceAAA > 0 || balanceAA > 0, "Insurance: no balance");

        _claim(balanceAAA, balanceAA);
    }
}
