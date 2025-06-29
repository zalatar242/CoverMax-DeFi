// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Thrown when deposit/withdraw amount is 0 or negative
error AmountTooLow();

/// @notice Thrown when deposit operation fails
error DepositFailed(string reason);

/// @notice Thrown when withdrawal operation fails
error WithdrawFailed(string reason);

/// @notice Thrown when token approval fails
error ApprovalFailed(address token, address spender);

interface ILendingAdapter {
    /// @notice Deposits assets into the lending platform
    /// @param asset The address of the asset to deposit (USDC)
    /// @param amount The amount to deposit
    /// @return The amount of shares/tokens received
    function deposit(address asset, uint256 amount) external returns (uint256);

    /// @notice Withdraws assets from the lending platform
    /// @param asset The address of the asset to withdraw (USDC)
    /// @param amount The amount to withdraw
    /// @return The amount actually withdrawn
    function withdraw(address asset, uint256 amount) external returns (uint256);

    /// @notice Gets the current balance of deposited assets
    /// @param asset The address of the asset to check
    /// @return The current balance
    function getBalance(address asset) external view returns (uint256);
}
