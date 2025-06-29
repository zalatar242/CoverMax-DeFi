import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MoonwellLendingAdapter, MockERC20, MockMToken } from "../typechain-types";

describe("Moonwell Lending Adapter (Mock)", function() {
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let mockUsdc: MockERC20;
    let mockMToken: MockMToken;
    let moonwellAdapter: MoonwellLendingAdapter;

    const INITIAL_SUPPLY = parseUnits("1000000", 6); // 1M USDC
    const TEST_AMOUNT = parseUnits("100", 6); // 100 USDC

    beforeEach(async function() {
        [owner, user] = await ethers.getSigners();

        // Deploy mock USDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        await mockUsdc.waitForDeployment();

        // Mint USDC to user and adapter for testing
        await mockUsdc.mint(user.address, INITIAL_SUPPLY);

        // Deploy mock mToken
        const MockMToken = await ethers.getContractFactory("MockMToken");
        mockMToken = await MockMToken.deploy(await mockUsdc.getAddress());
        await mockMToken.waitForDeployment();

        // Fund mToken with USDC for withdrawals
        await mockUsdc.mint(await mockMToken.getAddress(), INITIAL_SUPPLY);

        // Deploy Moonwell adapter
        const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
        moonwellAdapter = await MoonwellAdapter.deploy(await mockMToken.getAddress());
        await moonwellAdapter.waitForDeployment();
    });

    it("should deploy with correct mToken address", async function() {
        expect(await moonwellAdapter.mToken()).to.equal(await mockMToken.getAddress());
    });

    it("should deposit USDC into Moonwell", async function() {
        // Approve adapter to spend USDC
        await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT);

        // Check initial balance
        const initialBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
        expect(initialBalance).to.equal(0);

        // Deposit
        await expect(
            moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT)
        ).to.emit(moonwellAdapter, "DepositSuccessful")
         .withArgs(await mockUsdc.getAddress(), TEST_AMOUNT);

        // Check final balance (should be close to TEST_AMOUNT, accounting for exchange rate)
        const finalBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
        expect(finalBalance).to.be.closeTo(TEST_AMOUNT, parseUnits("0.01", 6)); // Within 0.01 USDC

        // Verify user's USDC balance decreased
        const userBalance = await mockUsdc.balanceOf(user.address);
        expect(userBalance).to.equal(INITIAL_SUPPLY - TEST_AMOUNT);
    });


    it("should withdraw USDC from Moonwell", async function() {
        // First deposit
        await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT);
        await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT);

        const initialUserBalance = await mockUsdc.balanceOf(user.address);
        const initialAdapterBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());

        // Withdraw
        await expect(
            moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), TEST_AMOUNT)
        ).to.emit(moonwellAdapter, "WithdrawSuccessful")
         .withArgs(await mockUsdc.getAddress(), TEST_AMOUNT);

        // Check balances
        const finalUserBalance = await mockUsdc.balanceOf(user.address);
        const finalAdapterBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());

        expect(finalUserBalance).to.equal(initialUserBalance + TEST_AMOUNT);
        expect(finalAdapterBalance).to.be.closeTo(0, parseUnits("0.01", 6)); // Close to 0 due to rounding
    });

    it("should revert on deposit with zero amount", async function() {
        await expect(
            moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), 0)
        ).to.be.revertedWithCustomError(moonwellAdapter, "AmountTooLow");
    });

    it("should revert on withdraw with zero amount", async function() {
        await expect(
            moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), 0)
        ).to.be.revertedWithCustomError(moonwellAdapter, "AmountTooLow");
    });

    it("should revert on withdraw with insufficient balance", async function() {
        await expect(
            moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), TEST_AMOUNT)
        ).to.be.revertedWithCustomError(moonwellAdapter, "WithdrawFailed");
    });

    describe("Additional Edge Cases", function() {
        it("should handle multiple deposits and withdrawals", async function() {
            const firstDeposit = parseUnits("50", 6);
            const secondDeposit = parseUnits("75", 6);

            // First deposit
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), firstDeposit);
            await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), firstDeposit);

            let balance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(balance).to.be.closeTo(firstDeposit, parseUnits("0.01", 6));

            // Second deposit
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), secondDeposit);
            await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), secondDeposit);

            balance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(balance).to.be.closeTo(firstDeposit + secondDeposit, parseUnits("0.02", 6));

            // Partial withdrawal
            const withdrawAmount = parseUnits("30", 6);
            await moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), withdrawAmount);

            balance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(balance).to.be.closeTo(firstDeposit + secondDeposit - withdrawAmount, parseUnits("0.03", 6));
        });

        it("should handle different users independently", async function() {
            const [, , user2] = await ethers.getSigners();

            // Setup second user
            await mockUsdc.mint(user2.address, INITIAL_SUPPLY);

            const user1Amount = parseUnits("100", 6);
            const user2Amount = parseUnits("200", 6);

            // User 1 deposits
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), user1Amount);
            await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), user1Amount);

            // User 2 deposits
            await mockUsdc.connect(user2).approve(await moonwellAdapter.getAddress(), user2Amount);
            await moonwellAdapter.connect(user2).deposit(await mockUsdc.getAddress(), user2Amount);

            // Check total balance reflects both deposits
            const totalBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(totalBalance).to.be.closeTo(user1Amount + user2Amount, parseUnits("0.03", 6));
        });

        it("should handle zero balance correctly", async function() {
            const balance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(balance).to.equal(0);
        });

        it("should handle very large amounts", async function() {
            const largeAmount = parseUnits("100000", 6); // 100k USDC

            // Mint large amount to user and mToken
            await mockUsdc.mint(user.address, largeAmount);
            await mockUsdc.mint(await mockMToken.getAddress(), largeAmount);

            // Approve and deposit large amount
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), largeAmount);
            await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), largeAmount);

            const balance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(balance).to.be.closeTo(largeAmount, parseUnits("1", 6)); // 1 USDC tolerance

            // Withdraw large amount
            await moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), largeAmount);

            const finalBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(finalBalance).to.be.closeTo(0, parseUnits("1", 6));
        });

        it("should revert on deposit with insufficient allowance", async function() {
            // Don't approve enough tokens
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT - 1n);

            await expect(
                moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT)
            ).to.be.reverted; // Will revert due to insufficient allowance
        });

        it("should revert on deposit with insufficient balance", async function() {
            const excessiveAmount = INITIAL_SUPPLY + 1n;

            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), excessiveAmount);

            await expect(
                moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), excessiveAmount)
            ).to.be.reverted; // Will revert due to insufficient balance
        });
    });

    describe("Integration Scenarios", function() {
        it("should handle complete deposit-withdraw cycle", async function() {
            const initialUserBalance = await mockUsdc.balanceOf(user.address);

            // Approve and deposit
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT);
            await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT);

            // Verify deposit
            let adapterBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(adapterBalance).to.be.closeTo(TEST_AMOUNT, parseUnits("0.01", 6));

            let userBalance = await mockUsdc.balanceOf(user.address);
            expect(userBalance).to.equal(initialUserBalance - TEST_AMOUNT);

            // Withdraw all
            await moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), TEST_AMOUNT);

            // Verify withdrawal
            adapterBalance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());
            expect(adapterBalance).to.be.closeTo(0, parseUnits("0.01", 6));

            userBalance = await mockUsdc.balanceOf(user.address);
            expect(userBalance).to.equal(initialUserBalance);
        });

        it("should emit events correctly", async function() {
            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT);

            // Test deposit event
            await expect(
                moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT)
            ).to.emit(moonwellAdapter, "DepositSuccessful")
             .withArgs(await mockUsdc.getAddress(), TEST_AMOUNT);

            // Test withdraw event
            await expect(
                moonwellAdapter.connect(user).withdraw(await mockUsdc.getAddress(), TEST_AMOUNT)
            ).to.emit(moonwellAdapter, "WithdrawSuccessful")
             .withArgs(await mockUsdc.getAddress(), TEST_AMOUNT);
        });

        it("should handle exchange rate variations", async function() {
            // This test simulates how Moonwell mTokens work with exchange rates
            const initialDeposit = parseUnits("100", 6);

            await mockUsdc.connect(user).approve(await moonwellAdapter.getAddress(), initialDeposit);
            await moonwellAdapter.connect(user).deposit(await mockUsdc.getAddress(), initialDeposit);

            const balance = await moonwellAdapter.getBalance(await mockUsdc.getAddress());

            // In a real scenario, the balance might be slightly different due to exchange rates
            // For mocks, we expect it to be very close to the deposited amount
            expect(balance).to.be.closeTo(initialDeposit, parseUnits("0.1", 6));
        });
    });

});
