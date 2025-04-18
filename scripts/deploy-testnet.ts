import { ethers } from "hardhat";
import { networks } from "../config/addresses";
import { deployCoreContracts } from "./core/deployCore";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { ContractTransactionResponse, parseUnits } from "ethers";

import { BaseContract } from "ethers";

async function waitForDeployment<T extends BaseContract>(contract: T): Promise<T> {
  const tx = await contract.deploymentTransaction();
  if (tx) {
    await tx.wait(2); // Wait for 2 confirmations
  }
  return contract;
}

async function waitForConfirmations(tx: Promise<ContractTransactionResponse> | ContractTransactionResponse) {
  const resolvedTx = await tx;
  await resolvedTx.wait(2); // Wait for 2 confirmations
  return resolvedTx;
}

async function main() {
  try {
    console.log("Starting deployment to Base Sepolia testnet...");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", await deployer.getAddress());

    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Use existing deployed contracts
    console.log("Using existing mock contracts...");
    const mockUSDC = await ethers.getContractAt("MockUSDC", "0x5f6294664F1B3938cC1dB98Af903B380D41E62b9");
    const mockAavePool = await ethers.getContractAt("MockAavePool", "0x3526D97037368887617Aa437253d97a9298F2330");
    const aTokenAddress = "0x4d23a1911C34e8108a78D1AfEA2302516084b9cC";
    const mockAaveDataProvider = await ethers.getContractAt("MockAavePoolDataProvider", "0x29Fd9FEe92f96025f05744345Cb525aFF4781d23");

    console.log("Existing contracts loaded:");
    console.log("- MockUSDC:", await mockUSDC.getAddress());
    console.log("- MockAavePool:", await mockAavePool.getAddress());
    console.log("- aToken:", aTokenAddress);
    console.log("- MockAaveDataProvider:", await mockAaveDataProvider.getAddress());

    // Deploy Mock Moonwell
    console.log("\nDeploying Moonwell mock contracts...");
    const MockMToken = await ethers.getContractFactory("MockMToken");
    const mockMToken = await waitForDeployment(await MockMToken.deploy(await mockUSDC.getAddress()));
    console.log("Mock Moonwell MToken deployed to:", await mockMToken.getAddress());

    // Deploy Mock Moonwell Comptroller
    console.log("Deploying Moonwell Comptroller...");
    const MockComptroller = await ethers.getContractFactory("MockMoonwellComptroller");
    const mockComptroller = await waitForDeployment(await MockComptroller.deploy(await mockMToken.getAddress()));
    console.log("Mock Moonwell Comptroller deployed to:", await mockComptroller.getAddress());

    // Deploy Mock Compound
    console.log("\nDeploying Compound mock contracts...");
    const MockComet = await ethers.getContractFactory("MockComet");
    const mockComet = await waitForDeployment(await MockComet.deploy(await mockUSDC.getAddress()));
    console.log("Mock Comet (Compound) deployed to:", await mockComet.getAddress());

    // Update addresses for core deployment
    const deploymentAddresses = {
      USDC_ADDRESS: await mockUSDC.getAddress(),
      AAVE_V3_POOL: await mockAavePool.getAddress(),
      AAVE_DATA_PROVIDER: await mockAaveDataProvider.getAddress(),
      MOONWELL_USDC: await mockMToken.getAddress(),
      COMPOUND_USDC_MARKET: await mockComet.getAddress()
    };

    console.log("\nDeploying core contracts...");
    const deployedContracts = await deployCoreContracts(deploymentAddresses);

    // Update addresses.ts with deployed contract addresses
    console.log("\nUpdating configuration files...");
    const updatedNetworks = {
      ...networks,
      "base-sepolia": {
        ...networks["base-sepolia"],
        USDC_ADDRESS: await mockUSDC.getAddress(),
        AAVE_V3_POOL: await mockAavePool.getAddress(),
        AAVE_DATA_PROVIDER: await mockAaveDataProvider.getAddress(),
        MOONWELL_USDC: await mockMToken.getAddress(),
        COMPOUND_USDC_MARKET: await mockComet.getAddress(),
        ATOKEN: aTokenAddress,
        MOONWELL_COMPTROLLER: await mockComptroller.getAddress()
      }
    };

    // Write updated addresses to addresses.ts
    const addressesPath = join(__dirname, "../config/addresses.ts");
    const content = `export const networks = ${JSON.stringify(updatedNetworks, null, 2)} as const;\n\nexport type NetworkConfig = typeof networks.mainnet;\nexport type NetworkName = keyof typeof networks;\n`;
    writeFileSync(addressesPath, content);

    // Update frontend contracts.json
    const contractsPath = join(__dirname, "../frontend/src/contracts.json");
    const contractsJson = JSON.parse(readFileSync(contractsPath, 'utf8'));

    // Get contract artifacts for ABIs
    const mockUsdcArtifact = await ethers.getContractFactory("MockUSDC");
    const insuranceArtifact = await ethers.getContractFactory("Insurance");
    const trancheArtifact = await ethers.getContractFactory("Tranche");
    const aaveAdapterArtifact = await ethers.getContractFactory("AaveLendingAdapter");
    const moonwellAdapterArtifact = await ethers.getContractFactory("MoonwellLendingAdapter");
    const compoundAdapterArtifact = await ethers.getContractFactory("CompoundLendingAdapter");

    // Add Base Sepolia network configuration
    contractsJson.networks["base-sepolia"] = {
      USDC: {
        address: await mockUSDC.getAddress(),
        abi: mockUsdcArtifact.interface.fragments
      },
      Insurance: {
        address: await deployedContracts.insurance.getAddress(),
        abi: insuranceArtifact.interface.fragments
      },
      TrancheA: {
        address: await deployedContracts.trancheA.getAddress(),
        abi: trancheArtifact.interface.fragments
      },
      TrancheB: {
        address: await deployedContracts.trancheB.getAddress(),
        abi: trancheArtifact.interface.fragments
      },
      TrancheC: {
        address: await deployedContracts.trancheC.getAddress(),
        abi: trancheArtifact.interface.fragments
      },
      AaveLendingAdapter: {
        address: await deployedContracts.aaveAdapter.getAddress(),
        abi: aaveAdapterArtifact.interface.fragments
      },
      MoonwellLendingAdapter: {
        address: await deployedContracts.moonwellAdapter.getAddress(),
        abi: moonwellAdapterArtifact.interface.fragments
      },
      CompoundLendingAdapter: {
        address: await deployedContracts.compoundAdapter.getAddress(),
        abi: compoundAdapterArtifact.interface.fragments
      }
    };

    // Write updated contracts.json
    writeFileSync(contractsPath, JSON.stringify(contractsJson, null, 2));

    console.log("\nDeployment complete!");
    console.log("- Updated addresses.ts with new contract addresses");
    console.log("- Updated frontend/src/contracts.json with Base Sepolia configuration");
    console.log("\nNext steps:");
    console.log("1. Fund your account with test ETH if needed");
    console.log("2. Test the deployed contracts");
    console.log("3. Update frontend configuration if needed");

  } catch (error) {
    console.error("\nDeployment failed:", error);
    throw error;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
