import { useAccount, useConnect, useWalletClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useState, useEffect, useRef } from 'react';
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
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id });
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingStartRef = useRef(false);

  useEffect(() => {
    console.log('[Wallet] State changed', { isConnected, address, hasWalletClient: !!walletClient });
  }, [isConnected, address, walletClient]);

  // Auto-start game when walletClient becomes available after user clicked start
  useEffect(() => {
    if (pendingStartRef.current && walletClient && address) {
      console.log('[Wallet] walletClient now available, auto-starting game');
      pendingStartRef.current = false;
      startGame();
    }
  }, [walletClient, address]);

  const startGame = async () => {
    if (!address || !walletClient) return;

    console.log('[Wallet] Starting game', { address });
    setIsStarting(true);

    try {
      const requirements = await fetchPaymentRequirements();
      const paymentHeader = await createPaymentHeader(walletClient, address, requirements);
      const sessionData = await startSession(paymentHeader);
      onGameStart(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartGame = async () => {
    setError(null);
    console.log('[Wallet] handleStartGame called', { isConnected, address, hasWalletClient: !!walletClient });

    // Connect wallet if not connected
    if (!isConnected) {
      console.log('[Wallet] Not connected, attempting to connect...');
      const injected = connectors.find(c => c.id === 'injected') || connectors[0];
      if (injected) {
        try {
          console.log('[Wallet] Using connector:', injected.id);
          pendingStartRef.current = true;
          connect({ connector: injected });
          return;
        } catch {
          console.error('[Wallet] Failed to connect');
          pendingStartRef.current = false;
          setError('Failed to connect wallet');
          return;
        }
      }
    }

    // If already connected but walletClient not ready, set pending flag and wait
    if (!walletClient) {
      console.log('[Wallet] Connected but walletClient not ready, waiting...');
      pendingStartRef.current = true;
      return;
    }

    await startGame();
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
