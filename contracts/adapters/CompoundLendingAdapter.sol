// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ILendingAdapter.sol";

interface IComet {
    function allow(address manager, bool isAllowed) external;
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function getSupplyRate(uint256 utilization) external view returns (uint256);
    function getBorrowRate(uint256 utilization) external view returns (uint256);
    function getUtilization() external view returns (uint256);
}

contract CompoundLendingAdapter is ILendingAdapter {
    // Known USDC address on Base
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public immutable comet;

    event DepositSuccessful(address asset, uint256 amount, uint256 sharesReceived);
    event WithdrawSuccessful(address asset, uint256 amount);

    constructor(address _comet) {
        require(_comet != address(0), "Invalid Comet address");
        comet = _comet;
    }

    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();
        if (asset != USDC) revert DepositFailed("Unsupported asset");

        // Transfer tokens to this contract first
        if (!IERC20(asset).transferFrom(msg.sender, address(this), amount)) {
            revert DepositFailed("Transfer to adapter failed");
        }

        // Get balance before supply
        uint256 balanceBefore = IComet(comet).balanceOf(address(this));

        // Reset and set approval
        IERC20(asset).approve(comet, 0);
        if (!IERC20(asset).approve(comet, amount)) {
            IERC20(asset).transfer(msg.sender, amount);
            revert ApprovalFailed(asset, comet);
        }

        // Supply to Compound
        try IComet(comet).supply(asset, amount) {
            uint256 balanceAfter = IComet(comet).balanceOf(address(this));
            uint256 sharesReceived = balanceAfter - balanceBefore;
            emit DepositSuccessful(asset, amount, sharesReceived);
            return sharesReceived;
        } catch Error(string memory reason) {
            // If supply fails, transfer tokens back to user
            IERC20(asset).transfer(msg.sender, amount);
            revert DepositFailed(reason);
        } catch {
            // If supply fails, transfer tokens back to user
            IERC20(asset).transfer(msg.sender, amount);
            revert DepositFailed("Compound supply failed");
        }
    }

    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();
        if (asset != USDC) revert WithdrawFailed("Unsupported asset");

        uint256 balance = IERC20(asset).balanceOf(address(this));
        try IComet(comet).withdraw(asset, amount) {
            uint256 newBalance = IERC20(asset).balanceOf(address(this));
            uint256 withdrawnAmount = newBalance - balance;

            // Transfer withdrawn tokens to caller
            if (!IERC20(asset).transfer(msg.sender, withdrawnAmount)) {
                revert WithdrawFailed("Transfer to user failed");
            }

            emit WithdrawSuccessful(asset, withdrawnAmount);
            return withdrawnAmount;
        } catch Error(string memory reason) {
            revert WithdrawFailed(reason);
        } catch {
            revert WithdrawFailed("Compound withdraw failed");
        }
    }

    function getBalance(address asset) external view returns (uint256) {
        if (asset != USDC) {
            return 0;
        }
        try IComet(comet).balanceOf(address(this)) returns (uint256 balance) {
            return balance;
        } catch {
            return 0;
        }
    }
}
