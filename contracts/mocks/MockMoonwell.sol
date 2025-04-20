// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock Moonwell Market implementation
contract MockMToken is ERC20 {
    address public immutable underlying;
    uint256 public constant INTEREST_RATE = 8.38e9; // ~30% APY when divided by 1e18
    uint256 private lastUpdateTimestamp;
    uint256 private interestAccumulator;

    event Mint(address minter, uint256 mintAmount);
    event Redeem(address redeemer, uint256 redeemAmount);

    constructor(address _underlying) ERC20("Moonwell USDC", "mUSDC") {
        underlying = _underlying;
        lastUpdateTimestamp = block.timestamp;
        interestAccumulator = 1e18; // Start with 1.0
    }

    function exchangeRateStored() public view returns (uint256) {
        if (block.timestamp > lastUpdateTimestamp) {
            uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
            uint256 interest = ((INTEREST_RATE * timeElapsed) + 1e18);
            return (interestAccumulator * interest) / 1e18;
        }
        return interestAccumulator;
    }

    function _updateInterest() internal {
        if (block.timestamp > lastUpdateTimestamp) {
            uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
            uint256 interest = ((INTEREST_RATE * timeElapsed) + 1e18);
            interestAccumulator = (interestAccumulator * interest) / 1e18;
            lastUpdateTimestamp = block.timestamp;
        }
    }

    function mint(uint256 amount) external returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");

        _updateInterest();

        // Transfer underlying tokens from user
        IERC20(underlying).transferFrom(msg.sender, address(this), amount);

        // Mint mTokens to user based on current exchange rate
        uint256 mintAmount = (amount * 1e18) / exchangeRateStored();
        _mint(msg.sender, mintAmount);

        emit Mint(msg.sender, mintAmount);
        return 0; // Success = 0 in Moonwell
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        require(redeemAmount > 0, "Amount must be greater than 0");

        _updateInterest();

        // Calculate tokens to burn based on current exchange rate
        uint256 tokensToRedeem = (redeemAmount * 1e18) / exchangeRateStored();
        require(balanceOf(msg.sender) >= tokensToRedeem, "Insufficient balance");

        // Burn mTokens
        _burn(msg.sender, tokensToRedeem);

        // Return underlying tokens with accrued interest
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
