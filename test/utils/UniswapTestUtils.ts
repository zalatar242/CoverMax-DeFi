import { ethers } from "hardhat";
import { parseUnits } from "ethers";

/**
 * Expand a number to 18 decimals (like standard ERC20)
 */
export function expandTo18Decimals(n: number): bigint {
  return BigInt(n) * parseUnits("1", 18);
}

/**
 * Encode price for Uniswap price oracle
 */
export function encodePrice(reserve0: bigint, reserve1: bigint): [bigint, bigint] {
  const Q112 = 2n ** 112n;
  return [
    (reserve1 * Q112) / reserve0,
    (reserve0 * Q112) / reserve1
  ];
}

/**
 * Mine a block at a specific timestamp (for testing)
 */
export async function mineBlock(timestamp: number): Promise<void> {
  await ethers.provider.send("evm_mine", [timestamp]);
}

/**
 * Get multiple wallets from hardhat for testing
 */
export async function getTestWallets(n: number) {
  const signers = await ethers.getSigners();
  return signers.slice(0, n);
}

/**
 * Calculate the CREATE2 address for a Uniswap pair
 */
export function calculatePairAddress(
  factory: string,
  tokenA: string,
  tokenB: string,
  initCodeHash: string
): string {
  const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
  const salt = ethers.keccak256(
    ethers.solidityPacked(['address', 'address'], [token0, token1])
  );
  return ethers.getCreate2Address(factory, salt, initCodeHash);
}