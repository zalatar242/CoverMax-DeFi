// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Insurance Time Manager - Handles time period management for insurance operations
contract InsuranceTimeManager {
    address public owner;
    address public insuranceCore;
    address public claimManager;

    uint256 public S;  // Start/split end
    uint256 public T1; // Insurance end
    uint256 public T2; // AAA tokens claim start
    uint256 public T3; // Final claim end

    event TimePeriodReset(uint256 newS, uint256 newT1, uint256 newT2, uint256 newT3);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "TimeManager: not owner");
        _;
    }

    modifier onlyInsuranceCore() {
        require(msg.sender == insuranceCore, "TimeManager: not insurance core");
        _;
    }

    function initialize(address _insuranceCore, address _claimManager) external onlyOwner {
        require(insuranceCore == address(0), "TimeManager: already initialized");
        insuranceCore = _insuranceCore;
        claimManager = _claimManager;
    }

    function setTimePeriods(uint256 _S, uint256 _T1, uint256 _T2, uint256 _T3) external onlyOwner {
        S = _S;
        T1 = _T1;
        T2 = _T2;
        T3 = _T3;
    }

    function checkAndResetTime() external returns (bool wasReset) {
        require(msg.sender == insuranceCore || msg.sender == owner || msg.sender == claimManager, "TimeManager: unauthorized");
        // Only auto-reset if explicitly called by owner, not automatically
        return false;
    }

    function forceResetTime() external onlyOwner {
        S = block.timestamp + 2 days;
        T1 = S + 5 days;
        T2 = T1 + 1 days;
        T3 = T2 + 1 days;
        emit TimePeriodReset(S, T1, T2, T3);
    }

    function canSplitRisk() external view returns (bool) {
        return block.timestamp < S;
    }

    function canClaim() external view returns (bool) {
        return block.timestamp <= S || block.timestamp > T1;
    }

    function getTimePeriods() external view returns (uint256, uint256, uint256, uint256) {
        return (S, T1, T2, T3);
    }
}
