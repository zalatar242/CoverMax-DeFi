import { ethers, run } from "hardhat";

async function verifyContract(address: string, args: any[] = []) {
  console.log(`Verifying contract at ${address}...`);
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (err) {
    console.log("Verification error:", err);
  }
}

async function main() {
  console.log("Deploying lending adapters...");

  // Deploy Aave adapter
  const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
  const aaveAdapter = await AaveAdapter.deploy();
  await aaveAdapter.waitForDeployment();
  console.log("AaveLendingAdapter deployed to:", await aaveAdapter.getAddress());

  // Deploy Moonwell adapter
  const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
  const moonwellAdapter = await MoonwellAdapter.deploy();
  await moonwellAdapter.waitForDeployment();
  console.log("MoonwellLendingAdapter deployed to:", await moonwellAdapter.getAddress());

  // Deploy Compound adapter
  const CompoundAdapter = await ethers.getContractFactory("CompoundLendingAdapter");
  const compoundAdapter = await CompoundAdapter.deploy();
  await compoundAdapter.waitForDeployment();
  console.log("CompoundLendingAdapter deployed to:", await compoundAdapter.getAddress());

  // Wait a bit before verification
  console.log("\nWaiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Verify all contracts
  await verifyContract(await aaveAdapter.getAddress());
  await verifyContract(await moonwellAdapter.getAddress());
  await verifyContract(await compoundAdapter.getAddress());

  console.log("\nDeployment Summary:");
  console.log("==================");
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
