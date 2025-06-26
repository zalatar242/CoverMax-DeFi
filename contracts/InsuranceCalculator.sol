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
     * @return primaryAmounts The amount to withdraw from each adapter in the first attempt.
     * @return remainingAmounts The amount to withdraw from each adapter in the second attempt if the first fails.
     */
    function calculateWithdrawalAmounts(
        uint256 totalToWithdraw,
        uint256 adapterCount
    ) external pure returns (
        uint256[] memory primaryAmounts,
        uint256[] memory remainingAmounts
    ) {
        primaryAmounts = new uint256[](adapterCount);
        remainingAmounts = new uint256[](adapterCount);

        if (totalToWithdraw == 0) return (primaryAmounts, remainingAmounts);

        uint256 baseAmount = totalToWithdraw / adapterCount;
        uint256 remainder = totalToWithdraw % adapterCount;

        for (uint256 i = 0; i < adapterCount; ) {
            primaryAmounts[i] = baseAmount;
            if (i < remainder) {
                primaryAmounts[i]++;
            }
            remainingAmounts[i] = totalToWithdraw;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Calculates tranche amounts for equal split.
     * @param totalAmount The total amount to split.
     * @return aaaAmount The amount for AAA tranche.
     * @return aaAmount The amount for AA tranche.
     */
    function calculateTrancheAmounts(uint256 totalAmount) external pure returns (uint256 aaaAmount, uint256 aaAmount) {
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
        amounts = new uint256[](adapterCount);

        if (totalAmount == 0 || adapterCount == 0) return amounts;

        uint256 amountPerAdapter = totalAmount / adapterCount;
        uint256 remainder = totalAmount % adapterCount;

        for (uint256 i = 0; i < adapterCount; ) {
            amounts[i] = amountPerAdapter;
            if (i < remainder) {
                amounts[i]++;
            }
            unchecked {
                ++i;
            }
        }
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
    function validateTimePeriods(
        uint256 currentTime,
        uint256 S,
        uint256 T1,
        uint256 T2,
        uint256 T3
    ) external pure returns (bool canSplit, bool canClaim, bool needsReset) {
        needsReset = currentTime > T3;
        canSplit = currentTime < S;
        canClaim = currentTime <= S || currentTime > T1;
    }

    /**
     * @dev Calculates new time periods for reset.
     * @param currentTime The current timestamp.
     * @return newS New start time.
     * @return newT1 New T1 time.
     * @return newT2 New T2 time.
     * @return newT3 New T3 time.
     */
    function calculateNewTimePeriods(uint256 currentTime) external pure returns (
        uint256 newS,
        uint256 newT1,
        uint256 newT2,
        uint256 newT3
    ) {
        newS = currentTime + 2 days;
        newT1 = newS + 5 days;
        newT2 = newT1 + 1 days;
        newT3 = newT2 + 1 days;
    }
}
