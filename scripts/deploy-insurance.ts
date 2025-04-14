import { ethers, network, run } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { ContractTransactionResponse } from "ethers";
import { networks } from "../config/addresses";

async function waitForDeployment(contract: any) {
  const tx = await contract.deploymentTransaction();
  if (tx) {
    await tx.wait(2); // Wait for 2 confirmations
  }
  return contract;
}

async function main() {
  try {
    console.log("Starting Insurance contract deployment to Base Sepolia...");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", await deployer.getAddress());

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Get USDC address from config
    const USDC_ADDRESS = networks["base-sepolia"].USDC_ADDRESS;
    console.log("Using USDC address:", USDC_ADDRESS);

    // Deploy Insurance contract
    console.log("\nDeploying Insurance contract...");
    const Insurance = await ethers.getContractFactory("Insurance");
    const insurance = await waitForDeployment(await Insurance.deploy(USDC_ADDRESS));
    const insuranceAddress = await insurance.getAddress();
    console.log("Insurance deployed to:", insuranceAddress);

    // Get existing lending adapters from frontend contracts.json
    const contractsPath = join(__dirname, "../frontend/src/contracts.json");
    const contractsJson = JSON.parse(readFileSync(contractsPath, 'utf8'));

    // Add existing adapters to Insurance contract
    const adapters = [
      contractsJson.networks["base-sepolia"].AaveLendingAdapter.address,
      contractsJson.networks["base-sepolia"].MoonwellLendingAdapter.address,
      contractsJson.networks["base-sepolia"].CompoundLendingAdapter.address
    ];

    console.log("\nAdding lending adapters...");
    for (const adapter of adapters) {
      console.log("Adding adapter:", adapter);
      await insurance.addLendingAdapter(adapter);
    }

    // Get contract artifacts for ABI
    const insuranceArtifact = await ethers.getContractFactory("Insurance");
    const trancheArtifact = await ethers.getContractFactory("Tranche");

    // Update only Insurance and Tranche contracts in contracts.json
    contractsJson.networks["base-sepolia"].Insurance = {
      address: insuranceAddress,
      abi: insuranceArtifact.interface.fragments
    };

    // Get new tranche addresses from Insurance contract
    const trancheA = await insurance.A();
    const trancheB = await insurance.B();
    const trancheC = await insurance.C();

    // Update tranche addresses
    contractsJson.networks["base-sepolia"].TrancheA = {
      address: trancheA,
      abi: trancheArtifact.interface.fragments
    };
    contractsJson.networks["base-sepolia"].TrancheB = {
      address: trancheB,
      abi: trancheArtifact.interface.fragments
    };
    contractsJson.networks["base-sepolia"].TrancheC = {
      address: trancheC,
      abi: trancheArtifact.interface.fragments
    };

    // Write updated contracts.json
    writeFileSync(contractsPath, JSON.stringify(contractsJson, null, 2));

    console.log("\nDeployment complete!");
    console.log("- Insurance contract deployed to:", insuranceAddress);
    console.log("- Tranche AAA deployed to:", trancheA);
    console.log("- Tranche AA deployed to:", trancheB);
    console.log("- Tranche A deployed to:", trancheC);
    console.log("- Updated frontend/src/contracts.json with new addresses");

    if (["base-mainnet", "base-sepolia"].includes(network.name)) {
      console.log("\nWaiting 30 seconds before verification...");
      await new Promise(resolve => setTimeout(resolve, 30000));

      try {
        console.log("\nVerifying contracts...");
        await run("verify:verify", {
          address: insuranceAddress,
          constructorArguments: [USDC_ADDRESS],
        });
        console.log("Insurance contract verified");
      } catch (error: any) {
        if (error.message.includes("Already Verified")) {
          console.log("Contract already verified");
        } else {
          console.error("Verification error:", error);
        }
      }
    }

  } catch (error) {
    console.error("\nDeployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
