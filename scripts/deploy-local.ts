import { ethers } from "hardhat";
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
    COMPOUND_USDC_MARKET: mockAddresses.compoundMarket,
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
    MOONWELL_USDC: mockAddresses.moonwellUsdc,
    COMPOUND_USDC_MARKET: mockAddresses.compoundMarket
  });

  // 4. Update contracts.json with deployed addresses
  await updateContractsJson("hardhat", [
    { name: "Insurance", contract: contracts.insurance },
    { name: "AaveLendingAdapter", contract: contracts.aaveAdapter },
    { name: "MoonwellLendingAdapter", contract: contracts.moonwellAdapter },
    { name: "CompoundLendingAdapter", contract: contracts.compoundAdapter },
    { name: "TrancheA", contract: contracts.trancheA },
    { name: "TrancheB", contract: contracts.trancheB },
    { name: "TrancheC", contract: contracts.trancheC }
  ]);

  console.log("\nLocal deployment complete! The environment is ready for testing.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
