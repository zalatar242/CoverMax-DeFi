import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Insurance, IERC20, AaveLendingAdapter, Tranche } from "../typechain-types";
import { networks } from "../config/addresses";

describe("Insurance (Base Mainnet Fork)", function () {
  // Get addresses from network config
  const { USDC_ADDRESS, AAVE_V3_POOL, AAVE_DATA_PROVIDER, USDC_WHALE } = networks.mainnet;

  let insurance: Insurance;
  let usdc: IERC20;
  let aaveAdapter: AaveLendingAdapter;
  let deployer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let whale: HardhatEthersSigner;
  let trancheAAA: Tranche;
  let trancheAA: Tranche;

  // Helper function to advance time
  const advanceTime = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  };

  // Constants for time periods (updated to match contract)
  const DAY = 24 * 60 * 60;
  const ISSUANCE_PERIOD = 2 * DAY;
  const INSURANCE_PERIOD = 5 * DAY;

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
    usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDC_ADDRESS) as unknown as IERC20;

    // Deploy Insurance contract
    const Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.deploy(USDC_ADDRESS) as Insurance;

    // Deploy Aave adapter
    const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
    aaveAdapter = await AaveAdapter.deploy(AAVE_V3_POOL, AAVE_DATA_PROVIDER) as AaveLendingAdapter;
    await aaveAdapter.waitForDeployment();

    // Get Tranche token contracts
    const trancheAAAAddress = await insurance.AAA();
    const trancheAAAddress = await insurance.AA();

    trancheAAA = await ethers.getContractAt("Tranche", trancheAAAAddress) as Tranche;
    trancheAA = await ethers.getContractAt("Tranche", trancheAAAddress) as Tranche;

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
      console.log("Tranche AAA:", await trancheAAA.getAddress());
      console.log("Tranche AA:", await trancheAA.getAddress());
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

  describe("Deployment", function () {
    it("Should deploy successfully with correct initial state", async function () {
      expect(await insurance.getAddress()).to.be.properAddress;
      expect(await trancheAAA.getAddress()).to.be.properAddress;
      expect(await trancheAA.getAddress()).to.be.properAddress;

      // Check initial state
      expect(await insurance.totalTranches()).to.equal(0);
      expect(await insurance.totalInvested()).to.equal(0);
    });

    it("Should set correct token addresses and time periods", async function () {
      expect(await insurance.usdc()).to.equal(USDC_ADDRESS);

      const deployTime = (await ethers.provider.getBlock("latest"))!.timestamp;
      const S = await insurance.S();
      const T1 = await insurance.T1();

      // Use approximately equal due to potential block timestamp variations
      expect(S).to.be.closeTo(deployTime + ISSUANCE_PERIOD, 15);
      expect(T1).to.be.closeTo(deployTime + ISSUANCE_PERIOD + INSURANCE_PERIOD, 15);
    });
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
      // Try with amount = 4 (minimum valid amount - must be > 2 and divisible by 2)
      const minAmount = 4n;
      await insurance.connect(attacker).splitRisk(minAmount);

      const expectedTranche = minAmount / 2n;
      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(expectedTranche);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(expectedTranche);
    });

    it("Should emit RiskSplit event with correct parameters", async function () {
      const amount = ethers.parseUnits("100", 6); // 100 USDC (divisible by 2)
      await expect(insurance.connect(attacker).splitRisk(amount))
        .to.emit(insurance, "RiskSplit")
        .withArgs(attacker.address, amount);
    });

    it("Should prevent amount not divisible by 2 in splitRisk", async function () {
      const amount = ethers.parseUnits("101", 6); // Odd number
      await expect(insurance.connect(attacker).splitRisk(amount))
        .to.be.revertedWith("Insurance: Amount must be divisible by 2");
    });

    it("Should prevent zero amount in splitRisk", async function () {
      await expect(insurance.connect(attacker).splitRisk(0))
        .to.be.revertedWith("Insurance: amount too low");
    });

    it("Should handle large amounts correctly", async function () {
      const largeAmount = ethers.parseUnits("98", 6); // Using 98 USDC (must be divisible by 2)
      await insurance.connect(attacker).splitRisk(largeAmount);
      const expectedTranche = largeAmount / 2n;
      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(expectedTranche);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(expectedTranche);
    });
  });

  describe("Claims", function () {
    it("Should prevent claiming during insurance period", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insurance.connect(attacker).splitRisk(amount);

      // Try to claim during insurance period (between S and T1)
      await advanceTime(ISSUANCE_PERIOD + 1); // After S but before T1
      await expect(insurance.connect(attacker).claim(10, 10))
        .to.be.revertedWith("Insurance: Claims can only be made before the insurance phase starts or after it ends");
    });

    it("Should allow claiming before insurance period starts", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insurance.connect(attacker).splitRisk(amount);

      // Should be able to claim immediately after split (before S)
      const trancheAmount = amount / 2n;
      await insurance.connect(attacker).claim(trancheAmount, trancheAmount);

      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(0);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(0);
    });

    it("Should allow claiming after insurance period ends", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insurance.connect(attacker).splitRisk(amount);

      // Advance time past T1 (insurance period ends)
      await advanceTime(ISSUANCE_PERIOD + INSURANCE_PERIOD + 1);

      const trancheAmount = amount / 2n;
      await insurance.connect(attacker).claim(trancheAmount, trancheAmount);

      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(0);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(0);
    });

    it("Should handle claimAll function correctly", async function () {
      const amount = ethers.parseUnits("100", 6);
      await insurance.connect(attacker).splitRisk(amount);

      console.log("\nClaim All Test");
      console.log("==============");

      const beforeBalanceAAA = await trancheAAA.balanceOf(attacker.address);
      const beforeBalanceAA = await trancheAA.balanceOf(attacker.address);
      const initialUSDC = await usdc.balanceOf(attacker.address);

      console.log("\nInitial Balances:");
      console.log("----------------");
      console.log("Tranche AAA:", ethers.formatUnits(beforeBalanceAAA, 18), "shares");
      console.log("Tranche AA:", ethers.formatUnits(beforeBalanceAA, 18), "shares");
      console.log("USDC:", ethers.formatUnits(initialUSDC, 6), "USDC");

      expect(beforeBalanceAAA).to.be.gt(0);
      expect(beforeBalanceAA).to.be.gt(0);

      // Claim all tranches
      await insurance.connect(attacker).claimAll();

      const afterUSDC = await usdc.balanceOf(attacker.address);
      console.log("\nFinal Balances:");
      console.log("--------------");
      console.log("Tranche AAA: 0 shares");
      console.log("Tranche AA: 0 shares");
      console.log("USDC:", ethers.formatUnits(afterUSDC, 6), "USDC");
      console.log("USDC Claimed:", ethers.formatUnits(afterUSDC - initialUSDC, 6), "USDC");
      console.log("==============\n");

      // Verify all balances are now 0
      expect(await trancheAAA.balanceOf(attacker.address)).to.equal(0);
      expect(await trancheAA.balanceOf(attacker.address)).to.equal(0);
    });

    it("Should prevent double claiming", async function () {
      console.log("\nDouble Claiming Test");
      console.log("==================");

      const amount = ethers.parseUnits("100", 6);
      console.log("Initial amount:", ethers.formatUnits(amount, 6), "USDC");
      await insurance.connect(whale).splitRisk(amount);

      const trancheAmount = amount / 2n;
      console.log("\nFirst Claim:");
      console.log("------------");
      console.log("Claiming Tranche AAA:", ethers.formatUnits(trancheAmount, 6), "USDC");

      const initialUSDC = await usdc.balanceOf(USDC_WHALE);
      await insurance.connect(whale).claim(trancheAmount, 0);
      const afterFirstClaim = await usdc.balanceOf(USDC_WHALE);

      console.log("USDC Claimed:", ethers.formatUnits(afterFirstClaim - initialUSDC, 6), "USDC");
      console.log("\nAttempting Second Claim (Should Fail)...");
      console.log("==================\n");

      await expect(insurance.connect(whale).claim(trancheAmount, 0))
        .to.be.revertedWith("Insurance: insufficient AAA balance");
    });
  });

  after(async function () {
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  });
});


//TODO! There should be tests for when people forget to call invest on or after T1, and tests for when people forget to call divest before T2 begins
