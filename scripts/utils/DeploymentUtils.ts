import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { ContractTransactionResponse } from "ethers";

const ADDRESSES_FILE = path.join(__dirname, "../../config/addresses.ts");
const CONTRACTS_FILE = path.join(__dirname, "../../frontend/src/contracts.json");

export async function waitForConfirmations(tx: Promise<ContractTransactionResponse> | ContractTransactionResponse) {
  const resolvedTx = await tx;
  await resolvedTx.wait(2); // Wait for 2 confirmations
  return resolvedTx;
}

export function loadDeployments(): { [key: string]: string } {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    return {};
  }

  const content = fs.readFileSync(ADDRESSES_FILE, "utf8");
  const addressMatch = content.match(/export const addresses = ({[\s\S]*?});/);

  if (!addressMatch) {
    return {};
  }

  try {
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
      "InsuranceTimeManager": addressObj.INSURANCE_TIME_MANAGER,
      "InsuranceClaimManager": addressObj.INSURANCE_CLAIM_MANAGER,
      "InsuranceCore": addressObj.INSURANCE_CORE
    };
  } catch {
    return {};
  }
}

export function saveDeployments(deployments: { [key: string]: string }): void {
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
    INSURANCE_TIME_MANAGER: deployments.InsuranceTimeManager || "",
    INSURANCE_CLAIM_MANAGER: deployments.InsuranceClaimManager || "",
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

export function updateSingleAddress(contractName: string, address: string): void {
  const deployments = loadDeployments();
  deployments[contractName] = address;
  saveDeployments(deployments);
}

export async function getDeployedContract(name: string, address: string) {
  const factory = await ethers.getContractFactory(name);
  return factory.attach(address);
}

export async function deployIfNeeded(
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

export async function deployAlways(
  name: string,
  factoryGetter: () => Promise<any>,
  ...args: any[]
): Promise<string> {
  console.log(`🚀 Deploying ${name}...`);
  const factory = await factoryGetter();
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  if (!deployedAddress) {
    console.error(`❌ Deployment failed for ${name}: no address found. Contract object:`, contract);
    throw new Error(`Deployment failed for ${name}: no address found.`);
  }

  console.log(`✅ Deployed ${name} at ${deployedAddress}`);
  return deployedAddress;
}

export async function setupDeployer() {
  let deployer;
  const [defaultAccount] = await ethers.getSigners();

  if (process.env.PRIVATE_KEY) {
    console.log("Using private key from .env file");
    deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);

    // Check if deployer has ETH, if not transfer some from default account
    const deployerBalance = await ethers.provider.getBalance(deployer.address);
    if (deployerBalance < ethers.parseEther("10")) {
      console.log("Funding deployer account with ETH...");
      const fundTx = await defaultAccount.sendTransaction({
        to: deployer.address,
        value: ethers.parseEther("1000")
      });
      await fundTx.wait();
      console.log("✅ Deployer account funded with 1000 ETH");
    }
  } else {
    console.log("Using default hardhat account");
    deployer = defaultAccount;
  }

  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  return { deployer, defaultAccount };
}

export async function updateFrontendContracts(contracts: {
  factoryAddress: string;
  routerAddress: string;
  usdcAddress: string;
  trancheAAAAddress: string;
  trancheAAAddress: string;
  pairAddress: string;
}) {
  // Read existing contracts.json
  let contractsJson: any = { networks: {} };
  if (fs.existsSync(CONTRACTS_FILE)) {
    contractsJson = JSON.parse(fs.readFileSync(CONTRACTS_FILE, 'utf8'));
  }

  // Get contract artifacts for ABIs (simplified ABIs for essential functions)
  const erc20ABI = [
    {
      "type": "function",
      "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
      "name": "allowance",
      "constant": true,
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "approve",
      "constant": false,
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "constant": true,
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [],
      "name": "decimals",
      "constant": true,
      "outputs": [{"name": "", "type": "uint8"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [],
      "name": "name",
      "constant": true,
      "outputs": [{"name": "", "type": "string"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [],
      "name": "symbol",
      "constant": true,
      "outputs": [{"name": "", "type": "string"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [],
      "name": "totalSupply",
      "constant": true,
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "transfer",
      "constant": false,
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "inputs": [{"name": "from", "type": "address"}, {"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "transferFrom",
      "constant": false,
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "name": "mint",
      "constant": false,
      "outputs": [],
      "stateMutability": "nonpayable"
    }
  ];

  const routerABI = [
    {
      "type": "function",
      "inputs": [
        {"name": "amountIn", "type": "uint256"},
        {"name": "amountOutMin", "type": "uint256"},
        {"name": "path", "type": "address[]"},
        {"name": "to", "type": "address"},
        {"name": "deadline", "type": "uint256"}
      ],
      "name": "swapExactTokensForTokens",
      "constant": false,
      "outputs": [{"name": "amounts", "type": "uint256[]"}],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "inputs": [
        {"name": "tokenA", "type": "address"},
        {"name": "tokenB", "type": "address"},
        {"name": "amountADesired", "type": "uint256"},
        {"name": "amountBDesired", "type": "uint256"},
        {"name": "amountAMin", "type": "uint256"},
        {"name": "amountBMin", "type": "uint256"},
        {"name": "to", "type": "address"},
        {"name": "deadline", "type": "uint256"}
      ],
      "name": "addLiquidity",
      "constant": false,
      "outputs": [
        {"name": "amountA", "type": "uint256"},
        {"name": "amountB", "type": "uint256"},
        {"name": "liquidity", "type": "uint256"}
      ],
      "stateMutability": "nonpayable"
    }
  ];

  // Update localhost network configuration
  contractsJson.networks.localhost = {
    "USDC": {
      "address": contracts.usdcAddress,
      "abi": erc20ABI
    },
    "TrancheAAA": {
      "address": contracts.trancheAAAAddress,
      "abi": erc20ABI
    },
    "TrancheAA": {
      "address": contracts.trancheAAAddress,
      "abi": erc20ABI
    },
    "UniswapV2Router02": {
      "address": contracts.routerAddress,
      "abi": routerABI
    },
    "UniswapV2Factory": {
      "address": contracts.factoryAddress,
      "abi": []
    },
    "AAAAPair": {
      "address": contracts.pairAddress,
      "abi": []
    }
  };

  // Write updated contracts.json
  fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contractsJson, null, 2));
  console.log("✅ Updated frontend/src/contracts.json with new addresses");
}
