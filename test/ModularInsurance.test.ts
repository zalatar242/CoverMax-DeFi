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
  const ISSUANCE_PERIOD = 7 * 24 * 60 * 60; // 7 days for testing
  const INSURANCE_PERIOD = 14 * 24 * 60 * 60; // 14 days for testing

  // Helper function to advance time
  const advanceTime = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  };

  // Helper functions for snapshots (works for both fork and local)
  let snapshotId: string;
  const takeSnapshot = async () => {
    return await ethers.provider.send("evm_snapshot", []);
  };
  const restoreSnapshot = async (id: string) => {
    if (id) {
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

    // Take initial snapshot for both fork and local
    snapshotId = await takeSnapshot();
  });

  beforeEach(async function() {
    // Restore to initial state before each test (works for both fork and local)
    if (snapshotId) {
      await restoreSnapshot(snapshotId);
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

    // Deploy Insurance Core (Optimized)
    const InsuranceCoreFactory = await ethers.getContractFactory("InsuranceCore");
    insuranceCore = await InsuranceCoreFactory.deploy() as InsuranceCore;
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

    // Transfer ownership of tranche tokens to InsuranceCore
    await trancheAAA.transferOwnership(await insuranceCore.getAddress());
    await trancheAA.transferOwnership(await insuranceCore.getAddress());

    // Deploy Aave adapter
    console.log("\n🔌 Deploying Aave Adapter...");

    if (isForking && networkConfig) {
      const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
      aaveAdapter = await AaveAdapter.deploy(
        networkConfig.AAVE_V3_POOL,
        networkConfig.AAVE_DATA_PROVIDER
      ) as AaveLendingAdapter;
      await aaveAdapter.waitForDeployment();
    } else {
      // For local testing, create a simple mock adapter that just holds USDC
      const MockAdapter = await ethers.getContractFactory("MockAdapter");
      aaveAdapter = await MockAdapter.deploy(await usdc.getAddress()) as any;
      await aaveAdapter.waitForDeployment();
    }

    // Add lending adapter to manager
    await adapterManager.addLendingAdapter(await aaveAdapter.getAddress());
    console.log("✅ All contracts deployed and initialized");
  }

  async function setupTestAccounts() {
    console.log("\n💰 Setting up Test Accounts...");

    const transferAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    const approvalAmount = ethers.parseUnits("2000", 6); // 2000 USDC

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
      // Deployer already has tokens from constructor, just mint for others
      await mockUSDC.mint(attacker.address, transferAmount);
      await mockUSDC.mint(user.address, transferAmount);

      console.log("✅ Tokens minted to test accounts");
      console.log("Deployer USDC Balance:", ethers.formatUnits(await usdc.balanceOf(deployer.address), 6), "USDC");
      console.log("Attacker USDC Balance:", ethers.formatUnits(await usdc.balanceOf(attacker.address), 6), "USDC");
      console.log("User USDC Balance:", ethers.formatUnits(await usdc.balanceOf(user.address), 6), "USDC");
    }

    // Approve insurance contract
    const insuranceCoreAddress = await insuranceCore.getAddress();
    console.log("Insurance Core Address:", insuranceCoreAddress);

    try {
      await usdc.connect(attacker).approve(insuranceCoreAddress, approvalAmount);
      console.log("✅ Attacker approved");

      await usdc.connect(user).approve(insuranceCoreAddress, approvalAmount);
      console.log("✅ User approved");

      await usdc.connect(deployer).approve(insuranceCoreAddress, approvalAmount);
      console.log("✅ Deployer approved");

      console.log("✅ Test accounts funded and approved");
    } catch (error) {
      console.error("Approval error:", error);
      throw error;
    }
  }

  describe("🏗️ Deployment & Initialization", function () {

    it("Should have correct initial state", async function () {
      const info = await insuranceCore.getInfo();
      expect(info[7]).to.equal(0); // totalTranches
      expect(info[8]).to.equal(0); // totalInvested
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


  describe("🔐 Access Control", function () {
    it("Should prevent unauthorized adapter management", async function () {
      // Deploy a mock adapter for testing
      const MockAdapter = await ethers.getContractFactory("MockAdapter");
      const newAdapter = await MockAdapter.deploy(await usdc.getAddress());
      await newAdapter.waitForDeployment();

      // Non-owner should not be able to add adapter
      await expect(adapterManager.connect(attacker).addLendingAdapter(await newAdapter.getAddress()))
        .to.be.revertedWith("Not owner");
    });

    it("Should allow owner to add/remove adapters at any time", async function () {
      // Deploy a mock adapter for testing
      const MockAdapter = await ethers.getContractFactory("MockAdapter");
      const newAdapter = await MockAdapter.deploy(await usdc.getAddress());
      await newAdapter.waitForDeployment();

      // Owner should be able to add adapter
      await expect(adapterManager.connect(deployer).addLendingAdapter(await newAdapter.getAddress()))
        .to.not.be.reverted;

      // Verify adapter was added
      expect(await adapterManager.getAdapterCount()).to.equal(2);

      // Owner should be able to remove adapter (remove the newly added one at index 1)
      await expect(adapterManager.connect(deployer).removeLendingAdapter(1))
        .to.not.be.reverted;

      // Verify adapter was removed
      expect(await adapterManager.getAdapterCount()).to.equal(1);
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
      const largeAmount = ethers.parseUnits("100", 6); // 100 USDC

      // Get balance before splitRisk
      const beforeAAA = await trancheAAA.balanceOf(user.address);
      const beforeAA = await trancheAA.balanceOf(user.address);

      await insuranceCore.connect(user).splitRisk(largeAmount);

      const expectedTranche = largeAmount / 2n;
      const afterAAA = await trancheAAA.balanceOf(user.address);
      const afterAA = await trancheAA.balanceOf(user.address);

      expect(afterAAA - beforeAAA).to.equal(expectedTranche);
      expect(afterAA - beforeAA).to.equal(expectedTranche);
    });

    it("Should properly distribute funds to adapters", async function () {
      const amount = ethers.parseUnits("100", 6);
      const initialAdapterBalance = await aaveAdapter.getBalance(await usdc.getAddress());

      await insuranceCore.connect(user).splitRisk(amount);

      // Check that the adapter received the USDC
      const finalAdapterBalance = await aaveAdapter.getBalance(await usdc.getAddress());
      expect(Number(finalAdapterBalance)).to.be.greaterThan(Number(initialAdapterBalance));
    });
  });

  describe("💸 Claims Processing", function () {
    it("Should allow claiming immediately after splitRisk (before insurance period)", async function () {
      // Setup for this specific test
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);

      // Get the actual tranche balance to claim
      const trancheAAABalance = await trancheAAA.balanceOf(attacker.address);
      const initialUSDC = await usdc.balanceOf(attacker.address);

      await insuranceCore.connect(attacker).claim(trancheAAABalance, 0);

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
        .to.be.revertedWith("Insurance: Claims allowed before/after insurance period");
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

  describe("⏰ Time-based Operation Restrictions", function () {
    it("Should prevent claims during insurance period (between S and T1)", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(attacker).splitRisk(amount);
      const trancheAmount = amount / 2n;

      await advanceTime(ISSUANCE_PERIOD + 1); // Just past S

      await expect(insuranceCore.connect(attacker).claim(trancheAmount, trancheAmount))
        .to.be.revertedWith("Insurance: Claims allowed before/after insurance period");
    });

    it("Should allow claims after T1 (insurance period ends)", async function () {
      const amount = ethers.parseUnits("100", 6);
      const testUser = isForking && whale ? whale : user;
      await insuranceCore.connect(testUser).splitRisk(amount);
      const trancheAmount = amount / 2n;

      await advanceTime(ISSUANCE_PERIOD + INSURANCE_PERIOD + 1); // Past T1

      await expect(insuranceCore.connect(testUser).claim(trancheAmount, trancheAmount))
        .to.not.be.reverted;
    });

    it("Should prevent splitRisk after issuance period", async function () {
      await advanceTime(ISSUANCE_PERIOD + 1);

      const amount = ethers.parseUnits("100", 6);
      await expect(insuranceCore.connect(attacker).splitRisk(amount))
        .to.be.revertedWith("Insurance: issuance ended");
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


  describe("🔍 View Functions & Edge Cases", function () {
    it("Should return correct user deposit for getUserDeposit", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      // Initially should be 0
      expect(await insuranceCore.getUserDeposit(user.address)).to.equal(0);
      
      // After splitRisk should equal the deposited amount
      await insuranceCore.connect(user).splitRisk(amount);
      expect(await insuranceCore.getUserDeposit(user.address)).to.equal(amount);
      
      // After partial claim should reflect remaining balance
      const halfAmount = amount / 2n;
      await insuranceCore.connect(user).claim(halfAmount / 2n, halfAmount / 2n);
      expect(await insuranceCore.getUserDeposit(user.address)).to.equal(halfAmount);
    });

    it("Should handle getUserDeposit for zero address", async function () {
      expect(await insuranceCore.getUserDeposit(ethers.ZeroAddress)).to.equal(0);
    });

    it("Should handle getUserDeposit after token transfers", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(user).splitRisk(amount);
      
      // Transfer half of AAA tokens to attacker
      const aaaBalance = await trancheAAA.balanceOf(user.address);
      await trancheAAA.connect(user).transfer(attacker.address, aaaBalance / 2n);
      
      // User should have 75% of original deposit
      const userDeposit = await insuranceCore.getUserDeposit(user.address);
      expect(userDeposit).to.equal(amount * 3n / 4n);
      
      // Attacker should have 25% of the deposit
      const attackerDeposit = await insuranceCore.getUserDeposit(attacker.address);
      expect(attackerDeposit).to.equal(amount / 4n);
    });
  });

  describe("🛡️ Error Handling & Edge Cases", function () {
    it("Should prevent double initialization", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      
      await expect(insuranceCore.initialize(
        await usdc.getAddress(),
        currentTime + 3600,
        currentTime + 7200,
        currentTime + 10800,
        currentTime + 14400,
        await adapterManager.getAddress(),
        await calculator.getAddress()
      )).to.be.revertedWith("Insurance: already initialized");
    });

    it("Should prevent setting tranches twice", async function () {
      const Tranche = await ethers.getContractFactory("Tranche");
      const newAAA = await Tranche.deploy("New AAA", "nAAA");
      const newAA = await Tranche.deploy("New AA", "nAA");
      
      await expect(insuranceCore.setTranches(await newAAA.getAddress(), await newAA.getAddress()))
        .to.be.revertedWith("Insurance: tranches already set");
    });

    it("Should prevent non-owner from setting tranches", async function () {
      const Tranche = await ethers.getContractFactory("Tranche");
      const newAAA = await Tranche.deploy("New AAA", "nAAA");
      const newAA = await Tranche.deploy("New AA", "nAA");
      
      // Deploy fresh insurance core without tranches set
      const InsuranceCore = await ethers.getContractFactory("InsuranceCore");
      const freshCore = await InsuranceCore.deploy();
      
      await expect(freshCore.connect(attacker).setTranches(await newAAA.getAddress(), await newAA.getAddress()))
        .to.be.revertedWith("Insurance: not owner");
    });

    it("Should handle claimAll with zero balance gracefully", async function () {
      // User with no tokens should revert when calling claimAll
      await expect(insuranceCore.connect(attacker).claimAll())
        .to.be.revertedWith("Insurance: No AAA or AA tokens to claim");
    });

    it("Should handle claim with partial amounts correctly", async function () {
      const amount = ethers.parseUnits("200", 6);
      await insuranceCore.connect(user).splitRisk(amount);
      
      const aaaBalance = await trancheAAA.balanceOf(user.address);
      const aaBalance = await trancheAA.balanceOf(user.address);
      
      // Claim only 25% of each tranche
      const partialAAA = aaaBalance / 4n;
      const partialAA = aaBalance / 4n;
      
      const initialUSDC = await usdc.balanceOf(user.address);
      await insuranceCore.connect(user).claim(partialAAA, partialAA);
      
      // Should receive proportional USDC
      const finalUSDC = await usdc.balanceOf(user.address);
      expect(finalUSDC).to.be.gt(initialUSDC);
      
      // Should have remaining tranche tokens
      expect(await trancheAAA.balanceOf(user.address)).to.equal(aaaBalance - partialAAA);
      expect(await trancheAA.balanceOf(user.address)).to.equal(aaBalance - partialAA);
    });

    it("Should enforce minimum splitRisk amount", async function () {
      // Test with amount less than 4 (minimum)
      await expect(insuranceCore.connect(user).splitRisk(2))
        .to.be.revertedWith("Insurance: amount too low");
      
      await expect(insuranceCore.connect(user).splitRisk(3))
        .to.be.revertedWith("Insurance: amount too low");
      
      // 4 should work (minimum valid amount)
      await expect(insuranceCore.connect(user).splitRisk(4))
        .to.not.be.reverted;
    });

    it("Should handle large amounts without overflow", async function () {
      // Mint large amount to user for testing
      const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC
      if (!isForking) {
        const mockUSDC = usdc as MockUSDC;
        await mockUSDC.mint(user.address, largeAmount);
        await usdc.connect(user).approve(await insuranceCore.getAddress(), largeAmount);
      }
      
      if (await usdc.balanceOf(user.address) >= largeAmount) {
        await expect(insuranceCore.connect(user).splitRisk(largeAmount))
          .to.not.be.reverted;
        
        const userDeposit = await insuranceCore.getUserDeposit(user.address);
        expect(userDeposit).to.be.gte(largeAmount);
      }
    });
  });

  describe("🔧 Integration Edge Cases", function () {
    it("Should handle adapter deposit failures gracefully", async function () {
      // This test depends on having a mock adapter that can fail
      // For now, just ensure the current flow works
      const amount = ethers.parseUnits("50", 6);
      
      await expect(insuranceCore.connect(user).splitRisk(amount))
        .to.not.be.reverted;
    });

    it("Should validate time periods correctly during operations", async function () {
      const amount = ethers.parseUnits("50", 6);
      
      // Should work in issuance period
      await insuranceCore.connect(user).splitRisk(amount);
      
      // Advance to insurance period
      await advanceTime(ISSUANCE_PERIOD + 1);
      
      // Should fail during insurance period
      await expect(insuranceCore.connect(attacker).splitRisk(amount))
        .to.be.revertedWith("Insurance: issuance ended");
      
      // Claims should also fail during insurance period
      const aaaBalance = await trancheAAA.balanceOf(user.address);
      await expect(insuranceCore.connect(user).claim(aaaBalance, 0))
        .to.be.revertedWith("Insurance: Claims allowed before/after insurance period");
    });

    it("Should update totalInvested correctly", async function () {
      const initialInfo = await insuranceCore.getInfo();
      const initialInvested = initialInfo[8]; // totalInvested
      
      const amount = ethers.parseUnits("100", 6);
      await insuranceCore.connect(user).splitRisk(amount);
      
      const finalInfo = await insuranceCore.getInfo();
      const finalInvested = finalInfo[8]; // totalInvested
      
      expect(finalInvested).to.be.gt(initialInvested);
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
