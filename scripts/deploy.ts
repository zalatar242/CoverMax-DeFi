import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log("Deploying contracts on network:", network.name, "chainId:", network.chainId);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Mock USDC
  console.log("Deploying Mock USDC...");
  const MockUSDC: ContractFactory = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy();
  const mockUsdcAddress = await mockUsdc.getAddress();
  console.log("MockUSDC deployed to:", mockUsdcAddress);

  // Deploy Mock Aave Lending Pool
  console.log("Deploying Mock Lending Pool...");
  const MockAaveLendingPool: ContractFactory = await ethers.getContractFactory("MockAaveLendingPool");
  const mockAaveLendingPool = await MockAaveLendingPool.deploy();
  const mockAaveLendingPoolAddress = await mockAaveLendingPool.getAddress();
  console.log("MockAaveLendingPool deployed to:", mockAaveLendingPoolAddress);

  // Deploy Insurance
  console.log("Deploying Insurance contract...");
  const Insurance: ContractFactory = await ethers.getContractFactory("Insurance");
  const insurance = await Insurance.deploy(mockUsdcAddress);
  const insuranceAddress = await insurance.getAddress();
  console.log("Insurance deployed to:", insuranceAddress);

  // Add lending adapter to Insurance
  console.log("Adding lending adapter...");
  const tx = await (insurance as any).addLendingAdapter(mockAaveLendingPoolAddress);
  await tx.wait();
  console.log("Lending adapter added");

  // Get tranche addresses for verification
  const trancheA = await (insurance as any).A();
  const trancheB = await (insurance as any).B();
  const trancheC = await (insurance as any).C();

  console.log("\nDeployment Summary");
  console.log("-----------------");
  console.log("USDC:", mockUsdcAddress);
  console.log("Insurance:", insuranceAddress);
  console.log("Tranche A:", trancheA);
  console.log("Tranche B:", trancheB);
  console.log("Tranche C:", trancheC);
  console.log("Lending Pool:", mockAaveLendingPoolAddress);
  console.log("\nDeployment complete.");

  // Wait for all transactions to be mined
  await Promise.all([
    mockUsdc.deploymentTransaction()?.wait(),
    mockAaveLendingPool.deploymentTransaction()?.wait(),
    insurance.deploymentTransaction()?.wait()
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
