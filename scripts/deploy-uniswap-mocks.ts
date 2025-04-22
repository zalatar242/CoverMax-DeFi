import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Uniswap V2 mocks with account:", await deployer.getAddress());

  // Deploy Mock USDC if needed (use existing if available)
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // Deploy Factory
  const MockUniswapV2Factory = await ethers.getContractFactory("MockUniswapV2Factory");
  const factory = await MockUniswapV2Factory.deploy(await deployer.getAddress());
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("MockUniswapV2Factory deployed to:", factoryAddress);

  // Deploy Router
  const MockUniswapV2Router02 = await ethers.getContractFactory("MockUniswapV2Router02");
  const router = await MockUniswapV2Router02.deploy(
    factoryAddress,
    ethers.ZeroAddress, // No WETH needed for our mock
    usdcAddress
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("MockUniswapV2Router02 deployed to:", routerAddress);

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
  await factory.createPair(aaaToken, usdcAddress);
  console.log("Created AAA/USDC pair");
  await factory.createPair(aaToken, usdcAddress);
  console.log("Created AA/USDC pair");

  // Get pair addresses
  const aaaUsdcPair = await factory.getPair(aaaToken, usdcAddress);
  const aaUsdcPair = await factory.getPair(aaToken, usdcAddress);
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
