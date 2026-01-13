import { Router, Request, Response } from 'express';
import { x402Middleware } from '../middleware/x402.js';
import { createSession, getSession, updateSession } from '../services/sessionStore.js';
import { getAIMove } from '../services/gameEngine.js';

export const sessionRouter = Router();

// POST /api/session/start - x402 protected
sessionRouter.post('/start', x402Middleware, (req: Request, res: Response) => {
  const walletAddress = req.walletAddress!;

  // Check for existing active session
  const existingSession = getSession(walletAddress);
  if (existingSession && existingSession.status !== 'player_wins' &&
      existingSession.status !== 'ai_wins' && existingSession.status !== 'draw') {
    // Return existing session
    res.json({
      walletAddress: existingSession.walletAddress,
      board: existingSession.gameState,
      playerFirst: existingSession.playerFirst,
      aiMove: null,
      status: existingSession.status,
      expiresAt: existingSession.expiresAt.toISOString(),
      restored: true,
    });
    return;
  }

  // Randomly decide who goes first
  const playerFirst = Math.random() > 0.5;
  const session = createSession(walletAddress, playerFirst);

  let aiMove: number | null = null;
  if (!playerFirst) {
    // AI moves first
    aiMove = getAIMove(session.gameState);
    if (aiMove !== null) {
      session.gameState[aiMove] = 'O';
      updateSession(walletAddress, { gameState: session.gameState, status: 'active' });
    }
  }

  res.json({
    walletAddress: session.walletAddress,
    board: session.gameState,
    playerFirst: session.playerFirst,
    aiMove,
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
    restored: false,
  });
});

// GET /api/session/:walletAddress - check session status
sessionRouter.get('/:walletAddress', (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const session = getSession(walletAddress);

  if (!session) {
    res.status(404).json({
      error: 'Session not found',
      message: 'No active session for this wallet',
    });
    return;
  }

  res.json({
    walletAddress: session.walletAddress,
    board: session.gameState,
    status: session.status,
    playerFirst: session.playerFirst,
    expiresAt: session.expiresAt.toISOString(),
  });
});
