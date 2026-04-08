import React, { useState } from 'react';
import type { Difficulty } from '../../types/game';
import { createGame } from '../../api/gameApi';

interface DifficultySelectorProps {
  onGameCreated: (gameId: string, difficulty: Difficulty) => void;
  onError: (error: string | null) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onGameCreated, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (difficulty: Difficulty) => {
    setLoading(true);
    onError(null);
    try {
      const { gameId } = await createGame(difficulty);
      onGameCreated(gameId, difficulty);
    } catch {
      onError('Spiel konnte nicht erstellt werden. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-200">Schwierigkeitsgrad wählen</h2>
        <p className="text-slate-400">Der Bot schießt auf {'"'}HARD{'"'} deutlich intelligenter.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <button
          onClick={() => handleSelect('EASY')}
          disabled={loading}
          className="group flex flex-col items-center gap-3 px-10 py-8 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 hover:border-cyan-500 rounded-2xl transition-all duration-150 shadow-lg"
        >
          <span className="text-4xl">🎯</span>
          <span className="text-xl font-bold text-slate-200">EASY</span>
          <span className="text-sm text-slate-400">Zufälliger Bot</span>
        </button>

        <button
          onClick={() => handleSelect('HARD')}
          disabled={loading}
          className="group flex flex-col items-center gap-3 px-10 py-8 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 hover:border-red-500 rounded-2xl transition-all duration-150 shadow-lg"
        >
          <span className="text-4xl">💀</span>
          <span className="text-xl font-bold text-red-400">HARD</span>
          <span className="text-sm text-slate-400">Intelligenter Bot</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Spiel wird erstellt...</span>
        </div>
      )}
    </div>
  );
};

export default DifficultySelector;
