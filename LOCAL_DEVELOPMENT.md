# Local Development Guide

This guide covers how to set up, deploy, and test the CoverMax-DeFi protocol locally.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
cp .env.example .env
```

3. Start local Hardhat node:
```bash
npx hardhat node
```

4. Deploy contracts:
```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

That's it! Your local environment is ready for development.

## What Gets Deployed

The deployment process sets up:

1. Mock External Contracts:
   - Mock USDC
   - Mock Aave (Pool, DataProvider)
   - Mock Compound (Comet)
   - Mock Moonwell (mToken, Comptroller)

2. Core Protocol:
   - Insurance contract
   - Lending adapters (Aave, Compound, Moonwell)
   - Tranches (A, B, C)

## Verifying Deployment

Check your deployment using Hardhat console:
```bash
npx hardhat console --network localhost
```

```javascript
// Get Insurance contract
const Insurance = await ethers.getContractFactory("Insurance")
const insurance = await Insurance.attach("INSURANCE_ADDRESS") // Use address from deployment output

// Check tranches
const trancheA = await insurance.A()
const trancheB = await insurance.B()
const trancheC = await insurance.C()

// Check lending adapters
const adapters = await insurance.getLendingAdapters()
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test test/Insurance.mainnet.test.ts
npm test test/AaveAdapter.mainnet.test.ts

# Run coverage
npm run coverage
```

### Manual Testing

1. Configure MetaMask:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

2. Get test USDC:
```bash
npx hardhat console --network localhost
```

```javascript
// Get contracts
const MockUSDC = await ethers.getContractFactory("MockUSDC")
const usdc = await MockUSDC.attach("USDC_ADDRESS") // Use deployment output address

// Get signers
const [deployer, user] = await ethers.getSigners()

// Mint USDC
await usdc.mint(user.address, ethers.parseUnits("1000", 6))
```

3. Test basic operations:
```javascript
// Approve USDC
await usdc.connect(user).approve(insurance.address, ethers.parseUnits("1000", 6))

// Deposit into tranches
await insurance.connect(user).deposit(0, ethers.parseUnits("100", 6)) // Tranche A
await insurance.connect(user).deposit(1, ethers.parseUnits("100", 6)) // Tranche B
await insurance.connect(user).deposit(2, ethers.parseUnits("100", 6)) // Tranche C
```

## Frontend Integration

1. Start the frontend:
```bash
cd frontend
npm install
npm run dev
```

2. Import test account to MetaMask:
   - Copy private key from Hardhat node output
   - Import into MetaMask using "Import Account"

## Troubleshooting

### Common Issues

1. **"Nonce too high" error**
   - Reset MetaMask account (Settings -> Advanced -> Reset Account)
   - Restart Hardhat node and redeploy

2. **Transaction failures**
   - Check ETH balance for gas
   - Verify USDC approval and balance
   - Confirm correct signer/account

3. **Frontend connection issues**
   - Verify MetaMask network settings
   - Check contract addresses in frontend config
   - Clear browser cache

### Debug Tools

1. Console debugging:
```bash
npx hardhat console --network localhost
```

2. Watch contract events:
```bash
npx hardhat watch-events --network localhost
```

## Configuration Files

- `hardhat.config.ts`: Network and compiler settings
- `config/addresses.ts`: Contract addresses by network
- `frontend/src/contracts.json`: Frontend configuration
