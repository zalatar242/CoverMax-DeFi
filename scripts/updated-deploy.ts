import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

const DEPLOYMENTS_DIR = path.join(__dirname, "../deployments");
const NETWORK = network.name;
const DEPLOYMENTS_FILE = path.join(DEPLOYMENTS_DIR, `${NETWORK}.json`);
const ADDRESSES_FILE = path.join(__dirname, "../config/addresses.ts");

interface Deployments {
  [key: string]: string;
}

interface NetworkConfig {
  [key: string]: any;
  chainId?: number;
  blockExplorerUrl?: string;
  defaultRpcUrl?: string;
}

interface AddressesConfig {
  networks: {
    [networkName: string]: NetworkConfig;
  };
}

function loadDeployments(): Deployments {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) fs.mkdirSync(DEPLOYMENTS_DIR);
  if (fs.existsSync(DEPLOYMENTS_FILE)) {
    return JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, "utf8"));
  }
  return {};
}

function saveDeployments(deployments: Deployments): void {
  fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
}

function loadAddressesConfig(): AddressesConfig {
  if (fs.existsSync(ADDRESSES_FILE)) {
    const content = fs.readFileSync(ADDRESSES_FILE, "utf8");
    // Extract the networks object from the TypeScript file
    const match = content.match(/export const networks = ({[\s\S]*?}) as const;/);
    if (match) {
      // Convert the TypeScript object to JSON by evaluating it
      const networksStr = match[1];
      try {
        const networks = eval(`(${networksStr})`);
        return { networks };
      } catch (error) {
        console.warn("Could not parse existing addresses.ts, creating new structure");
      }
    }
  }
  return { networks: {} };
}

function saveAddressesConfig(config: AddressesConfig): void {
  const content = `export const networks = ${JSON.stringify(config.networks, null, 2)} as const;\n`;
  fs.writeFileSync(ADDRESSES_FILE, content);
}

function updateAddressesConfig(contractName: string, address: string): void {
  const config = loadAddressesConfig();

  if (!config.networks[NETWORK]) {
    config.networks[NETWORK] = {};
  }

  // Map contract names to address config keys
  const contractKeyMap: { [key: string]: string } = {
    "MockUSDC": "USDC_ADDRESS",
    "MockAToken": "AAVE_ATOKEN",
    "MockAavePool": "AAVE_V3_POOL",
    "MockAavePoolDataProvider": "AAVE_DATA_PROVIDER",
    "AaveLendingAdapter": "AAVE_LENDING_ADAPTER",
    "MockMToken": "MOONWELL_MTOKEN",
    "MoonwellLendingAdapter": "MOONWELL_LENDING_ADAPTER",
    "UniswapV2Factory": "UNISWAP_FACTORY",
    "TrancheAAA": "TRANCHE_AAA",
    "TrancheAA": "TRANCHE_AA",
    "InsuranceCalculator": "INSURANCE_CALCULATOR",
    "InsuranceAdapterManager": "INSURANCE_ADAPTER_MANAGER",
    "InsuranceCore": "INSURANCE_CORE"
  };

  const configKey = contractKeyMap[contractName] || contractName.toUpperCase();
  config.networks[NETWORK][configKey] = address;

  console.log(`📝 Updated addresses.ts: ${NETWORK}.${configKey} = ${address}`);
  saveAddressesConfig(config);
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
  saveDeployments(deployments);

  // Update addresses.ts
  updateAddressesConfig(name, deployedAddress);

  console.log(`✅ Deployed ${name} at ${deployedAddress}`);
  return deployedAddress;
}

async function main(): Promise<void> {
  console.log("🚀 Starting Complete System Deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
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
      const existingAToken = await aavePool.aTokens(usdcAddress);
      if (existingAToken === "0x0000000000000000000000000000000000000000") {
        console.log("⚙️ Setting aToken for USDC in MockAavePool...");
        const tx = await aavePool.setAToken(usdcAddress, aTokenAddress);
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
    const coreInfo = await insuranceCore.getInfo();
    const isCoreInitialized = coreInfo[2]; // initialized is the third element in the returned tuple
    if (!isCoreInitialized) {
      console.log("\n⚙️ Initializing Insurance Core...");
      const currentTime = Math.floor(Date.now() / 1000);
      const S = currentTime + 2 * 24 * 60 * 60; // 2 days from now
      const T1 = S + 5 * 24 * 60 * 60; // 5 days after S
      const T2 = T1 + 1 * 24 * 60 * 60; // 1 day after T1
      const T3 = T2 + 1 * 24 * 60 * 60; // 1 day after T2

      await insuranceCore.initialize(
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
      await adapterManager.initialize(insuranceCoreAddress, deployments.MockUSDC);
      console.log("✅ Adapter Manager initialized");
    } catch (error: any) {
      if (error.message.includes("Already initialized")) {
        console.log("✅ Adapter Manager already initialized.");
      } else {
        throw error;
      }
    }

    // Set tranches in Insurance Core
    const currentAAA = await insuranceCore.AAA();
    const currentAA = await insuranceCore.AA();

    if (currentAAA === "0x0000000000000000000000000000000000000000" && currentAA === "0x0000000000000000000000000000000000000000") {
      console.log("\n⚙️ Setting tranches in Insurance Core...");
      await insuranceCore.setTranches(deployments.TrancheAAA, deployments.TrancheAA);
      console.log("✅ Tranches set in Insurance Core");
    } else {
      console.log("✅ Tranches already set in Insurance Core.");
    }

    // Add lending adapters to Adapter Manager
    const currentAdapterManagerAdapters = await adapterManager.getAllAdapters();
    if (!currentAdapterManagerAdapters.includes(deployments.AaveLendingAdapter)) {
      console.log("\n➕ Adding Aave Lending Adapter to Adapter Manager...");
      await adapterManager.addLendingAdapter(deployments.AaveLendingAdapter);
      console.log("✅ Aave Lending Adapter added to Adapter Manager");
    } else {
      console.log("✅ Aave Lending Adapter already added to Adapter Manager.");
    }

    if (!currentAdapterManagerAdapters.includes(deployments.MoonwellLendingAdapter)) {
      console.log("\n➕ Adding Moonwell Lending Adapter to Adapter Manager...");
      await adapterManager.addLendingAdapter(deployments.MoonwellLendingAdapter);
      console.log("✅ Moonwell Lending Adapter added to Adapter Manager");
    } else {
      console.log("✅ Moonwell Lending Adapter already added to Adapter Manager.");
    }

    saveDeployments(deployments);

    console.log("\n🎉 Complete System Deployment Successful!");
    console.log("\n📋 Contract Addresses:");
    for (const key in deployments) {
      console.log(`  ${key}: ${deployments[key]}`);
    }

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
