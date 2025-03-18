// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ILendingAdapter.sol";

/// @title Mock Aave lending pool for testing
contract MockAaveLendingPool is ILendingAdapter {
    mapping(address => uint256) public balances;
    bool public shouldRevert;

    /// @notice Toggle revert behavior for testing error handling
    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    /// @notice Deposits assets into the mock lending pool
    /// @param asset The address of the asset to deposit
    /// @param amount The amount to deposit
    /// @return The amount of shares/tokens received
    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (shouldRevert) {
            revert("MockAaveLendingPool: Deposit failed");
        }

        require(
            IERC20(asset).transferFrom(msg.sender, address(this), amount),
            "MockAaveLendingPool: Transfer failed"
        );

        balances[asset] += amount;
        return amount;
    }

    /// @notice Withdraws assets from the mock lending pool
    /// @param asset The address of the asset to withdraw
    /// @param amount The amount to withdraw
    /// @return The amount actually withdrawn
    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (shouldRevert) {
            revert("MockAaveLendingPool: Withdraw failed");
        }

        uint256 balance = balances[asset];
        uint256 withdrawAmount = amount > balance ? balance : amount;

        if (withdrawAmount > 0) {
            balances[asset] -= withdrawAmount;
            require(
                IERC20(asset).transfer(msg.sender, withdrawAmount),
                "MockAaveLendingPool: Transfer failed"
            );
        }

        return withdrawAmount;
    }

    /// @notice Gets the current balance of deposited assets
    /// @param asset The address of the asset to check
    /// @return The current balance
    function getBalance(address asset) external view returns (uint256) {
        return balances[asset];
    }

    /// @notice Simulates a loss in the lending pool for testing purposes
    /// @param asset The address of the asset to simulate loss for
    /// @param lossPercentage The percentage of loss to simulate (0-100)
    function simulateWithdrawLoss(address asset, uint256 lossPercentage) external {
        require(lossPercentage <= 100, "Loss percentage must be <= 100");
        uint256 currentBalance = balances[asset];
        uint256 lossAmount = (currentBalance * lossPercentage) / 100;
        balances[asset] = currentBalance - lossAmount;
    }
}
