import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { ContractTransactionResponse } from "ethers";
import { TimeCalculator } from "./utils/TimeCalculator";

const ADDRESSES_FILE = path.join(__dirname, "../config/addresses.ts");


async function waitForConfirmations(tx: Promise<ContractTransactionResponse> | ContractTransactionResponse) {
  const resolvedTx = await tx;
  await resolvedTx.wait(2); // Wait for 2 confirmations
  return resolvedTx;
}

function loadDeployments(): { [key: string]: string } {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    return {};
  }

  const content = fs.readFileSync(ADDRESSES_FILE, "utf8");
  const addressMatch = content.match(/export const addresses = ({[\s\S]*?});/);

  if (!addressMatch) {
    return {};
  }

  try {
    // SAFER: Use JSON.parse instead of eval
    const jsonString = addressMatch[1]
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to keys
      .replace(/'/g, '"'); // Replace single quotes with double quotes
    const addressObj = JSON.parse(jsonString);
    return {
      "MockUSDC": addressObj.USDC_ADDRESS,
      "MockAToken": addressObj.AAVE_ATOKEN,
      "MockAavePool": addressObj.AAVE_V3_POOL,
      "MockAavePoolDataProvider": addressObj.AAVE_DATA_PROVIDER,
      "AaveLendingAdapter": addressObj.AAVE_LENDING_ADAPTER,
      "MockMToken": addressObj.MOONWELL_MTOKEN,
      "MoonwellLendingAdapter": addressObj.MOONWELL_LENDING_ADAPTER,
      "UniswapV2Factory": addressObj.UNISWAP_FACTORY,
      "UniswapV2Router02": addressObj.UNISWAP_ROUTER,
      "TrancheAAA": addressObj.TRANCHE_AAA,
      "TrancheAA": addressObj.TRANCHE_AA,
      "InsuranceCalculator": addressObj.INSURANCE_CALCULATOR,
      "InsuranceAdapterManager": addressObj.INSURANCE_ADAPTER_MANAGER,
      "InsuranceCore": addressObj.INSURANCE_CORE
    };
  } catch {
    return {};
  }
}

function saveDeployments(deployments: { [key: string]: string }): void {
  const addresses = {
    UNISWAP_FACTORY: deployments.UniswapV2Factory || "",
    UNISWAP_ROUTER: deployments.UniswapV2Router02 || "",
    USDC_ADDRESS: deployments.MockUSDC || "",
    AAVE_ATOKEN: deployments.MockAToken || "",
    AAVE_V3_POOL: deployments.MockAavePool || "",
    AAVE_DATA_PROVIDER: deployments.MockAavePoolDataProvider || "",
    AAVE_LENDING_ADAPTER: deployments.AaveLendingAdapter || "",
    MOONWELL_MTOKEN: deployments.MockMToken || "",
    MOONWELL_LENDING_ADAPTER: deployments.MoonwellLendingAdapter || "",
    TRANCHE_AAA: deployments.TrancheAAA || "",
    TRANCHE_AA: deployments.TrancheAA || "",
    INSURANCE_CALCULATOR: deployments.InsuranceCalculator || "",
    INSURANCE_ADAPTER_MANAGER: deployments.InsuranceAdapterManager || "",
    INSURANCE_CORE: deployments.InsuranceCore || ""
  };

  // Remove empty addresses
  Object.keys(addresses).forEach(key => {
    if (!addresses[key as keyof typeof addresses]) {
      delete addresses[key as keyof typeof addresses];
    }
  });

  const content = `// Contract addresses for PassETHub\nexport const addresses = ${JSON.stringify(addresses, null, 2)};\n`;
  fs.writeFileSync(ADDRESSES_FILE, content);
}

function updateSingleAddress(contractName: string, address: string): void {
  const deployments = loadDeployments();
  deployments[contractName] = address;
  saveDeployments(deployments);
}

async function getDeployedContract(name: string, address: string) {
  const factory = await ethers.getContractFactory(name);
  return factory.attach(address);
}

async function deployIfNeeded(
  name: string,
  factoryGetter: () => Promise<any>,
  ...args: any[]
): Promise<string> {
  const deployments = loadDeployments();
  if (deployments[name]) {
    console.log(`✅ ${name} already deployed at ${deployments[name]}`);
    return deployments[name];
  }

  console.log(`🚀 Deploying ${name}...`);
  const factory = await factoryGetter();
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  if (!deployedAddress) {
    console.error(`❌ Deployment failed for ${name}: no address found. Contract object:`, contract);
    throw new Error(`Deployment failed for ${name}: no address found.`);
  }

  deployments[name] = deployedAddress;

  // Update addresses.ts (this now serves as our deployment tracking)
  updateSingleAddress(name, deployedAddress);

  console.log(`✅ Deployed ${name} at ${deployedAddress}`);
  return deployedAddress;
}

async function main(): Promise<void> {
  console.log("🚀 Starting Complete System Deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const deployerAddress = deployer.address;

  let deployments = loadDeployments();

  try {
    // 1. Deploy Uniswap Factory
    console.log("\n--- Deploying Uniswap Contracts ---");
    const uniswapFactoryAddress = await deployIfNeeded(
      "UniswapV2Factory",
      () => ethers.getContractFactory("UniswapV2Factory"),
      deployerAddress // feeToSetter
    );
    deployments.UniswapV2Factory = uniswapFactoryAddress;
    saveDeployments(deployments);

    // Deploy Uniswap Router
    const uniswapRouterAddress = await deployIfNeeded(
      "UniswapV2Router02",
      () => ethers.getContractFactory("UniswapV2Router02"),
      uniswapFactoryAddress, // factory
      "0x0000000000000000000000000000000000000000" // WETH (using zero address as placeholder)
    );
    deployments.UniswapV2Router02 = uniswapRouterAddress;
    saveDeployments(deployments);

    // 2. Deploy Supporting Contracts (Mocks and Adapters)
    console.log("\n--- Deploying Supporting Contracts ---");

    // Deploy MockUSDC
    const usdcAddress = await deployIfNeeded(
      "MockUSDC",
      () => ethers.getContractFactory("MockUSDC")
    );
    deployments.MockUSDC = usdcAddress;
    saveDeployments(deployments);

    // Deploy MockAToken
    const aTokenAddress = await deployIfNeeded(
      "MockAToken",
      () => ethers.getContractFactory("MockAToken"),
      usdcAddress
    );
    deployments.MockAToken = aTokenAddress;
    saveDeployments(deployments);

    // Deploy MockAavePool
    const aavePoolAddress = await deployIfNeeded(
      "MockAavePool",
      () => ethers.getContractFactory("MockAavePool"),
      usdcAddress
    );
    deployments.MockAavePool = aavePoolAddress;
    saveDeployments(deployments);

    // Initialize the aToken mapping in MockAavePool
    const aavePool = await getDeployedContract("MockAavePool", aavePoolAddress);
    try {
      const existingAToken = await (aavePool as any).aTokens(usdcAddress);
      if (existingAToken === "0x0000000000000000000000000000000000000000") {
        console.log("⚙️ Setting aToken for USDC in MockAavePool...");
        const tx = await (aavePool as any).setAToken(usdcAddress, aTokenAddress);
        await tx.wait();
        console.log(`✅ Set aToken ${aTokenAddress} for USDC in MockAavePool`);
      } else {
        console.log(`✅ aToken for USDC already set in MockAavePool: ${existingAToken}`);
      }
    } catch (error) {
      console.log("Note: Could not set aToken mapping, might need manual setup or already set.");
    }

    // Deploy MockAavePoolDataProvider
    const aaveDataProviderAddress = await deployIfNeeded(
      "MockAavePoolDataProvider",
      () => ethers.getContractFactory("MockAavePoolDataProvider"),
      usdcAddress,
      aTokenAddress
    );
    deployments.MockAavePoolDataProvider = aaveDataProviderAddress;
    saveDeployments(deployments);

    // Deploy AaveLendingAdapter
    const aaveAdapterAddress = await deployIfNeeded(
      "AaveLendingAdapter",
      () => ethers.getContractFactory("AaveLendingAdapter"),
      aavePoolAddress,
      aaveDataProviderAddress
    );
    deployments.AaveLendingAdapter = aaveAdapterAddress;
    saveDeployments(deployments);

    // Deploy MockMToken (Moonwell)
    const mTokenAddress = await deployIfNeeded(
      "MockMToken",
      () => ethers.getContractFactory("MockMToken"),
      usdcAddress
    );
    deployments.MockMToken = mTokenAddress;
    saveDeployments(deployments);

    // Deploy MoonwellLendingAdapter
    const moonwellAdapterAddress = await deployIfNeeded(
      "MoonwellLendingAdapter",
      () => ethers.getContractFactory("MoonwellLendingAdapter"),
      mTokenAddress
    );
    deployments.MoonwellLendingAdapter = moonwellAdapterAddress;
    saveDeployments(deployments);

    // 3. Deploy Tranche Contracts
    console.log("\n--- Deploying Tranche Contracts ---");
    const trancheAAAAddress = await deployIfNeeded(
      "TrancheAAA",
      () => ethers.getContractFactory("Tranche"),
      "Tranche AAA",
      "TAAA"
    );
    deployments.TrancheAAA = trancheAAAAddress;
    saveDeployments(deployments);

    const trancheAAAddress = await deployIfNeeded(
      "TrancheAA",
      () => ethers.getContractFactory("Tranche"),
      "Tranche AA",
      "TAA"
    );
    deployments.TrancheAA = trancheAAAddress;
    saveDeployments(deployments);

    // 4. Deploy Core Insurance Contracts
    console.log("\n--- Deploying Core Insurance System ---");

    // Deploy Calculator first (smallest contract)
    const calculatorAddress = await deployIfNeeded(
      "InsuranceCalculator",
      () => ethers.getContractFactory("InsuranceCalculator")
    );
    deployments.InsuranceCalculator = calculatorAddress;
    saveDeployments(deployments);

    // Deploy Adapter Manager
    const adapterManagerAddress = await deployIfNeeded(
      "InsuranceAdapterManager",
      () => ethers.getContractFactory("InsuranceAdapterManager")
    );
    deployments.InsuranceAdapterManager = adapterManagerAddress;
    saveDeployments(deployments);

    // Deploy Insurance Core
    const insuranceCoreAddress = await deployIfNeeded(
      "InsuranceCore",
      () => ethers.getContractFactory("InsuranceCore")
    );
    deployments.InsuranceCore = insuranceCoreAddress;
    saveDeployments(deployments);

    // Initialize Insurance Core
    const insuranceCore = await getDeployedContract("InsuranceCore", insuranceCoreAddress);
    const coreInfo = await (insuranceCore as any).getInfo();
    const isCoreInitialized = coreInfo[2]; // initialized is the third element in the returned tuple
    if (!isCoreInitialized) {
      console.log("\n⚙️ Initializing Insurance Core...");
      const timePeriods = TimeCalculator.calculateTimePeriods();
      const { S, T1, T2, T3 } = timePeriods;

      await (insuranceCore as any).initialize(
        deployments.MockUSDC,
        S,
        T1,
        T2,
        T3,
        adapterManagerAddress,
        calculatorAddress
      );
      console.log("✅ Insurance Core initialized");
    } else {
      console.log("✅ Insurance Core already initialized.");
    }

    // Initialize Adapter Manager
    const adapterManager = await getDeployedContract("InsuranceAdapterManager", adapterManagerAddress);
    try {
      console.log("\n⚙️ Initializing Adapter Manager...");
      await (adapterManager as any).initialize(insuranceCoreAddress, deployments.MockUSDC);
      console.log("✅ Adapter Manager initialized");
    } catch (error: any) {
      if (error.message.includes("Already initialized")) {
        console.log("✅ Adapter Manager already initialized.");
      } else {
        throw error;
      }
    }

    // Set tranches in Insurance Core
    const currentAAA = await (insuranceCore as any).AAA();
    const currentAA = await (insuranceCore as any).AA();

    if (currentAAA === "0x0000000000000000000000000000000000000000" && currentAA === "0x0000000000000000000000000000000000000000") {
      console.log("\n⚙️ Setting tranches in Insurance Core...");
      await (insuranceCore as any).setTranches(deployments.TrancheAAA, deployments.TrancheAA);
      console.log("✅ Tranches set in Insurance Core");
    } else {
      console.log("✅ Tranches already set in Insurance Core.");
    }

    // Add lending adapters to Adapter Manager
    const currentAdapterManagerAdapters = await (adapterManager as any).getAllAdapters();
    if (!currentAdapterManagerAdapters.includes(deployments.AaveLendingAdapter)) {
      console.log("\n➕ Adding Aave Lending Adapter to Adapter Manager...");
      await (adapterManager as any).addLendingAdapter(deployments.AaveLendingAdapter);
      console.log("✅ Aave Lending Adapter added to Adapter Manager");
    } else {
      console.log("✅ Aave Lending Adapter already added to Adapter Manager.");
    }

    if (!currentAdapterManagerAdapters.includes(deployments.MoonwellLendingAdapter)) {
      console.log("\n➕ Adding Moonwell Lending Adapter to Adapter Manager...");
      await (adapterManager as any).addLendingAdapter(deployments.MoonwellLendingAdapter);
      console.log("✅ Moonwell Lending Adapter added to Adapter Manager");
    } else {
      console.log("✅ Moonwell Lending Adapter already added to Adapter Manager.");
    }

    // Create Uniswap pairs for AAA and AA tokens
    console.log("\n--- Creating Uniswap Pairs ---");
    const factory = await getDeployedContract("UniswapV2Factory", uniswapFactoryAddress);

    // Check if AAA/USDC pair exists
    const aaaUsdcPair = await (factory as any).getPair(deployments.TrancheAAA, deployments.MockUSDC);
    if (aaaUsdcPair === "0x0000000000000000000000000000000000000000") {
      console.log("Creating AAA/USDC pair...");
      await waitForConfirmations((factory as any).createPair(deployments.TrancheAAA, deployments.MockUSDC));
      console.log("Created AAA/USDC pair");
    } else {
      console.log("✅ AAA/USDC pair already exists:", aaaUsdcPair);
    }

    // Check if AA/USDC pair exists
    const aaUsdcPair = await (factory as any).getPair(deployments.TrancheAA, deployments.MockUSDC);
    if (aaUsdcPair === "0x0000000000000000000000000000000000000000") {
      console.log("Creating AA/USDC pair...");
      await waitForConfirmations((factory as any).createPair(deployments.TrancheAA, deployments.MockUSDC));
      console.log("Created AA/USDC pair");
    } else {
      console.log("✅ AA/USDC pair already exists:", aaUsdcPair);
    }
    console.log("AAA/USDC pair:", aaaUsdcPair);
    console.log("AA/USDC pair:", aaUsdcPair);

    // Update frontend contracts.json
    console.log("\n--- Updating Frontend Configuration ---");
    const contractsPath = join(__dirname, "../frontend/src/contracts.json");
    let contractsJson: any = { networks: {} };

    if (fs.existsSync(contractsPath)) {
      contractsJson = JSON.parse(readFileSync(contractsPath, 'utf8'));
    }

    // Get contract artifacts for ABIs
    const mockUsdcArtifact = await ethers.getContractFactory("MockUSDC");
    const insuranceCoreArtifact = await ethers.getContractFactory("InsuranceCore");
    const trancheArtifact = await ethers.getContractFactory("Tranche");
    const aaveAdapterArtifact = await ethers.getContractFactory("AaveLendingAdapter");
    const moonwellAdapterArtifact = await ethers.getContractFactory("MoonwellLendingAdapter");
    const factoryArtifact = await ethers.getContractFactory("UniswapV2Factory");
    const routerArtifact = await ethers.getContractFactory("UniswapV2Router02");
    const pairArtifact = await ethers.getContractFactory("UniswapV2Pair");

    // Add network configuration to contracts.json
    contractsJson.networks["passetHub"] = {
      USDC: {
        address: deployments.MockUSDC,
        abi: mockUsdcArtifact.interface.fragments
      },
      Insurance: {
        address: deployments.InsuranceCore,
        abi: insuranceCoreArtifact.interface.fragments
      },
      TrancheAAA: {
        address: deployments.TrancheAAA,
        abi: trancheArtifact.interface.fragments
      },
      TrancheAA: {
        address: deployments.TrancheAA,
        abi: trancheArtifact.interface.fragments
      },
      AaveLendingAdapter: {
        address: deployments.AaveLendingAdapter,
        abi: aaveAdapterArtifact.interface.fragments
      },
      MoonwellLendingAdapter: {
        address: deployments.MoonwellLendingAdapter,
        abi: moonwellAdapterArtifact.interface.fragments
      },
      UniswapV2Factory: {
        address: deployments.UniswapV2Factory,
        abi: factoryArtifact.interface.fragments
      },
      UniswapV2Router02: {
        address: deployments.UniswapV2Router02,
        abi: routerArtifact.interface.fragments
      },
      AAAUSDCPair: {
        address: aaaUsdcPair,
        abi: pairArtifact.interface.fragments
      },
      AAUSDCPair: {
        address: aaUsdcPair,
        abi: pairArtifact.interface.fragments
      }
    };

    // Write updated contracts.json
    writeFileSync(contractsPath, JSON.stringify(contractsJson, null, 2));

    // Final save of all deployments to ensure everything is tracked
    saveDeployments(deployments);

    console.log("\n🎉 Complete System Deployment Successful!");
    console.log("- Updated config/addresses.ts with new contract addresses");
    console.log("- Updated frontend/src/contracts.json with network configuration");
    console.log("\n📋 Contract Addresses:");
    for (const key in deployments) {
      console.log(`  ${key}: ${deployments[key]}`);
    }
    console.log(`  AAAUSDCPair: ${aaaUsdcPair}`);
    console.log(`  AAUSDCPair: ${aaUsdcPair}`);

    console.log("\n🎯 Next steps:");
    console.log("1. Fund your account with test tokens if needed");
    console.log("2. Test the deployed contracts");
    console.log("3. Start the frontend to verify everything works");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
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
