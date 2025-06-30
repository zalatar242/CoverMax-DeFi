import React from 'react';
import { createAppKit, useAppKitAccount, useAppKit, useAppKitNetwork } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { hardhat } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

interface AppKitProviderProps {
  children: React.ReactNode;
}

interface NetworkInfo {
  chainId: number | undefined;
  network: any;
  networkKey: string;
}

interface WalletConnection {
  isConnected: boolean;
  address: string | undefined;
}

interface WalletModal {
  openConnectModal: () => void;
}

// Create query client
const queryClient = new QueryClient();

// Project metadata
const metadata = {
  name: 'CoverMax',
  description: 'Decentralized Insurance Platform',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Configure networks
const networks = [
  {
    id: 420420422,
    name: 'Asset Hub Testnet',
    network: 'asset-hub-testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'DOT',
      symbol: 'DOT',
    },
    rpcUrls: {
      default: { http: [process.env.REACT_APP_PASSETHUB_RPC_URL || 'https://testnet-passet-hub-eth-rpc.polkadot.io/'] },
      public: { http: [process.env.REACT_APP_PASSETHUB_RPC_URL || 'https://testnet-passet-hub-eth-rpc.polkadot.io/'] },
    },
    blockExplorers: {
      default: {
        name: 'Asset Hub Explorer',
        url: 'https://assethub-passet.subscan.io'
      }
    },
    testnet: true
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    network: 'base-sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: ['https://sepolia.base.org'] },
      public: { http: ['https://sepolia.base.org'] },
    },
    blockExplorers: {
      default: {
        name: 'BaseScan',
        url: 'https://sepolia.basescan.org'
      }
    },
    testnet: true
  },
  {
    ...hardhat,
    id: 31337,
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
    }
  }
];

// Get projectId from environment variables
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || 'fallback-project-id';

if (!process.env.REACT_APP_REOWN_PROJECT_ID) {
  console.error('REACT_APP_REOWN_PROJECT_ID is not configured in .env file');
}

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks: networks as any,
  projectId,
  ssr: false
});

// Create AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: networks as any,
  projectId,
  metadata,
  features: {
    analytics: true
  }
});

// AppKit Provider component
export function AppKitProvider({ children }: AppKitProviderProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

// Network key mapping
const NETWORK_KEYS: Record<number, string> = {
  420420422: 'passetHub',
  84532: 'baseSepolia',
  8453: 'base-mainnet',
  31337: 'hardhat'
};

// Hook to get current network
export const useNetwork = (): NetworkInfo => {
  const { chainId } = useAppKitNetwork();
  console.log('Current Chain ID:', chainId);

  // Map chain ID to network key
  const networkKey = chainId ? NETWORK_KEYS[chainId as number] || 'passetHub' : 'passetHub';
  // Default to Asset Hub if chain not found
  const network = networks.find(n => n.id === chainId) || networks.find(n => n.id === 420420422);

  console.log('Selected Network:', network, 'Network Key:', networkKey);

  return {
    chainId: chainId as number | undefined,
    network,
    networkKey
  };
};

// Hook to check if wallet is connected
export const useWalletConnection = (): WalletConnection => {
  const { address, isConnected } = useAppKitAccount({ namespace: 'eip155' });
  return { isConnected, address };
};

// Export modal controls
export const useWalletModal = (): WalletModal => {
  const { open } = useAppKit();
  return {
    openConnectModal: () => open({ view: 'Connect', namespace: 'eip155' })
  };
};
