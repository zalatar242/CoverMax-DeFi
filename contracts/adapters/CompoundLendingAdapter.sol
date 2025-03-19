// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ILendingAdapter.sol";

interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract CompoundLendingAdapter is ILendingAdapter {
    // Known USDC address on Base
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public immutable comet;

    event DepositSuccessful(
        address asset,
        uint256 amount,
        uint256 sharesReceived
    );
    event WithdrawSuccessful(address asset, uint256 amount);

    constructor(address _comet) {
        require(_comet != address(0), "Invalid Comet address");
        comet = _comet;
    }

    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();
        if (asset != USDC) revert("Unsupported asset");

        // Transfer tokens to this contract first
        if (!IERC20(asset).transferFrom(msg.sender, address(this), amount)) {
            revert DepositFailed("Transfer to adapter failed");
        }

        // Get collateral balance before supply
        // Reset and set approval
        IERC20(asset).approve(comet, 0);
        if (!IERC20(asset).approve(comet, amount)) {
            IERC20(asset).transfer(msg.sender, amount);
            revert ApprovalFailed(asset, comet);
        }

        uint256 balanceBefore = IComet(comet).balanceOf(address(this));

        // Supply to Compound
        try IComet(comet).supply(asset, amount) {
            uint256 balanceAfter = IComet(comet).balanceOf(address(this));
            if (balanceAfter <= balanceBefore) {
                // If supply failed silently, transfer tokens back and revert
                IERC20(asset).transfer(msg.sender, amount);
                revert DepositFailed("Balance did not increase after supply");
            }
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

    function withdraw(
        address asset,
        uint256 amount
    ) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();
        if (asset != USDC) revert("Unsupported asset");

        // Get current Compound balance before withdrawal
        uint256 balance = IComet(comet).balanceOf(address(this));
        if (balance < amount) {
            revert WithdrawFailed("Insufficient balance in Compound");
        }

        // Withdraw from Compound - this will send USDC directly to the adapter
        try IComet(comet).withdraw(asset, amount) {
            // Verify we received the USDC
            uint256 usdcBalance = IERC20(asset).balanceOf(address(this));
            if (usdcBalance < amount) {
                revert WithdrawFailed("Withdrawal did not receive enough USDC");
            }

            // Transfer withdrawn tokens to caller
            if (!IERC20(asset).transfer(msg.sender, amount)) {
                revert WithdrawFailed("Transfer to user failed");
            }

            emit WithdrawSuccessful(asset, amount);
            return amount;
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
        try IComet(comet).balanceOf(address(this)) returns (
            uint256 balance
        ) {
            return uint256(balance);
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("Failed to get balance");
        }
    }
}

