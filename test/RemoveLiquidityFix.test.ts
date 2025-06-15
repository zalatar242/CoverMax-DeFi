import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  UniswapV2Router02,
  UniswapV2Factory,
  UniswapV2Pair,
  MockUSDC,
  WETH
} from "../typechain-types";

describe("Remove Liquidity Fix", function () {
  let router: UniswapV2Router02;
  let factory: UniswapV2Factory;
  let usdc: MockUSDC;
  let weth: WETH;
  let pair: UniswapV2Pair;
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();

    // Deploy WETH
    const WETHFactory = await ethers.getContractFactory("WETH");
    weth = await WETHFactory.deploy();
    await weth.waitForDeployment();

    // Deploy Factory
    const UniswapFactoryContract = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapFactoryContract.deploy(deployer.address);
    await factory.waitForDeployment();

    // Deploy Router
    const RouterContract = await ethers.getContractFactory("UniswapV2Router02");
    router = await RouterContract.deploy(
      await factory.getAddress(),
      await weth.getAddress()
    );
    await router.waitForDeployment();

    // Deploy USDC
    const USDCContract = await ethers.getContractFactory("MockUSDC");
    usdc = await USDCContract.deploy();
    await usdc.waitForDeployment();

    // Mint some USDC to user
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
  });

  it("Should be able to add and remove liquidity correctly", async function () {
    const usdcAmount = ethers.parseUnits("1000", 6);
    const ethAmount = ethers.parseEther("1");

    // Approve router to spend USDC
    await usdc.connect(user).approve(await router.getAddress(), usdcAmount);

    // Add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const addLiquidityTx = await router.connect(user).addLiquidityETH(
      await usdc.getAddress(),
      usdcAmount,
      0, // amountTokenMin
      0, // amountETHMin
      user.address,
      deadline,
      { value: ethAmount }
    );

    await addLiquidityTx.wait();

    // Get pair address
    const pairAddress = await factory.getPair(await usdc.getAddress(), await weth.getAddress());
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);

    // Get pair contract instance
    pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

    // Check LP token balance
    const lpBalance = await pair.balanceOf(user.address);
    console.log("LP Balance:", ethers.formatEther(lpBalance));
    expect(lpBalance).to.be.greaterThan(0);

    // Check initial token balances
    const initialUsdcBalance = await usdc.balanceOf(user.address);
    const initialEthBalance = await ethers.provider.getBalance(user.address);

    console.log("Initial USDC Balance:", ethers.formatUnits(initialUsdcBalance, 6));
    console.log("Initial ETH Balance:", ethers.formatEther(initialEthBalance));

    // Approve router to spend LP tokens
    await pair.connect(user).approve(await router.getAddress(), lpBalance);

    // Remove 50% of liquidity
    const liquidityToRemove = lpBalance / 2n;

    console.log("Removing liquidity:", ethers.formatEther(liquidityToRemove));

    const removeLiquidityTx = await router.connect(user).removeLiquidityETH(
      await usdc.getAddress(),
      liquidityToRemove,
      0, // amountTokenMin
      0, // amountETHMin
      user.address,
      deadline
    );

    await removeLiquidityTx.wait();

    // Check final token balances
    const finalUsdcBalance = await usdc.balanceOf(user.address);
    const finalEthBalance = await ethers.provider.getBalance(user.address);
    const finalLpBalance = await pair.balanceOf(user.address);

    console.log("Final USDC Balance:", ethers.formatUnits(finalUsdcBalance, 6));
    console.log("Final ETH Balance:", ethers.formatEther(finalEthBalance));
    console.log("Final LP Balance:", ethers.formatEther(finalLpBalance));

    // Verify that we received tokens back
    expect(finalUsdcBalance).to.be.greaterThan(initialUsdcBalance);
    expect(finalLpBalance).to.equal(lpBalance - liquidityToRemove);
  });

  it("Should fail when trying to remove more liquidity than owned", async function () {
    const usdcAmount = ethers.parseUnits("1000", 6);
    const ethAmount = ethers.parseEther("1");

    // Approve router to spend USDC
    await usdc.connect(user).approve(await router.getAddress(), usdcAmount);

    // Add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    await router.connect(user).addLiquidityETH(
      await usdc.getAddress(),
      usdcAmount,
      0,
      0,
      user.address,
      deadline,
      { value: ethAmount }
    );

    // Get pair address and LP balance
    const pairAddress = await factory.getPair(await usdc.getAddress(), await weth.getAddress());
    pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    const lpBalance = await pair.balanceOf(user.address);

    // Approve router to spend LP tokens
    await pair.connect(user).approve(await router.getAddress(), lpBalance * 2n);

    // Try to remove more liquidity than we have - this should fail
    const excessiveLiquidity = lpBalance * 2n;

    await expect(
      router.connect(user).removeLiquidityETH(
        await usdc.getAddress(),
        excessiveLiquidity,
        0,
        0,
        user.address,
        deadline
      )
    ).to.be.revertedWith("ds-math-sub-underflow");
  });

  it("Should diagnose the exact cause of underflow", async function () {
    const usdcAmount = ethers.parseUnits("1000", 6);
    const ethAmount = ethers.parseEther("1");

    // Approve router to spend USDC
    await usdc.connect(user).approve(await router.getAddress(), usdcAmount);

    // Add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    await router.connect(user).addLiquidityETH(
      await usdc.getAddress(),
      usdcAmount,
      0,
      0,
      user.address,
      deadline,
      { value: ethAmount }
    );

    // Get pair address and LP balance
    const pairAddress = await factory.getPair(await usdc.getAddress(), await weth.getAddress());
    pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    const lpBalance = await pair.balanceOf(user.address);

    console.log("User LP Balance:", ethers.formatEther(lpBalance));
    console.log("Pair LP Balance of user:", ethers.formatEther(await pair.balanceOf(user.address)));
    console.log("Total Supply:", ethers.formatEther(await pair.totalSupply()));

    // Check allowance
    const allowance = await pair.allowance(user.address, await router.getAddress());
    console.log("Current allowance:", ethers.formatEther(allowance));

    // Set proper allowance
    await pair.connect(user).approve(await router.getAddress(), lpBalance);

    const newAllowance = await pair.allowance(user.address, await router.getAddress());
    console.log("New allowance:", ethers.formatEther(newAllowance));

    // Now try to remove half the liquidity
    const liquidityToRemove = lpBalance / 2n;
    console.log("Attempting to remove:", ethers.formatEther(liquidityToRemove));

    // This should work now
    await router.connect(user).removeLiquidityETH(
      await usdc.getAddress(),
      liquidityToRemove,
      0,
      0,
      user.address,
      deadline
    );

    console.log("Successfully removed liquidity!");
  });
});
