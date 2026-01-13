import { Router, Request, Response } from 'express';
import { getSession, updateSession, deleteSession } from '../services/sessionStore.js';
import { isValidMove, getAIMove, getGameStatus } from '../services/gameEngine.js';

export const gameRouter = Router();

// POST /api/game/move - make a move
gameRouter.post('/move', (req: Request, res: Response) => {
  const { walletAddress, position } = req.body;

  if (!walletAddress || position === undefined) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'walletAddress and position are required',
    });
    return;
  }

  const session = getSession(walletAddress);
  if (!session) {
    res.status(404).json({
      error: 'Session not found',
      message: 'Please start a new game',
    });
    return;
  }

  // Check if game is already over
  if (['player_wins', 'ai_wins', 'draw'].includes(session.status)) {
    res.status(400).json({
      error: 'Game over',
      message: 'This game has already ended. Please start a new game.',
    });
    return;
  }

  // Validate the move
  if (!isValidMove(session.gameState, position)) {
    res.status(400).json({
      error: 'Invalid move',
      message: 'Cell is already occupied or position is out of range',
    });
    return;
  }

  // Make player move
  session.gameState[position] = 'X';

  // Update status to active if this is the first move
  if (session.status === 'created') {
    session.status = 'active';
  }

  // Check game status after player move
  let status = getGameStatus(session.gameState);
  let aiMove: number | null = null;

  // If game is not over, AI makes a move
  if (status === 'active') {
    aiMove = getAIMove(session.gameState);
    if (aiMove !== null) {
      session.gameState[aiMove] = 'O';
      status = getGameStatus(session.gameState);
    }
  }

  // Update session
  session.status = status;
  updateSession(walletAddress, { gameState: session.gameState, status });

  // If game is over, delete the session
  if (['player_wins', 'ai_wins', 'draw'].includes(status)) {
    deleteSession(walletAddress);
  }

  res.json({
    board: session.gameState,
    aiMove,
    status,
  });
});
