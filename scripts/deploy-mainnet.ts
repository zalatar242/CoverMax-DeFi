import { ethers, network } from "hardhat";
import { deployCoreContracts } from "./core/deployCore";
import { networks } from "../config/addresses";
import { updateContractsJson } from "./utils/config";

async function main() {
  const networkKey = "mainnet"; // Always use mainnet addresses
  const addresses = networks[networkKey];

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts on ${network.name} with account:`, deployer.address);
  console.log("Using mainnet addresses configuration");

  // Deploy core contracts with mainnet addresses
  const contracts = await deployCoreContracts({
    USDC_ADDRESS: addresses.USDC_ADDRESS,
    AAVE_V3_POOL: addresses.AAVE_V3_POOL,
    AAVE_DATA_PROVIDER: addresses.AAVE_DATA_PROVIDER,
    MOONWELL_USDC: addresses.MOONWELL_USDC,
    COMPOUND_USDC_MARKET: addresses.COMPOUND_USDC_MARKET
  });

  // Update contracts.json with deployed addresses for the current network
  await updateContractsJson(network.name, [
    { name: "Insurance", contract: contracts.insurance },
    { name: "AaveLendingAdapter", contract: contracts.aaveAdapter },
    { name: "MoonwellLendingAdapter", contract: contracts.moonwellAdapter },
    { name: "CompoundLendingAdapter", contract: contracts.compoundAdapter },
    { name: "TrancheA", contract: contracts.trancheA },
    { name: "TrancheB", contract: contracts.trancheB },
    { name: "TrancheC", contract: contracts.trancheC }
  ]);

  console.log("\nMainnet deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
