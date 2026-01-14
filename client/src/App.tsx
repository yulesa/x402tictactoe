import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { GameBoard } from './components/GameBoard';
import { WalletConnect } from './components/WalletConnect';
import { useSession } from './hooks/useSession';
import { makeMove, getSession } from './services/api';
import './App.css';

type CellValue = 'X' | 'O' | null;

interface GameState {
  board: CellValue[];
  status: string;
  playerFirst: boolean;
}

function App() {
  const { walletAddress, saveWalletAddress, clearSession } = useSession();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleGameStart = (sessionData: {
    walletAddress: string;
    board: (string | null)[];
    playerFirst: boolean;
    status: string;
  }) => {
    saveWalletAddress(sessionData.walletAddress);
    setGameState({
      board: sessionData.board as CellValue[],
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

      // Clear session if game is over
      if (['player_wins', 'ai_wins', 'draw'].includes(result.status)) {
        clearSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make move');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewGame = () => {
    setGameState(null);
    clearSession();
  };

  const getStatusMessage = () => {
    if (!gameState) return '';
    switch (gameState.status) {
      case 'player_wins':
        return 'You win!';
      case 'ai_wins':
        return 'AI wins!';
      case 'draw':
        return "It's a draw!";
      default:
        return 'Tic-Tac-Toe';
    }
  };

  const isGameOver = gameState && ['player_wins', 'ai_wins', 'draw'].includes(gameState.status);

  return (
    <div className="app">
      <header>
        <h1>Tic-Tac-Toe x402</h1>
        <WalletConnect />
      </header>

      <main>
        {!gameState ? (
          <LandingPage onGameStart={handleGameStart} />
        ) : (
          <div className="game-container">
            <div className={`status ${gameState.status}`}>
              {getStatusMessage()}
            </div>

            <GameBoard
              board={gameState.board}
              onCellClick={handleCellClick}
              disabled={isLoading || isGameOver!}
            />

            {error && <p className="error">{error}</p>}

            {isGameOver && (
              <button onClick={handleNewGame} className="new-game-btn">
                Play Again (0.01 USD)
              </button>
            )}

            {!isGameOver && (
              <p className="hint">
                You are playing X. {gameState.playerFirst ? 'You go first!' : 'AI went first.'}
              </p>
            )}
          </div>
        )}
      </main>

      <footer>
        <p>Powered by x402 Protocol | Base Sepolia</p>
      </footer>
    </div>
  );
}

export default App;
