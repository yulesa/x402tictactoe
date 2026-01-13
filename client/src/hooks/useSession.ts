import { useState, useCallback, useEffect } from 'react';
import { getSession } from '../services/api';

const SESSION_KEY = 'ttt_wallet_address';

export function useSession() {
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_KEY);
  });

  const saveWalletAddress = useCallback((address: string) => {
    sessionStorage.setItem(SESSION_KEY, address);
    setWalletAddress(address);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setWalletAddress(null);
  }, []);

  // Check if stored session is still valid on mount
  useEffect(() => {
    if (walletAddress) {
      getSession(walletAddress).then((session) => {
        if (!session) {
          clearSession();
        }
      });
    }
  }, [walletAddress, clearSession]);

  return {
    walletAddress,
    saveWalletAddress,
    clearSession,
  };
}
