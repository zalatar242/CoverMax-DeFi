// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Tranche tokens for the SplitInsurance contract
/// @author Matthias Nadler, Felix Bekemeier, Fabian Schär
contract Tranche is ERC20, Ownable {
    uint8 private constant _decimals = 6;  // Match USDC decimals

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {}

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /// @notice Allows the owner to mint new tranche tokens
    /// @dev The insurance contract should be the immutable owner
    /// @param account The recipient of the new tokens
    /// @param amount The amount of new tokens to mint
    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    /// @notice Allows the owner to burn tranche tokens
    /// @dev The insurance contract should be the immutable owner
    /// @param account The owner of the tokens to be burned
    /// @param amount The amount of tokens to burn
    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }
}
