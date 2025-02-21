// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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

    /// @notice Handles errors that may occur during deposit or withdraw
    /// @param asset The address of the asset
    /// @param amount The amount to deposit or withdraw
    /// @param errorCode A code representing the error that occurred
    function handleLendingError(address asset, uint256 amount, uint256 errorCode) external;

    /// @notice Test helper to toggle revert behavior
    function setShouldRevert(bool _shouldRevert) external;

    /// @notice Test helper to simulate withdrawal losses
    function simulateWithdrawLoss(address asset, uint256 lossPercentage) external;
}
