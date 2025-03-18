# Decentralized Insurance with Lending Integration

## Lending Adapters

The project includes lending adapters for Aave V3, Moonwell, and Fluid protocols on Base mainnet. These adapters allow for seamless integration with lending protocols to generate yield on deposited assets.

### Deployed Addresses (Base Mainnet)

- Aave V3 Pool: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
- Moonwell mUSDC: `0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22`
- Fluid Pool: `0x1f29C486a8CFE7F4c60B09a49de646Db7f71f43a`

### Testing Locally

To test the lending adapters against Base mainnet:

1. Create a `.env` file with:
```
BASE_RPC_URL=your_base_rpc_url
PRIVATE_KEY=your_private_key_for_deployment
BASESCAN_API_KEY=your_basescan_api_key
```

2. Run the tests:
```bash
npx hardhat test test/LendingAdapters.test.ts
```

### Deployment

To deploy the lending adapters to Base mainnet:

```bash
npx hardhat run scripts/deploy-adapters.ts --network base
```

This will:
1. Deploy all three lending adapters
2. Verify the contracts on Basescan
3. Output the deployed addresses

### Architecture

Each lending adapter implements the `ILendingAdapter` interface with three core functions:

```solidity
function deposit(address asset, uint256 amount) external returns (uint256);
function withdraw(address asset, uint256 amount) external returns (uint256);
function getBalance(address asset) external returns (uint256);
```

- `AaveLendingAdapter`: Integrates with Aave V3 on Base
- `MoonwellLendingAdapter`: Integrates with Moonwell's mUSDC market
- `FluidLendingAdapter`: Integrates with Fluid's lending pools

### Security Considerations

1. All adapters are immutable (no admin functions)
2. Direct integration with protocol contracts (no proxies)
3. Simple deposit/withdraw functionality
4. No external dependencies beyond the core protocol contracts
5. Each adapter is thoroughly tested against mainnet state

### Architecture Diagram

```
┌──────────────────┐
│                  │
│  Insurance.sol   │
│                  │
└────────┬─────────┘
         │
         │ uses
         ▼
┌──────────────────┐    implements     ┌──────────────────┐
│                  │◄─────────────────►│                  │
│ ILendingAdapter  │                   │ AaveLendingAdapter│
│                  │                   │                  │
└──────────────────┘                   └──────────────────┘
         ▲
         │ implements                   ┌──────────────────┐
         │                             │                  │
         └─────────────────────────────│MoonwellAdapter   │
         │                             │                  │
         │                             └──────────────────┘
         │
         │                             ┌──────────────────┐
         │                             │                  │
         └─────────────────────────────│ FluidAdapter     │
                                      │                  │
                                      └──────────────────┘
