import { ethers, run, network } from "hardhat";
import { BaseContract } from "ethers";

export interface DeploymentAddresses {
  USDC_ADDRESS: string;
  AAVE_V3_POOL: string;
  AAVE_DATA_PROVIDER: string;
  MOONWELL_USDC: string;
  COMPOUND_USDC_MARKET: string;
}

export interface DeployedContracts {
  insurance: BaseContract;
  aaveAdapter: BaseContract;
  moonwellAdapter: BaseContract;
  compoundAdapter: BaseContract;
  trancheA: BaseContract;
  trancheB: BaseContract;
  trancheC: BaseContract;
}

async function verifyContract(address: string, args: any[] = []) {
  if (!["base-mainnet", "mainnet"].includes(network.name)) {
    console.log("Skipping verification on non-mainnet network");
    return;
  }

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

export async function deployCoreContracts(addresses: DeploymentAddresses): Promise<DeployedContracts> {
  console.log(`\nDeploying core contracts on ${network.name}...`);

  // Deploy Lending Adapters
  const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
  const aaveAdapter = await AaveAdapter.deploy(
    addresses.AAVE_V3_POOL,
    addresses.AAVE_DATA_PROVIDER
  );
  await aaveAdapter.waitForDeployment();

  const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
  const moonwellAdapter = await MoonwellAdapter.deploy(
    addresses.MOONWELL_USDC
  );
  await moonwellAdapter.waitForDeployment();

  const CompoundAdapter = await ethers.getContractFactory("CompoundLendingAdapter");
  const compoundAdapter = await CompoundAdapter.deploy(
    addresses.COMPOUND_USDC_MARKET
  );
  await compoundAdapter.waitForDeployment();

  // Deploy Insurance
  const Insurance = await ethers.getContractFactory("Insurance");
  const insurance = await Insurance.deploy(addresses.USDC_ADDRESS);
  await insurance.waitForDeployment();

  // Add lending adapters
  await (await insurance.addLendingAdapter(await aaveAdapter.getAddress())).wait();
  await (await insurance.addLendingAdapter(await moonwellAdapter.getAddress())).wait();
  await (await insurance.addLendingAdapter(await compoundAdapter.getAddress())).wait();

  // Get tranche addresses
  const trancheA = await ethers.getContractAt("Tranche", await insurance.A());
  const trancheB = await ethers.getContractAt("Tranche", await insurance.B());
  const trancheC = await ethers.getContractAt("Tranche", await insurance.C());

  // Verify contracts if on mainnet
  if (["base-mainnet", "mainnet"].includes(network.name)) {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    await verifyContract(await insurance.getAddress(), [addresses.USDC_ADDRESS]);
    await verifyContract(await aaveAdapter.getAddress(), [addresses.AAVE_V3_POOL, addresses.AAVE_DATA_PROVIDER]);
    await verifyContract(await moonwellAdapter.getAddress(), [addresses.MOONWELL_USDC]);
    await verifyContract(await compoundAdapter.getAddress(), [addresses.COMPOUND_USDC_MARKET]);
    await verifyContract(await trancheA.getAddress());
    await verifyContract(await trancheB.getAddress());
    await verifyContract(await trancheC.getAddress());
  }

  console.log("\nCore contracts deployed:");
  console.log("Insurance:", await insurance.getAddress());
  console.log("Aave Adapter:", await aaveAdapter.getAddress());
  console.log("Moonwell Adapter:", await moonwellAdapter.getAddress());
  console.log("Compound Adapter:", await compoundAdapter.getAddress());
  console.log("Tranche A:", await trancheA.getAddress());
  console.log("Tranche B:", await trancheB.getAddress());
  console.log("Tranche C:", await trancheC.getAddress());

  return {
    insurance,
    aaveAdapter,
    moonwellAdapter,
    compoundAdapter,
    trancheA,
    trancheB,
    trancheC
  };
}
