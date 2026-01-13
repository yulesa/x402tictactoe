type CellValue = 'X' | 'O' | null;

interface GameBoardProps {
  board: CellValue[];
  onCellClick: (position: number) => void;
  disabled: boolean;
}

export function GameBoard({ board, onCellClick, disabled }: GameBoardProps) {
  return (
    <div className="game-board">
      {board.map((cell, idx) => (
        <button
          key={idx}
          className={`cell ${cell ? 'filled' : ''} ${cell === 'X' ? 'player' : cell === 'O' ? 'ai' : ''}`}
          onClick={() => onCellClick(idx)}
          disabled={disabled || cell !== null}
        >
          {cell}
        </button>
      ))}
    </div>
  );
}
