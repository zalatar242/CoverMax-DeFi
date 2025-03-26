// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private _decimals = 6;

    constructor() ERC20("USD Coin", "USDC") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**_decimals); // 1M USDC
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Function to mint more tokens for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
