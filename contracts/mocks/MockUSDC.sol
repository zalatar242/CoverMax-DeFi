// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Mock USDC token for testing
contract MockUSDC is ERC20, Ownable {
    uint8 private immutable _decimals;

    constructor() ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        _decimals = 6; // USDC uses 6 decimals
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }
}
