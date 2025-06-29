// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Insurance Calculator - Handles complex calculations for the insurance system
contract InsuranceCalculator {
    uint256 private constant RAY = 1e27; // Used for floating point math

    /**
     * @dev Calculates the withdrawal share for a given amount of tokens.
     * @param totalTokens The total amount of tokens to withdraw.
     * @param totalTranches The total amount of tranche tokens in circulation.
     * @param totalInvested The total amount invested across adapters.
     * @return uint256 The amount to withdraw.
     */
    function calculateWithdrawal(
        uint256 totalTokens,
        uint256 totalTranches,
        uint256 totalInvested
    ) external pure returns (uint256) {
        if (totalTranches == 0) return 0;
        uint256 withdrawalShare = (totalTokens * RAY) / totalTranches;
        return (totalInvested * withdrawalShare) / RAY;
    }

    /**
     * @dev Calculates the withdrawal amounts for each lending adapter.
     * @param totalToWithdraw The total amount to withdraw.
     * @param adapterCount The number of lending adapters.
     * @return amounts The amount to withdraw from each adapter.
     */
    /**
     * @dev Internal function to distribute amount across multiple recipients.
     * @param totalAmount The total amount to distribute.
     * @param count The number of recipients.
     * @return amounts The amount for each recipient.
     */
    function _distributeAmount(uint256 totalAmount, uint256 count) 
        internal 
        pure 
        returns (uint256[] memory amounts) 
    {
        require(count > 0, "Calculator: no adapters");
        amounts = new uint256[](count);
        
        if (totalAmount == 0) return amounts;
        
        uint256 baseAmount = totalAmount / count;
        uint256 remainder = totalAmount % count;
        
        for (uint256 i = 0; i < count;) {
            amounts[i] = baseAmount + (i < remainder ? 1 : 0);
            unchecked { ++i; }
        }
    }

    function calculateWithdrawalAmounts(
        uint256 totalToWithdraw,
        uint256 adapterCount
    ) external pure returns (uint256[] memory amounts) {
        return _distributeAmount(totalToWithdraw, adapterCount);
    }

    /**
     * @dev Calculates tranche amounts for equal split.
     * @param totalAmount The total amount to split.
     * @return aaaAmount The amount for AAA tranche.
     * @return aaAmount The amount for AA tranche.
     */
    function calculateTrancheAmounts(uint256 totalAmount) external pure returns (uint256 aaaAmount, uint256 aaAmount) {
        require(totalAmount % 2 == 0, "Calculator: amount must be even");
        uint256 trancheAmount = totalAmount / 2;
        return (trancheAmount, trancheAmount);
    }

    /**
     * @dev Calculates deposit amounts for each adapter.
     * @param totalAmount The total amount to deposit.
     * @param adapterCount The number of adapters.
     * @return amounts The amount to deposit to each adapter.
     */
    function calculateDepositAmounts(
        uint256 totalAmount,
        uint256 adapterCount
    ) external pure returns (uint256[] memory amounts) {
        return _distributeAmount(totalAmount, adapterCount);
    }

    /**
     * @dev Validates time periods for insurance operations.
     * @param currentTime The current timestamp.
     * @param S Start/split end time.
     * @param T1 Insurance end time.
     * @param T2 AAA tokens claim start time.
     * @param T3 Final claim end time.
     * @return canSplit Whether risk splitting is allowed.
     * @return canClaim Whether claiming is allowed.
     * @return needsReset Whether time periods need to be reset.
     */
    struct TimePeriodValidation {
        bool canSplitRisk;
        bool canClaim;
        bool isInsurancePeriod;
    }

    function validateTimePeriods(
        uint256 currentTime,
        uint256 S,
        uint256 T1,
        uint256 T2,
        uint256 T3
    ) external pure returns (TimePeriodValidation memory) {
        bool canSplitRisk = currentTime < S;
        bool isInsurancePeriod = currentTime >= S && currentTime <= T1;
        bool canClaim = currentTime <= S || currentTime > T1;
        
        return TimePeriodValidation({
            canSplitRisk: canSplitRisk,
            canClaim: canClaim,
            isInsurancePeriod: isInsurancePeriod
        });
    }

    /**
     * @dev Calculates new time periods for reset.
     * @param currentTime The current timestamp.
     * @return newS New start time.
     * @return newT1 New T1 time.
     * @return newT2 New T2 time.
     * @return newT3 New T3 time.
     */
    struct NewTimePeriods {
        uint256 S;
        uint256 T1;
        uint256 T2;
        uint256 T3;
    }

    function calculateNewTimePeriods(uint256 currentTime) external pure returns (NewTimePeriods memory) {
        uint256 newS = currentTime + 7 days; // 7 days from current time
        uint256 newT1 = newS + 14 days; // 14 days insurance period
        uint256 newT2 = newT1 + 300; // 5 minutes after T1
        uint256 newT3 = newT2 + 300; // 5 minutes after T2
        
        return NewTimePeriods({
            S: newS,
            T1: newT1,
            T2: newT2,
            T3: newT3
        });
    }
}
