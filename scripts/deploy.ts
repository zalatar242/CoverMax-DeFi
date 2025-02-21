import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  console.log("printing..")
  const network = await ethers.provider.getNetwork();
  console.log("network:", network);
  console.log("Deploying contracts on network:", network.name, "chainId:", network.chainId);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Insurance contract with a higher gas limit
  console.log("Deploying Insurance contract...");
  // Deploy Mock Contracts
  console.log("Deploying Mock Contracts...");

  const MockDAIFactory = await ethers.getContractFactory("MockDAI");
  const mockDai = await MockDAIFactory.deploy();
  await mockDai.deploymentTransaction()?.wait();
  console.log("MockDAI deployed to:", await mockDai.getAddress());

  const mockADai = await MockDAIFactory.deploy();
  await mockADai.deploymentTransaction()?.wait();
  console.log("MockADAI deployed to:", await mockADai.getAddress());

  const mockCDai = await MockDAIFactory.deploy();
  await mockCDai.deploymentTransaction()?.wait();
  console.log("MockCDAI deployed to:", await mockCDai.getAddress());

  const MockAaveLendingPoolFactory = await ethers.getContractFactory("MockAaveLendingPool");
  const mockAaveLendingPool = await MockAaveLendingPoolFactory.deploy();
  await mockAaveLendingPool.deploymentTransaction()?.wait();
  console.log("MockAaveLendingPool deployed to:", await mockAaveLendingPool.getAddress());

  // Deploy SplitInsurance
  console.log("Deploying SplitInsurance...");
  const InsuranceFactory = await ethers.getContractFactory("SplitInsurance");
  const insurance = await InsuranceFactory.deploy(
    await mockDai.getAddress(),
    await mockAaveLendingPool.getAddress(),
    await mockADai.getAddress(),
    await mockCDai.getAddress()
  );
  const deployTx = await insurance.deploymentTransaction();
  if (!deployTx) throw new Error("Deployment transaction not found");
  await deployTx.wait();
  console.log("SplitInsurance deployed to:", await insurance.getAddress());
  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
