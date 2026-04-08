import React from 'react';
import type { Winner } from '../../types/game';

interface GameOverProps {
  winner: Winner;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, onRestart }) => {
  const isPlayerWin = winner === 'PLAYER';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4">
        <div className="text-6xl">{isPlayerWin ? '🎉' : '😔'}</div>
        <h2 className="text-4xl font-bold">
          {isPlayerWin ? (
            <span className="text-yellow-400">Du hast gewonnen!</span>
          ) : (
            <span className="text-slate-400">Der Bot hat gewonnen.</span>
          )}
        </h2>
        <p className="text-slate-400 text-lg">
          {isPlayerWin
            ? 'Alle feindlichen Schiffe wurden versenkt!'
            : 'Alle deine Schiffe wurden versenkt.'}
        </p>
      </div>

      <button
        onClick={onRestart}
        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg transition-colors duration-150 text-lg"
      >
        Nochmal spielen
      </button>
    </div>
  );
};

export default GameOver;
