import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MockUSDC...");

  // Get the contract factory for MockUSDC specifically
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  console.log("Contract factory created, deploying...");
  const usdc = await MockUSDC.deploy();

  console.log("Waiting for deployment...");
  await usdc.waitForDeployment();

  const address = await usdc.getAddress();
  console.log("MockUSDC deployed to:", address);

  // Verify the deployment
  const name = await usdc.name();
  const symbol = await usdc.symbol();
  const decimals = await usdc.decimals();

  console.log(`Token details: ${name} (${symbol}) with ${decimals} decimals`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
