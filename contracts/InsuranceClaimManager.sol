// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITranche {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IAdapterManager {
    function withdrawFunds(uint256 amount) external returns (uint256);
}

interface ICalculator {
    function calculateWithdrawal(uint256 totalTokens, uint256 totalTranches, uint256 totalInvested) external view returns (uint256);
}

interface ITimeManager {
    function canClaim() external view returns (bool);
    function checkAndResetTime() external returns (bool);
}

interface IInsuranceCore {
    function burnTokens(address user, uint256 amountAAA, uint256 amountAA) external;
}

/// @title Insurance Claim Manager - Handles claim processing logic
contract InsuranceClaimManager {
    address public owner;
    address public insuranceCore;
    address public AAA;
    address public AA;
    address public usdc;
    address public adapterManager;
    address public calculator;
    address public timeManager;

    event Claim(address indexed claimant, uint256 amountAAA, uint256 amountAA, uint256 amountUsdc);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "ClaimManager: not owner");
        _;
    }

    modifier onlyInsuranceCore() {
        require(msg.sender == insuranceCore, "ClaimManager: not insurance core");
        _;
    }

    function initialize(
        address _insuranceCore,
        address _AAA,
        address _AA,
        address _usdc,
        address _adapterManager,
        address _calculator,
        address _timeManager
    ) external onlyOwner {
        require(insuranceCore == address(0), "ClaimManager: already initialized");
        insuranceCore = _insuranceCore;
        AAA = _AAA;
        AA = _AA;
        usdc = _usdc;
        adapterManager = _adapterManager;
        calculator = _calculator;
        timeManager = _timeManager;
    }

    function processClaim(
        address user,
        uint256 amountAAA,
        uint256 amountAA,
        uint256 totalTranches,
        uint256 totalInvested
    ) external onlyInsuranceCore returns (uint256 totalWithdrawn, uint256 totalTokens) {
        // Reset time if needed
        ITimeManager(timeManager).checkAndResetTime();

        // Validate timing
        require(ITimeManager(timeManager).canClaim(), "ClaimManager: Claims not allowed during insurance period");
        require(amountAAA > 0 || amountAA > 0, "ClaimManager: AmountAAA and AmountAA cannot both be zero");

        totalTokens = amountAAA + amountAA;
        uint256 totalToWithdraw = ICalculator(calculator).calculateWithdrawal(totalTokens, totalTranches, totalInvested);
        totalWithdrawn = IAdapterManager(adapterManager).withdrawFunds(totalToWithdraw);

        // Validate balances before burning
        if (amountAAA > 0) {
            require(ITranche(AAA).balanceOf(user) >= amountAAA, "ClaimManager: insufficient AAA balance");
        }
        if (amountAA > 0) {
            require(ITranche(AA).balanceOf(user) >= amountAA, "ClaimManager: insufficient AA balance");
        }

        // Burn tokens through InsuranceCore
        IInsuranceCore(insuranceCore).burnTokens(user, amountAAA, amountAA);

        emit Claim(user, amountAAA, amountAA, totalWithdrawn);
        return (totalWithdrawn, totalTokens);
    }

    function getUserBalances(address user) external view returns (uint256 aaaBalance, uint256 aaBalance) {
        aaaBalance = ITranche(AAA).balanceOf(user);
        aaBalance = ITranche(AA).balanceOf(user);
    }
}
