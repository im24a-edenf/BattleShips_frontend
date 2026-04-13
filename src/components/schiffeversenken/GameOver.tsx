import React from 'react';
import type { Winner } from '../../types/game';

interface GameOverProps {
  winner: Winner;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, onRestart }) => {
  const isPlayerWin = winner === 'PLAYER';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center space-y-3">
        <div className="text-5xl sm:text-6xl">{isPlayerWin ? '🎉' : '😔'}</div>
        <h2 className="text-2xl sm:text-4xl font-bold">
          {isPlayerWin ? (
            <span className="text-yellow-400">Du hast gewonnen!</span>
          ) : (
            <span className="text-slate-400">Der Bot hat gewonnen.</span>
          )}
        </h2>
        <p className="text-slate-500 text-sm">
          {isPlayerWin
            ? 'Alle feindlichen Schiffe versenkt!'
            : 'Alle deine Schiffe wurden versenkt.'}
        </p>
      </div>

      <button
        onClick={onRestart}
        className="px-8 py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
      >
        Nochmal spielen
      </button>
    </div>
  );
};

export default GameOver;
