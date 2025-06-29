// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ILendingAdapter.sol";

/// @title MockAdapter - Simple mock adapter for testing
contract MockAdapter is ILendingAdapter {
    address public immutable usdc;
    mapping(address => uint256) public deposits;

    event DepositSuccessful(address asset, uint256 amount);
    event WithdrawSuccessful(address asset, uint256 amount);

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = _usdc;
    }

    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();
        require(asset == usdc, "Only USDC supported");

        // Transfer USDC from caller to this contract
        require(IERC20(asset).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        deposits[asset] += amount;
        emit DepositSuccessful(asset, amount);
        return amount;
    }

    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();
        require(asset == usdc, "Only USDC supported");
        require(deposits[asset] >= amount, "Insufficient balance");

        deposits[asset] -= amount;

        // Transfer USDC back to caller
        require(IERC20(asset).transfer(msg.sender, amount), "Transfer failed");

        emit WithdrawSuccessful(asset, amount);
        return amount;
    }

    function getBalance(address asset) external view returns (uint256) {
        if (asset != usdc) return 0;
        return deposits[asset];
    }
}
