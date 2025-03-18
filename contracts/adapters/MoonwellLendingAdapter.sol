// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ILendingAdapter.sol";

interface IMToken {
    function mint(uint256 amount) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
}

contract MoonwellLendingAdapter is ILendingAdapter {
    address public immutable mToken;

    event DepositSuccessful(address asset, uint256 amount);
    event WithdrawSuccessful(address asset, uint256 amount);

    constructor(address _mToken) {
        require(_mToken != address(0), "Invalid mToken");
        mToken = _mToken;
    }

    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();

        // Reset approval to 0 first for safety
        try IERC20(asset).approve(mToken, 0) {
            // Set new approval
            try IERC20(asset).approve(mToken, amount) {
                try IMToken(mToken).mint(amount) returns (uint256 errorCode) {
                    if (errorCode != 0) {
                        revert DepositFailed("Moonwell mint error code: ");
                    }
                    emit DepositSuccessful(asset, amount);
                    return amount;
                } catch Error(string memory reason) {
                    revert DepositFailed(reason);
                } catch {
                    revert DepositFailed("Moonwell mint failed");
                }
            } catch {
                revert ApprovalFailed(asset, mToken);
            }
        } catch {
            revert ApprovalFailed(asset, mToken);
        }
    }

    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();

        try IMToken(mToken).redeemUnderlying(amount) returns (uint256 errorCode) {
            if (errorCode != 0) {
                revert WithdrawFailed("Moonwell redeem error code: ");
            }
            emit WithdrawSuccessful(asset, amount);
            return amount;
        } catch Error(string memory reason) {
            revert WithdrawFailed(reason);
        } catch {
            revert WithdrawFailed("Moonwell redeem failed");
        }
    }

    function getBalance(address) external view returns (uint256) {
        // Return the mToken balance
        return IMToken(mToken).balanceOf(address(this));
    }
}
