// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoverMaxToken is ERC20, Ownable {
    constructor() ERC20("CoverMax Token", "CMAX") Ownable(msg.sender) {
        // Initial supply of 10 million tokens (with 18 decimals)
        _mint(msg.sender, 10000000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
