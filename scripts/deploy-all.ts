import { ethers, network } from "hardhat";
import { networks } from "../config/addresses";
import { updateNetworkConfig } from "./utils/config";

async function main() {
  const net = network.name;
  // Type assertion to bypass readonly/index signature error
  const networksAny = networks as any;
  let config = networksAny[net] ? { ...networksAny[net] } : {};

  // Deploy MockUSDC
  let usdcAddress = config["USDC_ADDRESS"];
  if (usdcAddress) {
    console.log("MockUSDC already deployed at:", usdcAddress);
  } else {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    console.log("Deploying MockUSDC...");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    config["USDC_ADDRESS"] = usdcAddress;
    updateNetworkConfig(net, config);
    console.log("MockUSDC deployed to:", usdcAddress);
  }

  // Deploy Aave Mock Contracts
  let mockAavePoolAddress = config["AAVE_V3_POOL"];
  if (mockAavePoolAddress) {
    console.log("MockAavePool already deployed at:", mockAavePoolAddress);
  } else {
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    console.log("Deploying MockAavePool...");
    const mockAavePool = await MockAavePool.deploy(usdcAddress);
    await mockAavePool.waitForDeployment();
    mockAavePoolAddress = await mockAavePool.getAddress();
    config["AAVE_V3_POOL"] = mockAavePoolAddress;
    updateNetworkConfig(net, config);
    console.log("MockAavePool deployed to:", mockAavePoolAddress);
  }

  let aTokenAddress = config["AAVE_ATOKEN"];
  if (aTokenAddress) {
    console.log("aToken already set at:", aTokenAddress);
  } else {
    const MockAavePool = await ethers.getContractAt("MockAavePool", mockAavePoolAddress);
    aTokenAddress = await MockAavePool.aTokens(usdcAddress);
    config["AAVE_ATOKEN"] = aTokenAddress;
    updateNetworkConfig(net, config);
    console.log("aToken address:", aTokenAddress);
  }

  let mockAavePoolDataProviderAddress = config["AAVE_DATA_PROVIDER"];
  if (mockAavePoolDataProviderAddress) {
    console.log("MockAavePoolDataProvider already deployed at:", mockAavePoolDataProviderAddress);
  } else {
    const MockAavePoolDataProvider = await ethers.getContractFactory("MockAavePoolDataProvider");
    console.log("Deploying MockAavePoolDataProvider...");
    const mockAavePoolDataProvider = await MockAavePoolDataProvider.deploy(
      usdcAddress,
      aTokenAddress
    );
    await mockAavePoolDataProvider.waitForDeployment();
    mockAavePoolDataProviderAddress = await mockAavePoolDataProvider.getAddress();
    config["AAVE_DATA_PROVIDER"] = mockAavePoolDataProviderAddress;
    updateNetworkConfig(net, config);
    console.log("MockAavePoolDataProvider deployed to:", mockAavePoolDataProviderAddress);
  }

  // Deploy Moonwell Mock Contracts
  const MockMoonwell = await ethers.getContractFactory("MockMoonwell");
  console.log("Deploying MockMoonwell...");
  const mockMoonwell = await MockMoonwell.deploy(usdcAddress);
  await mockMoonwell.waitForDeployment();
  const mockMoonwellAddress = await mockMoonwell.getAddress();
  console.log("MockMoonwell deployed to:", mockMoonwellAddress);

  const mTokenAddress = await mockMoonwell.mToken();
  console.log("mToken address:", mTokenAddress);

  // Deploy Adapters
  const AaveLendingAdapter = await ethers.getContractFactory(
    "AaveLendingAdapter"
  );
  console.log("Deploying AaveLendingAdapter...");
  const aaveAdapter = await AaveLendingAdapter.deploy(
    mockAavePoolAddress,
    mockAavePoolDataProviderAddress
  );
  await aaveAdapter.waitForDeployment();
  const aaveAdapterAddress = await aaveAdapter.getAddress();
  console.log("AaveLendingAdapter deployed to:", aaveAdapterAddress);

  const MoonwellLendingAdapter = await ethers.getContractFactory(
    "MoonwellLendingAdapter"
  );
  console.log("Deploying MoonwellLendingAdapter...");
  const moonwellAdapter = await MoonwellLendingAdapter.deploy(mTokenAddress);
  await moonwellAdapter.waitForDeployment();
  const moonwellAdapterAddress = await moonwellAdapter.getAddress();
  console.log("MoonwellLendingAdapter deployed to:", moonwellAdapterAddress);

  // Deploy Insurance contract
  const Insurance = await ethers.getContractFactory("Insurance");
  console.log("Deploying Insurance...");
  const insurance = await Insurance.deploy(usdcAddress);
  await insurance.waitForDeployment();
  const insuranceAddress = await insurance.getAddress();
  console.log("Insurance deployed to:", insuranceAddress);

  // Add lending adapters to Insurance contract
  console.log("Adding Aave lending adapter...");
  await insurance.addLendingAdapter(aaveAdapterAddress);
  console.log("Adding Moonwell lending adapter...");
  await insurance.addLendingAdapter(moonwellAdapterAddress);

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
