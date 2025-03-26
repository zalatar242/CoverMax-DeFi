// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock Compound III's Comet implementation
contract MockComet is ERC20 {
    address public immutable asset;

    event Supply(address indexed from, address asset, uint256 amount);
    event Withdraw(address indexed to, address asset, uint256 amount);

    constructor(address _asset) ERC20("Compound USDC", "cUSDC") {
        asset = _asset;
    }

    function supply(address _asset, uint256 amount) external {
        require(_asset == asset, "Unsupported asset");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer asset from user
        IERC20(_asset).transferFrom(msg.sender, address(this), amount);

        // Mint cTokens to user (1:1 for simplicity)
        _mint(msg.sender, amount);

        emit Supply(msg.sender, _asset, amount);
    }

    function withdraw(address _asset, uint256 amount) external {
        require(_asset == asset, "Unsupported asset");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Burn cTokens
        _burn(msg.sender, amount);

        // Return underlying tokens
        require(IERC20(_asset).transfer(msg.sender, amount), "Transfer failed");

        emit Withdraw(msg.sender, _asset, amount);
    }
}
