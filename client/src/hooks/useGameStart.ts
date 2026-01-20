import { useState } from 'react';
import { useActiveAccount, useActiveWallet, useSwitchActiveWalletChain } from 'thirdweb/react';
import { base, baseSepolia } from 'thirdweb/chains';
import { viemAdapter } from 'thirdweb/adapters/viem';
import { tryStartSession, startSessionWithPayment } from '../services/api';
import { extractPaymentRequired, createPaymentHeader } from '../services/x402';
import { thirdwebClient } from '../thirdwebClient';

// Network configuration based on environment variable
const getNetwork = () => {
  const networkEnv = import.meta.env.VITE_NETWORK;

  switch (networkEnv) {
    case 'base':
      return base;
    case 'base-sepolia':
      return baseSepolia;
    default:
      throw new Error(`Invalid NETWORK environment variable: ${networkEnv}. Must be 'base' or 'base-sepolia'`);
  }
};

const network = getNetwork();

// Transform error messages to be more user-friendly
export function formatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('insufficient_funds')) {
    return 'Your wallet has insufficient funds for the action. Make sure to have USDC. Check the "Need USDC?" info.';
  }

  if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
    return 'User rejected action in the wallet.';
  }

  return message;
}

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
  error: string | null;
  signingWarning: string | null;
  clearError: () => void;
}

export function useGameStart(): UseGameStartReturn {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const switchChain = useSwitchActiveWalletChain();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingWarning, setSigningWarning] = useState<string | null>(null);

  const startGame = async (): Promise<GameSessionData | null> => {
    setError(null);
    console.log('[Wallet] startGame called', { account: account?.address });

    const walletAddress = account?.address as `0x${string}` | undefined;

    // Check if wallet is connected - caller should handle opening connect modal
    if (!account || !wallet || !walletAddress) {
      console.log('[Wallet] Not connected, aborting game start');
      return null;
    }

    setIsStarting(true);
    setSigningWarning(null);

    try {
      // Switch to the configured network if needed
      await switchChain(network);

      // Get viem wallet client from thirdweb
      const walletClient = viemAdapter.walletClient.toViem({
        client: thirdwebClient,
        chain: network,
        account,
      });

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
        setSigningWarning(
          "There is a session open for your wallet. You're required to sign, proving wallet ownership. You won't be charged for session restorations."
        );
      } else {
        // Show signing warning for new payment
        setSigningWarning("You're required to sign, approving the payment in your wallet.");
      }

      // Extract payment requirements from 402 response
      const paymentRequired = extractPaymentRequired(initialResponse);
      console.log('[x402] Payment required, signing payment...');

      // Create payment header and retry request
      const paymentHeader = await createPaymentHeader(walletClient, walletAddress, paymentRequired);

      // Clear signing warning after successful signature
      setSigningWarning(null);
      const sessionData = await startSessionWithPayment(paymentHeader);

      return {
        walletAddress: sessionData.walletAddress,
        board: sessionData.board as CellValue[],
        playerFirst: sessionData.playerFirst,
        status: sessionData.status,
      };
    } catch (err) {
      console.error('[Wallet] Error:', err);
      setError(formatErrorMessage(err));
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    startGame,
    isStarting,
    error,
    signingWarning,
    clearError,
  };
}
