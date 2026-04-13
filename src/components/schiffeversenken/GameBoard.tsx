import React from 'react';
import type { CellState } from '../../types/game';

interface GameBoardProps {
  board: CellState[][];
  onCellClick?: (x: number, y: number) => void;
  isEnemy: boolean;
  disabled?: boolean;
  lastShot?: { x: number; y: number };
  label?: string;
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const getCellClasses = (
  state: CellState,
  isEnemy: boolean,
  isClickable: boolean,
  isLastShot: boolean,
): string => {
  const base =
    'game-cell border border-slate-700/60 flex items-center justify-center relative transition-all duration-150 select-none';

  const ring = isLastShot ? ' ring-2 ring-yellow-400 ring-inset z-10' : '';

  if (state === 'HIT') return `${base}${ring} bg-red-600/90`;
  if (state === 'SUNK') return `${base}${ring} bg-red-900`;
  if (state === 'MISS') return `${base}${ring} bg-slate-700/80`;
  if (state === 'SHIP' && !isEnemy) return `${base}${ring} bg-cyan-800/70 border-cyan-700/50`;

  if (isClickable) {
    return `${base}${ring} bg-slate-800/60 hover:bg-cyan-600/30 active:bg-cyan-500/40 cursor-crosshair`;
  }
  return `${base}${ring} bg-slate-800/60`;
};

const HitMarker: React.FC = () => (
  <svg className="w-[55%] h-[55%] pointer-events-none" viewBox="0 0 20 20">
    <line x1="4" y1="4" x2="16" y2="16" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="4" x2="4" y2="16" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MissMarker: React.FC = () => (
  <svg className="w-[35%] h-[35%] pointer-events-none" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="3.5" stroke="#64748b" strokeWidth="1.5" fill="rgba(100,116,139,0.3)" />
  </svg>
);

const SunkMarker: React.FC = () => (
  <svg className="w-[55%] h-[55%] pointer-events-none" viewBox="0 0 20 20">
    <line x1="4" y1="4" x2="16" y2="16" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="4" x2="4" y2="16" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
    <circle cx="10" cy="10" r="8" stroke="#f87171" strokeWidth="1" fill="none" opacity="0.4" />
  </svg>
);

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  onCellClick,
  isEnemy,
  disabled = false,
  lastShot,
  label,
}) => {
  const handleClick = (x: number, y: number) => {
    if (disabled || !onCellClick || !isEnemy) return;
    const state = board[x]?.[y];
    if (state !== 'EMPTY') return;
    onCellClick(x, y);
  };

  return (
    <div className="inline-flex flex-col gap-0.5">
      {label && (
        <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1 pl-[clamp(20px,5vw,28px)]">
          {label}
        </div>
      )}

      {/* Column headers */}
      <div className="flex gap-0" style={{ paddingLeft: 'clamp(20px, 5vw, 28px)' }}>
        {COLS.map(col => (
          <div key={col} className="game-label-col text-center text-[10px] sm:text-xs text-slate-600 font-mono">
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: 10 }, (_, y) => (
        <div key={y} className="flex gap-0 items-center">
          <div className="game-label-row text-right text-[10px] sm:text-xs text-slate-600 font-mono pr-0.5">
            {ROWS[y]}
          </div>

          {Array.from({ length: 10 }, (_, x) => {
            const state = board[x]?.[y] ?? 'EMPTY';
            const isLastShot = lastShot?.x === x && lastShot?.y === y;
            const isClickable = isEnemy && !disabled && state === 'EMPTY';

            return (
              <div
                key={x}
                className={getCellClasses(state, isEnemy, isClickable, isLastShot)}
                onClick={() => handleClick(x, y)}
                aria-label={`${ROWS[y]}${COLS[x]}`}
              >
                {state === 'HIT' && <HitMarker />}
                {state === 'MISS' && <MissMarker />}
                {state === 'SUNK' && <SunkMarker />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default GameBoard;
