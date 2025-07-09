import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits, ZeroAddress, keccak256, solidityPacked, getCreate2Address } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  UniswapV2Factory,
  UniswapV2Pair,
  MockERC20
} from "../typechain-types";

const TEST_ADDRESSES = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
];

const TOTAL_SUPPLY = parseUnits("10000", 18);

describe('UniswapV2Factory', function () {
  let deployer: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let token: MockERC20;
  let factory: UniswapV2Factory;

  beforeEach(async function () {
    [deployer, other] = await ethers.getSigners();

    // Deploy test token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await MockERC20Factory.deploy("Test Token", "TEST", 18);
    await token.waitForDeployment();
    await token.mint(deployer.address, TOTAL_SUPPLY);

    // Deploy factory
    const UniswapV2FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2FactoryFactory.deploy(deployer.address);
    await factory.waitForDeployment();
  });
  
  it('feeTo, feeToSetter, allPairsLength', async function() {
    expect(await factory.feeTo()).to.eq(ZeroAddress);
    expect(await factory.feeToSetter()).to.eq(deployer.address);
    expect(await factory.allPairsLength()).to.eq(0);
  });

  async function createPair(tokens: string[]) {
    const UniswapV2PairFactory = await ethers.getContractFactory("UniswapV2Pair");
    const bytecode = UniswapV2PairFactory.bytecode;
    const initCodeHash = keccak256(bytecode);
    const [token0, token1] = tokens[0] < tokens[1] ? [tokens[0], tokens[1]] : [tokens[1], tokens[0]];

    const salt = keccak256(solidityPacked(['address', 'address'], [token0, token1]));
    const create2Address = getCreate2Address(await factory.getAddress(), salt, initCodeHash);

    await expect(factory.createPair(tokens[0], tokens[1]))
      .to.emit(factory, "PairCreated")
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, 1n);

    await expect(factory.createPair(...tokens)).to.be.reverted; // UniswapV2: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted; // UniswapV2: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address);
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address);
    expect(await factory.allPairs(0)).to.eq(create2Address);
    expect(await factory.allPairsLength()).to.eq(1);

    const pair = await ethers.getContractAt("UniswapV2Pair", create2Address); 
    expect(await pair.factory()).to.eq(await factory.getAddress());
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0]);
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1]);
  }

  it('createPair', async function() {
    await createPair(TEST_ADDRESSES);
  });

  it('setFeeTo', async function() {
    await expect(factory.connect(other).setFeeTo(other.address))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');
    await factory.setFeeTo(deployer.address);
    expect(await factory.feeTo()).to.eq(deployer.address);
  });

  it('setFeeToSetter', async function() {
    await expect(factory.connect(other).setFeeToSetter(other.address))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');

    await factory.setFeeToSetter(other.address);
    expect(await factory.feeToSetter()).to.eq(other.address);
    await expect(factory.setFeeToSetter(deployer.address))
      .to.be.revertedWith('UniswapV2: FORBIDDEN');
  });
});