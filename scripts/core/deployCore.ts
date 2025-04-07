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
  if (!["base-mainnet", "mainnet", "base-sepolia"].includes(network.name)) {
    console.log("Skipping verification on unsupported network");
    return;
  }

  console.log(`Verifying contract at ${address}...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments: args,
    });
  } catch (err: any) {
    if (err.message.includes("Already Verified")) {
      console.log("Contract already verified");
    } else {
      console.error("Verification error:", err);
      throw err; // Rethrow to handle in the main deployment
    }
  }
}

async function waitForConfirmations(tx: any) {
  const receipt = await tx.wait(2); // Wait for 2 confirmations
  return receipt;
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

  // Add lending adapters with proper error handling and confirmations
  console.log("\nAdding lending adapters...");
  try {
    const tx1 = await insurance.addLendingAdapter(await aaveAdapter.getAddress());
    await waitForConfirmations(tx1);
    console.log("Added Aave adapter");

    const tx2 = await insurance.addLendingAdapter(await moonwellAdapter.getAddress());
    await waitForConfirmations(tx2);
    console.log("Added Moonwell adapter");

    const tx3 = await insurance.addLendingAdapter(await compoundAdapter.getAddress());
    await waitForConfirmations(tx3);
    console.log("Added Compound adapter");
  } catch (error) {
    console.error("Error adding lending adapters:", error);
    throw error;
  }

  // Verify tranche creation
  console.log("\nVerifying tranche contracts...");

  // Get tranche addresses
  const trancheA = await ethers.getContractAt("Tranche", await insurance.A());
  const trancheB = await ethers.getContractAt("Tranche", await insurance.B());
  const trancheC = await ethers.getContractAt("Tranche", await insurance.C());

  // Verify contracts
  if (["base-mainnet", "mainnet", "base-sepolia"].includes(network.name)) {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      console.log("\nVerifying contracts...");
      await verifyContract(await insurance.getAddress(), [addresses.USDC_ADDRESS]);
      await verifyContract(await aaveAdapter.getAddress(), [addresses.AAVE_V3_POOL, addresses.AAVE_DATA_PROVIDER]);
      await verifyContract(await moonwellAdapter.getAddress(), [addresses.MOONWELL_USDC]);
      await verifyContract(await compoundAdapter.getAddress(), [addresses.COMPOUND_USDC_MARKET]);
      await verifyContract(await trancheA.getAddress(), ["Tranche A", "TRA"]);
      await verifyContract(await trancheB.getAddress(), ["Tranche B", "TRB"]);
      await verifyContract(await trancheC.getAddress(), ["Tranche C", "TRC"]);
      console.log("All contracts verified successfully");
    } catch (error) {
      console.error("Error during contract verification:", error);
      // Don't throw here as verification failure shouldn't fail deployment
    }
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
