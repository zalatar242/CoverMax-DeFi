import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  InsuranceCore,
  InsuranceAdapterManager,
  InsuranceCalculator,
  IERC20,
  AaveLendingAdapter,
  Tranche,
  MockUSDC,
  MockAToken
} from "../typechain-types";
import { networks } from "../config/addresses";

// Import chai matchers for hardhat
import "@nomicfoundation/hardhat-chai-matchers";

describe("Modular Insurance - Comprehensive Tests", function () {
  // Contract instances
  let insuranceCore: InsuranceCore;
  let adapterManager: InsuranceAdapterManager;
  let calculator: InsuranceCalculator;
  let usdc: IERC20 | MockUSDC;
  let aaveAdapter: AaveLendingAdapter;
  let trancheAAA: Tranche;
  let trancheAA: Tranche;
  let mockAave: MockAToken;

  // Signers
  let deployer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let whale: HardhatEthersSigner;

  // Test configuration
  const isForking = process.env.FORK_ENABLED === 'true';
  const networkConfig = isForking ? networks.mainnet : null;

  // Constants for time periods (simplified for Polkadot compatibility)
  const DAY = 24 * 60 * 60;
  const ISSUANCE_PERIOD = 300; // 5 minutes for testing
  const INSURANCE_PERIOD = 600; // 10 minutes for testing

  // Helper function to advance time
  const advanceTime = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  };

  // Helper functions for snapshots (mainnet fork only)
  let snapshotId: string;
  const takeSnapshot = async () => {
    if (isForking) {
      return await ethers.provider.send("evm_snapshot", []);
    }
    return "";
  };
  const restoreSnapshot = async (id: string) => {
    if (isForking && id) {
      await ethers.provider.send("evm_revert", [id]);
    }
  };

  before(async function() {
    this.timeout(180000); // 3 minute timeout for deployment

    [deployer, attacker, user] = await ethers.getSigners();

    console.log("\n🚀 Modular Insurance Comprehensive Test Setup");
    console.log("===============================================");
    console.log("Network Mode:", isForking ? "Mainnet Fork" : "Local/AssetHub");
    console.log("Deployer:", deployer.address);

    if (isForking) {
      await setupMainnetFork();
    } else {
      await setupLocalNetwork();
    }

    await deployAndInitializeContracts();
    await setupTestAccounts();

    // Take initial snapshot for mainnet fork
    if (isForking) {
      snapshotId = await takeSnapshot();
    }
  });

  beforeEach(async function() {
    if (isForking) {
      // Restore to initial state before each test
      await restoreSnapshot(snapshotId);
      // Take a new snapshot for the next test
      snapshotId = await takeSnapshot();
    }
  });

  async function setupMainnetFork() {
    if (!networkConfig) {
      throw new Error("Network config not available for mainnet fork");
    }

    const { USDC_ADDRESS, AAVE_V3_POOL, AAVE_DATA_PROVIDER, USDC_WHALE } = networkConfig;

    // Get USDC contract
    usdc = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      USDC_ADDRESS
    ) as unknown as IERC20;

    // Setup whale account
    await ethers.provider.send("hardhat_setBalance", [
      USDC_WHALE,
      "0x" + (10n ** 18n * 1000n).toString(16)
    ]);
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    whale = await ethers.getSigner(USDC_WHALE);

    console.log("✅ Mainnet fork setup complete");
    console.log("USDC Address:", USDC_ADDRESS);
    console.log("Aave Pool:", AAVE_V3_POOL);
    console.log("Whale Address:", USDC_WHALE);
  }

  async function setupLocalNetwork() {
    console.log("\n📄 Deploying Mock Contracts...");

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy() as MockUSDC;
    await mockUSDC.waitForDeployment();
    usdc = mockUSDC;
    console.log("✅ Mock USDC deployed:", await usdc.getAddress());

    // Deploy Mock Aave token
    const MockAToken = await ethers.getContractFactory("MockAToken");
    mockAave = await MockAToken.deploy(await usdc.getAddress()) as MockAToken;
    await mockAave.waitForDeployment();
    console.log("✅ Mock Aave token deployed:", await mockAave.getAddress());
  }

  async function deployAndInitializeContracts() {
    console.log("\n🏗️ Deploying Core Contracts...");

    // Deploy Calculator
    const Calculator = await ethers.getContractFactory("InsuranceCalculator");
    calculator = await Calculator.deploy() as InsuranceCalculator;
    await calculator.waitForDeployment();
    console.log("✅ Calculator deployed:", await calculator.getAddress());

    // Deploy Adapter Manager
    const AdapterManager = await ethers.getContractFactory("InsuranceAdapterManager");
    adapterManager = await AdapterManager.deploy() as InsuranceAdapterManager;
    await adapterManager.waitForDeployment();
    console.log("✅ Adapter Manager deployed:", await adapterManager.getAddress());

    // Deploy Insurance Core
    const InsuranceCore = await ethers.getContractFactory("InsuranceCore");
    insuranceCore = await InsuranceCore.deploy() as InsuranceCore;
    await insuranceCore.waitForDeployment();
    console.log("✅ Insurance Core deployed:", await insuranceCore.getAddress());

    // Calculate time periods with shorter durations for testing (Polkadot compatible)
    const deployTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    const S = deployTime + ISSUANCE_PERIOD;
    const T1 = S + INSURANCE_PERIOD;
    const T2 = T1 + 300; // 5 minutes for claims
    const T3 = T2 + 300; // 5 minutes final period

    console.log("\n⏰ Time Configuration:");
    console.log("Current time:", deployTime);
    console.log("S (Issuance End):", S);
    console.log("T1 (Insurance End):", T1);
    console.log("T2 (AAA Claims Start):", T2);
    console.log("T3 (Final Claims End):", T3);

    // Initialize contracts
    console.log("\n🔧 Initializing Contracts...");
    await insuranceCore.initialize(
      await usdc.getAddress(),
      S,
      T1,
      T2,
      T3,
      await adapterManager.getAddress(),
      await calculator.getAddress()
    );

    await adapterManager.initialize(
      await insuranceCore.getAddress(),
      await usdc.getAddress()
    );

    // Deploy Tranche tokens
    console.log("\n🪙 Deploying Tranche Tokens...");
    const Tranche = await ethers.getContractFactory("Tranche");
    trancheAAA = await Tranche.deploy("Insurance AAA", "iAAA") as Tranche;
    trancheAA = await Tranche.deploy("Insurance AA", "iAA") as Tranche;
    await trancheAAA.waitForDeployment();
    await trancheAA.waitForDeployment();

    // Set tranche addresses in core
    await insuranceCore.setTranches(await trancheAAA.getAddress(), await trancheAA.getAddress());

    // Deploy Aave adapter
    console.log("\n🔌 Deploying Aave Adapter...");
    const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");

    if (isForking && networkConfig) {
      aaveAdapter = await AaveAdapter.deploy(
        networkConfig.AAVE_V3_POOL,
        networkConfig.AAVE_DATA_PROVIDER
      ) as AaveLendingAdapter;
    } else {
      aaveAdapter = await AaveAdapter.deploy(
        await mockAave.getAddress(),
        await mockAave.getAddress()
      ) as AaveLendingAdapter;
    }
    await aaveAdapter.waitForDeployment();

    // Add lending adapter to manager
    await adapterManager.addLendingAdapter(await aaveAdapter.getAddress());
    console.log("✅ All contracts deployed and initialized");
  }

  async function setupTestAccounts() {
    console.log("\n💰 Setting up Test Accounts...");

    const transferAmount = ethers.parseUnits("200", 6); // 200 USDC
    const approvalAmount = ethers.parseUnits("300", 6); // 300 USDC

    if (isForking && whale) {
      // Transfer from whale to test accounts
      const whaleBalance = await usdc.balanceOf(whale.address);
      console.log("Whale USDC Balance:", ethers.formatUnits(whaleBalance, 6), "USDC");

      if (whaleBalance < transferAmount * 2n) {
        throw new Error(`Insufficient whale balance`);
      }

      await usdc.connect(whale).transfer(attacker.address, transferAmount);
      await usdc.connect(whale).transfer(user.address, transferAmount);
      await usdc.connect(whale).approve(await insuranceCore.getAddress(), approvalAmount);
    } else {
      // Mint to test accounts (local network)
      const mockUSDC = usdc as MockUSDC;
      await mockUSDC.mint(deployer.address, transferAmount);
      await mockUSDC.mint(attacker.address, transferAmount);
      await mockUSDC.mint(user.address, transferAmount);
    }

    // Approve insurance contract
    await usdc.connect(attacker).approve(await insuranceCore.getAddress(), approvalAmount);
    await usdc.connect(user).approve(await insuranceCore.getAddress(), approvalAmount);
    await usdc.connect(deployer).approve(await insuranceCore.getAddress(), approvalAmount);

    console.log("✅ Test accounts funded and approved");
  }

  describe("🏗️ Deployment & Initialization", function () {
    it("Should deploy all modular contracts successfully", async function () {
      expect(await insuranceCore.getAddress()).to.be.a('string');
      expect(await adapterManager.getAddress()).to.be.a('string');
      expect(await calculator.getAddress()).to.be.a('string');
      expect(await trancheAAA.getAddress()).to.be.a('string');
      expect(await trancheAA.getAddress()).to.be.a('string');
      expect(await aaveAdapter.getAddress()).to.be.a('string');
    });

    it("Should have correct initial state", async function () {
      const info = await insuranceCore.getInfo();
      expect(info[6]).to.equal(0); // totalTranches
      expect(info[7]).to.equal(0); // totalInvested
      expect(info[2]).to.equal(true); // initialized
    });

    it("Should connect modular components correctly", async function () {
      // Verify adapter manager has the right adapter
      expect(await adapterManager.getAdapterCount()).to.equal(1);
      expect(await adapterManager.getAdapter(0)).to.equal(await aaveAdapter.getAddress());

      // Verify insurance core connections
      const info = await insuranceCore.getInfo();
      expect(info[0]).to.equal(deployer.address); // owner
      expect(info[1]).to.equal(await usdc.getAddress()); // usdc
    });

    it("Should set correct time periods", async function () {
      const info = await insuranceCore.getInfo();
      const S = info[3]; // S timestamp
      const T1 = info[4]; // T1 timestamp

      // Verify time periods are set (exact values may vary)
      expect(S).to.be.gt(0);
      expect(T1).to.be.gt(S);
    });
  });

  describe("⚖️ Risk Management", function () {
    it("Should handle minimum amounts correctly", async function () {
      const minAmount = 4n; // Minimum valid amount
      await insuranceCore.connect(attacker).splitRisk(minAmount);

      const expectedTranche = minAmount / 2n;
      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(expectedTranche);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(expectedTranche);
    });

    it("Should emit RiskSplit event with correct parameters", async function () {
      const amount = ethers.parseUnits("100", 6);
      await expect(insuranceCore.connect(user).splitRisk(amount))
        .to.emit(insuranceCore, "RiskSplit")
        .withArgs(user.address, amount);
    });

    it("Should prevent invalid amounts", async function () {
      // Test odd amount (not divisible by 2)
      const oddAmount = ethers.parseUnits("100", 6) + 1n;
      await expect(insuranceCore.connect(user).splitRisk(oddAmount))
        .to.be.revertedWith("Insurance: Amount must be divisible by 2");

      // Test zero amount
      await expect(insuranceCore.connect(user).splitRisk(0))
        .to.be.revertedWith("Insurance: amount too low");
    });

    it("Should handle large amounts correctly", async function () {
      const largeAmount = ethers.parseUnits("150", 6); // 150 USDC
      await insuranceCore.connect(user).splitRisk(largeAmount);

      const expectedTranche = largeAmount / 2n;
      expect(await trancheAAA.balanceOf(user.address)).to.equal(expectedTranche);
      expect(await trancheAA.balanceOf(user.address)).to.equal(expectedTranche);
    });

    it("Should properly distribute funds to adapters", async function () {
      const amount = ethers.parseUnits("100", 6);
      const initialAdapterBalance = await aaveAdapter.getBalance(await usdc.getAddress());

      await insuranceCore.connect(user).splitRisk(amount);

      const finalAdapterBalance = await aaveAdapter.getBalance(await usdc.getAddress());
      expect(Number(finalAdapterBalance)).to.be.greaterThan(Number(initialAdapterBalance));
    });
  });

  describe("💸 Claims Processing", function () {
    it("Should allow claiming immediately after splitRisk (before insurance period)", async function () {
      // Setup for this specific test
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);

      const trancheAmount = ethers.parseUnits("50", 6);
      const initialUSDC = await usdc.balanceOf(attacker.address);

      await insuranceCore.connect(attacker).claim(trancheAmount, 0);

      const finalUSDC = await usdc.balanceOf(attacker.address);
      expect(Number(finalUSDC)).to.be.gt(Number(initialUSDC));
      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(0);
    });

    it("Should handle claimAll function correctly", async function () {
      // Setup for this specific test
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(user).splitRisk(amount);

      const initialUSDC = await usdc.balanceOf(user.address);
      const beforeBalanceAAA = await trancheAAA.balanceOf(user.address);
      const beforeBalanceAA = await trancheAA.balanceOf(user.address);

      expect(beforeBalanceAAA).to.be.gt(0);
      expect(beforeBalanceAA).to.be.gt(0);

      await insuranceCore.connect(user).claimAll();

      const finalUSDC = await usdc.balanceOf(user.address);
      expect(Number(finalUSDC)).to.be.gt(Number(initialUSDC));
      expect(await trancheAAA.balanceOf(user.address)).to.equal(0);
      expect(await trancheAA.balanceOf(user.address)).to.equal(0);
    });

    it("Should prevent claiming during insurance period", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);

      // Try to claim during insurance period (between S and T1)
      await advanceTime(ISSUANCE_PERIOD + 1); // After S but before T1
      await expect(insuranceCore.connect(attacker).claim(10, 10))
        .to.be.revertedWith("Insurance: Claims can only be made before the insurance phase starts or after it ends");
    });

    it("Should allow claiming after insurance period ends", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);

      // Advance time past T1 (insurance period ends)
      await advanceTime(ISSUANCE_PERIOD + INSURANCE_PERIOD + 1);

      const trancheAmount = amount / 2n;
      await insuranceCore.connect(attacker).claim(trancheAmount, trancheAmount);

      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(0);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(0);
    });

    it("Should prevent double claiming", async function () {
      const amount = ethers.parseUnits("100", 6);
      const testUser = isForking && whale ? whale : attacker;
      
      await insuranceCore.connect(testUser).splitRisk(amount);

      const trancheAmount = amount / 2n;
      await insuranceCore.connect(testUser).claim(trancheAmount, 0);

      await expect(insuranceCore.connect(testUser).claim(trancheAmount, 0))
        .to.be.revertedWith("Insurance: insufficient AAA balance");
    });
  });

  describe("⏰ Time-based Configuration", function () {
    it("Should have valid time periods configured", async function () {
      const info = await insuranceCore.getInfo();
      const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;

      const S = Number(info[3]); // S timestamp
      const T1 = Number(info[4]); // T1 timestamp
      const T2 = Number(info[5]); // T2 timestamp
      const T3 = Number(info[6]); // T3 timestamp

      // Verify time periods are in logical order
      expect(S).to.be.greaterThan(currentTime);
      expect(T1).to.be.greaterThan(S);
      expect(T2).to.be.greaterThan(T1);
      expect(T3).to.be.greaterThan(T2);
    });

    it("Should allow splitRisk during issuance period", async function () {
      const amount = ethers.parseUnits("50", 6);

      // Should work during issuance period
      await expect(insuranceCore.connect(attacker).splitRisk(amount)).to.not.be.reverted;

      expect(await trancheAAA.balanceOf(attacker.address)).to.be.gt(0);
      expect(await trancheAA.balanceOf(attacker.address)).to.be.gt(0);
    });

    it("Should prevent splitRisk after issuance period", async function () {
      await advanceTime(ISSUANCE_PERIOD + 1);

      const amount = ethers.parseUnits("100", 6);
      await expect(insuranceCore.connect(deployer).splitRisk(amount))
        .to.be.revertedWith("Insurance: issuance ended");
    });
  });

  describe("🧮 Calculator Functions", function () {
    it("Should calculate withdrawal amounts correctly", async function () {
      const totalTokens = ethers.parseUnits("50", 6);
      const totalTranches = ethers.parseUnits("100", 6);
      const totalInvested = ethers.parseUnits("1000", 6);

      const withdrawal = await calculator.calculateWithdrawal(totalTokens, totalTranches, totalInvested);

      // Should be 50% of total invested = 500 USDC
      const expected = ethers.parseUnits("500", 6);
      expect(withdrawal).to.equal(expected);
    });

    it("Should calculate tranche amounts for equal split", async function () {
      const totalAmount = ethers.parseUnits("100", 6);
      const [aaaAmount, aaAmount] = await calculator.calculateTrancheAmounts(totalAmount);

      const expectedEach = ethers.parseUnits("50", 6);
      expect(aaaAmount).to.equal(expectedEach);
      expect(aaAmount).to.equal(expectedEach);
    });

    it("Should validate time periods correctly", async function () {
      const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
      const S = currentTime + 100;
      const T1 = S + 200;
      const T2 = T1 + 100;
      const T3 = T2 + 100;

      const [canSplit, canClaim, needsReset] = await calculator.validateTimePeriods(currentTime, S, T1, T2, T3);

      expect(canSplit).to.be.true; // Before S
      expect(canClaim).to.be.true; // Before S
      expect(needsReset).to.be.false; // Before T3
    });
  });

  describe("🔗 Adapter Management", function () {
    it("Should manage adapters correctly", async function () {
      // Check initial adapter count
      expect(await adapterManager.getAdapterCount()).to.equal(1);

      // Get all adapters
      const adapters = await adapterManager.getAllAdapters();
      expect(adapters.length).to.equal(1);
      expect(adapters[0]).to.equal(await aaveAdapter.getAddress());
    });

    it("Should handle adapter operations", async function () {
      const amount = ethers.parseUnits("50", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);

      // Verify funds were deposited
      const info = await insuranceCore.getInfo();
      expect(info[7]).to.be.gt(0); // totalInvested should be > 0
    });
  });

  describe("🌐 Network Compatibility", function () {
    it("Should work on both mainnet fork and local networks", async function () {
      const networkName = isForking ? "Mainnet Fork" : "Local/AssetHub";
      console.log("Testing on:", networkName);

      // Test basic functionality
      const amount = ethers.parseUnits("50", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);

      expect(await trancheAAA.balanceOf(attacker.address)).to.be.gt(0);
      expect(await trancheAA.balanceOf(attacker.address)).to.be.gt(0);
    });

    it("Should handle gas costs efficiently", async function () {
      const amount = ethers.parseUnits("20", 6);

      const tx = await insuranceCore.connect(attacker).splitRisk(amount);
      const receipt = await tx.wait();

      console.log("Gas used for splitRisk:", receipt?.gasUsed?.toString());
      // Should be reasonable gas cost (less than 500k gas)
      expect(receipt?.gasUsed).to.be.lt(500000);
    });
  });

  after(async function () {
    if (isForking && whale) {
      // Clean up impersonation if on mainnet fork
      try {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [whale.address]);
      } catch (error) {
        // Ignore cleanup errors in Polkadot environment
        console.log("Cleanup skipped for Polkadot compatibility");
      }
    }
  });
});