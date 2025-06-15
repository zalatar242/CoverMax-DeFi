import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  UniswapV2Router02,
  UniswapV2Factory,
  MockUSDC,
  WETH
} from "../typechain-types";

describe("UniswapV2 Router", function () {
  let router: UniswapV2Router02;
  let factory: UniswapV2Factory;
  let usdc: MockUSDC;
  let weth: WETH;
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

  it("Should deploy router with correct factory and WETH addresses", async function () {
    expect(await router.factory()).to.equal(await factory.getAddress());
    expect(await router.WETH()).to.equal(await weth.getAddress());
  });

  it("Should be able to add liquidity", async function () {
    const usdcAmount = ethers.parseUnits("1000", 6);
    const ethAmount = ethers.parseEther("1");

    // Approve router to spend USDC
    await usdc.connect(user).approve(await router.getAddress(), usdcAmount);

    // Add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await router.connect(user).addLiquidityETH(
      await usdc.getAddress(),
      usdcAmount,
      0, // amountTokenMin
      0, // amountETHMin
      user.address,
      deadline,
      { value: ethAmount }
    );

    // Check that pair was created
    const pairAddress = await factory.getPair(await usdc.getAddress(), await weth.getAddress());
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);
  });

  it("Should be able to get amounts out for a swap", async function () {
    const ethAmount = ethers.parseEther("1");
    const usdcAmount = ethers.parseUnits("2000", 6);

    // First add liquidity to create the pair
    await usdc.connect(user).approve(await router.getAddress(), usdcAmount);
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

    // Now test getAmountsOut
    const swapAmount = ethers.parseEther("0.1");
    const path = [await weth.getAddress(), await usdc.getAddress()];

    const amounts = await router.getAmountsOut(swapAmount, path);
    expect(amounts.length).to.equal(2);
    expect(amounts[0]).to.equal(swapAmount);
    expect(amounts[1]).to.be.greaterThan(0);
  });

  it("Should be able to swap ETH for tokens", async function () {
    const ethAmount = ethers.parseEther("1");
    const usdcAmount = ethers.parseUnits("2000", 6);

    // First add liquidity
    await usdc.connect(user).approve(await router.getAddress(), usdcAmount);
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

    // Check initial USDC balance
    const initialBalance = await usdc.balanceOf(user.address);

    // Swap ETH for USDC
    const swapAmount = ethers.parseEther("0.1");
    const path = [await weth.getAddress(), await usdc.getAddress()];

    await router.connect(user).swapExactETHForTokens(
      0, // amountOutMin
      path,
      user.address,
      deadline,
      { value: swapAmount }
    );

    // Check that USDC balance increased
    const finalBalance = await usdc.balanceOf(user.address);
    expect(finalBalance).to.be.greaterThan(initialBalance);
  });
});
