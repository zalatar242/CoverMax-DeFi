import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits, ZeroAddress } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  Tranche,
  UniswapV2Factory,
  UniswapV2Router02,
  UniswapV2Pair,
  WETH,
  MockUSDC
} from "../typechain-types";
import {
  fastForwardTime,
  getCurrentTime
} from "./utils/TestHelpers";

// Import chai matchers for hardhat
import "@nomicfoundation/hardhat-chai-matchers";

describe("Uniswap Tranche Token Trading", function () {
  // Contract instances
  let usdc: MockUSDC;
  let trancheAAA: Tranche;
  let trancheAA: Tranche;

  // Uniswap contracts
  let uniswapFactory: UniswapV2Factory;
  let uniswapRouter: UniswapV2Router02;
  let weth: WETH;
  let pairAAAUSDC: UniswapV2Pair;
  let pairAAUSDC: UniswapV2Pair;

  // Signers
  let deployer: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let liquidityProvider: HardhatEthersSigner;

  // Constants
  const MINIMUM_LIQUIDITY = 1000n;
  const INITIAL_SUPPLY = parseUnits("1000000", 6);
  const LP_INITIAL_TOKENS = parseUnits("50000", 6);

  beforeEach(async function () {
    // Get signers
    [deployer, user1, user2, liquidityProvider] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // Deploy Tranche tokens
    const TrancheFactory = await ethers.getContractFactory("Tranche");
    trancheAAA = await TrancheFactory.deploy("Tranche AAA", "AAA");
    await trancheAAA.waitForDeployment();

    trancheAA = await TrancheFactory.deploy("Tranche AA", "AA");
    await trancheAA.waitForDeployment();

    // Deploy Uniswap V2 contracts
    const WETHFactory = await ethers.getContractFactory("WETH");
    weth = await WETHFactory.deploy();
    await weth.waitForDeployment();

    const UniswapV2FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    uniswapFactory = await UniswapV2FactoryFactory.deploy(deployer.address);
    await uniswapFactory.waitForDeployment();

    const UniswapV2Router02Factory = await ethers.getContractFactory("UniswapV2Router02");
    uniswapRouter = await UniswapV2Router02Factory.deploy(
      await uniswapFactory.getAddress(),
      await weth.getAddress()
    );
    await uniswapRouter.waitForDeployment();

    // Mint tokens to all users
    await usdc.mint(liquidityProvider.address, INITIAL_SUPPLY);
    await usdc.mint(user1.address, INITIAL_SUPPLY);
    await usdc.mint(user2.address, INITIAL_SUPPLY);

    // Mint tranche tokens directly (simulating users getting them from insurance protocol)
    await trancheAAA.mint(liquidityProvider.address, LP_INITIAL_TOKENS);
    await trancheAA.mint(liquidityProvider.address, LP_INITIAL_TOKENS);
    await trancheAAA.mint(user1.address, parseUnits("10000", 6));
    await trancheAA.mint(user2.address, parseUnits("10000", 6));
  });

  describe("Liquidity Pool Creation", function () {
    it("Should create AAA/USDC liquidity pool", async function () {
      const trancheAAAAddress = await trancheAAA.getAddress();
      const usdcAddress = await usdc.getAddress();

      await expect(uniswapFactory.createPair(trancheAAAAddress, usdcAddress))
        .to.emit(uniswapFactory, "PairCreated");

      const pairAddress = await uniswapFactory.getPair(trancheAAAAddress, usdcAddress);
      expect(pairAddress).to.not.equal(ZeroAddress);

      pairAAAUSDC = await ethers.getContractAt("UniswapV2Pair", pairAddress);
      const token0 = await pairAAAUSDC.token0();
      const token1 = await pairAAAUSDC.token1();

      expect([token0, token1]).to.include(trancheAAAAddress);
      expect([token0, token1]).to.include(usdcAddress);
    });
  });

  describe("Add Liquidity", function () {
    beforeEach(async function () {
      // Create pairs
      await uniswapFactory.createPair(await trancheAAA.getAddress(), await usdc.getAddress());
      await uniswapFactory.createPair(await trancheAA.getAddress(), await usdc.getAddress());

      pairAAAUSDC = await ethers.getContractAt(
        "UniswapV2Pair",
        await uniswapFactory.getPair(await trancheAAA.getAddress(), await usdc.getAddress())
      );
      pairAAUSDC = await ethers.getContractAt(
        "UniswapV2Pair",
        await uniswapFactory.getPair(await trancheAA.getAddress(), await usdc.getAddress())
      );
    });

    it("Should add liquidity to AAA/USDC pool", async function () {
      const amountAAADesired = parseUnits("1000", 6);
      const amountUSDCDesired = parseUnits("1000", 6);
      const amountAAAMin = parseUnits("900", 6);
      const amountUSDCMin = parseUnits("900", 6);

      // Approve router
      await trancheAAA.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        amountAAADesired
      );
      await usdc.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        amountUSDCDesired
      );

      const deadline = (await getCurrentTime()) + 3600;

      await expect(
        uniswapRouter.connect(liquidityProvider).addLiquidity(
          await trancheAAA.getAddress(),
          await usdc.getAddress(),
          amountAAADesired,
          amountUSDCDesired,
          amountAAAMin,
          amountUSDCMin,
          liquidityProvider.address,
          deadline
        )
      ).to.emit(pairAAAUSDC, "Mint");

      const liquidityBalance = await pairAAAUSDC.balanceOf(liquidityProvider.address);
      expect(liquidityBalance).to.be.gt(0);

      const reserves = await pairAAAUSDC.getReserves();
      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });

    it("Should add liquidity to AA/USDC pool with higher risk ratio", async function () {
      const amountAADesired = parseUnits("500", 6);
      const amountUSDCDesired = parseUnits("1000", 6); // 1:2 ratio for higher risk
      const amountAAMin = parseUnits("450", 6);
      const amountUSDCMin = parseUnits("900", 6);

      // Approve router
      await trancheAA.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        amountAADesired
      );
      await usdc.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        amountUSDCDesired
      );

      const deadline = (await getCurrentTime()) + 3600;

      await expect(
        uniswapRouter.connect(liquidityProvider).addLiquidity(
          await trancheAA.getAddress(),
          await usdc.getAddress(),
          amountAADesired,
          amountUSDCDesired,
          amountAAMin,
          amountUSDCMin,
          liquidityProvider.address,
          deadline
        )
      ).to.emit(pairAAUSDC, "Mint");

      const liquidityBalance = await pairAAUSDC.balanceOf(liquidityProvider.address);
      expect(liquidityBalance).to.be.gt(0);
    });
  });

  describe("Swap Tranche Tokens", function () {
    let pairAAAAA: UniswapV2Pair;

    beforeEach(async function () {
      // Create AAA/AA direct trading pair
      await uniswapFactory.createPair(await trancheAAA.getAddress(), await trancheAA.getAddress());

      pairAAAAA = await ethers.getContractAt(
        "UniswapV2Pair",
        await uniswapFactory.getPair(await trancheAAA.getAddress(), await trancheAA.getAddress())
      );

      // Add liquidity to AAA/AA pool
      const deadline = (await getCurrentTime()) + 3600;

      // AAA/AA pool (2:1 ratio - AAA is safer so worth more AA tokens)
      await trancheAAA.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        parseUnits("20000", 6)
      );
      await trancheAA.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        parseUnits("40000", 6)
      );
      await uniswapRouter.connect(liquidityProvider).addLiquidity(
        await trancheAAA.getAddress(),
        await trancheAA.getAddress(),
        parseUnits("20000", 6),
        parseUnits("40000", 6),
        0,
        0,
        liquidityProvider.address,
        deadline
      );
    });

    it("Should swap AAA tokens for AA tokens", async function () {
      const amountIn = parseUnits("100", 6);
      const path = [await trancheAAA.getAddress(), await trancheAA.getAddress()];

      await trancheAAA.connect(user1).approve(
        await uniswapRouter.getAddress(),
        amountIn
      );

      const aaBalanceBefore = await trancheAA.balanceOf(user1.address);
      const deadline = (await getCurrentTime()) + 3600;

      await uniswapRouter.connect(user1).swapExactTokensForTokens(
        amountIn,
        0, // Accept any amount of AA
        path,
        user1.address,
        deadline
      );

      const aaBalanceAfter = await trancheAA.balanceOf(user1.address);
      expect(aaBalanceAfter).to.be.gt(aaBalanceBefore);

      // Since AAA is safer (2:1 ratio), 100 AAA should get ~200 AA tokens
      const received = aaBalanceAfter - aaBalanceBefore;
      expect(received).to.be.gt(parseUnits("190", 6)); // Account for slippage
    });

    it("Should swap AA tokens for AAA tokens", async function () {
      const amountIn = parseUnits("200", 6);
      const path = [await trancheAA.getAddress(), await trancheAAA.getAddress()];

      await trancheAA.connect(user2).approve(
        await uniswapRouter.getAddress(),
        amountIn
      );

      const aaaBalanceBefore = await trancheAAA.balanceOf(user2.address);
      const deadline = (await getCurrentTime()) + 3600;

      await uniswapRouter.connect(user2).swapExactTokensForTokens(
        amountIn,
        0, // Accept any amount of AAA
        path,
        user2.address,
        deadline
      );

      const aaaBalanceAfter = await trancheAAA.balanceOf(user2.address);
      expect(aaaBalanceAfter).to.be.gt(aaaBalanceBefore);

      // Since AA is riskier (1:2 ratio), 200 AA should get ~100 AAA tokens
      const received = aaaBalanceAfter - aaaBalanceBefore;
      expect(received).to.be.gt(parseUnits("95", 6)); // Account for slippage
    });

    it("Should handle slippage protection correctly", async function () {
      const amountIn = parseUnits("100", 6);
      const path = [await trancheAAA.getAddress(), await trancheAA.getAddress()];

      // Get expected output
      const amounts = await uniswapRouter.getAmountsOut(amountIn, path);
      const expectedOut = amounts[1];

      await trancheAAA.connect(user1).approve(
        await uniswapRouter.getAddress(),
        amountIn
      );

      const deadline = (await getCurrentTime()) + 3600;

      // Should fail if we demand more than expected output
      await expect(
        uniswapRouter.connect(user1).swapExactTokensForTokens(
          amountIn,
          expectedOut + 1n, // Demand 1 wei more than possible
          path,
          user1.address,
          deadline
        )
      ).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });

  describe("Liquidity Removal", function () {
    beforeEach(async function () {
      // Create pair and add initial liquidity
      await uniswapFactory.createPair(await trancheAAA.getAddress(), await usdc.getAddress());
      pairAAAUSDC = await ethers.getContractAt(
        "UniswapV2Pair",
        await uniswapFactory.getPair(await trancheAAA.getAddress(), await usdc.getAddress())
      );

      const amountAAADesired = parseUnits("1000", 6);
      const amountUSDCDesired = parseUnits("1000", 6);

      await trancheAAA.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        amountAAADesired
      );
      await usdc.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        amountUSDCDesired
      );

      const deadline = (await getCurrentTime()) + 3600;
      await uniswapRouter.connect(liquidityProvider).addLiquidity(
        await trancheAAA.getAddress(),
        await usdc.getAddress(),
        amountAAADesired,
        amountUSDCDesired,
        0,
        0,
        liquidityProvider.address,
        deadline
      );
    });

    it("Should remove liquidity and return tokens", async function () {
      const liquidityBalance = await pairAAAUSDC.balanceOf(liquidityProvider.address);
      const liquidityToRemove = liquidityBalance / 2n;

      await pairAAAUSDC.connect(liquidityProvider).approve(
        await uniswapRouter.getAddress(),
        liquidityToRemove
      );

      const deadline = (await getCurrentTime()) + 3600;

      const aaaBalanceBefore = await trancheAAA.balanceOf(liquidityProvider.address);
      const usdcBalanceBefore = await usdc.balanceOf(liquidityProvider.address);

      // Remove liquidity
      await expect(
        uniswapRouter.connect(liquidityProvider).removeLiquidity(
          await trancheAAA.getAddress(),
          await usdc.getAddress(),
          liquidityToRemove,
          0,
          0,
          liquidityProvider.address,
          deadline
        )
      ).to.emit(pairAAAUSDC, "Burn");

      const aaaBalanceAfter = await trancheAAA.balanceOf(liquidityProvider.address);
      const usdcBalanceAfter = await usdc.balanceOf(liquidityProvider.address);

      expect(aaaBalanceAfter).to.be.gt(aaaBalanceBefore);
      expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore);
      expect(await pairAAAUSDC.balanceOf(liquidityProvider.address)).to.equal(
        liquidityBalance - liquidityToRemove
      );
    });
  });
});
