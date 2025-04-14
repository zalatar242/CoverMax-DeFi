import { ethers, run, network } from "hardhat";
import { BaseContract } from "ethers";

export interface DeploymentAddresses {
  USDC_ADDRESS: string;
  AAVE_V3_POOL: string;
  AAVE_DATA_PROVIDER: string;
  MOONWELL_USDC: string;
}

export interface DeployedContracts {
  insurance: BaseContract;
  aaveAdapter: BaseContract;
  moonwellAdapter: BaseContract;
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
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait(1); // Wait for 1 confirmation
  console.log("Transaction confirmed!");
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

  // Deploy Insurance
  const Insurance = await ethers.getContractFactory("Insurance");
  const insurance = await Insurance.deploy(addresses.USDC_ADDRESS);
  await insurance.waitForDeployment();

  // Add lending adapters with proper error handling and confirmations
  console.log("\nAdding lending adapters...");
  console.log("Insurance contract deployed at:", await insurance.getAddress());
  console.log("Current block timestamp:", await ethers.provider.getBlock("latest").then(b => b!.timestamp));
  console.log("Insurance S timestamp:", await insurance.S());
  try {
    // Add Aave adapter
    console.log("\nAttempting to add Aave adapter...");
    const aaveAdapterAddress = await aaveAdapter.getAddress();
    console.log("Aave adapter address:", aaveAdapterAddress);
    try {
      const tx1 = await insurance.addLendingAdapter(aaveAdapterAddress, { gasLimit: 500000 });
      console.log("Transaction sent, waiting for confirmation...");
      await tx1.wait();
      console.log("Added Aave adapter successfully");
    } catch (e: any) {
      console.error("Error adding Aave adapter:", e.message);
      if (e.data) console.error("Error data:", e.data);
      throw e;
    }

    // Add Moonwell adapter
    console.log("\nAttempting to add Moonwell adapter...");
    const moonwellAdapterAddress = await moonwellAdapter.getAddress();
    console.log("Moonwell adapter address:", moonwellAdapterAddress);
    try {
      const tx2 = await insurance.addLendingAdapter(moonwellAdapterAddress, { gasLimit: 500000 });
      console.log("Transaction sent, waiting for confirmation...");
      await tx2.wait();
      console.log("Added Moonwell adapter successfully");
    } catch (e: any) {
      console.error("Error adding Moonwell adapter:", e.message);
      if (e.data) console.error("Error data:", e.data);
      throw e;
    }

  } catch (error: any) {
    console.error("\nError adding lending adapters:");
    console.error("Error message:", error.message);
    if (error.error) console.error("Transaction error:", error.error);
    if (error.transaction) console.error("Transaction details:", error.transaction);
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
      await verifyContract(await trancheA.getAddress(), ["Tranche AAA", "TRA"]);
      await verifyContract(await trancheB.getAddress(), ["Tranche AA", "TRB"]);
      await verifyContract(await trancheC.getAddress(), ["Tranche A", "TRC"]);
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
  console.log("Tranche AAA:", await trancheA.getAddress());
  console.log("Tranche AA:", await trancheB.getAddress());
  console.log("Tranche A:", await trancheC.getAddress());

  return {
    insurance,
    aaveAdapter,
    moonwellAdapter,
    trancheA,
    trancheB,
    trancheC
  };
}
