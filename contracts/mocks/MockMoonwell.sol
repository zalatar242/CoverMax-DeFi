// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock Moonwell Market implementation
contract MockMToken is ERC20 {
    address public immutable underlying;
    uint256 public constant exchangeRateStored = 1e18; // 1:1 exchange rate for simplicity

    event Mint(address minter, uint256 mintAmount);
    event Redeem(address redeemer, uint256 redeemAmount);

    constructor(address _underlying) ERC20("Moonwell USDC", "mUSDC") {
        underlying = _underlying;
    }

    function mint(uint256 amount) external returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");

        // Transfer underlying tokens from user
        IERC20(underlying).transferFrom(msg.sender, address(this), amount);

        // Mint mTokens to user (1:1 for simplicity)
        _mint(msg.sender, amount);

        emit Mint(msg.sender, amount);
        return 0; // Success = 0 in Moonwell
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        require(redeemAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= redeemAmount, "Insufficient balance");

        // Burn mTokens
        _burn(msg.sender, redeemAmount);

        // Return underlying tokens
        require(IERC20(underlying).transfer(msg.sender, redeemAmount), "Transfer failed");

        emit Redeem(msg.sender, redeemAmount);
        return 0; // Success = 0 in Moonwell
    }

    // Mock comptroller - always returns success
    function comptroller() external pure returns (address) {
        return address(1);
    }
}

// Mock Moonwell Comptroller implementation
contract MockMoonwellComptroller {
    mapping(address => bool) public markets;

    constructor(address mToken) {
        markets[mToken] = true;
    }

    function enterMarkets(address[] calldata _markets) external returns (uint256[] memory) {
        uint256[] memory results = new uint256[](_markets.length);
        for(uint i = 0; i < _markets.length; i++) {
            require(markets[_markets[i]], "Market does not exist");
            results[i] = 0; // 0 = success
        }
        return results;
    }
}
