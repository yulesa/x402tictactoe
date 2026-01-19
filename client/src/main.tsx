import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import { connectorsForWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import App from './App';
import { wakeServer } from './services/api';

// Show loading state while server wakes up
const rootElement = document.getElementById('root')!;
rootElement.innerHTML = `
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0a0a0a; color: #22c55e; font-family: system-ui, sans-serif;">
    <div style="font-size: 2rem; margin-bottom: 1rem;">Tic-Tac-Toe</div>
    <div style="font-size: 1rem; opacity: 0.8;">Waking up server...</div>
    <div style="margin-top: 1.5rem; width: 40px; height: 40px; border: 3px solid #22c55e; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  </div>
`;

// Network configuration based on environment variable
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [rainbowWallet],
    },
    {
      groupName: 'Other',
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: 'x402 Tic-Tac-Toe',
    projectId: import.meta.env.VITE_REOWN_PROJECT_ID,
  }
);

const config = createConfig({
  connectors,
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

// Wake up the server before rendering (handles Render cold starts)
wakeServer().then((serverReady) => {
  if (!serverReady) {
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0a0a0a; color: #ef4444; font-family: system-ui, sans-serif;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">Server Unavailable</div>
        <div style="font-size: 1rem; opacity: 0.8; text-align: center; max-width: 400px;">
          The server is not responding. Please try again later.
        </div>
        <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #22c55e; color: black; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
    return;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            initialChain={base}
            theme={darkTheme({
              accentColor: '#22c55e',
              accentColorForeground: 'black',
              borderRadius: 'large',
            })}
          >
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
});
