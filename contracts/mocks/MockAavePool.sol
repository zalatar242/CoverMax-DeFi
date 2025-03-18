// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAavePool {
    mapping(address => mapping(address => uint256)) private balances; // user => token => balance
    bool public shouldRevert;

    event Supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode);
    event Withdraw(address asset, uint256 amount, address to);

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {
        if (shouldRevert) {
            revert("MockAavePool: Supply failed");
        }

        require(
            IERC20(asset).transferFrom(msg.sender, address(this), amount),
            "MockAavePool: Transfer failed"
        );

        balances[onBehalfOf][asset] += amount;
        emit Supply(asset, amount, onBehalfOf, referralCode);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        if (shouldRevert) {
            revert("MockAavePool: Withdraw failed");
        }

        uint256 balance = balances[msg.sender][asset];
        uint256 withdrawAmount = amount > balance ? balance : amount;

        if (withdrawAmount > 0) {
            balances[msg.sender][asset] -= withdrawAmount;
            require(
                IERC20(asset).transfer(to, withdrawAmount),
                "MockAavePool: Transfer failed"
            );
        }

        emit Withdraw(asset, withdrawAmount, to);
        return withdrawAmount;
    }
}

contract MockAavePoolDataProvider {
    mapping(address => address) private aTokens;

    function setAToken(address asset, address aToken) external {
        aTokens[asset] = aToken;
    }

    function getATokensAndRatesAddresses(address asset) external view returns (
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress
    ) {
        return (aTokens[asset], address(0), address(0));
    }
}

contract MockAToken {
    mapping(address => uint256) private _balances;
    address public immutable underlyingAsset;

    constructor(address asset) {
        underlyingAsset = asset;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function mint(address account, uint256 amount) external {
        _balances[account] += amount;
    }

    function burn(address account, uint256 amount) external {
        _balances[account] -= amount;
    }
}
