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

    // Deploy CoverMax Token
    console.log("\nDeploying CoverMax Token...");
    const CoverMaxToken = await ethers.getContractFactory("CoverMaxToken");
    const coverMaxToken = await waitForDeployment(await CoverMaxToken.deploy());
    console.log("CoverMax Token deployed to:", await coverMaxToken.getAddress());

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

    // Deploy Uniswap mocks
    console.log("\nDeploying Uniswap mock contracts...");
    const MockUniswapV2Factory = await ethers.getContractFactory("MockUniswapV2Factory");
    const factory = await waitForDeployment(await MockUniswapV2Factory.deploy(deployer.address));
    console.log("MockUniswapV2Factory deployed to:", await factory.getAddress());

    const MockUniswapV2Router02 = await ethers.getContractFactory("MockUniswapV2Router02");
    const router = await waitForDeployment(await MockUniswapV2Router02.deploy(
      await factory.getAddress(),
      ethers.ZeroAddress, // No WETH needed for our mock
      await mockUSDC.getAddress()
    ));
    console.log("MockUniswapV2Router02 deployed to:", await router.getAddress());

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
        ATOKEN: aTokenAddress,
        MOONWELL_COMPTROLLER: await mockComptroller.getAddress(),
        UNISWAP_FACTORY: await factory.getAddress(),
        UNISWAP_ROUTER: await router.getAddress()
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
    await waitForConfirmations(factory.createPair(await deployedContracts.trancheAAA.getAddress(), await mockUSDC.getAddress()));
    console.log("Created AAA/USDC pair");
    await waitForConfirmations(factory.createPair(await deployedContracts.trancheAA.getAddress(), await mockUSDC.getAddress()));
    console.log("Created AA/USDC pair");

    // Get pair addresses for configuration
    const aaaUsdcPair = await factory.getPair(await deployedContracts.trancheAAA.getAddress(), await mockUSDC.getAddress());
    const aaUsdcPair = await factory.getPair(await deployedContracts.trancheAA.getAddress(), await mockUSDC.getAddress());
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
        abi: MockUniswapV2Factory.interface.fragments
      },
      UniswapV2Router02: {
        address: await router.getAddress(),
        abi: MockUniswapV2Router02.interface.fragments
      },
      AAAUSDCPair: {
        address: aaaUsdcPair,
        abi: (await ethers.getContractFactory("MockUniswapV2Pair")).interface.fragments
      },
      AAUSDCPair: {
        address: aaUsdcPair,
        abi: (await ethers.getContractFactory("MockUniswapV2Pair")).interface.fragments
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
