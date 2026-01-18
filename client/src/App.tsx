import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { GameBoard } from './components/GameBoard';
import { WalletConnect } from './components/WalletConnect';
import { WhyWeBuiltThis } from './components/WhyWeBuiltThis';
import { HowToPlay } from './components/HowToPlay';
import { NeedUsdc } from './components/NeedUsdc';
import { useSession } from './hooks/useSession';
import { useGameStart, GameSessionData, formatErrorMessage } from './hooks/useGameStart';
import { makeMove, getSession } from './services/api';
import './App.css';

// Get network display name from environment
const getNetworkName = () => {
  const networkEnv = import.meta.env.VITE_NETWORK;
  switch (networkEnv) {
    case 'base':
      return 'Base Mainnet';
    case 'base-sepolia':
      return 'Base Sepolia (Testnet)';
    default:
      return networkEnv || 'Unknown Network';
  }
};

const networkName = getNetworkName();
const isTestnet = import.meta.env.VITE_NETWORK === 'base-sepolia';

type CellValue = 'X' | 'O' | null;

interface GameState {
  board: CellValue[];
  status: string;
  playerFirst: boolean;
}

function App() {
  const { walletAddress, saveWalletAddress, clearSession } = useSession();
  const { startGame, isStarting, error: startError } = useGameStart();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [showNeedUsdcModal, setShowNeedUsdcModal] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    if (walletAddress && !gameState) {
      getSession(walletAddress).then((session) => {
        if (session && !['player_wins', 'ai_wins', 'draw'].includes(session.status)) {
          setGameState({
            board: session.board as CellValue[],
            status: session.status,
            playerFirst: session.playerFirst,
          });
        } else {
          clearSession();
        }
      });
    }
  }, [walletAddress, gameState, clearSession]);

  const handleGameStart = (sessionData: GameSessionData) => {
    saveWalletAddress(sessionData.walletAddress);
    setGameState({
      board: sessionData.board,
      status: sessionData.status,
      playerFirst: sessionData.playerFirst,
    });
  };

  const handleCellClick = async (position: number) => {
    if (!walletAddress || !gameState || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await makeMove(walletAddress, position);
      setGameState({
        ...gameState,
        board: result.board as CellValue[],
        status: result.status,
      });
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAgain = async () => {
    setError(null);
    const sessionData = await startGame();
    if (sessionData) {
      saveWalletAddress(sessionData.walletAddress);
      setGameState({
        board: sessionData.board,
        status: sessionData.status,
        playerFirst: sessionData.playerFirst,
      });
    }
  };

  const getStatusMessage = () => {
    if (!gameState) return '';
    switch (gameState.status) {
      case 'player_wins':
        return 'You win!';
      case 'ai_wins':
        return 'Bot wins!';
      case 'draw':
        return "It's a draw!";
      default:
        return 'Tic-Tac-Toe';
    }
  };

  const isGameOver = gameState && ['player_wins', 'ai_wins', 'draw'].includes(gameState.status);
  const displayError = error || startError;

  return (
    <div className="app">
      <header>
        <h1>x402 Tic-Tac-Toe</h1>
        <div className="header-actions">
          <a
            href="https://github.com/yulesa/x402demo"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            GitHub
          </a>
          <button
            className="header-link"
            onClick={() => setShowWhyModal(true)}
          >
            Why We Built This
          </button>
          <button
            className="header-link"
            onClick={() => setShowHowToPlayModal(true)}
          >
            How to Play
          </button>
          <button
            className="header-link"
            onClick={() => setShowNeedUsdcModal(true)}
          >
            Need USDC?
          </button>
          <WalletConnect />
        </div>
      </header>

      <div className={`network-banner ${isTestnet ? 'testnet' : 'mainnet'}`}>
        Running on {networkName}
      </div>

      <main>
        {!gameState ? (
          <LandingPage
            onGameStart={handleGameStart}
            onShowWhyWeBuiltThis={() => setShowWhyModal(true)}
            onShowHowToPlay={() => setShowHowToPlayModal(true)}
            onShowNeedUsdc={() => setShowNeedUsdcModal(true)}
          />
        ) : (
          <div className="game-container">
            <div className={`status ${gameState.status}`}>
              {getStatusMessage()}
            </div>

            <GameBoard
              board={gameState.board}
              onCellClick={handleCellClick}
              disabled={isLoading || isStarting || isGameOver!}
            />

            {displayError && <p className="error">{displayError}</p>}

            {isGameOver && (
              <button
                onClick={handlePlayAgain}
                disabled={isStarting}
                className="new-game-btn"
              >
                {isStarting ? 'Starting...' : 'Play Again (0.01 USD)'}
              </button>
            )}

            {!isGameOver && (
              <p className="hint">
                You are playing X. {gameState.playerFirst ? 'You go first!' : 'Bot went first.'}
              </p>
            )}
          </div>
        )}
      </main>

      <footer>
        <p>Powered by x402 Protocol | {networkName}</p>
      </footer>

      <WhyWeBuiltThis
        isOpen={showWhyModal}
        onClose={() => setShowWhyModal(false)}
      />
      <HowToPlay
        isOpen={showHowToPlayModal}
        onClose={() => setShowHowToPlayModal(false)}
      />
      <NeedUsdc
        isOpen={showNeedUsdcModal}
        onClose={() => setShowNeedUsdcModal(false)}
      />
    </div>
  );
}

export default App;
