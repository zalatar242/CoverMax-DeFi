import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  MockUSDC,
  MockUniswapV2Factory,
  MockUniswapV2Router02,
  MockUniswapV2Pair,
  Insurance,
  Tranche,
  MoonwellLendingAdapter,
  MockMoonwell
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("UniswapV2 Mocks", function() {
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let factory: MockUniswapV2Factory;
  let router: MockUniswapV2Router02;
  let insurance: Insurance;
  let usdc: MockUSDC;
  let aaaToken: string;
  let aaToken: string;
  let aaaUsdcPair: string;
  let aaUsdcPair: string;

  const INITIAL_USDC_AMOUNT = BigInt(1000000) * BigInt(10**6); // 1M USDC
  const SPLIT_AMOUNT = BigInt(500000) * BigInt(10**6); // 500k USDC for splitting
  const INITIAL_LIQUIDITY_USDC = BigInt(100000) * BigInt(10**6); // 100k USDC
  const DEADLINE = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  async function deployFixture() {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Factory
    const MockUniswapV2Factory = await ethers.getContractFactory("MockUniswapV2Factory");
    factory = await MockUniswapV2Factory.deploy(await owner.getAddress());

    // Deploy Router
    const MockUniswapV2Router02 = await ethers.getContractFactory("MockUniswapV2Router02");
    router = await MockUniswapV2Router02.deploy(
      await factory.getAddress(),
      ethers.ZeroAddress,
      await usdc.getAddress()
    );

    // Deploy mock Moonwell
    const MockMoonwell = await ethers.getContractFactory("MockMoonwell");
    const mockMoonwell = await MockMoonwell.deploy(await usdc.getAddress()) as MockMoonwell;

    // Get the mToken address from MockMoonwell
    const mTokenAddress = await mockMoonwell.mToken();

    // Deploy Insurance (creates AAA and AA tokens)
    const Insurance = await ethers.getContractFactory("Insurance");
    insurance = await Insurance.deploy(await usdc.getAddress());

    // Add Moonwell adapter to Insurance
    const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
    const moonwellAdapter = await MoonwellAdapter.deploy(mTokenAddress);

    // Initialize Insurance with adapter
    await insurance.addLendingAdapter(await moonwellAdapter.getAddress());

    // Get token addresses
    aaaToken = await insurance.AAA();
    aaToken = await insurance.AA();

    // Create pairs
    await factory.createPair(aaaToken, await usdc.getAddress());
    await factory.createPair(aaToken, await usdc.getAddress());

    // Get pair addresses
    aaaUsdcPair = await factory.getPair(aaaToken, await usdc.getAddress());
    aaUsdcPair = await factory.getPair(aaToken, await usdc.getAddress());

    // Mint USDC to users
    await usdc.mint(await user1.getAddress(), INITIAL_USDC_AMOUNT);
    await usdc.mint(await user2.getAddress(), INITIAL_USDC_AMOUNT);

    // Split risk to get AAA and AA tokens (using only half the USDC)
    await usdc.connect(user1).approve(await insurance.getAddress(), SPLIT_AMOUNT);
    await insurance.connect(user1).splitRisk(SPLIT_AMOUNT);

    // Get instances of tokens
    const AAA = await ethers.getContractAt("Tranche", aaaToken) as Tranche;
    const AA = await ethers.getContractAt("Tranche", aaToken) as Tranche;

    // Approve tokens for router
    await usdc.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);
    await usdc.connect(user2).approve(await router.getAddress(), ethers.MaxUint256);
    await AAA.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);
    await AA.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);

    // Log initial balances and approvals
    console.log("\nInitial balances and approvals:");
    console.log("USDC balance of user1:", await usdc.balanceOf(await user1.getAddress()));
    console.log("AAA balance of user1:", await AAA.balanceOf(await user1.getAddress()));
    console.log("USDC allowance for router:", await usdc.allowance(await user1.getAddress(), await router.getAddress()));
    console.log("AAA allowance for router:", await AAA.allowance(await user1.getAddress(), await router.getAddress()));

    return { owner, user1, user2, factory, router, insurance, usdc, aaaToken, aaToken, aaaUsdcPair, aaUsdcPair };
  }

  beforeEach(async function() {
    const fixture = await loadFixture(deployFixture);
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    factory = fixture.factory;
    router = fixture.router;
    insurance = fixture.insurance;
    usdc = fixture.usdc;
    aaaToken = fixture.aaaToken;
    aaToken = fixture.aaToken;
    aaaUsdcPair = fixture.aaaUsdcPair;
    aaUsdcPair = fixture.aaUsdcPair;
  });

  describe("Liquidity", function() {
    it("Should add liquidity to AAA/USDC pair", async function() {
      const AAA = await ethers.getContractAt("Tranche", aaaToken) as Tranche;
      const tokenAmount = SPLIT_AMOUNT / BigInt(2); // Half the split amount

      // Log pre-liquidity state
      console.log("\nBefore adding liquidity:");
      console.log("USDC balance:", await usdc.balanceOf(await user1.getAddress()));
      console.log("AAA balance:", await AAA.balanceOf(await user1.getAddress()));
      console.log("USDC allowance:", await usdc.allowance(await user1.getAddress(), await router.getAddress()));
      console.log("AAA allowance:", await AAA.allowance(await user1.getAddress(), await router.getAddress()));

      await router.connect(user1).addLiquidityWithUSDC(
        aaaToken,
        tokenAmount,
        INITIAL_LIQUIDITY_USDC,
        0,
        0,
        await user1.getAddress(),
        DEADLINE
      );

      const pair = await ethers.getContractAt("MockUniswapV2Pair", aaaUsdcPair) as MockUniswapV2Pair;
      expect(await pair.balanceOf(await user1.getAddress())).to.be.gt(0);
    });

    it("Should add liquidity to AA/USDC pair", async function() {
      const tokenAmount = SPLIT_AMOUNT / BigInt(2); // Half the split amount
      await router.connect(user1).addLiquidityWithUSDC(
        aaToken,
        tokenAmount,
        INITIAL_LIQUIDITY_USDC,
        0,
        0,
        await user1.getAddress(),
        DEADLINE
      );

      const pair = await ethers.getContractAt("MockUniswapV2Pair", aaUsdcPair) as MockUniswapV2Pair;
      expect(await pair.balanceOf(await user1.getAddress())).to.be.gt(0);
    });

    it("Should remove liquidity from AAA/USDC pair", async function() {
      // First add liquidity
      const tokenAmount = SPLIT_AMOUNT / BigInt(2);
      await router.connect(user1).addLiquidityWithUSDC(
        aaaToken,
        tokenAmount,
        INITIAL_LIQUIDITY_USDC,
        0,
        0,
        await user1.getAddress(),
        DEADLINE
      );

      const pair = await ethers.getContractAt("MockUniswapV2Pair", aaaUsdcPair) as MockUniswapV2Pair;
      const liquidity = await pair.balanceOf(await user1.getAddress());
      await pair.connect(user1).approve(await router.getAddress(), liquidity);

      await router.connect(user1).removeLiquidity(
        aaaToken,
        await usdc.getAddress(),
        liquidity,
        0,
        0,
        await user1.getAddress(),
        DEADLINE
      );

      expect(await pair.balanceOf(await user1.getAddress())).to.equal(0);
    });
  });

  describe("Swaps", function() {
    beforeEach(async function() {
      // Add initial liquidity to both pairs
      const tokenAmount = SPLIT_AMOUNT / BigInt(2);
      await router.connect(user1).addLiquidityWithUSDC(
        aaaToken,
        tokenAmount,
        INITIAL_LIQUIDITY_USDC,
        0,
        0,
        await user1.getAddress(),
        DEADLINE
      );

      await router.connect(user1).addLiquidityWithUSDC(
        aaToken,
        tokenAmount,
        INITIAL_LIQUIDITY_USDC,
        0,
        0,
        await user1.getAddress(),
        DEADLINE
      );
    });

    it("Should swap USDC for AAA tokens", async function() {
      const swapAmount = BigInt(1000) * BigInt(10**6); // 1000 USDC
      const AAA = await ethers.getContractAt("Tranche", aaaToken) as Tranche;

      // Log pre-swap state
      console.log("\nBefore swap:");
      console.log("USDC balance of user2:", await usdc.balanceOf(await user2.getAddress()));
      console.log("USDC allowance for router:", await usdc.allowance(await user2.getAddress(), await router.getAddress()));

      await router.connect(user2).swapExactUSDCForTokens(
        swapAmount,
        0,
        aaaToken,
        await user2.getAddress(),
        DEADLINE
      );

      expect(await AAA.balanceOf(await user2.getAddress())).to.be.gt(0);
    });

    it("Should swap AAA tokens for USDC", async function() {
      // First get some AAA tokens by splitting risk
      await usdc.connect(user2).approve(await insurance.getAddress(), SPLIT_AMOUNT);
      await insurance.connect(user2).splitRisk(SPLIT_AMOUNT);

      const AAA = await ethers.getContractAt("Tranche", aaaToken) as Tranche;
      const swapAmount = SPLIT_AMOUNT / BigInt(2);
      await AAA.connect(user2).approve(await router.getAddress(), swapAmount);

      const balanceBefore = await usdc.balanceOf(await user2.getAddress());

      await router.connect(user2).swapExactTokensForUSDC(
        swapAmount,
        0,
        aaaToken,
        await user2.getAddress(),
        DEADLINE
      );

      expect(await usdc.balanceOf(await user2.getAddress())).to.be.gt(balanceBefore);
    });
  });
});
