import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  InsuranceCore,
  InsuranceAdapterManager,
  InsuranceCalculator,
  InsuranceTimeManager,
  InsuranceClaimManager,
  IERC20,
  AaveLendingAdapter,
  Tranche,
  MockUSDC,
  MockAToken
} from "../typechain-types";

// Import chai matchers for hardhat
import "@nomicfoundation/hardhat-chai-matchers";

describe("Modular Insurance - Comprehensive Tests", function () {
  // Contract instances
  let insuranceCore: InsuranceCore;
  let adapterManager: InsuranceAdapterManager;
  let calculator: InsuranceCalculator;
  let timeManager: InsuranceTimeManager;
  let claimManager: InsuranceClaimManager;
  let usdc: IERC20 | MockUSDC;
  let aaveAdapter: AaveLendingAdapter;
  let trancheAAA: Tranche;
  let trancheAA: Tranche;
  let mockAave: MockAToken;

  // Signers
  let deployer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  // Constants for time periods
  const ISSUANCE_PERIOD = 7 * 24 * 60 * 60; // 7 days
  const INSURANCE_PERIOD = 14 * 24 * 60 * 60; // 14 days

  // Helper function to advance time
  const advanceTime = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  };

  before(async function () {
    [deployer, attacker, user] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // Deploy Mock Aave Token
    const MockATokenFactory = await ethers.getContractFactory("MockAToken");
    mockAave = await MockATokenFactory.deploy(await usdc.getAddress());
    await mockAave.waitForDeployment();

    // Deploy Core Contracts
    // Deploy Calculator
    const CalculatorFactory = await ethers.getContractFactory("InsuranceCalculator");
    calculator = await CalculatorFactory.deploy();
    await calculator.waitForDeployment();

    // Deploy Adapter Manager
    const AdapterManagerFactory = await ethers.getContractFactory("InsuranceAdapterManager");
    adapterManager = await AdapterManagerFactory.deploy();
    await adapterManager.waitForDeployment();

    // Deploy Time Manager
    const TimeManagerFactory = await ethers.getContractFactory("InsuranceTimeManager");
    timeManager = await TimeManagerFactory.deploy();
    await timeManager.waitForDeployment();

    // Deploy Claim Manager
    const ClaimManagerFactory = await ethers.getContractFactory("InsuranceClaimManager");
    claimManager = await ClaimManagerFactory.deploy();
    await claimManager.waitForDeployment();

    // Deploy Insurance Core
    const InsuranceCoreFactory = await ethers.getContractFactory("InsuranceCore");
    insuranceCore = await InsuranceCoreFactory.deploy();
    await insuranceCore.waitForDeployment();

    // Calculate time periods using blockchain time
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock!.timestamp;
    const S = currentTime + ISSUANCE_PERIOD;
    const T1 = S + INSURANCE_PERIOD;
    const T2 = T1 + 300; // 5 minutes after T1
    const T3 = T2 + 300; // 5 minutes after T2

    // Initialize contracts

    // Initialize Time Manager
    await timeManager.initialize(await insuranceCore.getAddress(), await claimManager.getAddress());
    await timeManager.setTimePeriods(S, T1, T2, T3);

    // Initialize Adapter Manager
    await adapterManager.initialize(await insuranceCore.getAddress(), await usdc.getAddress());
    await adapterManager.setClaimManager(await claimManager.getAddress());

    // Initialize Claim Manager (skip for now, will reinitialize after tranches are created)

    // Initialize Insurance Core
    await insuranceCore.initialize(
      await usdc.getAddress(),
      await adapterManager.getAddress(),
      await timeManager.getAddress(),
      await claimManager.getAddress()
    );

    // Deploy Tranche tokens
    const TrancheFactory = await ethers.getContractFactory("Tranche");
    trancheAAA = await TrancheFactory.deploy("AAA Tranche", "AAA");
    trancheAA = await TrancheFactory.deploy("AA Tranche", "AA");

    await trancheAAA.waitForDeployment();
    await trancheAA.waitForDeployment();

    // Keep ownership of tranche tokens with InsuranceCore (they are already owned by deployer)
    // Transfer ownership to Insurance Core so it can mint and burn
    await trancheAAA.transferOwnership(await insuranceCore.getAddress());
    await trancheAA.transferOwnership(await insuranceCore.getAddress());

    // Set tranches in Insurance Core
    await insuranceCore.setTranches(await trancheAAA.getAddress(), await trancheAA.getAddress());

    // Initialize Claim Manager with tranche addresses
    await claimManager.initialize(
      await insuranceCore.getAddress(),
      await trancheAAA.getAddress(),
      await trancheAA.getAddress(),
      await usdc.getAddress(),
      await adapterManager.getAddress(),
      await calculator.getAddress(),
      await timeManager.getAddress()
    );

    // Deploy Aave Adapter - note: constructor expects (aavePool, poolDataProvider)
    const AaveAdapterFactory = await ethers.getContractFactory("AaveLendingAdapter");
    aaveAdapter = await AaveAdapterFactory.deploy(
      await mockAave.getAddress(),  // aavePool
      await mockAave.getAddress()   // poolDataProvider (use same mock for both)
    );
    await aaveAdapter.waitForDeployment();

    // Add adapter to manager
    await adapterManager.addLendingAdapter(await aaveAdapter.getAddress());
    // Mint tokens to test accounts
    const mockUSDC = usdc as MockUSDC;
    await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6)); // 1M USDC
    await mockUSDC.mint(attacker.address, ethers.parseUnits("1000", 6));   // 1K USDC
    await mockUSDC.mint(user.address, ethers.parseUnits("1000", 6));       // 1K USDC


    // Approve Insurance Core to spend USDC
    const maxApproval = ethers.parseUnits("1000000", 6);
    await usdc.connect(attacker).approve(await insuranceCore.getAddress(), maxApproval);
    await usdc.connect(user).approve(await insuranceCore.getAddress(), maxApproval);
    await usdc.connect(deployer).approve(await insuranceCore.getAddress(), maxApproval);

  });

  describe("🏗️ Deployment & Initialization", function () {
    it("Should have correct initial state", async function () {
      const info = await insuranceCore.getInfo();
      expect(info[0]).to.equal(deployer.address); // owner
      expect(info[1]).to.equal(await usdc.getAddress()); // usdc
      expect(info[2]).to.be.true; // initialized
      expect(info[7]).to.equal(0); // totalTranches
      expect(info[8]).to.equal(0); // totalInvested
    });

    it("Should connect modular components correctly", async function () {
      expect(await timeManager.insuranceCore()).to.equal(await insuranceCore.getAddress());
      expect(await claimManager.insuranceCore()).to.equal(await insuranceCore.getAddress());
      expect(await adapterManager.insuranceCore()).to.equal(await insuranceCore.getAddress());
    });

    it("Should set correct time periods", async function () {
      const [S, T1, T2, T3] = await timeManager.getTimePeriods();
      expect(S).to.be.gt(0);
      expect(T1).to.be.gt(S);
      expect(T2).to.be.gt(T1);
      expect(T3).to.be.gt(T2);
    });
  });

  describe("⚖️ Risk Management", function () {
    it("Should handle risk splitting correctly", async function () {
      const amount = ethers.parseUnits("100", 6);

      const initialAAABalance = await trancheAAA.balanceOf(user.address);
      const initialAABalance = await trancheAA.balanceOf(user.address);

      await insuranceCore.connect(user).splitRisk(amount);

      // Check tranche tokens were minted
      const expectedTrancheAmount = amount / 2n;
      expect(await trancheAAA.balanceOf(user.address)).to.equal(initialAAABalance + expectedTrancheAmount);
      expect(await trancheAA.balanceOf(user.address)).to.equal(initialAABalance + expectedTrancheAmount);
    });

    it("Should prevent invalid amounts", async function () {
      // Too small
      await expect(insuranceCore.connect(user).splitRisk(ethers.parseUnits("1", 6)))
        .to.be.revertedWith("Insurance: amount too low");

      // Odd amount (101.000001 USDC = 101000001 wei, which is odd)
      await expect(insuranceCore.connect(user).splitRisk(101000001))
        .to.be.revertedWith("Insurance: Amount must be divisible by 2");
    });

    it("Should prevent risk splitting after issuance period", async function () {
      // Advance time past issuance period
      await advanceTime(ISSUANCE_PERIOD + 1);

      const amount = ethers.parseUnits("100", 6);
      await expect(insuranceCore.connect(user).splitRisk(amount))
        .to.be.revertedWith("Insurance: issuance ended");
    });
  });

  describe("💸 Claims Processing", function () {
    beforeEach(async function () {
      // Reset time periods to allow splitRisk again
      await timeManager.forceResetTime();

      // Reset to initial state and do a splitRisk
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(user).splitRisk(amount);

      // Prepare state for test
      const totalInvested = await insuranceCore.totalInvested();
    });

    it("Should allow claiming before insurance period", async function () {
      const aaaAmount = ethers.parseUnits("25", 6);
      const aaAmount = ethers.parseUnits("25", 6);

      const initialUsdcBalance = await usdc.balanceOf(user.address);

      await insuranceCore.connect(user).claim(aaaAmount, aaAmount);

      // Check USDC was returned
      const finalUsdcBalance = await usdc.balanceOf(user.address);
      expect(finalUsdcBalance).to.be.gte(initialUsdcBalance);

      // Check tranche tokens were burned
      expect(await trancheAAA.balanceOf(user.address)).to.equal(ethers.parseUnits("75", 6));
      expect(await trancheAA.balanceOf(user.address)).to.equal(ethers.parseUnits("75", 6));
    });

    it("Should handle claimAll function correctly", async function () {
      const initialUsdcBalance = await usdc.balanceOf(user.address);

      await insuranceCore.connect(user).claimAll();

      // Check all tranche tokens were burned
      expect(await trancheAAA.balanceOf(user.address)).to.equal(0);
      expect(await trancheAA.balanceOf(user.address)).to.equal(0);

      // Check USDC was returned
      const finalUsdcBalance = await usdc.balanceOf(user.address);
      expect(finalUsdcBalance).to.be.gte(initialUsdcBalance);
    });
  });

  describe("🔐 Access Control", function () {
    it("Should prevent unauthorized function calls", async function () {
      await expect(insuranceCore.connect(attacker).setTranches(ethers.ZeroAddress, ethers.ZeroAddress))
        .to.be.revertedWith("Insurance: not owner");
    });
  });

  describe("🔍 View Functions & Edge Cases", function () {
    it("Should return correct user deposit for getUserDeposit", async function () {
      // Reset time periods to allow splitRisk again
      await timeManager.forceResetTime();

      const amount = ethers.parseUnits("100", 6);

      // Use a fresh address that hasn't participated in any previous tests
      const [, , , freshUser] = await ethers.getSigners();

      // Give fresh user some USDC and approve
      await usdc.transfer(freshUser.address, amount);
      await usdc.connect(freshUser).approve(await insuranceCore.getAddress(), amount);

      // Initially should be 0
      expect(await insuranceCore.getUserDeposit(freshUser.address)).to.equal(0);

      // After splitRisk should equal the deposited amount
      await insuranceCore.connect(freshUser).splitRisk(amount);
      expect(await insuranceCore.getUserDeposit(freshUser.address)).to.equal(amount);
    });

  });

  describe("🛡️ Error Handling", function () {
    it("Should prevent double initialization", async function () {
      await expect(insuranceCore.initialize(
        await usdc.getAddress(),
        await adapterManager.getAddress(),
        await timeManager.getAddress(),
        await claimManager.getAddress()
      )).to.be.revertedWith("Insurance: already initialized");
    });

    it("Should prevent setting tranches twice", async function () {
      await expect(insuranceCore.setTranches(await trancheAAA.getAddress(), await trancheAA.getAddress()))
        .to.be.revertedWith("Insurance: tranches already set");
    });

    it("Should handle claimAll with zero balance gracefully", async function () {
      await expect(insuranceCore.connect(attacker).claimAll())
        .to.be.revertedWith("Insurance: No AAA or AA tokens to claim");
    });
  });
});
