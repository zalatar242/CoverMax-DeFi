import { createAppKit, useAppKitAccount, useAppKit, useAppKitNetwork } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { base, hardhat } from '@reown/appkit/networks';
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

// Configure networks
const networks = [
  base,
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
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID;

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
export const appKit = createAppKit({
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

// Hook to get current network
export const useNetwork = () => {
  const { chainId } = useAppKitNetwork();
  return {
    chainId,
    network: networks.find(n => n.id === chainId) || networks[0]
  };
};

// Hook to check if wallet is connected
export const useWalletConnection = () => {
  const { address, isConnected } = useAppKitAccount({ namespace: 'eip155' });
  return { isConnected, address };
};

// Export modal controls
export const useWalletModal = () => {
  const { open } = useAppKit();
  return {
    openConnectModal: () => open({ view: 'Connect', namespace: 'eip155' })
  };
};
