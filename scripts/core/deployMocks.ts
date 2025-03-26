import { ethers } from "hardhat";
import { Contract } from "ethers";

export async function deployMocks() {
  console.log("\nDeploying mock contracts...");
  const [deployer] = await ethers.getSigners();

  // Deploy USDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();

  // Deploy Aave contracts
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const mockAavePool = await MockAavePool.deploy(await mockUSDC.getAddress());
  await mockAavePool.waitForDeployment();

  const aTokenAddress = await mockAavePool.aTokens(await mockUSDC.getAddress());

  const MockAavePoolDataProvider = await ethers.getContractFactory("MockAavePoolDataProvider");
  const mockDataProvider = await MockAavePoolDataProvider.deploy(await mockUSDC.getAddress(), aTokenAddress);
  await mockDataProvider.waitForDeployment();

  // Deploy Compound contracts
  const MockComet = await ethers.getContractFactory("MockComet");
  const mockComet = await MockComet.deploy(await mockUSDC.getAddress());
  await mockComet.waitForDeployment();

  // Deploy Moonwell contracts
  const MockMToken = await ethers.getContractFactory("MockMToken");
  const mockMToken = await MockMToken.deploy(await mockUSDC.getAddress());
  await mockMToken.waitForDeployment();

  const MockMoonwellComptroller = await ethers.getContractFactory("MockMoonwellComptroller");
  const mockComptroller = await MockMoonwellComptroller.deploy(await mockMToken.getAddress());
  await mockComptroller.waitForDeployment();

  // Mint initial USDC to deployer
  const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
  await mockUSDC.mint(deployer.address, mintAmount);

  const addresses = {
    usdcAddress: await mockUSDC.getAddress(),
    aavePool: await mockAavePool.getAddress(),
    aaveDataProvider: await mockDataProvider.getAddress(),
    moonwellComptroller: await mockComptroller.getAddress(),
    moonwellUsdc: await mockMToken.getAddress(),
    compoundMarket: await mockComet.getAddress()
  };

  console.log("\nMock contracts deployed:");
  console.log(addresses);

  return addresses;
}
