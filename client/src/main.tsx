import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import { connectorsForWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import {
  rabbyWallet,
  rainbowWallet,
  baseAccount,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import App from './App';

// Network configuration based on environment variable
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [rabbyWallet, rainbowWallet, baseAccount, metaMaskWallet],
    },
    {
      groupName: 'Other',
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: 'Tic-Tac-Toe x402',
    projectId: import.meta.env.VITE_REOWN_PROJECT_ID,
  }
);

const getConfig = () => {
  const networkEnv = import.meta.env.VITE_NETWORK;

  switch (networkEnv) {
    case 'base':
      return createConfig({
        connectors,
        chains: [base],
        transports: {
          [base.id]: http(),
        },
      });
    case 'base-sepolia':
      return createConfig({
        connectors,
        chains: [baseSepolia],
        transports: {
          [baseSepolia.id]: http(),
        },
      });
    default:
      throw new Error(`Invalid NETWORK environment variable: ${networkEnv}. Must be 'base' or 'base-sepolia'`);
  }
};

const config = getConfig();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6366f1',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
