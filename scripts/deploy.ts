import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { TimeCalculator } from "./utils/TimeCalculator";
import {
  deployIfNeeded,
  getDeployedContract,
  loadDeployments,
  saveDeployments,
  setupDeployer,
  waitForConfirmations
} from "./utils/DeploymentUtils";

async function main(): Promise<void> {
  console.log("🚀 Starting Complete Insurance System Deployment...");

  const { deployer, defaultAccount } = await setupDeployer();
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

    // Deploy Time Manager
    const timeManagerAddress = await deployIfNeeded(
      "InsuranceTimeManager",
      () => ethers.getContractFactory("InsuranceTimeManager")
    );
    deployments.InsuranceTimeManager = timeManagerAddress;
    saveDeployments(deployments);

    // Deploy Claim Manager
    const claimManagerAddress = await deployIfNeeded(
      "InsuranceClaimManager",
      () => ethers.getContractFactory("InsuranceClaimManager")
    );
    deployments.InsuranceClaimManager = claimManagerAddress;
    saveDeployments(deployments);

    // Deploy Insurance Core (Refactored Version)
    const insuranceCoreAddress = await deployIfNeeded(
      "InsuranceCore",
      () => ethers.getContractFactory("InsuranceCore")
    );
    deployments.InsuranceCore = insuranceCoreAddress;
    saveDeployments(deployments);

    // 5. Initialize Contracts
    console.log("\n--- Initializing Contracts ---");

    // Initialize Time Manager
    const timeManager = await getDeployedContract("InsuranceTimeManager", timeManagerAddress);
    try {
      const currentCore = await (timeManager as any).insuranceCore();
      if (currentCore === "0x0000000000000000000000000000000000000000") {
        console.log("⚙️ Initializing Time Manager...");
        const tx = await (timeManager as any).initialize(insuranceCoreAddress, claimManagerAddress);
        await tx.wait();
        console.log("✅ Time Manager initialized");
      } else {
        console.log("✅ Time Manager already initialized");
      }
    } catch (error: any) {
      if (error.message.includes("already initialized")) {
        console.log("✅ Time Manager already initialized");
      } else {
        throw error;
      }
    }

    // Set time periods in Time Manager
    try {
      console.log("⚙️ Setting time periods in Time Manager...");
      const timePeriods = TimeCalculator.calculateTimePeriods();
      const { S, T1, T2, T3 } = timePeriods;
      const tx = await (timeManager as any).setTimePeriods(S, T1, T2, T3);
      await tx.wait();
      console.log("✅ Time periods set in Time Manager");
    } catch (error: any) {
      console.log("Note: Time periods might already be set or there was an issue setting them");
    }

    // Initialize Claim Manager
    const claimManager = await getDeployedContract("InsuranceClaimManager", claimManagerAddress);
    try {
      const currentCore = await (claimManager as any).insuranceCore();
      if (currentCore === "0x0000000000000000000000000000000000000000") {
        console.log("⚙️ Initializing Claim Manager...");
        const tx = await (claimManager as any).initialize(
          insuranceCoreAddress,
          deployments.TrancheAAA,
          deployments.TrancheAA,
          deployments.MockUSDC,
          deployments.InsuranceAdapterManager,
          deployments.InsuranceCalculator,
          timeManagerAddress
        );
        await tx.wait();
        console.log("✅ Claim Manager initialized");
      } else {
        console.log("✅ Claim Manager already initialized");
      }
    } catch (error: any) {
      if (error.message.includes("already initialized")) {
        console.log("✅ Claim Manager already initialized");
      } else {
        throw error;
      }
    }

    // Initialize Insurance Core
    const insuranceCore = await getDeployedContract("InsuranceCore", insuranceCoreAddress);
    try {
      console.log("⚙️ Initializing Insurance Core...");
      const tx = await (insuranceCore as any).initialize(
        deployments.MockUSDC,
        deployments.InsuranceAdapterManager,
        timeManagerAddress,
        claimManagerAddress
      );
      await tx.wait();
      console.log("✅ Insurance Core initialized");
    } catch (error: any) {
      if (error.message.includes("already initialized")) {
        console.log("✅ Insurance Core already initialized");
      } else {
        console.log(`⚠️ Error initializing Insurance Core: ${error.message}`);
        // Continue with deployment even if initialization fails
      }
    }


    // Initialize Adapter Manager
    const adapterManager = await getDeployedContract("InsuranceAdapterManager", adapterManagerAddress);
    try {
      console.log("⚙️ Initializing Adapter Manager...");
      await (adapterManager as any).initialize(insuranceCoreAddress, deployments.MockUSDC);
      console.log("✅ Adapter Manager initialized");
    } catch (error: any) {
      if (error.message.includes("Already initialized")) {
        console.log("✅ Adapter Manager already initialized.");
      } else {
        throw error;
      }
    }

    // Transfer tranche ownership and set tranches in Insurance Core
    try {
      const currentAAA = await (insuranceCore as any).AAA();
      const currentAA = await (insuranceCore as any).AA();

      if (currentAAA === "0x0000000000000000000000000000000000000000" && currentAA === "0x0000000000000000000000000000000000000000") {
        console.log("⚙️ Transferring tranche ownership to Insurance Core...");
        const trancheAAA = await getDeployedContract("Tranche", deployments.TrancheAAA);
        const trancheAA = await getDeployedContract("Tranche", deployments.TrancheAA);

        // Transfer ownership first
        const tx1 = await (trancheAAA as any).transferOwnership(insuranceCoreAddress);
        await tx1.wait();
        console.log("✅ TrancheAAA ownership transferred to Insurance Core");

        const tx2 = await (trancheAA as any).transferOwnership(insuranceCoreAddress);
        await tx2.wait();
        console.log("✅ TrancheAA ownership transferred to Insurance Core");

        // Then set tranches in Insurance Core
        console.log("⚙️ Setting tranche addresses in Insurance Core...");
        const tx3 = await (insuranceCore as any).setTranches(deployments.TrancheAAA, deployments.TrancheAA);
        await tx3.wait();
        console.log("✅ Tranche addresses set in Insurance Core");

        // Verify the configuration
        const verifyAAA = await (insuranceCore as any).AAA();
        const verifyAA = await (insuranceCore as any).AA();
        console.log("✅ Verified tranche addresses in Insurance Core:");
        console.log(`  AAA: ${verifyAAA}`);
        console.log(`  AA: ${verifyAA}`);
      } else {
        console.log("✅ Tranches already set in Insurance Core");
        console.log(`  AAA: ${currentAAA}`);
        console.log(`  AA: ${currentAA}`);
      }
    } catch (error: any) {
      console.error("❌ Error setting up tranches:", error.message);
      throw error; // Don't continue if tranche setup fails
    }

    // Add lending adapters to Adapter Manager
    const currentAdapterManagerAdapters = await (adapterManager as any).getAllAdapters();
    if (!currentAdapterManagerAdapters.includes(deployments.AaveLendingAdapter)) {
      console.log("➕ Adding Aave Lending Adapter to Adapter Manager...");
      await (adapterManager as any).addLendingAdapter(deployments.AaveLendingAdapter);
      console.log("✅ Aave Lending Adapter added to Adapter Manager");
    } else {
      console.log("✅ Aave Lending Adapter already added to Adapter Manager.");
    }

    if (!currentAdapterManagerAdapters.includes(deployments.MoonwellLendingAdapter)) {
      console.log("➕ Adding Moonwell Lending Adapter to Adapter Manager...");
      await (adapterManager as any).addLendingAdapter(deployments.MoonwellLendingAdapter);
      console.log("✅ Moonwell Lending Adapter added to Adapter Manager");
    } else {
      console.log("✅ Moonwell Lending Adapter already added to Adapter Manager.");
    }

    // Create Uniswap pairs for AAA and AA tokens
    console.log("\n--- Creating Uniswap Pairs ---");
    const factory = await getDeployedContract("UniswapV2Factory", uniswapFactoryAddress);

    // Check if AAA/AA pair exists (refactored from separate USDC pairs)
    const aaaAaPair = await (factory as any).getPair(deployments.TrancheAAA, deployments.TrancheAA);
    if (aaaAaPair === "0x0000000000000000000000000000000000000000") {
      console.log("Creating AAA/AA pair...");
      await waitForConfirmations((factory as any).createPair(deployments.TrancheAAA, deployments.TrancheAA));
      console.log("Created AAA/AA pair");
    } else {
      console.log("✅ AAA/AA pair already exists:", aaaAaPair);
    }

    // Get the pair address after creation
    const aaaAaPairAddress = await (factory as any).getPair(deployments.TrancheAAA, deployments.TrancheAA);

    // Add liquidity to AAA/AA pair by depositing USDC first
    console.log("\n--- Adding Liquidity to AAA/AA Pair ---");
    const router = await getDeployedContract("UniswapV2Router02", uniswapRouterAddress);
    const trancheAAA = await getDeployedContract("Tranche", deployments.TrancheAAA);
    const trancheAA = await getDeployedContract("Tranche", deployments.TrancheAA);
    const usdc = await getDeployedContract("MockUSDC", deployments.MockUSDC);

    const depositAmount = ethers.parseEther("100000"); // 100k USDC
    const liquidityAmount = ethers.parseEther("50000"); // 50k tokens for liquidity

    try {
      console.log("⚙️ Minting USDC and depositing to get AAA/AA tokens...");

      // First mint USDC to deployer
      const mintUSDCtx = await (usdc as any).mint(deployerAddress, depositAmount);
      await mintUSDCtx.wait();
      console.log(`✅ Minted ${ethers.formatEther(depositAmount)} USDC to deployer`);

      // Approve Insurance Core to spend USDC
      const approveUSDCtx = await (usdc as any).approve(insuranceCoreAddress, depositAmount);
      await approveUSDCtx.wait();
      console.log("✅ Approved Insurance Core to spend USDC");

      // Deposit USDC to get AAA and AA tokens
      console.log("⚙️ Depositing USDC to Insurance Core...");
      const depositTx = await (insuranceCore as any).splitRisk(depositAmount);
      await depositTx.wait();
      console.log(`✅ Deposited ${ethers.formatEther(depositAmount)} USDC and received AAA/AA tokens`);

      // Check balances
      const aaaBalance = await (trancheAAA as any).balanceOf(deployerAddress);
      const aaBalance = await (trancheAA as any).balanceOf(deployerAddress);
      console.log(`AAA balance: ${ethers.formatEther(aaaBalance)}`);
      console.log(`AA balance: ${ethers.formatEther(aaBalance)}`);

      // Approve router to spend tokens
      console.log("⚙️ Approving router to spend tokens...");
      const approveAAAtx = await (trancheAAA as any).approve(uniswapRouterAddress, liquidityAmount);
      await approveAAAtx.wait();
      console.log("✅ Approved router to spend AAA tokens");

      const approveAAtx = await (trancheAA as any).approve(uniswapRouterAddress, liquidityAmount);
      await approveAAtx.wait();
      console.log("✅ Approved router to spend AA tokens");

      // Add liquidity using router
      console.log("⚙️ Adding liquidity to AAA/AA pair...");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

      const addLiquidityTx = await (router as any).addLiquidity(
        deployments.TrancheAAA,    // tokenA
        deployments.TrancheAA,     // tokenB
        liquidityAmount,           // amountADesired
        liquidityAmount,           // amountBDesired
        ethers.parseEther("49000"), // amountAMin (allow 2% slippage)
        ethers.parseEther("49000"), // amountBMin (allow 2% slippage)
        deployerAddress,           // to
        deadline                   // deadline
      );
      await addLiquidityTx.wait();
      console.log(`✅ Successfully added ${ethers.formatEther(liquidityAmount)} AAA and ${ethers.formatEther(liquidityAmount)} AA tokens as liquidity`);

      // Verify liquidity was added
      const pair = await getDeployedContract("UniswapV2Pair", aaaAaPairAddress);
      const reserves = await (pair as any).getReserves();
      console.log("✅ Pool reserves after liquidity addition:");
      console.log(`  Reserve0: ${ethers.formatEther(reserves[0])}`);
      console.log(`  Reserve1: ${ethers.formatEther(reserves[1])}`);

    } catch (error: any) {
      console.error("❌ Error adding liquidity:", error.message);
      console.log("⚠️ Continuing deployment without liquidity provision");
    }

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
    const timeManagerArtifact = await ethers.getContractFactory("InsuranceTimeManager");
    const claimManagerArtifact = await ethers.getContractFactory("InsuranceClaimManager");

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
      InsuranceTimeManager: {
        address: deployments.InsuranceTimeManager,
        abi: timeManagerArtifact.interface.fragments
      },
      InsuranceClaimManager: {
        address: deployments.InsuranceClaimManager,
        abi: claimManagerArtifact.interface.fragments
      },
      AAAAPair: {
        address: aaaAaPairAddress,
        abi: pairArtifact.interface.fragments
      }
    };

    // Write updated contracts.json
    writeFileSync(contractsPath, JSON.stringify(contractsJson, null, 2));

    // Final save of all deployments to ensure everything is tracked
    saveDeployments(deployments);

    console.log("\n🎉 Complete Insurance System Deployment Successful!");
    console.log("- Updated config/addresses.ts with new contract addresses");
    console.log("- Updated frontend/src/contracts.json with network configuration");
    console.log("\n📋 Contract Addresses:");
    for (const key in deployments) {
      console.log(`  ${key}: ${deployments[key]}`);
    }
    console.log(`  AAAAPair: ${aaaAaPairAddress}`);

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
