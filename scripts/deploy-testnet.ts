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

    // Deploy all mock contracts
    console.log("\nDeploying all mock contracts from scratch...");
    const { deployMocks } = require("./core/deployMocks");
    const mockAddresses = await deployMocks();

    const mockUSDC = await ethers.getContractAt("MockUSDC", mockAddresses.usdcAddress);
    const mockAavePool = await ethers.getContractAt("MockAavePool", mockAddresses.aavePool);
    const mockAaveDataProvider = await ethers.getContractAt("MockAavePoolDataProvider", mockAddresses.aaveDataProvider);
    const coverMaxToken = await ethers.getContractAt("CoverMaxToken", mockAddresses.coverMaxToken);
    const mockMToken = await ethers.getContractAt("MockMToken", mockAddresses.moonwellUsdc);
    const mockComptroller = await ethers.getContractAt("MockMoonwellComptroller", mockAddresses.moonwellComptroller);
    const factory = await ethers.getContractAt("UniswapV2Factory", mockAddresses.uniswapFactory);

    // Update addresses for core deployment
    const deploymentAddresses = {
      USDC_ADDRESS: await mockUSDC.getAddress(),
      AAVE_V3_POOL: await mockAavePool.getAddress(),
      AAVE_DATA_PROVIDER: await mockAaveDataProvider.getAddress(),
      MOONWELL_USDC: await mockMToken.getAddress()
    };

    console.log("\nDeploying core contracts...");
    const deployedContracts = await deployCoreContracts(deploymentAddresses);

    // Update addresses.ts with deployed contract addresses
    console.log("\nUpdating configuration files...");
    const updatedNetworks = {
      ...networks,
      "base-sepolia": {
        ...networks["base-sepolia"],
        COVERMAX_TOKEN: await coverMaxToken.getAddress(),
        USDC_ADDRESS: await mockUSDC.getAddress(),
        AAVE_V3_POOL: await mockAavePool.getAddress(),
        AAVE_DATA_PROVIDER: await mockAaveDataProvider.getAddress(),
        MOONWELL_USDC: await mockMToken.getAddress(),
        ATOKEN: await mockAavePool.aTokens(await mockUSDC.getAddress()),
        MOONWELL_COMPTROLLER: await mockComptroller.getAddress(),
        UNISWAP_FACTORY: await factory.getAddress(),
        UNISWAP_ROUTER: mockAddresses.uniswapRouter,
        WETH: mockAddresses.weth
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
    const coverMaxArtifact = await ethers.getContractFactory("CoverMaxToken");
    const mockUsdcArtifact = await ethers.getContractFactory("MockUSDC");
    const insuranceArtifact = await ethers.getContractFactory("Insurance");
    const trancheArtifact = await ethers.getContractFactory("Tranche");
    const aaveAdapterArtifact = await ethers.getContractFactory("AaveLendingAdapter");
    const moonwellAdapterArtifact = await ethers.getContractFactory("MoonwellLendingAdapter");

    // Create Uniswap pairs for AAA and AA tokens
    console.log("\nCreating Uniswap pairs...");
    await waitForConfirmations((factory as any).createPair(await deployedContracts.trancheAAA.getAddress(), await mockUSDC.getAddress()));
    console.log("Created AAA/USDC pair");
    await waitForConfirmations((factory as any).createPair(await deployedContracts.trancheAA.getAddress(), await mockUSDC.getAddress()));
    console.log("Created AA/USDC pair");

    // Get pair addresses for configuration
    const aaaUsdcPair = await (factory as any).getPair(await deployedContracts.trancheAAA.getAddress(), await mockUSDC.getAddress());
    const aaUsdcPair = await (factory as any).getPair(await deployedContracts.trancheAA.getAddress(), await mockUSDC.getAddress());
    console.log("AAA/USDC pair:", aaaUsdcPair);
    console.log("AA/USDC pair:", aaUsdcPair);

    // Add Base Sepolia network configuration
    contractsJson.networks["base-sepolia"] = {
      CoverMaxToken: {
        address: await coverMaxToken.getAddress(),
        abi: coverMaxArtifact.interface.fragments
      },
      USDC: {
        address: await mockUSDC.getAddress(),
        abi: mockUsdcArtifact.interface.fragments
      },
      Insurance: {
        address: await deployedContracts.insurance.getAddress(),
        abi: insuranceArtifact.interface.fragments
      },
      TrancheAAA: {
        address: await deployedContracts.trancheAAA.getAddress(),
        abi: trancheArtifact.interface.fragments
      },
      TrancheAA: {
        address: await deployedContracts.trancheAA.getAddress(),
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
      UniswapV2Factory: {
        address: await factory.getAddress(),
        abi: (await ethers.getContractFactory("UniswapV2Factory")).interface.fragments
      },
      UniswapV2Router02: {
        address: mockAddresses.uniswapRouter,
        abi: (await ethers.getContractFactory("UniswapV2Router02")).interface.fragments
      },
      AAAUSDCPair: {
        address: aaaUsdcPair,
        abi: (await ethers.getContractFactory("UniswapV2Pair")).interface.fragments
      },
      AAUSDCPair: {
        address: aaUsdcPair,
        abi: (await ethers.getContractFactory("UniswapV2Pair")).interface.fragments
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
