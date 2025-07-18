import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { TimeCalculator } from "./utils/TimeCalculator";

// Load environment variables
dotenv.config();

async function main() {
  console.log("🚀 Deploying contracts to local hardhat node...");

  // Use private key from .env if provided, otherwise use default hardhat account
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

  // Deploy Uniswap Factory
  console.log("Deploying UniswapV2Factory...");
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ UniswapV2Factory deployed at:", factoryAddress);

  // Deploy Uniswap Router
  console.log("Deploying UniswapV2Router02...");
  const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
  const router = await UniswapV2Router02.deploy(factoryAddress, "0x0000000000000000000000000000000000000000");
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ UniswapV2Router02 deployed at:", routerAddress);

  // Deploy MockUSDC
  console.log("Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockUSDC deployed at:", usdcAddress);

  // Deploy Tranche tokens
  console.log("Deploying TrancheAAA...");
  const Tranche = await ethers.getContractFactory("Tranche");
  const trancheAAA = await Tranche.deploy("Tranche AAA", "TAAA");
  await trancheAAA.waitForDeployment();
  const trancheAAAAddress = await trancheAAA.getAddress();
  console.log("✅ TrancheAAA deployed at:", trancheAAAAddress);

  console.log("Deploying TrancheAA...");
  const trancheAA = await Tranche.deploy("Tranche AA", "TAA");
  await trancheAA.waitForDeployment();
  const trancheAAAddress = await trancheAA.getAddress();
  console.log("✅ TrancheAA deployed at:", trancheAAAddress);

  // Deploy Insurance System Components
  console.log("\n--- Deploying Insurance System ---");
  
  // Deploy Calculator
  console.log("Deploying InsuranceCalculator...");
  const InsuranceCalculator = await ethers.getContractFactory("InsuranceCalculator");
  const calculator = await InsuranceCalculator.deploy();
  await calculator.waitForDeployment();
  const calculatorAddress = await calculator.getAddress();
  console.log("✅ InsuranceCalculator deployed at:", calculatorAddress);

  // Deploy Adapter Manager
  console.log("Deploying InsuranceAdapterManager...");
  const InsuranceAdapterManager = await ethers.getContractFactory("InsuranceAdapterManager");
  const adapterManager = await InsuranceAdapterManager.deploy();
  await adapterManager.waitForDeployment();
  const adapterManagerAddress = await adapterManager.getAddress();
  console.log("✅ InsuranceAdapterManager deployed at:", adapterManagerAddress);

  // Deploy Time Manager
  console.log("Deploying InsuranceTimeManager...");
  const InsuranceTimeManager = await ethers.getContractFactory("InsuranceTimeManager");
  const timeManager = await InsuranceTimeManager.deploy();
  await timeManager.waitForDeployment();
  const timeManagerAddress = await timeManager.getAddress();
  console.log("✅ InsuranceTimeManager deployed at:", timeManagerAddress);

  // Deploy Claim Manager
  console.log("Deploying InsuranceClaimManager...");
  const InsuranceClaimManager = await ethers.getContractFactory("InsuranceClaimManager");
  const claimManager = await InsuranceClaimManager.deploy();
  await claimManager.waitForDeployment();
  const claimManagerAddress = await claimManager.getAddress();
  console.log("✅ InsuranceClaimManager deployed at:", claimManagerAddress);

  // Deploy Insurance Core
  console.log("Deploying InsuranceCore...");
  const InsuranceCore = await ethers.getContractFactory("InsuranceCore");
  const insuranceCore = await InsuranceCore.deploy();
  await insuranceCore.waitForDeployment();
  const insuranceCoreAddress = await insuranceCore.getAddress();
  console.log("✅ InsuranceCore deployed at:", insuranceCoreAddress);

  // Deploy Mock Lending Protocols
  console.log("\n--- Deploying Mock Lending Protocols ---");
  
  // Deploy MockAToken
  console.log("Deploying MockAToken...");
  const MockAToken = await ethers.getContractFactory("MockAToken");
  const aToken = await MockAToken.deploy(usdcAddress);
  await aToken.waitForDeployment();
  const aTokenAddress = await aToken.getAddress();
  console.log("✅ MockAToken deployed at:", aTokenAddress);

  // Deploy MockAavePool
  console.log("Deploying MockAavePool...");
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const aavePool = await MockAavePool.deploy(usdcAddress);
  await aavePool.waitForDeployment();
  const aavePoolAddress = await aavePool.getAddress();
  console.log("✅ MockAavePool deployed at:", aavePoolAddress);

  // Set aToken mapping in MockAavePool
  console.log("Setting aToken for USDC in MockAavePool...");
  await aavePool.setAToken(usdcAddress, aTokenAddress);
  console.log("✅ aToken mapping set");

  // Deploy MockAavePoolDataProvider
  console.log("Deploying MockAavePoolDataProvider...");
  const MockAavePoolDataProvider = await ethers.getContractFactory("MockAavePoolDataProvider");
  const aaveDataProvider = await MockAavePoolDataProvider.deploy(usdcAddress, aTokenAddress);
  await aaveDataProvider.waitForDeployment();
  const aaveDataProviderAddress = await aaveDataProvider.getAddress();
  console.log("✅ MockAavePoolDataProvider deployed at:", aaveDataProviderAddress);

  // Deploy AaveLendingAdapter
  console.log("Deploying AaveLendingAdapter...");
  const AaveLendingAdapter = await ethers.getContractFactory("AaveLendingAdapter");
  const aaveAdapter = await AaveLendingAdapter.deploy(aavePoolAddress, aaveDataProviderAddress);
  await aaveAdapter.waitForDeployment();
  const aaveAdapterAddress = await aaveAdapter.getAddress();
  console.log("✅ AaveLendingAdapter deployed at:", aaveAdapterAddress);

  // Deploy MockMToken (Moonwell)
  console.log("Deploying MockMToken...");
  const MockMToken = await ethers.getContractFactory("MockMToken");
  const mToken = await MockMToken.deploy(usdcAddress);
  await mToken.waitForDeployment();
  const mTokenAddress = await mToken.getAddress();
  console.log("✅ MockMToken deployed at:", mTokenAddress);

  // Deploy MoonwellLendingAdapter
  console.log("Deploying MoonwellLendingAdapter...");
  const MoonwellLendingAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
  const moonwellAdapter = await MoonwellLendingAdapter.deploy(mTokenAddress);
  await moonwellAdapter.waitForDeployment();
  const moonwellAdapterAddress = await moonwellAdapter.getAddress();
  console.log("✅ MoonwellLendingAdapter deployed at:", moonwellAdapterAddress);

  // Create Uniswap pair for AAA/AA
  console.log("Creating AAA/AA pair...");
  const tx = await factory.createPair(trancheAAAAddress, trancheAAAddress);
  await tx.wait();
  console.log("✅ AAA/AA pair created");

  // Mint some tokens for testing
  console.log("Minting test tokens...");

  // For adding liquidity, we need to mint to the account that will actually deploy (defaultAccount)
  // since that's where the deployment transactions are coming from
  const liquidityProvider = defaultAccount;

  await usdc.mint(liquidityProvider.address, ethers.parseEther("1000000"));
  await trancheAAA.mint(liquidityProvider.address, ethers.parseEther("1000000"));
  await trancheAA.mint(liquidityProvider.address, ethers.parseEther("1000000"));
  console.log(`✅ Test tokens minted to liquidity provider: ${liquidityProvider.address}`);

  // If using private key, also mint to your address for testing
  if (process.env.PRIVATE_KEY) {
    await usdc.mint(deployer.address, ethers.parseEther("100000")); // MockUSDC uses 18 decimals
    await trancheAAA.mint(deployer.address, ethers.parseEther("50000"));
    await trancheAA.mint(deployer.address, ethers.parseEther("50000"));
    console.log(`✅ Additional test tokens minted to your account: ${deployer.address}`);
  }

  // Initialize Insurance System
  console.log("\n--- Initializing Insurance System ---");
  
  // Initialize Time Manager
  console.log("Initializing Time Manager...");
  await timeManager.initialize(insuranceCoreAddress, claimManagerAddress);
  console.log("✅ Time Manager initialized");

  // Initialize Claim Manager
  console.log("Initializing Claim Manager...");
  await claimManager.initialize(
    insuranceCoreAddress,
    trancheAAAAddress,
    trancheAAAddress,
    usdcAddress,
    adapterManagerAddress,
    calculatorAddress,
    timeManagerAddress
  );
  console.log("✅ Claim Manager initialized");

  // Initialize Insurance Core
  console.log("Initializing Insurance Core...");
  await insuranceCore.initialize(
    usdcAddress,
    adapterManagerAddress,
    timeManagerAddress,
    claimManagerAddress
  );
  console.log("✅ Insurance Core initialized");

  // Initialize Adapter Manager
  console.log("Initializing Adapter Manager...");
  await adapterManager.initialize(insuranceCoreAddress, usdcAddress);
  console.log("✅ Adapter Manager initialized");

  // Transfer tranche ownership to Insurance Core
  console.log("Transferring tranche ownership to Insurance Core...");
  await trancheAAA.transferOwnership(insuranceCoreAddress);
  await trancheAA.transferOwnership(insuranceCoreAddress);
  console.log("✅ Tranche ownership transferred");

  // Set tranches in Insurance Core
  console.log("Setting tranches in Insurance Core...");
  await insuranceCore.setTranches(trancheAAAAddress, trancheAAAddress);
  console.log("✅ Tranches set in Insurance Core");

  // Set time periods in Time Manager
  console.log("Setting time periods in Time Manager...");
  const timePeriods = TimeCalculator.calculateTimePeriods();
  const { S, T1, T2, T3 } = timePeriods;
  await timeManager.setTimePeriods(S, T1, T2, T3);
  console.log("✅ Time periods set in Time Manager");
  console.log(`  S (Issuance end): ${new Date(S * 1000).toISOString()}`);
  console.log(`  T1 (Insurance end): ${new Date(T1 * 1000).toISOString()}`);
  console.log(`  T2 (AAA claims start): ${new Date(T2 * 1000).toISOString()}`);
  console.log(`  T3 (Final claims end): ${new Date(T3 * 1000).toISOString()}`);

  // Add lending adapters to Adapter Manager
  console.log("Adding lending adapters to Adapter Manager...");
  await adapterManager.addLendingAdapter(aaveAdapterAddress);
  console.log("✅ Aave Lending Adapter added");
  
  await adapterManager.addLendingAdapter(moonwellAdapterAddress);
  console.log("✅ Moonwell Lending Adapter added");

  // Add some initial liquidity to the pair
  console.log("Adding initial liquidity...");
  const pairAddress = await factory.getPair(trancheAAAAddress, trancheAAAddress);
  console.log("Pair address:", pairAddress);

  // Approve router to spend tokens from the liquidity provider account
  await trancheAAA.connect(liquidityProvider).approve(routerAddress, ethers.parseEther("100000"));
  await trancheAA.connect(liquidityProvider).approve(routerAddress, ethers.parseEther("100000"));

  // Add liquidity using the liquidity provider account
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
  await router.connect(liquidityProvider).addLiquidity(
    trancheAAAAddress,
    trancheAAAddress,
    ethers.parseEther("10000"), // 10k AAA
    ethers.parseEther("10000"), // 10k AA
    0,
    0,
    liquidityProvider.address,
    deadline
  );
  console.log("✅ Initial liquidity added");

  // Update frontend contracts.json file
  console.log("\n--- Updating Frontend Configuration ---");
  await updateFrontendContracts({
    factoryAddress,
    routerAddress,
    usdcAddress,
    trancheAAAAddress,
    trancheAAAddress,
    pairAddress,
    insuranceCoreAddress
  });

  console.log("\n=== Deployment Summary ===");
  console.log("UniswapV2Factory:", factoryAddress);
  console.log("UniswapV2Router02:", routerAddress);
  console.log("MockUSDC:", usdcAddress);
  console.log("TrancheAAA:", trancheAAAAddress);
  console.log("TrancheAA:", trancheAAAddress);
  console.log("AAA/AA Pair:", pairAddress);
  console.log("InsuranceCore:", insuranceCoreAddress);
  console.log("✅ Frontend contracts.json updated successfully!");
}

async function updateFrontendContracts(contracts: {
  factoryAddress: string;
  routerAddress: string;
  usdcAddress: string;
  trancheAAAAddress: string;
  trancheAAAddress: string;
  pairAddress: string;
  insuranceCoreAddress: string;
}) {
  const contractsPath = path.join(__dirname, "../frontend/src/contracts.json");

  // Read existing contracts.json
  let contractsJson: any = { networks: {} };
  if (fs.existsSync(contractsPath)) {
    contractsJson = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
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
    },
    {
      "type": "function",
      "inputs": [
        {"name": "amountOut", "type": "uint256"},
        {"name": "reserveIn", "type": "uint256"},
        {"name": "reserveOut", "type": "uint256"}
      ],
      "name": "getAmountIn",
      "constant": true,
      "outputs": [{"name": "amountIn", "type": "uint256"}],
      "stateMutability": "pure"
    },
    {
      "type": "function",
      "inputs": [
        {"name": "amountIn", "type": "uint256"},
        {"name": "reserveIn", "type": "uint256"},
        {"name": "reserveOut", "type": "uint256"}
      ],
      "name": "getAmountOut",
      "constant": true,
      "outputs": [{"name": "amountOut", "type": "uint256"}],
      "stateMutability": "pure"
    },
    {
      "type": "function",
      "inputs": [
        {"name": "amountIn", "type": "uint256"},
        {"name": "path", "type": "address[]"}
      ],
      "name": "getAmountsOut",
      "constant": true,
      "outputs": [{"name": "amounts", "type": "uint256[]"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [
        {"name": "tokenA", "type": "address"},
        {"name": "tokenB", "type": "address"},
        {"name": "liquidity", "type": "uint256"},
        {"name": "amountAMin", "type": "uint256"},
        {"name": "amountBMin", "type": "uint256"},
        {"name": "to", "type": "address"},
        {"name": "deadline", "type": "uint256"}
      ],
      "name": "removeLiquidity",
      "constant": false,
      "outputs": [
        {"name": "amountA", "type": "uint256"},
        {"name": "amountB", "type": "uint256"}
      ],
      "stateMutability": "nonpayable"
    }
  ];

  const factoryABI = [
    {
      "type": "function",
      "inputs": [
        {"name": "tokenA", "type": "address"},
        {"name": "tokenB", "type": "address"}
      ],
      "name": "getPair",
      "constant": true,
      "outputs": [{"name": "pair", "type": "address"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [
        {"name": "tokenA", "type": "address"},
        {"name": "tokenB", "type": "address"}
      ],
      "name": "createPair",
      "constant": false,
      "outputs": [{"name": "pair", "type": "address"}],
      "stateMutability": "nonpayable"
    }
  ];

  const insuranceABI = [
    {
      "type": "function",
      "inputs": [{"name": "amount", "type": "uint256"}],
      "name": "splitRisk",
      "constant": false,
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "inputs": [],
      "name": "AAA",
      "constant": true,
      "outputs": [{"name": "", "type": "address"}],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "inputs": [],
      "name": "AA",
      "constant": true,
      "outputs": [{"name": "", "type": "address"}],
      "stateMutability": "view"
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
      "abi": factoryABI
    },
    "AAAAPair": {
      "address": contracts.pairAddress,
      "abi": []
    },
    "Insurance": {
      "address": contracts.insuranceCoreAddress,
      "abi": insuranceABI
    }
  };

  // Write updated contracts.json
  fs.writeFileSync(contractsPath, JSON.stringify(contractsJson, null, 2));
  console.log("✅ Updated frontend/src/contracts.json with new addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
