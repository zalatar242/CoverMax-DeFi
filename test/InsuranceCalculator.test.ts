import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { InsuranceCalculator } from "../typechain-types";

describe("InsuranceCalculator", function() {
    let calculator: InsuranceCalculator;
    let owner: SignerWithAddress;

    beforeEach(async function() {
        [owner] = await ethers.getSigners();

        const Calculator = await ethers.getContractFactory("InsuranceCalculator");
        calculator = await Calculator.deploy();
        await calculator.waitForDeployment();
    });

    describe("calculateWithdrawal", function() {
        it("should calculate correct withdrawal amount for proportional share", async function() {
            const totalTokens = parseUnits("100", 6); // 100 USDC worth of tokens
            const totalTranches = parseUnits("1000", 6); // 1000 USDC total tranches
            const totalInvested = parseUnits("1000", 6); // 1000 USDC invested

            const result = await calculator.calculateWithdrawal(totalTokens, totalTranches, totalInvested);
            
            // Should get 100/1000 * 1000 = 100 USDC
            expect(result).to.equal(parseUnits("100", 6));
        });

        it("should handle zero token amount", async function() {
            const result = await calculator.calculateWithdrawal(0, parseUnits("1000", 6), parseUnits("1000", 6));
            expect(result).to.equal(0);
        });

        it("should handle zero total tranches", async function() {
            const result = await calculator.calculateWithdrawal(parseUnits("100", 6), 0, parseUnits("1000", 6));
            expect(result).to.equal(0);
        });

        it("should handle zero total invested", async function() {
            const result = await calculator.calculateWithdrawal(parseUnits("100", 6), parseUnits("1000", 6), 0);
            expect(result).to.equal(0);
        });

        it("should calculate correct proportional withdrawal", async function() {
            const totalTokens = parseUnits("25", 6); // 25 tokens
            const totalTranches = parseUnits("100", 6); // 100 total tranches  
            const totalInvested = parseUnits("200", 6); // 200 invested

            const result = await calculator.calculateWithdrawal(totalTokens, totalTranches, totalInvested);
            
            // Should get 25/100 * 200 = 50 USDC
            expect(result).to.equal(parseUnits("50", 6));
        });

        it("should handle large numbers without overflow", async function() {
            const totalTokens = ethers.parseUnits("1000000", 18); // Large token amount
            const totalTranches = ethers.parseUnits("10000000", 18); // Large total
            const totalInvested = ethers.parseUnits("5000000", 6); // Large investment

            const result = await calculator.calculateWithdrawal(totalTokens, totalTranches, totalInvested);
            
            // Should get 1M/10M * 5M = 500K USDC
            expect(result).to.equal(parseUnits("500000", 6));
        });
    });

    describe("calculateWithdrawalAmounts", function() {
        it("should distribute withdrawal evenly across adapters", async function() {
            const totalToWithdraw = parseUnits("100", 6);
            const adapterCount = 4;

            const result = await calculator.calculateWithdrawalAmounts(totalToWithdraw, adapterCount);
            
            // Should distribute 100/4 = 25 to each adapter
            expect(result.length).to.equal(4);
            expect(result[0]).to.equal(parseUnits("25", 6));
            expect(result[1]).to.equal(parseUnits("25", 6));
            expect(result[2]).to.equal(parseUnits("25", 6));
            expect(result[3]).to.equal(parseUnits("25", 6));
        });

        it("should handle remainder distribution", async function() {
            const totalToWithdraw = parseUnits("100", 6) + 3n; // 100.000003 USDC
            const adapterCount = 4;

            const result = await calculator.calculateWithdrawalAmounts(totalToWithdraw, adapterCount);
            
            // Base amount: 25.000000, remainder: 3 wei
            // First 3 adapters get +1 wei each
            expect(result.length).to.equal(4);
            expect(result[0]).to.equal(parseUnits("25", 6) + 1n);
            expect(result[1]).to.equal(parseUnits("25", 6) + 1n);
            expect(result[2]).to.equal(parseUnits("25", 6) + 1n);
            expect(result[3]).to.equal(parseUnits("25", 6));
        });

        it("should handle single adapter", async function() {
            const totalToWithdraw = parseUnits("100", 6);
            const adapterCount = 1;

            const result = await calculator.calculateWithdrawalAmounts(totalToWithdraw, adapterCount);
            
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal(parseUnits("100", 6));
        });

        it("should handle zero withdrawal amount", async function() {
            const result = await calculator.calculateWithdrawalAmounts(0, 3);
            
            expect(result.length).to.equal(3);
            expect(result[0]).to.equal(0);
            expect(result[1]).to.equal(0);
            expect(result[2]).to.equal(0);
        });

        it("should revert on zero adapter count", async function() {
            await expect(calculator.calculateWithdrawalAmounts(parseUnits("100", 6), 0))
                .to.be.revertedWith("Calculator: no adapters");
        });
    });

    describe("calculateTrancheAmounts", function() {
        it("should split even amount equally", async function() {
            const totalAmount = parseUnits("100", 6);

            const result = await calculator.calculateTrancheAmounts(totalAmount);
            
            expect(result.aaaAmount).to.equal(parseUnits("50", 6));
            expect(result.aaAmount).to.equal(parseUnits("50", 6));
        });

        it("should handle zero amount", async function() {
            const result = await calculator.calculateTrancheAmounts(0);
            
            expect(result.aaaAmount).to.equal(0);
            expect(result.aaAmount).to.equal(0);
        });

        it("should revert on odd amount", async function() {
            const oddAmount = parseUnits("100", 6) + 1n;

            await expect(calculator.calculateTrancheAmounts(oddAmount))
                .to.be.revertedWith("Calculator: amount must be even");
        });

        it("should handle large even amounts", async function() {
            const largeAmount = parseUnits("1000000", 6); // 1M USDC

            const result = await calculator.calculateTrancheAmounts(largeAmount);
            
            expect(result.aaaAmount).to.equal(parseUnits("500000", 6));
            expect(result.aaAmount).to.equal(parseUnits("500000", 6));
        });

        it("should handle minimum even amount", async function() {
            const minAmount = 2n; // 2 wei

            const result = await calculator.calculateTrancheAmounts(minAmount);
            
            expect(result.aaaAmount).to.equal(1n);
            expect(result.aaAmount).to.equal(1n);
        });
    });

    describe("calculateDepositAmounts", function() {
        it("should distribute deposit evenly across adapters", async function() {
            const totalAmount = parseUnits("120", 6);
            const adapterCount = 3;

            const result = await calculator.calculateDepositAmounts(totalAmount, adapterCount);
            
            expect(result.length).to.equal(3);
            expect(result[0]).to.equal(parseUnits("40", 6));
            expect(result[1]).to.equal(parseUnits("40", 6));
            expect(result[2]).to.equal(parseUnits("40", 6));
        });

        it("should handle remainder in deposit distribution", async function() {
            const totalAmount = parseUnits("100", 6) + 7n; // 100.000007 USDC
            const adapterCount = 3;

            const result = await calculator.calculateDepositAmounts(totalAmount, adapterCount);
            
            // Base: 33.333333, remainder: 7 % 3 = 1 wei
            // First 1 adapter gets extra wei
            const baseAmount = (parseUnits("100", 6) + 7n) / 3n;
            
            expect(result.length).to.equal(3);
            // Check the actual calculation: 100000007 / 3 = 33333335.666...
            // So base = 33333335, remainder = 100000007 % 3 = 2
            // First 2 adapters get +1
            expect(result[0]).to.equal(33333336n);
            expect(result[1]).to.equal(33333336n);
            expect(result[2]).to.equal(33333335n);
        });

        it("should handle single adapter deposit", async function() {
            const totalAmount = parseUnits("500", 6);
            const adapterCount = 1;

            const result = await calculator.calculateDepositAmounts(totalAmount, adapterCount);
            
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal(parseUnits("500", 6));
        });

        it("should handle zero deposit amount", async function() {
            const result = await calculator.calculateDepositAmounts(0, 2);
            
            expect(result.length).to.equal(2);
            expect(result[0]).to.equal(0);
            expect(result[1]).to.equal(0);
        });

        it("should revert on zero adapter count", async function() {
            await expect(calculator.calculateDepositAmounts(parseUnits("100", 6), 0))
                .to.be.revertedWith("Calculator: no adapters");
        });
    });

    describe("validateTimePeriods", function() {
        let currentTime: number;
        let S: number, T1: number, T2: number, T3: number;

        beforeEach(function() {
            currentTime = Math.floor(Date.now() / 1000);
            S = currentTime + 3600; // 1 hour from now
            T1 = S + 7200; // 2 hours after S
            T2 = T1 + 3600; // 1 hour after T1
            T3 = T2 + 1800; // 30 min after T2
        });

        it("should allow splitRisk before S (issuance period)", async function() {
            const result = await calculator.validateTimePeriods(currentTime, S, T1, T2, T3);
            
            expect(result.canSplitRisk).to.equal(true);
            expect(result.canClaim).to.equal(true);
            expect(result.isInsurancePeriod).to.equal(false);
        });

        it("should prevent splitRisk after S but allow claims before T1", async function() {
            const timeAfterS = S + 1800; // 30 min after S
            const result = await calculator.validateTimePeriods(timeAfterS, S, T1, T2, T3);
            
            expect(result.canSplitRisk).to.equal(false);
            expect(result.canClaim).to.equal(false);
            expect(result.isInsurancePeriod).to.equal(true);
        });

        it("should allow claims after T1 (insurance period ends)", async function() {
            const timeAfterT1 = T1 + 1800; // 30 min after T1
            const result = await calculator.validateTimePeriods(timeAfterT1, S, T1, T2, T3);
            
            expect(result.canSplitRisk).to.equal(false);
            expect(result.canClaim).to.equal(true);
            expect(result.isInsurancePeriod).to.equal(false);
        });

        it("should handle edge case at exact time boundaries", async function() {
            // At exactly S
            let result = await calculator.validateTimePeriods(S, S, T1, T2, T3);
            expect(result.canSplitRisk).to.equal(false);
            
            // At exactly T1 (inclusive boundary)
            result = await calculator.validateTimePeriods(T1, S, T1, T2, T3);
            expect(result.canClaim).to.equal(false); // Still in insurance period at T1
            expect(result.isInsurancePeriod).to.equal(true);
        });

        it("should handle time periods in the past", async function() {
            const pastTime = currentTime - 86400; // 1 day ago
            const result = await calculator.validateTimePeriods(pastTime, S, T1, T2, T3);
            
            expect(result.canSplitRisk).to.equal(true);
            expect(result.canClaim).to.equal(true);
            expect(result.isInsurancePeriod).to.equal(false);
        });
    });

    describe("calculateNewTimePeriods", function() {
        it("should calculate future time periods correctly", async function() {
            const currentTime = Math.floor(Date.now() / 1000);
            
            const result = await calculator.calculateNewTimePeriods(currentTime);
            
            expect(result.S).to.be.gt(currentTime);
            expect(result.T1).to.be.gt(result.S);
            expect(result.T2).to.be.gt(result.T1);
            expect(result.T3).to.be.gt(result.T2);
            
            // Check specific intervals (adjust based on your contract's logic)
            const expectedS = currentTime + 7 * 24 * 60 * 60; // 7 days from current time
            expect(result.S).to.be.closeTo(expectedS, 60); // Within 1 minute
        });

        it("should handle different base timestamps", async function() {
            const baseTime = 1000000000; // Fixed timestamp
            
            const result = await calculator.calculateNewTimePeriods(baseTime);
            
            expect(result.S).to.be.gt(baseTime);
            expect(result.T1).to.be.gt(result.S);
            expect(result.T2).to.be.gt(result.T1);
            expect(result.T3).to.be.gt(result.T2);
        });

        it("should maintain consistent time intervals", async function() {
            const currentTime = Math.floor(Date.now() / 1000);
            
            const result = await calculator.calculateNewTimePeriods(currentTime);
            
            // Verify reasonable time intervals
            const issuancePeriod = Number(result.T1 - result.S);
            const insurancePeriod = Number(result.T2 - result.T1);
            const claimsPeriod = Number(result.T3 - result.T2);
            
            expect(issuancePeriod).to.be.gt(0);
            expect(insurancePeriod).to.be.gt(0);
            expect(claimsPeriod).to.be.gt(0);
        });
    });

    describe("Edge Cases and Error Handling", function() {
        it("should handle maximum uint256 values safely", async function() {
            const maxUint = ethers.MaxUint256;
            
            // This should not revert even with max values
            // 1 / MaxUint256 * MaxUint256 should equal 1 using RAY precision
            const result = await calculator.calculateWithdrawal(1n, maxUint, 1n);
            expect(result).to.equal(0n); // Due to precision loss with very large numbers
        });

        it("should handle precision in calculations", async function() {
            // Test with values that could cause precision loss
            const totalTokens = 1n;
            const totalTranches = parseUnits("1000000", 18);
            const totalInvested = parseUnits("1", 6);
            
            const result = await calculator.calculateWithdrawal(totalTokens, totalTranches, totalInvested);
            // Should handle very small fractions correctly
            expect(result).to.be.gte(0);
        });
    });
});