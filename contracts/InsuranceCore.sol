// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITranche {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IAdapterManager {
    function depositFunds(uint256 amount) external returns (uint256);
    function withdrawFunds(uint256 amount) external returns (uint256);
}

interface ICalculator {
    function calculateWithdrawal(uint256 totalTokens, uint256 totalTranches, uint256 totalInvested) external view returns (uint256);
}

/// @title Insurance Core - Optimized version for size constraints
contract InsuranceCore {
    address public owner;
    address public AAA;
    address public AA;
    address public usdc;
    address public adapterManager;
    address public calculator;

    uint256 public S; // Start/split end
    uint256 public T1; // Insurance end
    uint256 public T2; // AAA tokens claim start
    uint256 public T3; // Final claim end

    uint256 public totalTranches;
    uint256 public totalInvested;

    event RiskSplit(address indexed splitter, uint256 amountUsdc);
    event Claim(address indexed claimant, uint256 amountAAA, uint256 amountAA, uint256 amountUsdc);
    event Initialized(address usdc, address owner);

    bool private initialized;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Insurance: not owner");
        _;
    }

    modifier timeReset() {
        if (block.timestamp > T3) {
            S = block.timestamp + 2 days;
            T1 = S + 5 days;
            T2 = T1 + 1 days;
            T3 = T2 + 1 days;
        }
        _;
    }

    function initialize(
        address usdcAddress,
        uint256 _S,
        uint256 _T1,
        uint256 _T2,
        uint256 _T3,
        address _adapterManager,
        address _calculator
    ) external onlyOwner {
        require(!initialized, "Insurance: already initialized");
        initialized = true;
        usdc = usdcAddress;
        adapterManager = _adapterManager;
        calculator = _calculator;
        S = _S;
        T1 = _T1;
        T2 = _T2;
        T3 = _T3;
        emit Initialized(usdcAddress, owner);
    }

    function setTranches(address _AAA, address _AA) external onlyOwner {
        require(AAA == address(0) && AA == address(0), "Insurance: tranches already set");
        AAA = _AAA;
        AA = _AA;
    }

    function splitRisk(uint256 amountUsdc) external timeReset {
        require(block.timestamp < S, "Insurance: issuance ended");
        require(amountUsdc >= 4, "Insurance: amount too low");
        require(amountUsdc % 2 == 0, "Insurance: Amount must be divisible by 2");

        IERC20(usdc).transferFrom(msg.sender, address(this), amountUsdc);
        IERC20(usdc).approve(adapterManager, amountUsdc);

        uint256 deposited = IAdapterManager(adapterManager).depositFunds(amountUsdc);
        totalInvested += deposited;

        uint256 trancheAmount = amountUsdc / 2;
        ITranche(AAA).mint(msg.sender, trancheAmount);
        ITranche(AA).mint(msg.sender, trancheAmount);
        totalTranches += amountUsdc;

        emit RiskSplit(msg.sender, amountUsdc);
    }

    function claim(uint256 amountAAA, uint256 amountAA) external {
        _claim(amountAAA, amountAA);
    }

    function claimAll() external {
        uint256 balanceAAA = ITranche(AAA).balanceOf(msg.sender);
        uint256 balanceAA = ITranche(AA).balanceOf(msg.sender);
        require(balanceAAA > 0 || balanceAA > 0, "Insurance: No AAA or AA tokens to claim");

        // Call internal claim function directly to avoid external call issues
        _claim(balanceAAA, balanceAA);
    }

    function _claim(uint256 amountAAA, uint256 amountAA) internal timeReset {
        require(
            block.timestamp <= S || block.timestamp > T1,
            "Insurance: Claims allowed before/after insurance period"
        );
        require(amountAAA > 0 || amountAA > 0, "Insurance: AmountAAA and AmountAA cannot both be zero");

        uint256 totalTokens = amountAAA + amountAA;
        uint256 totalToWithdraw = ICalculator(calculator).calculateWithdrawal(totalTokens, totalTranches, totalInvested);
        uint256 totalWithdrawn = IAdapterManager(adapterManager).withdrawFunds(totalToWithdraw);

        totalInvested -= totalToWithdraw;

        if (amountAAA > 0) {
            require(ITranche(AAA).balanceOf(msg.sender) >= amountAAA, "Insurance: insufficient AAA balance");
            ITranche(AAA).burn(msg.sender, amountAAA);
        }
        if (amountAA > 0) {
            require(ITranche(AA).balanceOf(msg.sender) >= amountAA, "Insurance: insufficient AA balance");
            ITranche(AA).burn(msg.sender, amountAA);
        }
        totalTranches -= totalTokens;

        IERC20(usdc).transfer(msg.sender, totalWithdrawn);
        emit Claim(msg.sender, amountAAA, amountAA, totalWithdrawn);
    }

    function getInfo() external view returns (address, address, bool, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (owner, usdc, initialized, S, T1, T2, T3, totalTranches, totalInvested);
    }

    function getUserDeposit(address user) external view returns (uint256) {
        return ITranche(AAA).balanceOf(user) + ITranche(AA).balanceOf(user);
    }
}
