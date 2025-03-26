// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock aToken for tracking user deposits
contract MockAToken is ERC20 {
    address public immutable underlying;

    constructor(address _underlying) ERC20("Aave Interest Bearing USDC", "aUSDC") {
        underlying = _underlying;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}

// Mock Aave Pool implementation
contract MockAavePool {
    mapping(address => address) public aTokens;
    mapping(address => MockAToken) public aTokenContracts;

    event Supply(address asset, uint256 amount, address onBehalfOf);
    event Withdraw(address asset, uint256 amount, address to);

    constructor(address usdc) {
        // Create aToken for USDC
        MockAToken aToken = new MockAToken(usdc);
        aTokens[usdc] = address(aToken);
        aTokenContracts[usdc] = aToken;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {
        require(amount > 0, "Amount must be greater than 0");

        // Transfer underlying token from user
        IERC20(asset).transferFrom(msg.sender, address(this), amount);

        // Mint aTokens to user
        MockAToken aToken = aTokenContracts[asset];
        require(address(aToken) != address(0), "Unsupported asset");
        aToken.mint(onBehalfOf, amount);

        emit Supply(asset, amount, onBehalfOf);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        MockAToken aToken = aTokenContracts[asset];
        require(address(aToken) != address(0), "Unsupported asset");

        // Burn aTokens
        aToken.burn(msg.sender, amount);

        // Return underlying tokens
        require(IERC20(asset).transfer(to, amount), "Transfer failed");

        emit Withdraw(asset, amount, to);
        return amount;
    }
}

// Mock Aave Pool Data Provider
contract MockAavePoolDataProvider {
    mapping(address => address) public aTokens;

    constructor(address usdc, address aToken) {
        aTokens[usdc] = aToken;
    }

    function getReserveTokensAddresses(address asset) external view returns (
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress
    ) {
        return (aTokens[asset], address(0), address(0));
    }
}
