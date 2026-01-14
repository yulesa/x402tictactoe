import { CellValue, GameStatus } from './sessionStore.js';

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export function checkWinner(board: CellValue[]): CellValue {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function isBoardFull(board: CellValue[]): boolean {
  return board.every(cell => cell !== null);
}

export function getGameStatus(board: CellValue[]): GameStatus {
  const winner = checkWinner(board);
  if (winner === 'X') return 'player_wins';
  if (winner === 'O') return 'ai_wins';
  if (isBoardFull(board)) return 'draw';
  return 'active';
}

function getEmptyCells(board: CellValue[]): number[] {
  return board.map((cell, idx) => cell === null ? idx : -1).filter(idx => idx !== -1);
}

// Simple Bot that sometimes makes mistakes for better UX
export function getAIMove(board: CellValue[]): number | null {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return null;

  // 70% chance to play optimally, 30% chance to make a random move
  const playOptimally = Math.random() > 0.3;

  if (playOptimally) {
    // Try to win
    for (const cell of emptyCells) {
      const testBoard = [...board];
      testBoard[cell] = 'O';
      if (checkWinner(testBoard) === 'O') return cell;
    }

    // Block player from winning
    for (const cell of emptyCells) {
      const testBoard = [...board];
      testBoard[cell] = 'X';
      if (checkWinner(testBoard) === 'X') return cell;
    }

    // Take center if available
    if (board[4] === null) return 4;

    // Take a corner
    const corners = [0, 2, 6, 8].filter(c => board[c] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }
  }

  // Random move
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

export function isValidMove(board: CellValue[], position: number): boolean {
  return position >= 0 && position <= 8 && board[position] === null;
}
