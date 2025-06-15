import { ethers } from "hardhat";
import { Contract } from "ethers";
// import { UniswapV2Factory } from "../typechain-types"; // Changed import for UniswapV2Factory type
// Minimal interface for UniswapV2Factory removed for simplicity

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Uniswap V2 contracts with account:", await deployer.getAddress());

  // Deploy Mock USDC if needed (use existing if available)
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // Deploy Factory
  const UniswapV2FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2FactoryFactory.deploy(await deployer.getAddress());
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("UniswapV2Factory deployed to:", factoryAddress);

  // Router removed - using only core Uniswap V2 contracts
  const routerAddress = ethers.ZeroAddress; // Placeholder for router address

  // Get AAA and AA token addresses from Insurance contract
  const Insurance = await ethers.getContractFactory("Insurance");
  const insurance = await Insurance.deploy(usdcAddress);
  await insurance.waitForDeployment();
  const insuranceAddress = await insurance.getAddress();
  console.log("Insurance deployed to:", insuranceAddress);

  const aaaToken = await insurance.AAA();
  const aaToken = await insurance.AA();
  console.log("AAA Token:", aaaToken);
  console.log("AA Token:", aaToken);

  // Create pairs
  await (factory as any).createPair(aaaToken, usdcAddress);
  console.log(`Created AAA/USDC pair`);
  await (factory as any).createPair(aaToken, usdcAddress);
  console.log(`Created AA/USDC pair`);

  // Get pair addresses
  const aaaUsdcPair = await (factory as any).getPair(aaaToken, usdcAddress);
  const aaUsdcPair = await (factory as any).getPair(aaToken, usdcAddress);
  console.log("AAA/USDC pair:", aaaUsdcPair);
  console.log("AA/USDC pair:", aaUsdcPair);

  console.log("\nDeployment complete!");
  console.log("\nNext steps:");
  console.log("1. Add initial liquidity to both pairs");
  console.log("2. Test swapping between tokens");
  console.log("3. Verify contracts on block explorer if on testnet");

  // Return addresses for testing
  return {
    usdc: usdcAddress,
    factory: factoryAddress,
    router: routerAddress,
    insurance: insuranceAddress,
    aaaToken,
    aaToken,
    aaaUsdcPair,
    aaUsdcPair
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
