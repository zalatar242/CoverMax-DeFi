import { ethers } from "hardhat";
import { formatUnits } from "ethers";
import { Insurance } from "../typechain-types";
import { deployMocks } from "./core/deployMocks";
import { deployCoreContracts } from "./core/deployCore";
import { updateNetworkConfig, updateContractsJson } from "./utils/config";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy mock contracts
  const mockAddresses = await deployMocks();

  // 2. Update addresses.ts with mock addresses
  updateNetworkConfig("hardhat", {
    USDC_ADDRESS: mockAddresses.usdcAddress,
    AAVE_V3_POOL: mockAddresses.aavePool,
    AAVE_DATA_PROVIDER: mockAddresses.aaveDataProvider,
    MOONWELL_COMPTROLLER: mockAddresses.moonwellComptroller,
    MOONWELL_USDC: mockAddresses.moonwellUsdc,
    UNISWAP_FACTORY: mockAddresses.uniswapFactory,
    UNISWAP_ROUTER: mockAddresses.uniswapRouter,
    WETH: mockAddresses.weth,
    chainId: 31337,
    blockExplorerUrl: "http://localhost:8545",
    defaultRpcUrl: "http://localhost:8545",
    USDC_WHALE: deployer.address
  });

  // 3. Deploy core contracts
  const contracts = await deployCoreContracts({
    USDC_ADDRESS: mockAddresses.usdcAddress,
    AAVE_V3_POOL: mockAddresses.aavePool,
    AAVE_DATA_PROVIDER: mockAddresses.aaveDataProvider,
    MOONWELL_USDC: mockAddresses.moonwellUsdc
  });

  // 4. Update contracts.json with all deployed addresses
  const mockAavePool = await ethers.getContractAt("MockAavePool", mockAddresses.aavePool);
  const mockAaveDataProvider = await ethers.getContractAt("MockAavePoolDataProvider", mockAddresses.aaveDataProvider);
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockAddresses.usdcAddress);

  // Get the aToken address that was created when deploying MockAavePool
  const aTokenAddress = await mockAavePool.aTokens(await mockUSDC.getAddress());
  console.log("Adding aToken to contracts.json:", aTokenAddress);
  const mockAToken = await ethers.getContractAt("MockAToken", aTokenAddress);

  // Get CoverMax token contract instance
  const coverMaxToken = await ethers.getContractAt("CoverMaxToken", mockAddresses.coverMaxToken);

  // Create Uniswap pairs for AAA and AA tokens
  console.log("\nCreating Uniswap pairs...");
  const factory = await ethers.getContractAt("UniswapV2Factory", mockAddresses.uniswapFactory);

  await (factory as any).createPair(await contracts.trancheAAA.getAddress(), mockAddresses.usdcAddress);
  console.log("Created AAA/USDC pair");
  await (factory as any).createPair(await contracts.trancheAA.getAddress(), mockAddresses.usdcAddress);
  console.log("Created AA/USDC pair");

  // Get pair addresses
  const aaaUsdcPair = await (factory as any).getPair(await contracts.trancheAAA.getAddress(), mockAddresses.usdcAddress);
  const aaUsdcPair = await (factory as any).getPair(await contracts.trancheAA.getAddress(), mockAddresses.usdcAddress);
  console.log("AAA/USDC pair:", aaaUsdcPair);
  console.log("AA/USDC pair:", aaUsdcPair);

  await updateContractsJson("hardhat", [
    // Mock contracts first
    { name: "CoverMaxToken", contract: coverMaxToken },
    { name: "USDC", contract: mockUSDC },
    { name: "AavePool", contract: mockAavePool },
    { name: "AavePoolDataProvider", contract: mockAaveDataProvider },
    { name: "AToken", contract: mockAToken },  // Add the aToken contract

    // Core contracts
    { name: "Insurance", contract: contracts.insurance },
    { name: "AaveLendingAdapter", contract: contracts.aaveAdapter },
    { name: "MoonwellLendingAdapter", contract: contracts.moonwellAdapter },
    { name: "TrancheAAA", contract: contracts.trancheAAA },
    { name: "TrancheAA", contract: contracts.trancheAA },

    // Uniswap contracts
    { name: "UniswapV2Factory", contract: factory },
    { name: "UniswapV2Router02", contract: await ethers.getContractAt("UniswapV2Router02", mockAddresses.uniswapRouter) },
    { name: "AAAUSDCPair", contract: await ethers.getContractAt("UniswapV2Pair", aaaUsdcPair) },
    { name: "AAUSDCPair", contract: await ethers.getContractAt("UniswapV2Pair", aaUsdcPair) }
  ]);

  console.log("\nLocal deployment complete! The environment is ready for testing.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
