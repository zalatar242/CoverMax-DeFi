import { ethers, network, run } from "hardhat";
import { networks } from "../config/addresses";
import { updateContractsJson } from "./utils";
import { BaseContract } from "ethers";
import { Insurance, Tranche, AaveLendingAdapter, MoonwellLendingAdapter, CompoundLendingAdapter } from "../typechain-types";

async function verifyContract(address: string | undefined, args: any[] = []) {
  if (!address) return;
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

interface DeployedContracts {
  Insurance: Insurance;
  AaveLendingAdapter: AaveLendingAdapter;
  MoonwellLendingAdapter: MoonwellLendingAdapter;
  CompoundLendingAdapter: CompoundLendingAdapter;
  TrancheA?: Tranche;
  TrancheB?: Tranche;
  TrancheC?: Tranche;
}

async function main() {
  const isLocalNetwork = network.name === "hardhat" || network.name === "localhost";
  const networkKey = "mainnet"; // Always use mainnet addresses
  const addresses = networks[networkKey];

  console.log(`Deploying contracts on ${network.name} (using mainnet addresses)...`);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  console.log("Using USDC address:", addresses.USDC_ADDRESS);

  const deployedContracts: DeployedContracts = {} as DeployedContracts;

  // Deploy Lending Adapters
  console.log("\nDeploying Lending Adapters...");

  // Deploy Aave adapter
  const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
  deployedContracts.AaveLendingAdapter = await AaveAdapter.deploy(
    addresses.AAVE_V3_POOL,
    addresses.AAVE_DATA_PROVIDER
  );
  await deployedContracts.AaveLendingAdapter.waitForDeployment();
  console.log("AaveLendingAdapter deployed to:", await deployedContracts.AaveLendingAdapter.getAddress());

  // Deploy Moonwell adapter
  const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
  deployedContracts.MoonwellLendingAdapter = await MoonwellAdapter.deploy(
    addresses.MOONWELL_USDC
  );
  await deployedContracts.MoonwellLendingAdapter.waitForDeployment();
  console.log("MoonwellLendingAdapter deployed to:", await deployedContracts.MoonwellLendingAdapter.getAddress());

  // Deploy Compound adapter
  const CompoundAdapter = await ethers.getContractFactory("CompoundLendingAdapter");
  deployedContracts.CompoundLendingAdapter = await CompoundAdapter.deploy(
    addresses.COMPOUND_USDC_MARKET
  );
  await deployedContracts.CompoundLendingAdapter.waitForDeployment();
  console.log("CompoundLendingAdapter deployed to:", await deployedContracts.CompoundLendingAdapter.getAddress());

  // Deploy Insurance
  console.log("\nDeploying Insurance contract...");
  const Insurance = await ethers.getContractFactory("Insurance");
  deployedContracts.Insurance = await Insurance.deploy(addresses.USDC_ADDRESS);
  await deployedContracts.Insurance.waitForDeployment();
  console.log("Insurance deployed to:", await deployedContracts.Insurance.getAddress());

  // Add lending adapters to Insurance
  console.log("\nAdding lending adapters to Insurance...");
  const addAdapterTx1 = await deployedContracts.Insurance.addLendingAdapter(await deployedContracts.AaveLendingAdapter.getAddress());
  await addAdapterTx1.wait();
  console.log("Added Aave adapter");

  const addAdapterTx2 = await deployedContracts.Insurance.addLendingAdapter(await deployedContracts.MoonwellLendingAdapter.getAddress());
  await addAdapterTx2.wait();
  console.log("Added Moonwell adapter");

  const addAdapterTx3 = await deployedContracts.Insurance.addLendingAdapter(await deployedContracts.CompoundLendingAdapter.getAddress());
  await addAdapterTx3.wait();
  console.log("Added Compound adapter");

  // Get tranche addresses
  deployedContracts.TrancheA = await ethers.getContractAt("Tranche", await deployedContracts.Insurance.A());
  deployedContracts.TrancheB = await ethers.getContractAt("Tranche", await deployedContracts.Insurance.B());
  deployedContracts.TrancheC = await ethers.getContractAt("Tranche", await deployedContracts.Insurance.C());

  // Only verify on actual networks
  if (!isLocalNetwork) {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    await verifyContract(await deployedContracts.Insurance.getAddress(), [addresses.USDC_ADDRESS]);
    await verifyContract(await deployedContracts.AaveLendingAdapter.getAddress(), [
      addresses.AAVE_V3_POOL,
      addresses.AAVE_DATA_PROVIDER
    ]);
    await verifyContract(await deployedContracts.MoonwellLendingAdapter.getAddress(), [
      addresses.MOONWELL_USDC
    ]);
    await verifyContract(await deployedContracts.CompoundLendingAdapter.getAddress(), [
      addresses.COMPOUND_USDC_MARKET
    ]);
    await verifyContract(await deployedContracts.TrancheA?.getAddress(), []);
    await verifyContract(await deployedContracts.TrancheB?.getAddress(), []);
    await verifyContract(await deployedContracts.TrancheC?.getAddress(), []);
  } else {
    console.log("\nSkipping contract verification on local network");
  }

  // Update contracts.json
  const contractsToUpdate = [
    { name: "Insurance", contract: deployedContracts.Insurance },
    { name: "AaveLendingAdapter", contract: deployedContracts.AaveLendingAdapter },
    { name: "MoonwellLendingAdapter", contract: deployedContracts.MoonwellLendingAdapter },
    { name: "CompoundLendingAdapter", contract: deployedContracts.CompoundLendingAdapter },
    { name: "TrancheA", contract: deployedContracts.TrancheA! },
    { name: "TrancheB", contract: deployedContracts.TrancheB! },
    { name: "TrancheC", contract: deployedContracts.TrancheC! }
  ];

  await updateContractsJson(networkKey, contractsToUpdate);

  console.log("\nDeployment Summary");
  console.log("-----------------");
  console.log(`Network: ${network.name} (${networkKey} addresses)`);
  console.log(`USDC (existing): ${addresses.USDC_ADDRESS}`);
  console.log(`Insurance: ${await deployedContracts.Insurance.getAddress()}`);
  console.log(`Tranche A: ${await deployedContracts.TrancheA?.getAddress()}`);
  console.log(`Tranche B: ${await deployedContracts.TrancheB?.getAddress()}`);
  console.log(`Tranche C: ${await deployedContracts.TrancheC?.getAddress()}`);
  console.log(`AaveLendingAdapter: ${await deployedContracts.AaveLendingAdapter.getAddress()}`);
  console.log(`MoonwellLendingAdapter: ${await deployedContracts.MoonwellLendingAdapter.getAddress()}`);
  console.log(`CompoundLendingAdapter: ${await deployedContracts.CompoundLendingAdapter.getAddress()}`);

  // Transfer USDC to test wallet if on local network
  if (isLocalNetwork) {
    console.log("\nFunding test wallet with USDC...");
    const TEST_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const TRANSFER_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC

    const usdcWhale = process.env.MAINNET_USDC_WHALE!; // Coinbase USDC Whale on Base

    // Fund whale with ETH for gas
    await ethers.provider.send("hardhat_setBalance", [
      usdcWhale,
      "0x" + (10n ** 18n * 1000n).toString(16) // 1000 ETH
    ]);

    // Impersonate whale account
    await ethers.provider.send("hardhat_impersonateAccount", [usdcWhale]);
    const whale = await ethers.getSigner(usdcWhale);

    // Get USDC contract
    const usdc = await ethers.getContractAt("IERC20", addresses.USDC_ADDRESS);

    // Transfer USDC from whale to test wallet
    console.log(`Transferring ${ethers.formatUnits(TRANSFER_AMOUNT, 6)} USDC to ${TEST_WALLET}`);
    const whaleBalance = await usdc.balanceOf(whale.address);
    console.log(`Whale USDC balance: ${ethers.formatUnits(whaleBalance, 6)}`);

    const tx = await usdc.connect(whale).transfer(TEST_WALLET, TRANSFER_AMOUNT);
    await tx.wait();

    const testWalletBalance = await usdc.balanceOf(TEST_WALLET);
    console.log(`Test wallet USDC balance: ${ethers.formatUnits(testWalletBalance, 6)}`);

    // Stop impersonating whale
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [usdcWhale]);
  }
}

main()
.then(()=>process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});

