# CoverMax-DeFi

A simple DeFi insurance protocol on Polkadot Asset Hub that lets you earn yield while getting protection.

## What it does

- Deposit USDC and get AAA/AA insurance tokens
- Earn yield from Aave and Moonwell lending protocols  
- Get protected against smart contract risks
- Withdraw anytime with your earnings

## Quick Start

### 1. Setup
```bash
npm install
npm test
```

### 2. Deploy (optional - already deployed)
```bash
npx hardhat run scripts/deploy.ts --network passetHub
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

## Live Contracts (PassETHub)

| Contract | Address |
|----------|---------|
| **InsuranceCore** | `0x4b36f970037fc1EAc81BEFF53067Dee30437C2F6` |
| **TrancheAAA** | `0x94d4368503f4D184bB496098359E48A6901F6a0C` |
| **TrancheAA** | `0x8479835ecB7ceF761262Da3AE3eFdEaE0006BCf4` |
| **USDC (Mock)** | `0xfb9978ed80e59D5b66d36BC7c486423Ff6071E31` |

## How to Use

### Connect to PassETHub
Add to MetaMask:
- **Network**: Passet Hub  
- **RPC**: `https://testnet-passet-hub-eth-rpc.polkadot.io/`
- **Chain ID**: `420420422`

### Basic Operations

```solidity
// Deposit 100 USDC
insurance.splitRisk(100 * 10**6);

// Withdraw everything  
insurance.claimAll();

// Withdraw specific amounts
insurance.claim(aaaAmount, aaAmount);
```

## Architecture

- **InsuranceCore** - Main contract for deposits/withdrawals
- **InsuranceCalculator** - Handles yield calculations
- **InsuranceAdapterManager** - Manages lending protocols
- **Tranche** - AAA/AA risk tokens
- **Adapters** - Connect to Aave/Moonwell

## License

Business Source License - see [LICENSE](LICENSE)