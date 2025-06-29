import { parseUnits } from "ethers";

export const TEST_CONSTANTS = {
  // Token amounts
  INITIAL_SUPPLY: parseUnits("1000000", 6),
  TEST_AMOUNT: parseUnits("100", 6),
  LARGE_AMOUNT: parseUnits("100000", 6),
  MIN_AMOUNT: 4n,
  
  // Time periods
  DAY: 24 * 60 * 60,
  ISSUANCE_PERIOD: 2 * 24 * 60 * 60,  // 2 days
  INSURANCE_PERIOD: 5 * 24 * 60 * 60, // 5 days
  CLAIM_PERIOD: 3 * 24 * 60 * 60,     // 3 days
  
  // Test accounts
  DEPLOYER_BALANCE: parseUnits("1000000", 6),
  USER_BALANCE: parseUnits("1000", 6),
  ATTACKER_BALANCE: parseUnits("1000", 6)
};