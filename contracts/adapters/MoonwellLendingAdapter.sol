// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../ILendingAdapter.sol";

interface IMToken {
    function mint(uint256 amount) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function exchangeRateStored() external view returns (uint256);
}

contract MoonwellLendingAdapter is ILendingAdapter {
    using Strings for uint256;
    address public immutable mToken;

    event DepositSuccessful(address asset, uint256 amount);
    event WithdrawSuccessful(address asset, uint256 amount);

    constructor(address _mToken) {
        require(_mToken != address(0), "Invalid mToken");
        mToken = _mToken;
    }

    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();

        // Transfer tokens from user to adapter first
        try IERC20(asset).transferFrom(msg.sender, address(this), amount) {
            // Reset approval to 0 first for safety
            try IERC20(asset).approve(mToken, 0) {
                // Set new approval for mToken
                try IERC20(asset).approve(mToken, amount) {
                    // Attempt to mint in Moonwell
                    try IMToken(mToken).mint(amount) returns (uint256 errorCode) {
                        if (errorCode != 0) {
                            revert DepositFailed(string.concat("Moonwell mint error code: ", errorCode.toString()));
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
        } catch Error(string memory reason) {
            revert DepositFailed(reason);
        } catch {
            revert DepositFailed("Failed to transfer tokens to adapter");
        }
    }

    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();

        try IMToken(mToken).redeemUnderlying(amount) returns (uint256 errorCode) {
            if (errorCode != 0) {
                revert WithdrawFailed(string.concat("Moonwell redeem error code: ", errorCode.toString()));
            }

            // After successful redeem, transfer the tokens back to the user
            try IERC20(asset).transfer(msg.sender, amount) {
                emit WithdrawSuccessful(asset, amount);
                return amount;
            } catch Error(string memory reason) {
                revert WithdrawFailed(string.concat("Transfer failed: ", reason));
            } catch {
                revert WithdrawFailed("Transfer to user failed");
            }
        } catch Error(string memory reason) {
            revert WithdrawFailed(reason);
        } catch {
            revert WithdrawFailed("Moonwell redeem failed");
        }
    }

    function getBalance(address) external view returns (uint256) {
        // Get mToken balance and stored exchange rate
        uint256 mTokenBalance = IMToken(mToken).balanceOf(address(this));
        uint256 exchangeRate = IMToken(mToken).exchangeRateStored();

        // Convert mToken balance to underlying token amount
        // Exchange rate is scaled by 1e18
        return (mTokenBalance * exchangeRate) / 1e18;
    }
}
