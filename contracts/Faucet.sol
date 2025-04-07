// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Faucet is Ownable {
    IERC20 public token;
    uint256 public tokenWithdrawalAmount;
    uint256 public ethWithdrawalAmount;
    uint256 public lockTime = 1 days;
    mapping(address => uint256) lastTokenAccessTime;
    mapping(address => uint256) lastEthAccessTime;

    event TokenWithdrawal(address indexed to, uint256 amount);
    event EthWithdrawal(address indexed to, uint256 amount);
    event TokenDeposit(address indexed from, uint256 amount);
    event EthDeposit(address indexed from, uint256 amount);

    constructor(
        address _tokenAddress,
        uint256 _tokenWithdrawalAmount,
        uint256 _ethWithdrawalAmount
    ) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        token = IERC20(_tokenAddress);
        tokenWithdrawalAmount = _tokenWithdrawalAmount;
        ethWithdrawalAmount = _ethWithdrawalAmount;
    }

    function requestTokens() external {
        require(
            lastTokenAccessTime[msg.sender] + lockTime < block.timestamp,
            "Try again later"
        );
        require(
            token.balanceOf(address(this)) >= tokenWithdrawalAmount,
            "Insufficient token balance in faucet"
        );

        lastTokenAccessTime[msg.sender] = block.timestamp;
        require(
            token.transfer(msg.sender, tokenWithdrawalAmount),
            "Failed to send tokens"
        );

        emit TokenWithdrawal(msg.sender, tokenWithdrawalAmount);
    }

    function requestEth() external {
        require(
            lastEthAccessTime[msg.sender] + lockTime < block.timestamp,
            "Try again later"
        );
        require(
            address(this).balance >= ethWithdrawalAmount,
            "Insufficient ETH balance in faucet"
        );

        lastEthAccessTime[msg.sender] = block.timestamp;
        (bool success, ) = msg.sender.call{value: ethWithdrawalAmount}("");
        require(success, "Failed to send ETH");

        emit EthWithdrawal(msg.sender, ethWithdrawalAmount);
    }

    function depositTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Failed to transfer tokens"
        );

        emit TokenDeposit(msg.sender, amount);
    }

    receive() external payable {
        if (msg.value > 0) {
            emit EthDeposit(msg.sender, msg.value);
        }
    }

    function setTokenWithdrawalAmount(uint256 _amount) external onlyOwner {
        tokenWithdrawalAmount = _amount;
    }

    function setEthWithdrawalAmount(uint256 _amount) external onlyOwner {
        ethWithdrawalAmount = _amount;
    }

    function setLockTime(uint256 _lockTime) external onlyOwner {
        lockTime = _lockTime;
    }

    function withdrawTokens() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(owner(), balance), "Failed to withdraw tokens");
    }

    function withdrawEth() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Failed to withdraw ETH");
    }
}
