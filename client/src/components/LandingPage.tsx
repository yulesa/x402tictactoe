import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { useState } from 'react';
import { startSession } from '../services/api';

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
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    setError(null);

    // Step 1: Connect wallet if not connected
    if (!isConnected) {
      const injected = connectors.find(c => c.id === 'injected') || connectors[0];
      if (injected) {
        try {
          connect({ connector: injected });
          return; // Will re-render, user can click again
        } catch {
          setError('Failed to connect wallet');
          return;
        }
      }
    }

    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsStarting(true);

    try {
      // Step 2: Sign payment message (MVP: just sign a message to prove wallet ownership)
      const message = `Start Tic-Tac-Toe game\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      // Step 3: Call API with payment header
      const paymentHeader = `wallet:${address}:sig:${signature}`;
      const sessionData = await startSession(paymentHeader);

      onGameStart(sessionData);
    } catch (err) {
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
