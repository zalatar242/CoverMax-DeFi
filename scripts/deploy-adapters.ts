import { ethers, run, network } from "hardhat";
import { updateContractsJson } from "./utils";
import { networks } from "../config/addresses";

async function verifyContract(address: string, args: any[] = []) {
  console.log(`Verifying contract at ${address}...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments: args,
    });
  } catch (err) {
    console.log("Verification error:", err);
  }
}

async function main() {
  const networkKey = "mainnet"; // Always use mainnet addresses
  const addresses = networks[networkKey];

  console.log(`Deploying lending adapters on ${network.name} (using mainnet addresses)...`);

  // Deploy Aave adapter
  const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
  const aaveAdapter = await AaveAdapter.deploy(
    addresses.AAVE_V3_POOL,
    addresses.AAVE_DATA_PROVIDER
  );
  await aaveAdapter.waitForDeployment();
  console.log("AaveLendingAdapter deployed to:", await aaveAdapter.getAddress());

  // Deploy Moonwell adapter
  const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
  const moonwellAdapter = await MoonwellAdapter.deploy(
    addresses.MOONWELL_USDC
  );
  await moonwellAdapter.waitForDeployment();
  console.log("MoonwellLendingAdapter deployed to:", await moonwellAdapter.getAddress());

  // Deploy Compound adapter
  const CompoundAdapter = await ethers.getContractFactory("CompoundLendingAdapter");
  const compoundAdapter = await CompoundAdapter.deploy(
    addresses.COMPOUND_USDC_MARKET
  );
  await compoundAdapter.waitForDeployment();
  console.log("CompoundLendingAdapter deployed to:", await compoundAdapter.getAddress());

  // Only verify contracts on mainnet (not hardhat/localhost)
  if (network.name === "base-mainnet") {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify all contracts
    await verifyContract(await aaveAdapter.getAddress(), [addresses.AAVE_V3_POOL, addresses.AAVE_DATA_PROVIDER]);
    await verifyContract(await moonwellAdapter.getAddress(), [addresses.MOONWELL_USDC]);
    await verifyContract(await compoundAdapter.getAddress(), [addresses.COMPOUND_USDC_MARKET]);
  } else {
    console.log("\nSkipping contract verification on local network");
  }

  // Update contracts.json
  await updateContractsJson(networkKey, [
    { name: "AaveLendingAdapter", contract: aaveAdapter },
    { name: "MoonwellLendingAdapter", contract: moonwellAdapter },
    { name: "CompoundLendingAdapter", contract: compoundAdapter }
  ]);

  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log(`Network: ${network.name}`);
  console.log(`AaveLendingAdapter: ${await aaveAdapter.getAddress()}`);
  console.log(`MoonwellLendingAdapter: ${await moonwellAdapter.getAddress()}`);
  console.log(`CompoundLendingAdapter: ${await compoundAdapter.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
