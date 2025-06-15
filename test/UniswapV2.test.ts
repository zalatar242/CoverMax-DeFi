import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  MockUSDC,
  Insurance,
  Tranche,
  MoonwellLendingAdapter,
  MockMoonwell
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("UniswapV2 Core", function() {
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let factory: any; // UniswapV2Factory
  let insurance: Insurance;
  let usdc: MockUSDC;
  let aaaToken: string;
  let aaToken: string;
  let aaaUsdcPair: string;
  let aaUsdcPair: string;

  const INITIAL_USDC_AMOUNT = BigInt(1000000) * BigInt(10**6); // 1M USDC
  const SPLIT_AMOUNT = BigInt(500000) * BigInt(10**6); // 500k USDC for splitting

  async function deployFixture() {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Factory
    const UniswapV2FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2FactoryFactory.deploy(await owner.getAddress());

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
    await (factory as any).createPair(aaaToken, await usdc.getAddress());
    await (factory as any).createPair(aaToken, await usdc.getAddress());

    // Get pair addresses
    aaaUsdcPair = await (factory as any).getPair(aaaToken, await usdc.getAddress());
    aaUsdcPair = await (factory as any).getPair(aaToken, await usdc.getAddress());

    // Mint USDC to users
    await usdc.mint(await user1.getAddress(), INITIAL_USDC_AMOUNT);
    await usdc.mint(await user2.getAddress(), INITIAL_USDC_AMOUNT);

    // Split risk to get AAA and AA tokens
    await usdc.connect(user1).approve(await insurance.getAddress(), SPLIT_AMOUNT);
    await insurance.connect(user1).splitRisk(SPLIT_AMOUNT);

    return { owner, user1, user2, factory, insurance, usdc, aaaToken, aaToken, aaaUsdcPair, aaUsdcPair };
  }

  beforeEach(async function() {
    const fixture = await loadFixture(deployFixture);
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    factory = fixture.factory;
    insurance = fixture.insurance;
    usdc = fixture.usdc;
    aaaToken = fixture.aaaToken;
    aaToken = fixture.aaToken;
    aaaUsdcPair = fixture.aaaUsdcPair;
    aaUsdcPair = fixture.aaUsdcPair;
  });

  describe("Factory", function() {
    it("Should create pairs for AAA/USDC and AA/USDC", async function() {
      expect(aaaUsdcPair).to.not.equal(ethers.ZeroAddress);
      expect(aaUsdcPair).to.not.equal(ethers.ZeroAddress);
      expect(aaaUsdcPair).to.not.equal(aaUsdcPair);
    });

    it("Should return the same pair address when called again", async function() {
      const aaaUsdcPair2 = await (factory as any).getPair(aaaToken, await usdc.getAddress());
      expect(aaaUsdcPair2).to.equal(aaaUsdcPair);
    });
  });

  describe("Pairs", function() {
    it("Should have the correct token addresses", async function() {
      const pair = await ethers.getContractAt("UniswapV2Pair", aaaUsdcPair);
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      const usdcAddress = await usdc.getAddress();
      expect([token0, token1]).to.include(aaaToken);
      expect([token0, token1]).to.include(usdcAddress);
    });

    it("Should be able to mint liquidity tokens directly", async function() {
      const AAA = await ethers.getContractAt("Tranche", aaaToken) as Tranche;
      const pair = await ethers.getContractAt("UniswapV2Pair", aaaUsdcPair) as any;

      const tokenAmount = SPLIT_AMOUNT / BigInt(2);
      const usdcAmount = BigInt(100000) * BigInt(10**6); // 100k USDC

      // Transfer tokens to pair
      await AAA.connect(user1).transfer(aaaUsdcPair, tokenAmount);
      await usdc.connect(user1).transfer(aaaUsdcPair, usdcAmount);

      // Mint liquidity
      await pair.connect(user1).mint(await user1.getAddress());

      expect(await pair.balanceOf(await user1.getAddress())).to.be.gt(0);
    });
  });

  describe("Token Integration", function() {
    it("Should allow users to split risk and get tranche tokens", async function() {
      const AAA = await ethers.getContractAt("Tranche", aaaToken) as Tranche;
      const AA = await ethers.getContractAt("Tranche", aaToken) as Tranche;

      expect(await AAA.balanceOf(await user1.getAddress())).to.be.gt(0);
      expect(await AA.balanceOf(await user1.getAddress())).to.be.gt(0);
    });
  });
});
