import { expect } from "chai";
import { ethers } from "hardhat";

describe("SplitInsurance Basic Test", function () {
  let splitInsurance: any;
  let mockDai: any;
  let deployer: any;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy MockDAI instances
    const MockDAIFactory = await ethers.getContractFactory("MockDAI", deployer);
    mockDai = await MockDAIFactory.deploy(false); // Regular DAI
    await mockDai.deploymentTransaction()?.wait();

    // Use same mock instance for both aDAI and cDAI in basic test
    const mockCDai = await MockDAIFactory.deploy(true); // cDAI instance
    await mockCDai.deploymentTransaction()?.wait();
    const mockADai = await MockDAIFactory.deploy(false); // aDAI instance
    await mockADai.deploymentTransaction()?.wait();

    // Deploy Mock Aave Lending Pool
    const MockAaveLendingPoolFactory = await ethers.getContractFactory("MockAaveLendingPool", deployer);
    const mockAaveLendingPool = await MockAaveLendingPoolFactory.deploy(await mockADai.getAddress());
    await mockAaveLendingPool.deploymentTransaction()?.wait();

    // Deploy SplitInsurance
    const SplitInsuranceFactory = await ethers.getContractFactory("SplitInsurance", deployer);
    splitInsurance = await SplitInsuranceFactory.deploy(
      await mockDai.getAddress(),
      await mockAaveLendingPool.getAddress(),
      await mockADai.getAddress(),
      await mockCDai.getAddress()
    );
    await splitInsurance.deploymentTransaction()?.wait();
  });

  it("Should deploy successfully", async function () {
    expect(await splitInsurance.getAddress()).to.be.properAddress;
  });
});
