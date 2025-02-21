import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MockUSDC, ILendingAdapter, Tranche, Insurance, MockAaveLendingPool } from "../typechain-types";

describe("Insurance Contract", function () {
  let insurance: Insurance;
  let mockUsdc: MockUSDC;
  let mockAaveLendingPool: MockAaveLendingPool;
  let deployer: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
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

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC: ContractFactory = await ethers.getContractFactory("MockUSDC");
    mockUsdc = await MockUSDC.deploy() as MockUSDC;

    // Deploy Mock Aave Lending Pool
    const MockAaveLendingPool: ContractFactory = await ethers.getContractFactory("MockAaveLendingPool");
    mockAaveLendingPool = await MockAaveLendingPool.deploy() as MockAaveLendingPool;

    // Deploy Insurance contract
    const Insurance: ContractFactory = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.deploy(await mockUsdc.getAddress()) as Insurance;

    // Get Tranche token contracts
    const trancheAAddress = await insurance.A();
    const trancheBAddress = await insurance.B();
    const trancheCAddress = await insurance.C();

    const Tranche: ContractFactory = await ethers.getContractFactory("Tranche");
    trancheA = Tranche.attach(trancheAAddress) as Tranche;
    trancheB = Tranche.attach(trancheBAddress) as Tranche;
    trancheC = Tranche.attach(trancheCAddress) as Tranche;

    // Add lending adapter
    await insurance.addLendingAdapter(await mockAaveLendingPool.getAddress());

    // Mint USDC to users for testing
    await mockUsdc.mint(user1.address, ethers.parseUnits("1000", 6));
    await mockUsdc.mint(user2.address, ethers.parseUnits("1000", 6));

    // Approve insurance contract to spend USDC
    await mockUsdc.connect(user1).approve(await insurance.getAddress(), ethers.parseUnits("1000", 6));
    await mockUsdc.connect(user2).approve(await insurance.getAddress(), ethers.parseUnits("1000", 6));
  });

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
      expect(await insurance.usdc()).to.equal(await mockUsdc.getAddress());

      const deployTime = (await ethers.provider.getBlock("latest"))!.timestamp;
      const S = await insurance.S();
      const T1 = await insurance.T1();

      // Use approximately equal due to potential block timestamp variations
      expect(S).to.be.closeTo(deployTime + ISSUANCE_PERIOD, 5);
      expect(T1).to.be.closeTo(deployTime + ISSUANCE_PERIOD + INSURANCE_PERIOD, 5);
    });
  });

  describe("Risk Splitting", function () {
    it("Should split risk correctly with equal allocation", async function () {
      const amount = ethers.parseUnits("300", 6);
      await insurance.connect(user1).splitRisk(amount);

      const expectedTranche = amount / 3n;
      expect(await trancheA.balanceOf(user1.address)).to.equal(expectedTranche);
      expect(await trancheB.balanceOf(user1.address)).to.equal(expectedTranche);
      expect(await trancheC.balanceOf(user1.address)).to.equal(expectedTranche);
    });

    it("Should handle minimum amounts correctly", async function () {
      // Try with amount = 3 (minimum valid amount)
      const minAmount = 3n;
      await insurance.connect(user1).splitRisk(minAmount);

      const expectedTranche = minAmount / 3n;
      expect(await trancheA.balanceOf(user1.address)).to.equal(expectedTranche);
    });

    it("Should fail with amount less than 3", async function () {
      await expect(insurance.connect(user1).splitRisk(2))
        .to.be.revertedWith("Insurance: amount too low");
    });

    it("Should require amount to be divisible by 3", async function () {
      const amount = ethers.parseUnits("100", 6); // Not divisible by 3
      await expect(insurance.connect(user1).splitRisk(amount))
        .to.be.revertedWith("Insurance: amount must be divisible by 3");
    });

    it("Should fail after issuance period", async function () {
      await advanceTime(ISSUANCE_PERIOD + 1);
      const amount = ethers.parseUnits("300", 6);
      await expect(insurance.connect(user1).splitRisk(amount))
        .to.be.revertedWith("Insurance: issuance ended");
    });

    it("Should emit RiskSplit event with correct parameters", async function () {
      const amount = ethers.parseUnits("300", 6);
      await expect(insurance.connect(user1).splitRisk(amount))
        .to.emit(insurance, "RiskSplit")
        .withArgs(user1.address, amount);
    });
  });

  describe("Investment", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("300", 6);
      await insurance.connect(user1).splitRisk(amount);
    });

    it("Should invest funds correctly across multiple adapters", async function () {
      // Add another lending adapter
      const MockAaveLendingPool2 = await ethers.getContractFactory("MockAaveLendingPool");
      const mockAaveLendingPool2 = await MockAaveLendingPool2.deploy();
      await insurance.addLendingAdapter(await mockAaveLendingPool2.getAddress());

      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();

      // Check balances in both adapters
      const balance1 = await mockAaveLendingPool.getBalance(await mockUsdc.getAddress());
      const balance2 = await mockAaveLendingPool2.getBalance(await mockUsdc.getAddress());
      const totalBalance = balance1 + balance2;

      expect(totalBalance).to.equal(ethers.parseUnits("300", 6));
      expect(balance1).to.equal(balance2); // Equal distribution
    });

    it("Should handle failed deposits gracefully", async function () {
      await advanceTime(ISSUANCE_PERIOD);

      // Make first adapter fail
      await mockAaveLendingPool.setShouldRevert(true);

      // Investment should still complete
      await expect(insurance.invest())
        .to.emit(mockAaveLendingPool, "LendingError")
        .withArgs(await mockUsdc.getAddress(), ethers.parseUnits("300", 6), 1);

      expect(await insurance.isInvested()).to.be.true;
    });

    it("Should fail if no USDC balance", async function () {
      // Deploy new insurance contract without depositing USDC
      const Insurance = await ethers.getContractFactory("Insurance");
      const newInsurance = await Insurance.deploy(await mockUsdc.getAddress());
      await newInsurance.addLendingAdapter(await mockAaveLendingPool.getAddress());

      // Skip to after issuance period
      await advanceTime(ISSUANCE_PERIOD + 1);

      await expect(newInsurance.invest())
        .to.be.revertedWith("Insurance: no USDC");
    });

    it("Should fail if no adapters", async function () {
      // Deploy new insurance contract without adapters
      const Insurance = await ethers.getContractFactory("Insurance");
      const newInsurance = await Insurance.deploy(await mockUsdc.getAddress());

      await advanceTime(ISSUANCE_PERIOD);
      await expect(newInsurance.invest())
        .to.be.revertedWith("Insurance: no adapters");
    });
  });

  describe("Divestment and Claims", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("300", 6);
      await insurance.connect(user1).splitRisk(amount);
      await advanceTime(ISSUANCE_PERIOD);
      await insurance.invest();
      await advanceTime(INSURANCE_PERIOD);
    });

    it("Should divest and calculate payouts correctly with no losses", async function () {
      await insurance.divest();
      expect(await insurance.inLiquidMode()).to.be.true;

      const payoutA = await insurance.usdcPayoutA();
      const payoutB = await insurance.usdcPayoutB();
      const payoutC = await insurance.usdcPayoutC();

      expect(payoutA).to.equal(payoutB);
      expect(payoutB).to.equal(payoutC);
    });

    it("Should handle severe losses correctly", async function () {
      // Mock the adapter response to simulate loss
      await mockAaveLendingPool.simulateWithdrawLoss(await mockUsdc.getAddress(), 90);

      await insurance.divest();

      const payoutA = await insurance.usdcPayoutA();
      const payoutB = await insurance.usdcPayoutB();
      const payoutC = await insurance.usdcPayoutC();

      // A should get partial payment, B and C nothing
      expect(payoutA).to.be.gt(0);
      expect(payoutB).to.equal(0);
      expect(payoutC).to.equal(0);
    });

    it("Should handle claims with different combinations", async function () {
      await insurance.divest();

      // Claim only A tranches
      const balanceA = await trancheA.balanceOf(user1.address);
      await insurance.connect(user1).claim(balanceA, 0, 0);
      expect(await trancheA.balanceOf(user1.address)).to.equal(0);
      expect(await trancheB.balanceOf(user1.address)).to.be.gt(0);
      expect(await trancheC.balanceOf(user1.address)).to.be.gt(0);

      // Claim remaining all at once
      const balanceB = await trancheB.balanceOf(user1.address);
      const balanceC = await trancheC.balanceOf(user1.address);
      await insurance.connect(user1).claim(0, balanceB, balanceC);
    });

    it("Should handle claimAll function correctly", async function () {
      // Divest first to enable claims
      await insurance.divest();

      const beforeBalanceA = await trancheA.balanceOf(user1.address);
      const beforeBalanceB = await trancheB.balanceOf(user1.address);
      const beforeBalanceC = await trancheC.balanceOf(user1.address);

      expect(beforeBalanceA).to.be.gt(0);
      expect(beforeBalanceB).to.be.gt(0);
      expect(beforeBalanceC).to.be.gt(0);

      // Approve all tranches before claiming
      await trancheA.connect(user1).approve(await insurance.getAddress(), beforeBalanceA);
      await trancheB.connect(user1).approve(await insurance.getAddress(), beforeBalanceB);
      await trancheC.connect(user1).approve(await insurance.getAddress(), beforeBalanceC);

      // Claim all tranches
      await insurance.connect(user1).claimAll();

      // Verify all balances are now 0
      expect(await trancheA.balanceOf(user1.address)).to.equal(0);
      expect(await trancheB.balanceOf(user1.address)).to.equal(0);
      expect(await trancheC.balanceOf(user1.address)).to.equal(0);
    });
  });
});
