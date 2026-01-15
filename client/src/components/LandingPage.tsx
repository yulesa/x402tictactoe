import { useAccount } from 'wagmi';
import { useGameStart, GameSessionData } from '../hooks/useGameStart';

interface LandingPageProps {
  onGameStart: (sessionData: GameSessionData) => void;
}

export function LandingPage({ onGameStart }: LandingPageProps) {
  const { address, isConnected } = useAccount();
  const {
    startGame,
    isStarting,
    isConnecting,
    error,
    signingWarning,
  } = useGameStart();

  const handleStartGame = async () => {
    const sessionData = await startGame();
    if (sessionData) {
      onGameStart(sessionData);
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

      {signingWarning && (
        <p className="warning">{signingWarning}</p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
