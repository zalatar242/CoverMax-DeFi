import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Insurance, IERC20, AaveLendingAdapter, Tranche } from "../typechain-types";
import { networks } from "../config/addresses";

// Rest of the file remains the same
describe("Insurance (Base Mainnet Fork)", function () {
  // Get addresses from network config

  describe("Deployment", function () {
    it("Should deploy successfully with correct initial state", async function () {
      expect(await insurance.getAddress()).to.be.properAddress;
      expect(await trancheA.getAddress()).to.be.properAddress;
      expect(await trancheB.getAddress()).to.be.properAddress;
      expect(await trancheC.getAddress()).to.be.properAddress;

      // Check initial state
      expect(await insurance.isInvested()).to.be.false;
      expect(await insurance.inLiquidMode()).to.be.false;
      expect(await insurance.totalTranches()).to.equal(0);
    });

    it("Should set correct token addresses and time periods", async function () {
      expect(await insurance.usdc()).to.equal(USDC_ADDRESS);

      const deployTime = (await ethers.provider.getBlock("latest"))!.timestamp;
      const S = await insurance.S();
      const T1 = await insurance.T1();

      // Use approximately equal due to potential block timestamp variations
      // Use larger tolerance for block time variations in mainnet fork
      expect(S).to.be.closeTo(deployTime + ISSUANCE_PERIOD, 15);
      expect(T1).to.be.closeTo(deployTime + ISSUANCE_PERIOD + INSURANCE_PERIOD, 15);
    });
  });

  const { USDC_ADDRESS, AAVE_V3_POOL, AAVE_DATA_PROVIDER, USDC_WHALE } = networks.mainnet;

  let insurance: Insurance;
  let usdc: IERC20;
  let aaveAdapter: AaveLendingAdapter;
  let deployer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let whale: HardhatEthersSigner;
  let trancheA: Tranche;
  let trancheB: Tranche;
  let trancheC: Tranche;

  // Helper function to advance time
  const advanceTime = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  };

  // Constants for time periods
  const DAY = 24 * 60 * 60;
  const ISSUANCE_PERIOD = 7 * DAY;
  const INSURANCE_PERIOD = 28 * DAY;

  let snapshotId: string;

  // Helper function to take a snapshot of the blockchain state
  const takeSnapshot = async () => {
    return await ethers.provider.send("evm_snapshot", []);
  };

  // Helper function to restore the blockchain state to a snapshot
  const restoreSnapshot = async (id: string) => {
    await ethers.provider.send("evm_revert", [id]);
  };

  before(async function() {
    if (process.env.FORK_ENABLED !== 'true') {
      console.log("These tests require forking mode. Please set FORK_ENABLED=true");
      this.skip();
    }

    [deployer, attacker, user] = await ethers.getSigners();

    // Get USDC contract
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS) as IERC20;

    // Deploy Insurance contract
    const Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.deploy(USDC_ADDRESS) as Insurance;

    // Deploy Aave adapter
    const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
    aaveAdapter = await AaveAdapter.deploy(AAVE_V3_POOL, AAVE_DATA_PROVIDER) as AaveLendingAdapter;
    await aaveAdapter.waitForDeployment();

    // Get Tranche token contracts
    const trancheAAddress = await insurance.A();
    const trancheBAddress = await insurance.B();
    const trancheCAddress = await insurance.C();

    trancheA = await ethers.getContractAt("Tranche", trancheAAddress) as Tranche;
    trancheB = await ethers.getContractAt("Tranche", trancheBAddress) as Tranche;
    trancheC = await ethers.getContractAt("Tranche", trancheCAddress) as Tranche;

    // Add lending adapter
    await insurance.addLendingAdapter(await aaveAdapter.getAddress());

    // Setup whale account for testing
    await ethers.provider.send("hardhat_setBalance", [
      USDC_WHALE,
      "0x" + (10n ** 18n * 1000n).toString(16)
    ]);
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    whale = await ethers.getSigner(USDC_WHALE);

    // Use small amounts for testing
    const transferAmount = ethers.parseUnits("100", 6); // 100 USDC

    try {
      // Verify USDC contract and whale setup
      const code = await ethers.provider.getCode(USDC_ADDRESS);
      if (code === "0x") {
        throw new Error("USDC contract not found at specified address");
      }

      console.log("\nInsurance Contract Test Setup");
      console.log("===========================");

      console.log("\nAddresses:");
      console.log("----------");
      console.log("USDC Token:", USDC_ADDRESS);
      console.log("Insurance:", await insurance.getAddress());
      console.log("Aave Adapter:", await aaveAdapter.getAddress());
      console.log("Tranche A:", await trancheA.getAddress());
      console.log("Tranche B:", await trancheBAddress);
      console.log("Tranche C:", await trancheCAddress);
      console.log("Whale:", USDC_WHALE);

      const whaleBalance = await usdc.balanceOf(USDC_WHALE);
      console.log("\nBalances:");
      console.log("---------");
      console.log("Whale USDC Balance:", ethers.formatUnits(whaleBalance, 6), "USDC");
      console.log("Required Amount:", ethers.formatUnits(transferAmount, 6), "USDC");

      if (whaleBalance < transferAmount) {
        throw new Error(`Insufficient whale balance. Has: ${ethers.formatUnits(whaleBalance, 6)} USDC, Needs: ${ethers.formatUnits(transferAmount, 6)} USDC`);
      }

      // Transfer USDC
      await usdc.connect(whale).transfer(attacker.address, transferAmount);
      await usdc.connect(whale).transfer(user.address, transferAmount);

      const attackerBalance = await usdc.balanceOf(attacker.address);
      const userBalance = await usdc.balanceOf(user.address);
      console.log("Attacker USDC Balance:", ethers.formatUnits(attackerBalance, 6), "USDC");
      console.log("User USDC Balance:", ethers.formatUnits(userBalance, 6), "USDC");
      console.log("===========================\n");
    } catch (error: any) {
      console.error("Error in whale setup:", error?.message || "Unknown error");
      throw error;
    }

    // Approve insurance contract
    await usdc.connect(attacker).approve(await insurance.getAddress(), transferAmount);
    await usdc.connect(user).approve(await insurance.getAddress(), transferAmount);
    await usdc.connect(whale).approve(await insurance.getAddress(), transferAmount);

    // Take initial snapshot after setup
    snapshotId = await takeSnapshot();
  });

  beforeEach(async function() {
    // Restore to initial state before each test
    await restoreSnapshot(snapshotId);
    // Take a new snapshot for the next test
    snapshotId = await takeSnapshot();
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized lending adapter addition", async function () {
      const newAdapter = await (await ethers.getContractFactory("AaveLendingAdapter"))
        .deploy(AAVE_V3_POOL, AAVE_DATA_PROVIDER);

      await expect(insurance.connect(attacker).addLendingAdapter(await newAdapter.getAddress()))
        .to.be.revertedWithCustomError(insurance, "OwnableUnauthorizedAccount")
        .withArgs(attacker.address);

      await advanceTime(ISSUANCE_PERIOD + 1);
      await expect(insurance.connect(deployer).addLendingAdapter(await newAdapter.getAddress()))
        .to.be.revertedWith("Insurance: past issuance period");
    });

    it("Should prevent adapter addition/removal after issuance period", async function () {
      await advanceTime(ISSUANCE_PERIOD + 1);
      await expect(insurance.connect(deployer).addLendingAdapter(USDC_ADDRESS))
        .to.be.revertedWith("Insurance: past issuance period");
      await expect(insurance.connect(deployer).removeLendingAdapter(0))
        .to.be.revertedWith("Insurance: past issuance period");
    });
  });

  describe("Risk Management", function () {
    it("Should handle minimum amounts correctly", async function () {
      // Try with amount = 3 (minimum valid amount)
      const minAmount = 3n;
      await insurance.connect(attacker).splitRisk(minAmount);

      const expectedTranche = minAmount / 3n;
      expect(await trancheA.balanceOf(attacker.address)).to.equal(expectedTranche);
    });

    it("Should emit RiskSplit event with correct parameters", async function () {
      const amount = ethers.parseUnits("30", 6); // 30 USDC (divisible by 3)
      await expect(insurance.connect(attacker).splitRisk(amount))
        .to.emit(insurance, "RiskSplit")
        .withArgs(attacker.address, amount);
    });

    it("Should prevent amount not divisible by 3 in splitRisk", async function () {
      const amount = ethers.parseUnits("100", 6);
      await expect(insurance.connect(attacker).splitRisk(amount))
        .to.be.revertedWith("Insurance: amount must be divisible by 3");
    });

    it("Should prevent zero amount in splitRisk", async function () {
      await expect(insurance.connect(attacker).splitRisk(0))
        .to.be.revertedWith("Insurance: amount too low");
    });

    it("Should handle large amounts correctly", async function () {
      const largeAmount = ethers.parseUnits("99", 6); // Using 99 USDC (must be divisible by 3)
      await insurance.connect(attacker).splitRisk(largeAmount);
      const expectedTranche = largeAmount / 3n;
      expect(await trancheA.balanceOf(attacker.address)).to.equal(expectedTranche);
    });
  });

  describe("Investment Lifecycle", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("30", 6); // 30 USDC (divisible by 3)
      await insurance.connect(whale).splitRisk(amount);
    });

    it("Should prevent invest() before issuance period ends", async function () {
      await expect(insurance.invest())
        .to.be.revertedWith("Insurance: still in issuance");
    });

    it("Should prevent invest() after insurance period", async function () {
      await advanceTime(ISSUANCE_PERIOD + INSURANCE_PERIOD + 1);
      await expect(insurance.invest())
        .to.be.revertedWith("Insurance: past insurance period");
    });

    it("Should invest and divest correctly", async function () {
      console.log("\nInvestment Lifecycle Test");
      console.log("=======================");

      const initialPoolBalance = await usdc.balanceOf(await aaveAdapter.getAddress());
      console.log("Initial pool balance:", ethers.formatUnits(initialPoolBalance, 6), "USDC");

      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();
      expect(await insurance.isInvested()).to.be.true;

      const investedBalance = await usdc.balanceOf(await aaveAdapter.getAddress());
      console.log("Balance after investment:", ethers.formatUnits(investedBalance, 6), "USDC");

      await advanceTime(INSURANCE_PERIOD);
      await insurance.divest();
      expect(await insurance.inLiquidMode()).to.be.true;

      const finalPoolBalance = await usdc.balanceOf(await aaveAdapter.getAddress());
      console.log("Final pool balance:", ethers.formatUnits(finalPoolBalance, 6), "USDC");
      console.log("=======================\n");
    });

    it("Should prevent early divestment", async function () {
      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();
      await expect(insurance.divest())
        .to.be.revertedWith("Insurance: still in insurance period");
    });

    it("Should prevent divest after claim period starts", async function () {
      const amount = ethers.parseUnits("30", 6);
      await insurance.connect(whale).splitRisk(amount);
      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();
      await advanceTime(INSURANCE_PERIOD + 2 * DAY); // Past T2

      await expect(insurance.divest())
        .to.be.revertedWith("Insurance: in claim period");
    });
  });

  describe("Claims", function () {
    it("Should prevent claiming before liquid mode", async function () {
      await expect(insurance.connect(attacker).claim(10, 10, 10))
        .to.be.revertedWith("Insurance: not in liquid mode");
    });

    it("Should prevent claim manipulation through transfer", async function () {
      console.log("\nClaim Manipulation Test");
      console.log("=====================");

      const amount = ethers.parseUnits("30", 6);
      console.log("Total amount:", ethers.formatUnits(amount, 6), "USDC");
      await insurance.connect(attacker).splitRisk(amount);
      await advanceTime(ISSUANCE_PERIOD + INSURANCE_PERIOD);
      await insurance.divest();

      // Split up the tranches
      const trancheAmount = amount / 3n;
      console.log("Each tranche amount:", ethers.formatUnits(trancheAmount, 6), "USDC");

      console.log("\nInitial State:");
      console.log("-------------");
      console.log("Attacker Tranche A:", ethers.formatUnits(await trancheA.balanceOf(attacker.address), 18), "shares");
      console.log("User Tranche A: 0 shares");

      await trancheA.connect(attacker).transfer(user.address, trancheAmount);
      console.log("\nAfter Transfer:");
      console.log("--------------");
      console.log("Attacker Tranche A: 0 shares");
      console.log("User Tranche A:", ethers.formatUnits(trancheAmount, 18), "shares");

      // Record balances before claiming
      const initialBalanceAttacker = await usdc.balanceOf(attacker.address);
      const initialBalanceUser = await usdc.balanceOf(user.address);
      console.log("\nBefore Claims:");
      console.log("-------------");
      console.log("Attacker USDC:", ethers.formatUnits(initialBalanceAttacker, 6), "USDC");
      console.log("User USDC:", ethers.formatUnits(initialBalanceUser, 6), "USDC");

      // Claims
      console.log("\nProcessing Claims...");
      await insurance.connect(user).claim(trancheAmount, 0, 0);
      await insurance.connect(attacker).claim(0, trancheAmount, trancheAmount);

      // Calculate total claimed
      const finalBalanceAttacker = await usdc.balanceOf(attacker.address);
      const finalBalanceUser = await usdc.balanceOf(user.address);
      const totalClaimed = (finalBalanceAttacker - initialBalanceAttacker) +
                         (finalBalanceUser - initialBalanceUser);

      console.log("\nAfter Claims:");
      console.log("------------");
      console.log("Attacker USDC:", ethers.formatUnits(finalBalanceAttacker, 6), "USDC");
      console.log("User USDC:", ethers.formatUnits(finalBalanceUser, 6), "USDC");
      console.log("Total Claimed:", ethers.formatUnits(totalClaimed, 6), "USDC");
      console.log("=====================\n");

      // Verify total claimed equals original deposit
      expect(totalClaimed).to.equal(amount);
    });

    it("Should handle claimAll function correctly", async function () {
      const amount = ethers.parseUnits("30", 6);
      await insurance.connect(attacker).splitRisk(amount);
      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();
      await advanceTime(INSURANCE_PERIOD);
      await insurance.divest();

      console.log("\nClaim All Test");
      console.log("==============");

      const beforeBalanceA = await trancheA.balanceOf(attacker.address);
      const beforeBalanceB = await trancheB.balanceOf(attacker.address);
      const beforeBalanceC = await trancheC.balanceOf(attacker.address);
      const initialUSDC = await usdc.balanceOf(attacker.address);

      console.log("\nInitial Balances:");
      console.log("----------------");
      console.log("Tranche A:", ethers.formatUnits(beforeBalanceA, 18), "shares");
      console.log("Tranche B:", ethers.formatUnits(beforeBalanceB, 18), "shares");
      console.log("Tranche C:", ethers.formatUnits(beforeBalanceC, 18), "shares");
      console.log("USDC:", ethers.formatUnits(initialUSDC, 6), "USDC");

      expect(beforeBalanceA).to.be.gt(0);
      expect(beforeBalanceB).to.be.gt(0);
      expect(beforeBalanceC).to.be.gt(0);

      // Claim all tranches
      await insurance.connect(attacker).claimAll();

      const afterUSDC = await usdc.balanceOf(attacker.address);
      console.log("\nFinal Balances:");
      console.log("--------------");
      console.log("Tranche A: 0 shares");
      console.log("Tranche B: 0 shares");
      console.log("Tranche C: 0 shares");
      console.log("USDC:", ethers.formatUnits(afterUSDC, 6), "USDC");
      console.log("USDC Claimed:", ethers.formatUnits(afterUSDC - initialUSDC, 6), "USDC");
      console.log("==============\n");

      // Verify all balances are now 0
      expect(await trancheA.balanceOf(attacker.address)).to.equal(0);
      expect(await trancheB.balanceOf(attacker.address)).to.equal(0);
      expect(await trancheC.balanceOf(attacker.address)).to.equal(0);
    });

    it("Should handle full lifecycle with claims", async function () {
      console.log("\nFull Lifecycle Test");
      console.log("==================");

      const amount = ethers.parseUnits("30", 6); // 30 USDC (divisible by 3)
      console.log("\nInitial State:");
      console.log("-------------");
      console.log("Total amount:", ethers.formatUnits(amount, 6), "USDC");

      await insurance.connect(whale).splitRisk(amount);
      const trancheAmount = amount / 3n;
      console.log("Each tranche amount:", ethers.formatUnits(trancheAmount, 6), "USDC");

      const initialBalances = {
        trancheA: await trancheA.balanceOf(USDC_WHALE),
        trancheB: await trancheB.balanceOf(USDC_WHALE),
        trancheC: await trancheC.balanceOf(USDC_WHALE)
      };
      console.log("\nAfter Split:");
      console.log("------------");
      console.log("Tranche A:", ethers.formatUnits(initialBalances.trancheA, 18), "shares");
      console.log("Tranche B:", ethers.formatUnits(initialBalances.trancheB, 18), "shares");
      console.log("Tranche C:", ethers.formatUnits(initialBalances.trancheC, 18), "shares");

      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();

      await advanceTime(INSURANCE_PERIOD);
      await insurance.divest();

      const initialUSDC = await usdc.balanceOf(USDC_WHALE);
      console.log("\nBefore Claim:");
      console.log("------------");
      console.log("USDC Balance:", ethers.formatUnits(initialUSDC, 6), "USDC");

      await insurance.connect(whale).claim(trancheAmount, trancheAmount, trancheAmount);

      const finalUSDC = await usdc.balanceOf(USDC_WHALE);
      console.log("\nAfter Claim:");
      console.log("-----------");
      console.log("USDC Balance:", ethers.formatUnits(finalUSDC, 6), "USDC");
      console.log("USDC Claimed:", ethers.formatUnits(finalUSDC - initialUSDC, 6), "USDC");
      console.log("==================\n");

      expect(await trancheA.balanceOf(USDC_WHALE)).to.equal(0);
      expect(await trancheB.balanceOf(USDC_WHALE)).to.equal(0);
      expect(await trancheC.balanceOf(USDC_WHALE)).to.equal(0);
    });

    it("Should prevent double claiming", async function () {
      console.log("\nDouble Claiming Test");
      console.log("==================");

      const amount = ethers.parseUnits("30", 6); // 30 USDC (divisible by 3)
      console.log("Initial amount:", ethers.formatUnits(amount, 6), "USDC");
      await insurance.connect(whale).splitRisk(amount);

      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();

      await advanceTime(INSURANCE_PERIOD);
      await insurance.divest();

      const trancheAmount = amount / 3n;
      console.log("\nFirst Claim:");
      console.log("------------");
      console.log("Claiming Tranche A:", ethers.formatUnits(trancheAmount, 6), "USDC");

      const initialUSDC = await usdc.balanceOf(USDC_WHALE);
      await insurance.connect(whale).claim(trancheAmount, 0, 0);
      const afterFirstClaim = await usdc.balanceOf(USDC_WHALE);

      console.log("USDC Claimed:", ethers.formatUnits(afterFirstClaim - initialUSDC, 6), "USDC");
      console.log("\nAttempting Second Claim (Should Fail)...");
      console.log("==================\n");

      await expect(insurance.connect(whale).claim(trancheAmount, 0, 0))
        .to.be.revertedWith("Insurance: insufficient A balance");
    });
  });

  after(async function () {
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  });
});


//TODO! There should be tests for when people forget to call invest on or after T1, and tests for when people forget to call divest before T2 begins
