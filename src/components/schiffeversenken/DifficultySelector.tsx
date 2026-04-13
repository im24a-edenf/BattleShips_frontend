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
      onError('Spiel konnte nicht erstellt werden.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-200">Schwierigkeit wählen</h2>
        <p className="text-xs sm:text-sm text-slate-500">Wie clever soll der Bot sein?</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:w-auto">
        <button
          onClick={() => handleSelect('EASY')}
          disabled={loading}
          className="flex flex-col items-center gap-2 px-8 py-6 sm:px-10 sm:py-8 bg-slate-800/60 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 hover:border-cyan-600/50 rounded-2xl transition-all duration-200"
        >
          <span className="text-3xl sm:text-4xl">🎯</span>
          <span className="text-lg font-bold text-slate-200">Easy</span>
          <span className="text-xs text-slate-500">Zufälliger Bot</span>
        </button>

        <button
          onClick={() => handleSelect('HARD')}
          disabled={loading}
          className="flex flex-col items-center gap-2 px-8 py-6 sm:px-10 sm:py-8 bg-slate-800/60 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 hover:border-red-500/50 rounded-2xl transition-all duration-200"
        >
          <span className="text-3xl sm:text-4xl">💀</span>
          <span className="text-lg font-bold text-red-400">Hard</span>
          <span className="text-xs text-slate-500">Intelligenter Bot</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Erstelle Spiel...</span>
        </div>
      )}
    </div>
  );
};

export default DifficultySelector;
