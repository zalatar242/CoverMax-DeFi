// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCompoundPool {
    mapping(address => mapping(address => uint256)) private balances; // user => token => balance
    bool public shouldRevert;

    event Supply(address asset, uint256 amount, uint256 sharesReceived);
    event Withdraw(address asset, uint256 amount, uint256 withdrawn);

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function supply(address asset, uint256 amount) external returns (uint256) {
        if (shouldRevert) {
            revert("MockCompoundPool: Supply failed");
        }

        require(
            IERC20(asset).transferFrom(msg.sender, address(this), amount),
            "MockCompoundPool: Transfer failed"
        );

        balances[msg.sender][asset] += amount;
        emit Supply(asset, amount, amount); // 1:1 share ratio for testing
        return amount;
    }

    function withdraw(address asset, uint256 amount) external returns (uint256) {
        if (shouldRevert) {
            revert("MockCompoundPool: Withdraw failed");
        }

        uint256 balance = balances[msg.sender][asset];
        uint256 withdrawAmount = amount > balance ? balance : amount;

        if (withdrawAmount > 0) {
            balances[msg.sender][asset] -= withdrawAmount;
            require(
                IERC20(asset).transfer(msg.sender, withdrawAmount),
                "MockCompoundPool: Transfer failed"
            );
        }

        emit Withdraw(asset, amount, withdrawAmount);
        return withdrawAmount;
    }

    function balanceOf(address account) external view returns (uint256) {
        // For simplicity in mock, we'll return the USDC balance
        return balances[account][0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913];
    }

    // Helper function to simulate losses
    function simulateLoss(address account, address asset, uint256 lossPercentage) external {
        require(lossPercentage <= 100, "Loss percentage must be <= 100");
        uint256 currentBalance = balances[account][asset];
        uint256 lossAmount = (currentBalance * lossPercentage) / 100;
        balances[account][asset] = currentBalance - lossAmount;
    }
}
