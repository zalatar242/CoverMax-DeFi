import React, { type ReactNode } from 'react';
import { createAppKit, useAppKitAccount, useAppKit, useAppKitNetwork } from '@reown/appkit/react';
import { WagmiProvider, type Config } from 'wagmi';
import { hardhat } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import type { Chain, Address } from 'viem';

// Create query client
const queryClient = new QueryClient();

interface ProjectMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

interface NetworkConfig extends Chain {
  id: number;
  name: string;
  network: string;
  testnet?: boolean;
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
}

// Project metadata
const metadata: ProjectMetadata = {
  name: 'CoverMax',
  description: 'Decentralized Insurance Platform',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Configure networks
const networks: NetworkConfig[] = [
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
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || '';

if (!projectId) {
  console.error('REACT_APP_REOWN_PROJECT_ID is not configured in .env file');
}

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
});

// Create AppKit instance
// Ensure at least one network is available
const appKitNetworks = networks.length > 0
  ? (networks as unknown as [NetworkConfig, ...NetworkConfig[]])
  : ([networks[0]] as unknown as [NetworkConfig, ...NetworkConfig[]]);

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: appKitNetworks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
});

interface AppKitProviderProps {
  children: ReactNode;
}

// AppKit Provider component
export function AppKitProvider({ children }: AppKitProviderProps): React.ReactElement {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

// Network key mapping (matches contractConfig.js)
const NETWORK_KEYS: Record<number, string> = {
  84532: 'base-sepolia',
  8453: 'base-mainnet',
  31337: 'hardhat'
};

interface NetworkHookReturn {
  chainId: number;
  network: NetworkConfig | undefined;
  networkKey: string;
}

// Hook to get current network
export const useNetwork = (): NetworkHookReturn => {
  const { chainId = 84532 } = useAppKitNetwork();
  console.log('Current Chain ID:', chainId);

  // Map chain ID to network key
  const networkKey = NETWORK_KEYS[Number(chainId)] || 'base-sepolia';
  // Default to Base Sepolia if chain not found
  const network = networks.find(n => n.id === Number(chainId)) || networks.find(n => n.id === 84532);

  console.log('Selected Network:', network, 'Network Key:', networkKey);

  return {
    chainId: Number(chainId),
    network,
    networkKey
  };
};

interface WalletConnectionReturn {
  isConnected: boolean;
  address: Address | undefined;
}

// Hook to check if wallet is connected
export const useWalletConnection = (): WalletConnectionReturn => {
  const { address, isConnected } = useAppKitAccount({ namespace: 'eip155' });
  return {
    isConnected,
    address: address ? address as Address : undefined
  };
};

interface WalletModalReturn {
  openConnectModal: () => void;
}

// Export modal controls
export const useWalletModal = (): WalletModalReturn => {
  const { open } = useAppKit();
  return {
    openConnectModal: () => open({ view: 'Connect', namespace: 'eip155' })
  };
};
