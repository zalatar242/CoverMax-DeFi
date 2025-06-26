// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock aToken for tracking user deposits
contract MockAToken is ERC20 {
    address public immutable underlying;
    uint256 public constant INTEREST_RATE = 8.38e9; // ~30% APY when divided by 1e18
    uint256 private lastUpdateTimestamp;
    uint256 private interestAccumulator;

    constructor(address _underlying) ERC20("Aave Interest Bearing USDC", "aUSDC") {
        underlying = _underlying;
        lastUpdateTimestamp = block.timestamp;
        interestAccumulator = 1e18; // Start with 1.0
    }

    function _updateInterest() internal {
        if (block.timestamp > lastUpdateTimestamp) {
            uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
            // Calculate interest: (1 + rate)^time
            uint256 interest = ((INTEREST_RATE * timeElapsed) + 1e18);
            interestAccumulator = (interestAccumulator * interest) / 1e18;
            lastUpdateTimestamp = block.timestamp;
        }
    }

    function mint(address account, uint256 amount) external {
        _updateInterest();
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _updateInterest();
        _burn(account, amount);
    }

    function balanceOf(address account) public view override returns (uint256) {
        uint256 rawBalance = super.balanceOf(account);
        if (block.timestamp > lastUpdateTimestamp && rawBalance > 0) {
            uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
            uint256 interest = ((INTEREST_RATE * timeElapsed) + 1e18);
            uint256 currentAccumulator = (interestAccumulator * interest) / 1e18;
            return (rawBalance * currentAccumulator) / 1e18;
        }
        return (rawBalance * interestAccumulator) / 1e18;
    }
}

// Mock Aave Pool implementation
contract MockAavePool {
    mapping(address => address) public aTokens;
    mapping(address => MockAToken) public aTokenContracts;

    event Supply(address asset, uint256 amount, address onBehalfOf);
    event Withdraw(address asset, uint256 amount, address to);

    constructor(address usdc) {
        // We'll initialize the aToken separately to avoid constructor issues
    }

    function setAToken(address asset, address aTokenAddress) external {
        require(aTokens[asset] == address(0), "Already set");
        aTokens[asset] = aTokenAddress;
        aTokenContracts[asset] = MockAToken(aTokenAddress);
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

        uint256 currentBalance = aToken.balanceOf(msg.sender);
        require(currentBalance >= amount, "Insufficient balance");

        // Burn aTokens
        aToken.burn(msg.sender, amount);

        // Calculate accrued interest and total amount to return
        uint256 totalAmount = amount;

        // Return underlying tokens with accrued interest
        require(IERC20(asset).transfer(to, totalAmount), "Transfer failed");

        emit Withdraw(asset, totalAmount, to);
        return totalAmount;
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
