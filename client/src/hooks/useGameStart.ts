import { useState } from 'react';
import { useAccount, useConnect, useConfig, useDisconnect } from 'wagmi';
import { getWalletClient, switchChain } from '@wagmi/core';
import { baseSepolia } from 'wagmi/chains';
import { tryStartSession, startSessionWithPayment } from '../services/api';
import { extractPaymentRequired, createPaymentHeader } from '../services/x402';

type CellValue = 'X' | 'O' | null;

export interface GameSessionData {
  walletAddress: string;
  board: CellValue[];
  playerFirst: boolean;
  status: string;
}

interface UseGameStartReturn {
  startGame: () => Promise<GameSessionData | null>;
  isStarting: boolean;
  isConnecting: boolean;
  error: string | null;
  sessionRestoreWarning: string | null;
  clearError: () => void;
}

export function useGameStart(): UseGameStartReturn {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const config = useConfig();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionRestoreWarning, setSessionRestoreWarning] = useState<string | null>(null);

  const connectWallet = async (): Promise<`0x${string}` | null> => {
    const injected = connectors.find(c => c.id === 'injected') || connectors[0];
    if (!injected) {
      setError('No wallet connector found');
      return null;
    }

    console.log('[Wallet] Using connector:', injected.id);

    try {
      const result = await connectAsync({ connector: injected });
      console.log('[Wallet] Connected with address:', result.accounts[0]);
      return result.accounts[0];
    } catch (err) {
      // If not a "Connector already connected" error, fail immediately, else try reconnecting
      if (!(err instanceof Error && err.message.includes('Connector already connected'))) {
        console.error('[Wallet] Failed to connect:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        return null;
      }
    }

    // Connector already connected - reconnecting: properly disconnect first, then retry
    console.log('[Wallet] Connector already connected, disconnecting first...');
    try {
      await disconnectAsync();
      const result = await connectAsync({ connector: injected });
      console.log('[Wallet] Reconnected with address:', result.accounts[0]);
      return result.accounts[0];
    } catch (err) {
      console.error('[Wallet] Failed to reconnect:', err);
      setError(err instanceof Error ? err.message : 'Failed to reconnect wallet');
      return null;
    }
  };

  const startGame = async (): Promise<GameSessionData | null> => {
    setError(null);
    console.log('[Wallet] startGame called', { isConnected, address });

    let walletAddress = address;

    // Connect wallet if not connected
    if (!isConnected || !walletAddress) {
      console.log('[Wallet] Not connected, attempting to connect...');
      const connectedAddress = await connectWallet();
      if (!connectedAddress) return null;
      walletAddress = connectedAddress;
    }

    setIsStarting(true);
    setSessionRestoreWarning(null);

    try {
      // Switch to baseSepolia if needed and get wallet client
      await switchChain(config, { chainId: baseSepolia.id });
      const walletClient = await getWalletClient(config, { chainId: baseSepolia.id });

      if (!walletClient) {
        setError('Failed to get wallet client');
        return null;
      }

      console.log('[Wallet] Starting game', { address: walletAddress });

      // First, try to start session without payment - this will return 402 with requirements
      // Pass wallet address as a hint so server can check for existing sessions
      const initialResponse = await tryStartSession(walletAddress);

      if (initialResponse.status !== 402) {
        // Unexpected response - session might already exist or other error
        if (initialResponse.ok) {
          const sessionData = await initialResponse.json();
          return {
            walletAddress: sessionData.walletAddress,
            board: sessionData.board as CellValue[],
            playerFirst: sessionData.playerFirst,
            status: sessionData.status,
          };
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
      const paymentHeader = await createPaymentHeader(walletClient, walletAddress, paymentRequired);
      const sessionData = await startSessionWithPayment(paymentHeader);

      return {
        walletAddress: sessionData.walletAddress,
        board: sessionData.board as CellValue[],
        playerFirst: sessionData.playerFirst,
        status: sessionData.status,
      };
    } catch (err) {
      console.error('[Wallet] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game');
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    startGame,
    isStarting,
    isConnecting,
    error,
    sessionRestoreWarning,
    clearError,
  };
}
