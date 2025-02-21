// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../Insurance.sol";

contract MockDAI is ERC20, IcDAI {
    mapping(address => uint256) public cTokenBalances;
    bool public isCToken;
    address public underlyingToken; // Only used if this is a cToken

    constructor(bool _isCToken) ERC20(_isCToken ? "Mock cDAI" : "Mock DAI", _isCToken ? "mcDAI" : "mDAI") {
        isCToken = _isCToken;
        if (!_isCToken) {
            _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens to deployer for DAI instance
        }
    }

    // Set the underlying token address (only for cToken instances)
    function setUnderlyingToken(address _underlyingToken) external {
        require(isCToken, "Mock: Not a cToken");
        require(underlyingToken == address(0), "Mock: Underlying token already set");
        underlyingToken = _underlyingToken;
    }

    // Compound's cToken interface implementation
    function mint(uint256 mintAmount) external override returns (uint256) {
        require(isCToken, "Mock: Not a cToken");
        require(underlyingToken != address(0), "Mock: Underlying token not set");

        // Transfer underlying tokens from user to this contract
        require(
            IERC20(underlyingToken).transferFrom(msg.sender, address(this), mintAmount),
            "Mock: Transfer of underlying token failed"
        );

        // Mint cTokens to user (1:1 ratio for simplicity)
        _mint(msg.sender, mintAmount);
        cTokenBalances[msg.sender] += mintAmount;

        return 0; // Return 0 to indicate success (as per Compound's interface)
    }

    function redeem(uint256 redeemTokens) external override returns (uint256) {
        require(isCToken, "Mock: Not a cToken");
        require(underlyingToken != address(0), "Mock: Underlying token not set");
        require(balanceOf(msg.sender) >= redeemTokens, "Mock: Insufficient cToken balance");

        // Burn cTokens
        _burn(msg.sender, redeemTokens);
        cTokenBalances[msg.sender] -= redeemTokens;

        // Transfer underlying tokens back to user
        require(
            IERC20(underlyingToken).transfer(msg.sender, redeemTokens),
            "Mock: Transfer of underlying token failed"
        );

        return 0; // Return 0 to indicate success (as per Compound's interface)
    }

    // Administrative function for testing
    function adminMint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Override approve to always succeed for testing
    function approve(address spender, uint256 amount) public virtual override(ERC20, IERC20) returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    // Override allowance to always return max for testing
    function allowance(
        address, /* owner */
        address /* spender */
    ) public view virtual override(ERC20, IERC20) returns (uint256) {
        return type(uint256).max;
    }

    // Get cToken balance
    function balanceOfCToken(address account) external view returns (uint256) {
        return cTokenBalances[account];
    }

    // Burn function for testing aToken redemption
    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
