import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Helper function to check balance changes
 */
export async function expectBalanceChange(
  token: any,
  user: string,
  expectedChange: bigint,
  operation: () => Promise<any>
) {
  const before = await token.balanceOf(user);
  await operation();
  const after = await token.balanceOf(user);
  expect(after - before).to.equal(expectedChange);
}

/**
 * Helper function to mint and approve tokens
 */
export async function mintAndApprove(
  token: any,
  user: SignerWithAddress,
  spender: string,
  amount: bigint
) {
  if (typeof token.mint === "function") {
    await token.mint(user.address, amount);
  }
  await token.connect(user).approve(spender, amount);
}

/**
 * Helper function to fast forward time in tests
 */
export async function fastForwardTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * Helper function to get current block timestamp
 */
export async function getCurrentTime(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

/**
 * Helper function to calculate time periods for testing
 */
export function calculateTestTimePeriods(baseTime?: number) {
  const currentTime = baseTime || Math.floor(Date.now() / 1000);
  return {
    S: currentTime + 2 * 24 * 60 * 60,   // 2 days from now
    T1: currentTime + 7 * 24 * 60 * 60,  // 7 days from now
    T2: currentTime + 8 * 24 * 60 * 60,  // 8 days from now  
    T3: currentTime + 9 * 24 * 60 * 60   // 9 days from now
  };
}