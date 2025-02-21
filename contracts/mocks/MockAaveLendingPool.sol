// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockDAI.sol";

contract MockAaveLendingPool {
    mapping(address => uint256) public deposits; // Track deposits by user
    address public immutable aToken;
    address public underlyingToken;

    constructor(address _aToken) {
        aToken = _aToken;
    }

    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        // Store the underlying token on first deposit
        if (underlyingToken == address(0)) {
            underlyingToken = asset;
        }
        require(asset == underlyingToken, "Mock: Invalid asset");

        // Transfer and store the underlying tokens
        require(
            IERC20(asset).transferFrom(msg.sender, address(this), amount),
            "Mock: Transfer failed"
        );

        // Record the deposit for the user
        deposits[onBehalfOf] += amount;

        // Mint aTokens to onBehalfOf using the aToken contract
        MockDAI(aToken).adminMint(onBehalfOf, amount);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        // Since withdraw is called with aToken address, but we track deposits in underlying
        require(asset == aToken, "Mock: Invalid asset");
        require(deposits[msg.sender] >= amount, "Mock: Insufficient balance");

        // Burn the aTokens from the caller
        MockDAI(aToken).burn(msg.sender, amount);

        // Update deposit record
        deposits[msg.sender] -= amount;

        // Return underlying tokens
        require(
            IERC20(underlyingToken).transfer(to, amount),
            "Mock: Transfer failed"
        );

        return amount;
    }
}
