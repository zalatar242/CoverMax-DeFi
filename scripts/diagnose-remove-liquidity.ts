import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Diagnosing Remove Liquidity Issue...\n");

  const [deployer, user] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User:", user.address);
  console.log("User ETH balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)));

  // Deploy contracts
  console.log("\n📦 Deploying contracts...");

  // Deploy WETH
  const WETHFactory = await ethers.getContractFactory("WETH");
  const weth = await WETHFactory.deploy();
  await weth.waitForDeployment();
  console.log("WETH deployed to:", await weth.getAddress());

  // Deploy Factory
  const UniswapFactoryContract = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapFactoryContract.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // Deploy Router
  const RouterContract = await ethers.getContractFactory("UniswapV2Router02");
  const router = await RouterContract.deploy(
    await factory.getAddress(),
    await weth.getAddress()
  );
  await router.waitForDeployment();
  console.log("Router deployed to:", await router.getAddress());

  // Deploy USDC
  const USDCContract = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDCContract.deploy();
  await usdc.waitForDeployment();
  console.log("USDC deployed to:", await usdc.getAddress());

  // Mint USDC to user
  const usdcAmount = ethers.parseUnits("10000", 6);
  await usdc.mint(user.address, usdcAmount);
  console.log("Minted USDC to user:", ethers.formatUnits(usdcAmount, 6));

  console.log("\n💧 Adding liquidity...");

  const liquidityUsdcAmount = ethers.parseUnits("1000", 6);
  const liquidityEthAmount = ethers.parseEther("1");
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // Approve USDC
  await usdc.connect(user).approve(await router.getAddress(), liquidityUsdcAmount);
  console.log("✅ Approved USDC");

  // Add liquidity
  const addLiquidityTx = await router.connect(user).addLiquidityETH(
    await usdc.getAddress(),
    liquidityUsdcAmount,
    0,
    0,
    user.address,
    deadline,
    { value: liquidityEthAmount }
  );

  const receipt = await addLiquidityTx.wait();
  console.log("✅ Added liquidity, gas used:", receipt?.gasUsed?.toString());

  // Get pair
  const pairAddress = await factory.getPair(await usdc.getAddress(), await weth.getAddress());
  const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
  console.log("Pair address:", pairAddress);

  // Check balances
  const lpBalance = await pair.balanceOf(user.address);
  const totalSupply = await pair.totalSupply();
  const reserves = await pair.getReserves();

  console.log("\n📊 Current state:");
  console.log("LP token balance:", ethers.formatEther(lpBalance));
  console.log("Total LP supply:", ethers.formatEther(totalSupply));
  console.log("Reserve0:", reserves[0].toString());
  console.log("Reserve1:", reserves[1].toString());
  console.log("User USDC balance:", ethers.formatUnits(await usdc.balanceOf(user.address), 6));

  console.log("\n🔍 Testing remove liquidity scenarios...");

  // Test 1: Try to remove more than balance (should fail)
  console.log("\n❌ Test 1: Attempting to remove excessive liquidity...");
  try {
    const excessiveLiquidity = lpBalance * 2n;
    await pair.connect(user).approve(await router.getAddress(), excessiveLiquidity);

    await router.connect(user).removeLiquidityETH(
      await usdc.getAddress(),
      excessiveLiquidity,
      0,
      0,
      user.address,
      deadline
    );
  } catch (error: any) {
    console.log("Expected error:", error.message);
  }

  // Test 2: Check approvals
  console.log("\n🔍 Test 2: Checking approvals...");
  const currentAllowance = await pair.allowance(user.address, await router.getAddress());
  console.log("Current LP token allowance:", ethers.formatEther(currentAllowance));

  // Test 3: Remove half liquidity with proper approval
  console.log("\n✅ Test 3: Removing liquidity properly...");
  const liquidityToRemove = lpBalance / 2n;
  console.log("Attempting to remove:", ethers.formatEther(liquidityToRemove));

  // Approve LP tokens
  await pair.connect(user).approve(await router.getAddress(), liquidityToRemove);
  const newAllowance = await pair.allowance(user.address, await router.getAddress());
  console.log("New allowance:", ethers.formatEther(newAllowance));

  // Get balances before removal
  const usdcBalanceBefore = await usdc.balanceOf(user.address);
  const ethBalanceBefore = await ethers.provider.getBalance(user.address);

  try {
    const removeTx = await router.connect(user).removeLiquidityETH(
      await usdc.getAddress(),
      liquidityToRemove,
      0,
      0,
      user.address,
      deadline
    );

    const removeReceipt = await removeTx.wait();
    console.log("✅ Successfully removed liquidity! Gas used:", removeReceipt?.gasUsed?.toString());

    // Check final balances
    const usdcBalanceAfter = await usdc.balanceOf(user.address);
    const ethBalanceAfter = await ethers.provider.getBalance(user.address);
    const lpBalanceAfter = await pair.balanceOf(user.address);

    console.log("\n📊 Final balances:");
    console.log("USDC gained:", ethers.formatUnits(usdcBalanceAfter - usdcBalanceBefore, 6));
    console.log("ETH gained:", ethers.formatEther(ethBalanceAfter - ethBalanceBefore));
    console.log("LP tokens remaining:", ethers.formatEther(lpBalanceAfter));

  } catch (error: any) {
    console.log("❌ Error removing liquidity:", error.message);

    // Additional diagnostics
    console.log("\n🔍 Additional diagnostics:");
    console.log("Pair LP balance:", ethers.formatEther(await pair.balanceOf(pairAddress)));
    console.log("Router LP balance:", ethers.formatEther(await pair.balanceOf(await router.getAddress())));
    console.log("User LP balance:", ethers.formatEther(await pair.balanceOf(user.address)));

    const token0 = await pair.token0();
    const token1 = await pair.token1();
    console.log("Token0:", token0);
    console.log("Token1:", token1);
    console.log("USDC address:", await usdc.getAddress());
    console.log("WETH address:", await weth.getAddress());
  }

  console.log("\n🏁 Diagnosis complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
