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
  // Deploy Aave contracts
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const mockAavePool = await MockAavePool.deploy(await mockUSDC.getAddress());
  await mockAavePool.waitForDeployment();

  // Get the aToken address that was created during MockAavePool deployment
  const usdcAddress = await mockUSDC.getAddress();
  const aTokenAddress = await mockAavePool.aTokens(usdcAddress);
  console.log("Deployed aToken address:", aTokenAddress);

  // Deploy MockAavePoolDataProvider with the correct aToken address
  const MockAavePoolDataProvider = await ethers.getContractFactory("MockAavePoolDataProvider");
  const mockDataProvider = await MockAavePoolDataProvider.deploy(usdcAddress, aTokenAddress);
  await mockDataProvider.waitForDeployment();

  // Verify the aToken is correctly set
  const storedAToken = await mockDataProvider.getReserveTokensAddresses(usdcAddress);
  console.log("Stored aToken address:", storedAToken[0]);

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
    moonwellUsdc: await mockMToken.getAddress()
  };

  console.log("\nMock contracts deployed:");
  console.log(addresses);

  return addresses;
}
