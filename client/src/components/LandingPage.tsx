import { useActiveAccount, useConnectModal } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';
import { base, baseSepolia } from 'thirdweb/chains';
import { useGameStart, GameSessionData } from '../hooks/useGameStart';
import { thirdwebClient } from '../thirdwebClient';

// Same wallet configuration as WalletConnect component
const wallets = [
  createWallet('me.rainbow'),
  createWallet('io.rabby'),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
];

interface LandingPageProps {
  onGameStart: (sessionData: GameSessionData) => void;
  onShowWhyWeBuiltThis: () => void;
  onShowHowToPlay: () => void;
  onShowNeedUsdc: () => void;
}

export function LandingPage({
  onGameStart,
  onShowWhyWeBuiltThis,
  onShowHowToPlay,
  onShowNeedUsdc,
}: LandingPageProps) {
  const account = useActiveAccount();
  const isConnected = !!account;
  const { connect } = useConnectModal();
  const { startGame, isStarting, error, signingWarning } = useGameStart();

  const handleStartGame = async () => {
    // If not connected, open the thirdweb connect modal with same wallet options
    if (!isConnected) {
      connect({
        client: thirdwebClient,
        wallets,
        chains: [base, baseSepolia],
      });
      return;
    }

    const sessionData = await startGame();
    if (sessionData) {
      onGameStart(sessionData);
    }
  };

  return (
    <div className="landing-page">
      <h1>x402 Tic-Tac-Toe</h1>
      <p className="subtitle">Pay-per-play with USD using x402 Protocol</p>

      <button className="why-btn" onClick={onShowWhyWeBuiltThis}>
        Why We Built This
      </button>

      <div className="price-info">
        <span className="price">0.01 USD</span>
        <span className="per-game">per game</span>
      </div>

      <button
        onClick={handleStartGame}
        disabled={isStarting}
        className="start-btn"
      >
        {isStarting
          ? 'Starting Game...'
          : isConnected
            ? 'Start Game (0.01 USD)'
            : 'Connect Wallet & Play'}
      </button>

      {signingWarning && <p className="warning">{signingWarning}</p>}

      {error && <p className="error">{error}</p>}

      <div className="quick-guide">
        <h3>Quick Start</h3>
        <ol>
          <li>You need a digital wallet. We suggest downloading Rainbow Wallet.</li>
          <li>
            Need USDC? Follow the instruction {' '}
            <button className="how-to-play-link" onClick={onShowNeedUsdc}>
              here
            </button>
            .
            </li>
          <li>You're in control of your wallet. We don't have access to your funds or recovery keys. This keeps your assets fully yours, but also means transactions are final and can't be undone (just like PIX). </li>
          <li>Start the game. You will be prompted to sign the 0.01 USDC payment.</li>
        </ol>
        <button className="how-to-play-link" onClick={onShowHowToPlay}>
          Full instructions
        </button>
      </div>
    </div>
  );
}
