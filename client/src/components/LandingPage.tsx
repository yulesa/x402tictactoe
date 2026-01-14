import { useAccount, useConnect, useConfig, useDisconnect } from 'wagmi';
import { getWalletClient, switchChain } from '@wagmi/core';
import { baseSepolia } from 'wagmi/chains';
import { useState } from 'react';
import { tryStartSession, startSessionWithPayment } from '../services/api';
import { extractPaymentRequired, createPaymentHeader } from '../services/x402';

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
  const { disconnectAsync } = useDisconnect();
  const config = useConfig();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionRestoreWarning, setSessionRestoreWarning] = useState<string | null>(null);

  const connectWallet = async (): Promise<boolean> => {
    const injected = connectors.find(c => c.id === 'injected') || connectors[0];
    if (!injected) {
      setError('No wallet connector found');
      return false;
    }

    console.log('[Wallet] Using connector:', injected.id);

    try {
      const result = await connectAsync({ connector: injected });
      console.log('[Wallet] Connected with address:', result.accounts[0]);
      return true;
    } catch (err) {
      // If not a "Connector already connected" error, fail immediately, else try reconnecting
      if (!(err instanceof Error && err.message.includes('Connector already connected'))) {
        console.error('[Wallet] Failed to connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        return false;
      }
    }

    // Connector already connected - reconnecting: properly disconnect first, then retry
    console.log('[Wallet] Connector already connected, disconnecting first...');
    try {
      await disconnectAsync();
      const result = await connectAsync({ connector: injected });
      console.log('[Wallet] Reconnected with address:', result.accounts[0]);
      return true;
    } catch (err) {
      console.error('[Wallet] Failed to reconnect:', err);
      setError(err instanceof Error ? err.message : 'Failed to reconnect wallet');
      return false;
    }
  };

  const handleStartGame = async () => {
    setError(null);
    console.log('[Wallet] handleStartGame called', { isConnected, address });

    // Connect wallet if not connected
    if (!isConnected) {
      console.log('[Wallet] Not connected, attempting to connect...');
      const connected = await connectWallet();
      if (!connected) return;
      return; // User needs to click again after connecting
    }

    if (!address) {
      setError('No wallet address found');
      return;
    }

    setIsStarting(true);
    setSessionRestoreWarning(null);

    try {
      // Switch to baseSepolia if needed and get wallet client
      await switchChain(config, { chainId: baseSepolia.id });
      const walletClient = await getWalletClient(config, { chainId: baseSepolia.id });

      if (!walletClient) {
        setError('Failed to get wallet client');
        return;
      }

      console.log('[Wallet] Starting game', { address });

      // First, try to start session without payment - this will return 402 with requirements
      // Pass wallet address as a hint so server can check for existing sessions
      const initialResponse = await tryStartSession(address);

      if (initialResponse.status !== 402) {
        // Unexpected response - session might already exist or other error
        if (initialResponse.ok) {
          const sessionData = await initialResponse.json();
          onGameStart(sessionData);
          return;
        }
        const error = await initialResponse.json();
        throw new Error(error.message || 'Unexpected response from server');
      }

      // Check if server indicated an existing session for this wallet
      const responseBody = await initialResponse.clone().json();
      if (responseBody.hasExistingSession) {
        console.log('[x402] Existing session found, will restore without charging');
        setSessionRestoreWarning(
          "There is a session open for your wallet. You're still required to sign to prove wallet ownership. You won't be charged for session restorations."
        );
      }

      // Extract payment requirements from 402 response
      const paymentRequired = extractPaymentRequired(initialResponse);
      console.log('[x402] Payment required, signing payment...');

      // Create payment header and retry request
      const paymentHeader = await createPaymentHeader(walletClient, address, paymentRequired);
      const sessionData = await startSessionWithPayment(paymentHeader);
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

      {sessionRestoreWarning && (
        <p className="warning">{sessionRestoreWarning}</p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
