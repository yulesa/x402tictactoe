import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useGameStart, GameSessionData } from '../hooks/useGameStart';

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
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { startGame, isStarting, error, signingWarning } = useGameStart();

  const handleStartGame = async () => {
    // If not connected, open the RainbowKit modal
    if (!isConnected && openConnectModal) {
      openConnectModal();
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
          <li>Start the game. You will be prompted to sign the 0.01 USDC payment.</li>
        </ol>
        <button className="how-to-play-link" onClick={onShowHowToPlay}>
          Full instructions
        </button>
      </div>
    </div>
  );
}
