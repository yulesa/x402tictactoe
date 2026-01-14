import { useAccount, useConnect, useConfig } from 'wagmi';
import { getWalletClient, switchChain } from '@wagmi/core';
import { baseSepolia } from 'wagmi/chains';
import { useState } from 'react';
import { startSession } from '../services/api';
import { fetchPaymentRequirements, createPaymentHeader } from '../services/x402';

interface LandingPageProps {
  onGameStart: (sessionData: {
    walletAddress: string;
    board: (string | null)[];
    playerFirst: boolean;
    status: string;
  }) => void;
}

export function LandingPage({ onGameStart }: LandingPageProps) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const config = useConfig();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    setError(null);
    console.log('[Wallet] handleStartGame called', { isConnected, address });

    // Connect wallet if not connected
    if (!isConnected) {
      console.log('[Wallet] Not connected, attempting to connect...');
      const injected = connectors.find(c => c.id === 'injected') || connectors[0];
      if (injected) {
        try {
          console.log('[Wallet] Using connector:', injected.id);
          const result = await connectAsync({ connector: injected });
          console.log('[Wallet] Connected with address:', result.accounts[0]);
          return;
        } catch {
          console.error('[Wallet] Failed to connect');
          setError('Failed to connect wallet');
          return;
        }
      }
    }

    if (!address) {
      setError('No wallet address found');
      return;
    }

    setIsStarting(true);

    try {
      // Switch to baseSepolia if needed and get wallet client
      console.log('[Wallet] Switching to baseSepolia chain...');
      await switchChain(config, { chainId: baseSepolia.id });

      console.log('[Wallet] Getting wallet client...');
      const walletClient = await getWalletClient(config, { chainId: baseSepolia.id });
      console.log('[Wallet] Got wallet client', { hasClient: !!walletClient });

      if (!walletClient) {
        setError('Failed to get wallet client');
        return;
      }

      console.log('[Wallet] Starting game', { address });
      const requirements = await fetchPaymentRequirements();
      const paymentHeader = await createPaymentHeader(walletClient, address, requirements);
      const sessionData = await startSession(paymentHeader);
      onGameStart(sessionData);
    } catch (err) {
      console.error('[Wallet] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="landing-page">
      <h1>Tic-Tac-Toe x402</h1>
      <p className="subtitle">Pay-per-play with USD using x402 Protocol</p>

      <div className="price-info">
        <span className="price">0.01 USD</span>
        <span className="per-game">per game</span>
      </div>

      <button
        onClick={handleStartGame}
        disabled={isStarting || isConnecting}
        className="start-btn"
      >
        {isConnecting
          ? 'Connecting Wallet...'
          : isStarting
          ? 'Starting Game...'
          : isConnected
          ? 'Start Game (0.01 USD)'
          : 'Connect Wallet & Play'}
      </button>

      {isConnected && (
        <p className="wallet-status">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
