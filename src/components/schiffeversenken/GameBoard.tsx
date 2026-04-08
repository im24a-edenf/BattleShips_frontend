import React from 'react';
import type { CellState, ShipDTO } from '../../types/game';

interface GameBoardProps {
  board: CellState[][];
  ships?: ShipDTO[];
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
    'w-10 h-10 border border-slate-600 flex items-center justify-center relative transition-colors duration-150 select-none';

  const ring = isLastShot ? ' ring-2 ring-yellow-400 ring-inset z-10' : '';

  if (state === 'HIT') return `${base}${ring} bg-red-600`;
  if (state === 'SUNK') return `${base}${ring} bg-red-900`;
  if (state === 'MISS') return `${base}${ring} bg-slate-600`;
  if (state === 'SHIP' && !isEnemy) return `${base}${ring} bg-blue-800`;

  // EMPTY (or SHIP on enemy board which shouldn't occur but treat as empty)
  if (isClickable) {
    return `${base}${ring} bg-slate-100 hover:bg-cyan-200 cursor-crosshair`;
  }
  return `${base}${ring} bg-slate-100`;
};

const HitMarker: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className="pointer-events-none">
    <line x1="4" y1="4" x2="16" y2="16" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="4" x2="4" y2="16" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MissMarker: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none">
    <circle cx="6" cy="6" r="3.5" stroke="#94a3b8" strokeWidth="1.5" fill="rgba(148,163,184,0.3)" />
  </svg>
);

const SunkMarker: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className="pointer-events-none">
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
    <div className="inline-flex flex-col gap-1">
      {label && (
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 pl-7">
          {label}
        </div>
      )}

      {/* Column headers */}
      <div className="flex gap-0 pl-7">
        {COLS.map(col => (
          <div key={col} className="w-10 text-center text-xs text-slate-500 font-mono">
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: 10 }, (_, y) => (
        <div key={y} className="flex gap-0 items-center">
          {/* Row label */}
          <div className="w-7 text-right text-xs text-slate-500 font-mono pr-1">{ROWS[y]}</div>

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
