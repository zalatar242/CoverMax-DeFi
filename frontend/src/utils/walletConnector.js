import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

// Create query client
const queryClient = new QueryClient();

// Project metadata
const metadata = {
  name: 'CoverMax',
  description: 'Decentralized Insurance Platform',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Configure networks with RPC URLs
const configuredBase = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: { http: [process.env.REACT_APP_MAINNET_RPC_URL || base.rpcUrls.default.http[0]] }
  }
};

const configuredBaseSepolia = {
  ...baseSepolia,
  rpcUrls: {
    ...baseSepolia.rpcUrls,
    default: { http: [process.env.REACT_APP_SEPOLIA_RPC_URL || baseSepolia.rpcUrls.default.http[0]] }
  }
};

// Configure Hardhat local network
const hardhatLocal = {
  id: 84531,
  name: 'Hardhat Local',
  network: 'hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: 'http://localhost:8545' },
  },
  testnet: true,
};

// Define networks
const networks = [configuredBase, configuredBaseSepolia, hardhatLocal];

// Get projectId from environment variables
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID;

if (!projectId) {
  console.error('REACT_APP_REOWN_PROJECT_ID is not configured in .env file');
}

// Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
  defaultNetwork: process.env.REACT_APP_DEFAULT_NETWORK || 'mainnet'
});

// Create AppKit instance
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
});

// AppKit Provider component
export function AppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

// Helper to get wallet type (for UI display)
export const getWalletType = () => {
  return document.querySelector('appkit-button')?.isConnected() ? 'Reown Wallet' : null;
};
