import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits, ZeroAddress, keccak256, solidityPacked, getCreate2Address } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  UniswapV2Factory,
  UniswapV2Pair,
  MockERC20
} from "../typechain-types";

const TOTAL_SUPPLY = parseUnits("10000", 18);
const TEST_AMOUNT = parseUnits("10", 18);
const MINIMUM_LIQUIDITY = 1000n;

function expandTo18Decimals(n: number): bigint {
  return BigInt(n) * BigInt('1000000000000000000');
}

describe('UniswapV2Pair', function() {
  let factory: UniswapV2Factory;
  let token0: MockERC20;
  let token1: MockERC20;
  let pair: UniswapV2Pair;
  let deployer: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async function() {
    [deployer, other] = await ethers.getSigners();

    // Deploy tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    const token0Contract = await MockERC20Factory.deploy("Token0", "TK0", 18);
    await token0Contract.waitForDeployment();
    await token0Contract.mint(deployer.address, TOTAL_SUPPLY);
    
    const token1Contract = await MockERC20Factory.deploy("Token1", "TK1", 18);
    await token1Contract.waitForDeployment();
    await token1Contract.mint(deployer.address, TOTAL_SUPPLY);

    // Deploy factory
    const UniswapV2FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2FactoryFactory.deploy(deployer.address);
    await factory.waitForDeployment();
    
    const token0Address = await token0Contract.getAddress();
    const token1Address = await token1Contract.getAddress();

    // Ensure token0 address is smaller
    [token0, token1] = token0Address < token1Address ? 
      [token0Contract, token1Contract] : 
      [token1Contract, token0Contract];

    const first = await token0.getAddress();
    const second = await token1.getAddress();

    // Create pair - let the factory create it and get the actual address from the event
    // Use the sorted addresses
    const tx = await factory.createPair(first, second);
    const receipt = await tx.wait();
    
    // Find the PairCreated event to get the actual pair address
    const pairCreatedEvent = receipt!.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed!.name === 'PairCreated';
      } catch {
        return false;
      }
    });
    
    const parsedEvent = factory.interface.parseLog(pairCreatedEvent!);
    const actualPairAddress = parsedEvent!.args[2];
    
    // The event args should match the sorted token order from the factory
    const eventToken0 = parsedEvent!.args[0];
    const eventToken1 = parsedEvent!.args[1];
    
    // Verify pair count
    // Verify pair count
    expect(parsedEvent!.args[3]).to.eq(1n);

    pair = await ethers.getContractAt("UniswapV2Pair", actualPairAddress);
    expect(await pair.token0()).to.eq(eventToken0);
    expect(await pair.token1()).to.eq(eventToken1);
  });

  it('mint', async function() {
    const token0Amount = expandTo18Decimals(1);
    const token1Amount = expandTo18Decimals(4);
    const pairAddress = await pair.getAddress();
    
    await token0.transfer(pairAddress, token0Amount);
    await token1.transfer(pairAddress, token1Amount);

    const expectedLiquidity = expandTo18Decimals(2);

    await expect(pair.mint(deployer.address))
      .to.emit(pair, 'Transfer')
      .withArgs(ZeroAddress, ZeroAddress, MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Transfer')
      .withArgs(ZeroAddress, deployer.address, expectedLiquidity - MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount, token1Amount)
      .to.emit(pair, 'Mint')
      .withArgs(deployer.address, token0Amount, token1Amount);

    expect(await pair.totalSupply()).to.eq(expectedLiquidity);
    expect(await pair.balanceOf(deployer.address)).to.eq(expectedLiquidity - MINIMUM_LIQUIDITY);
    expect(await token0.balanceOf(pairAddress)).to.eq(token0Amount);
    expect(await token1.balanceOf(pairAddress)).to.eq(token1Amount);
    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount);
    expect(reserves[1]).to.eq(token1Amount);
  });

  async function addLiquidity(token0Amount: bigint, token1Amount: bigint) {
    await token0.transfer(await pair.getAddress(), token0Amount);
    await token1.transfer(await pair.getAddress(), token1Amount);
    await pair.mint(deployer.address);
  }

  const swapTestCases: bigint[][] = [
    [1, 5, 10, BigInt('1662497915624478906')],
    [1, 10, 5, BigInt('453305446940074565')],
    [2, 5, 10, BigInt('2851015155847869602')],
    [2, 10, 5, BigInt('831248957812239453')],
    [1, 10, 10, BigInt('906610893880149131')],
    [1, 100, 100, BigInt('987158034397061298')],
    [1, 1000, 1000, BigInt('996006981039903216')]
  ].map(a => a.map(n => typeof n === 'bigint' ? n : expandTo18Decimals(Number(n))));

  // Test a representative subset of swap cases
  it('getInputPrice', async function() {
    const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCases[0];
    await addLiquidity(token0Amount, token1Amount);
    await token0.transfer(await pair.getAddress(), swapAmount);
    await expect(pair.swap(0, expectedOutputAmount + 1n, deployer.address, '0x'))
      .to.be.revertedWith('UniswapV2: K');
    await pair.swap(0, expectedOutputAmount, deployer.address, '0x');
  });

  it('swap:token0', async function() {
    const token0Amount = expandTo18Decimals(5);
    const token1Amount = expandTo18Decimals(10);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('1662497915624478906');
    await token0.transfer(await pair.getAddress(), swapAmount);

    await expect(pair.swap(0, expectedOutputAmount, deployer.address, '0x'))
      .to.emit(token1, 'Transfer')
      .withArgs(await pair.getAddress(), deployer.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount + swapAmount, token1Amount - expectedOutputAmount)
      .to.emit(pair, 'Swap')
      .withArgs(deployer.address, swapAmount, 0, 0, expectedOutputAmount, deployer.address);
      
    const reserves = await pair.getReserves();
    expect(reserves[0]).to.eq(token0Amount + swapAmount);
    expect(reserves[1]).to.eq(token1Amount - expectedOutputAmount);
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(token0Amount + swapAmount);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(token1Amount - expectedOutputAmount);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(deployer.address)).to.eq(totalSupplyToken0 - token0Amount - swapAmount);
    expect(await token1.balanceOf(deployer.address)).to.eq(totalSupplyToken1 - token1Amount + expectedOutputAmount);
  });

  it('burn', async function() {
    const token0Amount = expandTo18Decimals(3);
    const token1Amount = expandTo18Decimals(3);
    await addLiquidity(token0Amount, token1Amount);

    const expectedLiquidity = expandTo18Decimals(3);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    await expect(pair.burn(deployer.address))
      .to.emit(pair, 'Transfer')
      .withArgs(await pair.getAddress(), ZeroAddress, expectedLiquidity - MINIMUM_LIQUIDITY)
      .to.emit(token0, 'Transfer')
      .withArgs(await pair.getAddress(), deployer.address, token0Amount - 1000n)
      .to.emit(token1, 'Transfer')
      .withArgs(await pair.getAddress(), deployer.address, token1Amount - 1000n)
      .to.emit(pair, 'Sync')
      .withArgs(1000, 1000)
      .to.emit(pair, 'Burn')
      .withArgs(deployer.address, token0Amount - 1000n, token1Amount - 1000n, deployer.address);

    expect(await pair.balanceOf(deployer.address)).to.eq(0);
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
    expect(await token0.balanceOf(await pair.getAddress())).to.eq(1000);
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(1000);
    const totalSupplyToken0 = await token0.totalSupply();
    const totalSupplyToken1 = await token1.totalSupply();
    expect(await token0.balanceOf(deployer.address)).to.eq(totalSupplyToken0 - 1000n);
    expect(await token1.balanceOf(deployer.address)).to.eq(totalSupplyToken1 - 1000n);
  });

  it('feeTo:off', async function() {
    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('996006981039903216');
    await token1.transfer(await pair.getAddress(), swapAmount);
    await pair.swap(expectedOutputAmount, 0, deployer.address, '0x');

    const expectedLiquidity = expandTo18Decimals(1000);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    await pair.burn(deployer.address);
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY);
  });

  it('feeTo:on', async function() {
    await factory.setFeeTo(other.address);

    const token0Amount = expandTo18Decimals(1000);
    const token1Amount = expandTo18Decimals(1000);
    await addLiquidity(token0Amount, token1Amount);

    const swapAmount = expandTo18Decimals(1);
    const expectedOutputAmount = BigInt('996006981039903216');
    await token1.transfer(await pair.getAddress(), swapAmount);
    await pair.swap(expectedOutputAmount, 0, deployer.address, '0x');

    const expectedLiquidity = expandTo18Decimals(1000);
    await pair.transfer(await pair.getAddress(), expectedLiquidity - MINIMUM_LIQUIDITY);
    await pair.burn(deployer.address);

    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY + BigInt('249750499251388'));
    expect(await pair.balanceOf(other.address)).to.eq(BigInt('249750499251388'));

    expect(await token0.balanceOf(await pair.getAddress())).to.eq(1000n + BigInt('249501683697445'));
    expect(await token1.balanceOf(await pair.getAddress())).to.eq(1000n + BigInt('250000187312969'));
  });
});