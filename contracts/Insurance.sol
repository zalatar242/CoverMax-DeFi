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
    address public immutable AAA; // Tranche AAA token contract
    address public immutable AA; // Tranche AA token contract
    address public immutable usdc; // USDC token
    ILendingAdapter[] public lendingAdapters; // Array of platform adapters

    /* Math helper for decimal numbers */
    uint256 private constant RAY = 1e27; // Used for floating point math
    uint256 private constant TRANCHE_ALLOCATION = RAY / 2; // Equal 50% allocation per tranche
    uint256 private constant MINIMUM_AMOUNT = 2; // Minimum split amount

    /* Time periods */
    uint256 public immutable S; // Start/split end
    uint256 public immutable T1; // Insurance end
    uint256 public immutable T2; // AAA tokens claim start
    uint256 public immutable T3; // Final claim end (AAA and AA)

    /* State tracking */
    uint256 public totalTranches; // Total AAA + AA tokens
    uint256 public totalInvested; // Total amount invested across adapters

    /* Events */
    event RiskSplit(address indexed splitter, uint256 amountUsdc);
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


        constructor(address usdcAddress) Ownable(msg.sender) {
            require(usdcAddress != address(0), "Insurance: USDC address cannot be zero");
            usdc = usdcAddress;
        // Create tranche tokens
        AAA = address(new Tranche("CM Tranche AAA", "CM-AAA"));
        AA = address(new Tranche("CM Tranche AA", "CM-AA"));

        // Set time periods
        S = block.timestamp + 2 days;
        T1 = S + 5 days;
        T2 = T1 + 1 days;
        T3 = T2 + 1 days;
    }

    // Investment Operations
    /**
     * @dev Deposits USDC to a lending adapter.
     * @param adapter The lending adapter to deposit to.
     * @param amount The amount of USDC to deposit.
     * @return bool True if the deposit was successful, false otherwise.
     */
    function _depositToAdapter(
        ILendingAdapter adapter,
        uint256 amount
    ) internal returns (bool) {
        IERC20 usdcToken = IERC20(usdc);

        if (amount == 0) return true;

        if (!usdcToken.approve(address(adapter), amount)) {
            return false;
        }

        try adapter.deposit(usdc, amount) returns (uint256) {
            totalInvested += amount;
            return true;
        } catch {
            emit LendingError(address(adapter), usdc, amount, 1);
            usdcToken.approve(address(adapter), 0);
            return false;
        }
    }

    /**
     * @dev Withdraws USDC from a lending adapter.
     * @param adapter The lending adapter to withdraw from.
     * @param primaryAmount The amount of USDC to withdraw in the first attempt.
     * @param remainingAmount The amount of USDC to withdraw in the second attempt if the first fails.
     * @return amountReceived The amount of USDC received from the withdrawal.
     */
    function _withdrawFromAdapter(
        ILendingAdapter adapter,
        uint256 primaryAmount,
        uint256 remainingAmount
    ) internal returns (uint256 amountReceived) {
        if (primaryAmount == 0) return 0;

        try adapter.withdraw(usdc, primaryAmount) returns (uint256 amount) {
            amountReceived = amount;
            totalInvested -= primaryAmount;
        } catch {
            if (remainingAmount > 0) {
                try adapter.withdraw(usdc, remainingAmount) returns (
                    uint256 amount
                ) {
                    amountReceived = amount;
                    totalInvested -= remainingAmount;
                } catch {
                    emit LendingError(
                        address(adapter),
                        usdc,
                        remainingAmount,
                        2
                    );
                }
            } else {
                emit LendingError(address(adapter), usdc, primaryAmount, 2);
            }
        }
    }

    // Risk Calculations
    /**
     * @dev Calculates the withdrawal share for a given amount of tokens.
     * @param totalTokens The total amount of tokens to withdraw.
     * @return uint256 The withdrawal share.
     */
    function _calculateWithdrawalShare(
        uint256 totalTokens
    ) internal view returns (uint256) {
        if (totalTranches == 0) return 0;
        return (totalTokens * RAY) / totalTranches;
    }

    /**
     * @dev Calculates the withdrawal amounts for each lending adapter.
     * @param totalToWithdraw The total amount to withdraw.
     * @return primaryAmounts The amount to withdraw from each adapter in the first attempt.
     * @return remainingAmounts The amount to withdraw from each adapter in the second attempt if the first fails.
     */
    function _calculateWithdrawalAmounts(
        uint256 totalToWithdraw
    )
        internal
        view
        returns (
            uint256[] memory primaryAmounts,
            uint256[] memory remainingAmounts
        )
    {
        uint256 adapterCount = lendingAdapters.length;
        primaryAmounts = new uint256[](adapterCount);
        remainingAmounts = new uint256[](adapterCount);

        if (totalToWithdraw == 0) return (primaryAmounts, remainingAmounts);

        uint256 baseAmount = totalToWithdraw / adapterCount;
        uint256 remainder = totalToWithdraw % adapterCount;

        for (uint256 i = 0; i < adapterCount; ) {
            primaryAmounts[i] = baseAmount;
            if (i < remainder) {
                primaryAmounts[i]++;
            }
            remainingAmounts[i] = totalToWithdraw;
            unchecked {
                ++i;
            }
        }
    }

    // Token Operations
    /**
     * @dev Mints AAA and AA tranche tokens to a recipient.
     * @param recipient The address to mint the tokens to.
     * @param amount The total amount of tokens to mint (split equally between AAA and AA).
     */
    function _mintTranches(address recipient, uint256 amount) internal {
        uint256 trancheAmount = amount / 2;
        ITranche(AAA).mint(recipient, trancheAmount);
        ITranche(AA).mint(recipient, trancheAmount);
        totalTranches += amount;
    }

    /**
     * @dev Burns AAA and AA tranche tokens from an account.
     * @param account The address to burn the tokens from.
     * @param amountAAA The amount of AAA tokens to burn.
     * @param amountAA The amount of AA tokens to burn.
     */
    function _burnTranches(
        address account,
        uint256 amountAAA,
        uint256 amountAA
    ) internal {
        require(
            amountAAA > 0 || amountAA > 0,
            "Insurance: AmountAAA and AmountAA cannot both be zero"
        );

        if (amountAAA > 0) {
            require(
                ITranche(AAA).balanceOf(account) >= amountAAA,
                "Insurance: insufficient AAA balance"
            );
            ITranche(AAA).burn(account, amountAAA);
        }
        if (amountAA > 0) {
            require(
                ITranche(AA).balanceOf(account) >= amountAA,
                "Insurance: insufficient AA balance"
            );
            ITranche(AA).burn(account, amountAA);
        }

        totalTranches -= (amountAAA + amountAA);
    }

    // External Functions
    /**
     * @dev Adds a lending adapter to the list of adapters.
     * @param adapter The address of the lending adapter to add.
     */
    function addLendingAdapter(address adapter) external onlyOwner {
        require(block.timestamp < S, "Insurance: past issuance period");
        require(adapter != address(0), "Insurance: Adapter address cannot be zero");
        lendingAdapters.push(ILendingAdapter(adapter));
        emit AdapterAdded(adapter);
    }

    /**
     * @dev Removes a lending adapter from the list of adapters.
     * @param index The index of the lending adapter to remove.
     */
    function removeLendingAdapter(uint256 index) external onlyOwner {
        require(block.timestamp < S, "Insurance: past issuance period");
        require(index < lendingAdapters.length, "Insurance: invalid index");

        emit AdapterRemoved(address(lendingAdapters[index]));
        lendingAdapters[index] = lendingAdapters[lendingAdapters.length - 1];
        lendingAdapters.pop();
    }

    /**
     * @dev Splits the risk by depositing USDC to lending adapters and minting tranche tokens.
     * @param amountUsdc The amount of USDC to split.
     */
    function splitRisk(uint256 amountUsdc) external {
        require(block.timestamp < S, "Insurance: issuance ended");
        require(amountUsdc > MINIMUM_AMOUNT, "Insurance: amount too low");
        require(
            amountUsdc % 2 == 0,
            "Insurance: Amount must be divisible by 2"
        );
        require(lendingAdapters.length > 0, "Insurance: no adapters");

        IERC20 usdcToken = IERC20(usdc);
        require(
            usdcToken.transferFrom(msg.sender, address(this), amountUsdc),
            "Insurance: USDC transfer failed"
        );

        uint256 amountPerAdapter = amountUsdc / lendingAdapters.length;
        uint256 remainder = amountUsdc % lendingAdapters.length;

        // Deposit to adapters
        for (uint256 i = 0; i < lendingAdapters.length; ) {
            uint256 amount = amountPerAdapter;
            if (i < remainder) {
                amount++;
            }
            _depositToAdapter(lendingAdapters[i], amount);
            unchecked {
                ++i;
            }
        }

        _mintTranches(msg.sender, amountUsdc);
        emit RiskSplit(msg.sender, amountUsdc);
    }

    /**
     * @dev Claims USDC by withdrawing from lending adapters and burning tranche tokens.
     * @param amountAAA The amount of AAA tokens to burn.
     * @param amountAA The amount of AA tokens to burn.
     */
    function _claim(uint256 amountAAA, uint256 amountAA) internal {
        require(
            block.timestamp <= S || block.timestamp > T1,
            "Insurance: Claims can only be made before the insurance phase starts or after it ends"
        );

        uint256 totalTokens = amountAAA + amountAA;
        uint256 withdrawalShare = _calculateWithdrawalShare(totalTokens);
        uint256 totalToWithdraw = (totalInvested * withdrawalShare) / RAY;

        (
            uint256[] memory primaryAmounts,
            uint256[] memory remainingAmounts
        ) = _calculateWithdrawalAmounts(totalToWithdraw);

        uint256 totalWithdrawn;
        for (uint256 i = 0; i < lendingAdapters.length; ) {
            totalWithdrawn += _withdrawFromAdapter(
                lendingAdapters[i],
                primaryAmounts[i],
                remainingAmounts[i]
            );
            unchecked {
                ++i;
            }
        }

        require(totalWithdrawn > 0, "Insurance: no funds withdrawn");

        _burnTranches(msg.sender, amountAAA, amountAA);

        require(
            IERC20(usdc).transfer(msg.sender, totalWithdrawn),
            "Insurance: USDC transfer failed"
        );

        emit Claim(msg.sender, amountAAA, amountAA, totalWithdrawn);
    }

    /**
     * @dev Claims USDC by withdrawing from lending adapters and burning tranche tokens.
     * @param amountAAA The amount of AAA tokens to burn.
     * @param amountAA The amount of AA tokens to burn.
     */
    function claim(uint256 amountAAA, uint256 amountAA) external {
        _claim(amountAAA, amountAA);
    }

    /**
     * @dev Claims all available USDC by withdrawing from lending adapters and burning all tranche tokens.
     */
    function claimAll() external {
        uint256 balanceAAA = ITranche(AAA).balanceOf(msg.sender);
        uint256 balanceAA = ITranche(AA).balanceOf(msg.sender);

        require(balanceAAA > 0 || balanceAA > 0, "Insurance: No AAA or AA tokens to claim");

        _claim(balanceAAA, balanceAA);
    }
}
