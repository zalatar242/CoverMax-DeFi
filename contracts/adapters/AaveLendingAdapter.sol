// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ILendingAdapter.sol";

interface IAavePool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
}

interface IAavePoolDataProvider {
    function getReserveTokensAddresses(address asset) external view returns (
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress
    );
}

interface IAToken {
    function balanceOf(address user) external view returns (uint256);
}

contract AaveLendingAdapter is ILendingAdapter {
    address public immutable aavePool;
    address public immutable poolDataProvider;

    event DepositSuccessful(address asset, uint256 amount);
    event WithdrawSuccessful(address asset, uint256 amount);

    constructor(address _aavePool, address _poolDataProvider) {
        require(_aavePool != address(0), "Invalid Aave pool");
        require(_poolDataProvider != address(0), "Invalid data provider");
        aavePool = _aavePool;
        poolDataProvider = _poolDataProvider;
    }

    function deposit(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();

        // Transfer the tokens to this contract first
        if (!IERC20(asset).transferFrom(msg.sender, address(this), amount)) {
            revert DepositFailed("Transfer to adapter failed");
        }

        // Reset approval first
        try IERC20(asset).approve(aavePool, 0) {
            // Then set new approval
            try IERC20(asset).approve(aavePool, amount) {
                try IAavePool(aavePool).supply(asset, amount, address(this), 0) {
                    emit DepositSuccessful(asset, amount);
                    return amount;
                } catch Error(string memory reason) {
                    // If supply fails, transfer tokens back to user
                    IERC20(asset).transfer(msg.sender, amount);
                    revert DepositFailed(reason);
                } catch {
                    // If supply fails, transfer tokens back to user
                    IERC20(asset).transfer(msg.sender, amount);
                    revert DepositFailed("Aave supply failed");
                }
            } catch {
                // If approval fails, transfer tokens back to user
                IERC20(asset).transfer(msg.sender, amount);
                revert ApprovalFailed(asset, aavePool);
            }
        } catch {
            // If approval reset fails, transfer tokens back to user
            IERC20(asset).transfer(msg.sender, amount);
            revert ApprovalFailed(asset, aavePool);
        }
    }

    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (amount == 0) revert AmountTooLow();

        try IAavePool(aavePool).withdraw(asset, amount, address(this)) returns (uint256 withdrawnAmount) {
            emit WithdrawSuccessful(asset, withdrawnAmount);
            // Transfer withdrawn tokens to caller
            if (!IERC20(asset).transfer(msg.sender, withdrawnAmount)) {
                revert WithdrawFailed("Transfer to user failed");
            }
            return withdrawnAmount;
        } catch Error(string memory reason) {
            revert WithdrawFailed(reason);
        } catch {
            revert WithdrawFailed("Aave withdraw failed");
        }
    }

    function getBalance(address asset) external view returns (uint256) {
        try IAavePoolDataProvider(poolDataProvider).getReserveTokensAddresses(asset) returns (
            address aTokenAddress,
            address,
            address
        ) {
            if (aTokenAddress == address(0)) {
                return 0;
            }
            // Return aToken balance
            return IAToken(aTokenAddress).balanceOf(address(this));
        } catch {
            return 0;
        }
    }
}
