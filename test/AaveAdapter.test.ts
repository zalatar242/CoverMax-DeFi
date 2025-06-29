import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AaveLendingAdapter, MockERC20, MockAavePool, MockAToken, MockAavePoolDataProvider } from "../typechain-types";

describe("Aave Lending Adapter (Mock)", function() {
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let mockUsdc: MockERC20;
    let mockAavePool: MockAavePool;
    let mockAToken: MockAToken;
    let mockDataProvider: MockAavePoolDataProvider;
    let aaveAdapter: AaveLendingAdapter;

    const INITIAL_SUPPLY = parseUnits("1000000", 6); // 1M USDC
    const TEST_AMOUNT = parseUnits("100", 6); // 100 USDC

    beforeEach(async function() {
        [owner, user] = await ethers.getSigners();

        // Deploy mock USDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        await mockUsdc.waitForDeployment();

        // Mint USDC to user
        await mockUsdc.mint(user.address, INITIAL_SUPPLY);

        // Deploy mock aToken
        const MockAToken = await ethers.getContractFactory("MockAToken");
        mockAToken = await MockAToken.deploy(await mockUsdc.getAddress());
        await mockAToken.waitForDeployment();

        // Deploy mock Aave pool
        const MockAavePool = await ethers.getContractFactory("MockAavePool");
        mockAavePool = await MockAavePool.deploy(await mockUsdc.getAddress());
        await mockAavePool.waitForDeployment();

        // Set aToken in pool
        await mockAavePool.setAToken(await mockUsdc.getAddress(), await mockAToken.getAddress());

        // Deploy mock data provider
        const MockAavePoolDataProvider = await ethers.getContractFactory("MockAavePoolDataProvider");
        mockDataProvider = await MockAavePoolDataProvider.deploy(
            await mockUsdc.getAddress(),
            await mockAToken.getAddress()
        );
        await mockDataProvider.waitForDeployment();

        // Deploy Aave adapter with mock contracts
        const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
        aaveAdapter = await AaveAdapter.deploy(
            await mockAavePool.getAddress(),
            await mockDataProvider.getAddress()
        );
        await aaveAdapter.waitForDeployment();
    });

    it("should deploy with correct addresses", async function() {
        expect(await aaveAdapter.aavePool()).to.equal(await mockAavePool.getAddress());
        expect(await aaveAdapter.poolDataProvider()).to.equal(await mockDataProvider.getAddress());
    });

    it("should deposit USDC into Aave", async function() {
        // Approve adapter to spend USDC
        await mockUsdc.connect(user).approve(await aaveAdapter.getAddress(), TEST_AMOUNT);

        // Check initial balance
        const initialBalance = await aaveAdapter.getBalance(await mockUsdc.getAddress());
        expect(initialBalance).to.equal(0);

        // Deposit
        await expect(
            aaveAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT)
        ).to.emit(aaveAdapter, "DepositSuccessful")
         .withArgs(await mockUsdc.getAddress(), TEST_AMOUNT);

        // Check final balance
        const finalBalance = await aaveAdapter.getBalance(await mockUsdc.getAddress());
        expect(finalBalance).to.be.closeTo(TEST_AMOUNT, 10); // Allow small variance due to mock interest

        // Verify user's USDC balance decreased
        const userBalance = await mockUsdc.balanceOf(user.address);
        expect(userBalance).to.equal(INITIAL_SUPPLY - TEST_AMOUNT);
    });


    it("should withdraw USDC from Aave", async function() {
        // First deposit
        await mockUsdc.connect(user).approve(await aaveAdapter.getAddress(), TEST_AMOUNT);
        await aaveAdapter.connect(user).deposit(await mockUsdc.getAddress(), TEST_AMOUNT);

        const initialUserBalance = await mockUsdc.balanceOf(user.address);
        const initialAdapterBalance = await aaveAdapter.getBalance(await mockUsdc.getAddress());

        // Withdraw
        await expect(
            aaveAdapter.connect(user).withdraw(await mockUsdc.getAddress(), TEST_AMOUNT)
        ).to.emit(aaveAdapter, "WithdrawSuccessful")
         .withArgs(await mockUsdc.getAddress(), TEST_AMOUNT);

        // Check balances
        const finalUserBalance = await mockUsdc.balanceOf(user.address);
        const finalAdapterBalance = await aaveAdapter.getBalance(await mockUsdc.getAddress());

        expect(finalUserBalance).to.equal(initialUserBalance + TEST_AMOUNT);
        expect(finalAdapterBalance).to.equal(0);
    });

    it("should revert on deposit with zero amount", async function() {
        await expect(
            aaveAdapter.connect(user).deposit(await mockUsdc.getAddress(), 0)
        ).to.be.revertedWithCustomError(aaveAdapter, "AmountTooLow");
    });

    it("should revert on withdraw with zero amount", async function() {
        await expect(
            aaveAdapter.connect(user).withdraw(await mockUsdc.getAddress(), 0)
        ).to.be.revertedWithCustomError(aaveAdapter, "AmountTooLow");
    });

    it("should revert on withdraw with insufficient balance", async function() {
        await expect(
            aaveAdapter.connect(user).withdraw(await mockUsdc.getAddress(), TEST_AMOUNT)
        ).to.be.revertedWithCustomError(aaveAdapter, "WithdrawFailed");
    });

});
