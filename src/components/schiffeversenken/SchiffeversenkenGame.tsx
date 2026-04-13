import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CellState, ShipDTO, LogEntry, GamePhase, Difficulty, Winner, FireCallbackPayload } from '../../types/game';
import { getGameState } from '../../api/gameApi';
import DifficultySelector from './DifficultySelector';
import PlacementPhase from './PlacementPhase';
import BattlePhase from './BattlePhase';
import GameOver from './GameOver';

const createEmptyBoard = (): CellState[][] =>
  Array.from({ length: 10 }, () => Array<CellState>(10).fill('EMPTY'));

interface GameState {
  gameId: string | null;
  phase: GamePhase;
  difficulty: Difficulty | null;
  playerBoard: CellState[][];
  botBoard: CellState[][];
  playerShips: ShipDTO[];
  botShips: ShipDTO[];
  winner: Winner | null;
  eventLog: LogEntry[];
  isLoading: boolean;
  error: string | null;
}

const initialState: GameState = {
  gameId: null,
  phase: 'IDLE',
  difficulty: null,
  playerBoard: createEmptyBoard(),
  botBoard: createEmptyBoard(),
  playerShips: [],
  botShips: [],
  winner: null,
  eventLog: [],
  isLoading: false,
  error: null,
};

const SchiffeversenkenGame: React.FC = () => {
  const [state, setState] = useState<GameState>(initialState);
  const navigate = useNavigate();

  const handleGameCreated = useCallback((gameId: string, difficulty: Difficulty) => {
    setState(prev => ({ ...prev, gameId, difficulty, phase: 'PLACEMENT', error: null }));
  }, []);

  const handleShipsPlaced = useCallback(async () => {
    const gameId = state.gameId;
    if (!gameId) return;
    try {
      const gameState = await getGameState(gameId);
      setState(prev => ({
        ...prev,
        phase: 'BATTLE',
        playerBoard: gameState.playerBoard,
        playerShips: gameState.playerShips,
        botBoard: gameState.botBoard,
        botShips: gameState.botShips,
        error: null,
      }));
    } catch {
      setState(prev => ({ ...prev, error: 'Fehler beim Laden des Spielzustands.' }));
    }
  }, [state.gameId]);

  const handleFire = useCallback((payload: FireCallbackPayload) => {
    setState(prev => ({
      ...prev,
      playerBoard: payload.playerBoard,
      botBoard: payload.botBoard,
      playerShips: payload.playerShips,
      botShips: payload.botShips,
      eventLog: [...payload.newEntries, ...prev.eventLog],
      winner: payload.winner,
      phase: payload.winner ? 'FINISHED' : 'BATTLE',
      isLoading: false,
    }));
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const handleError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const handleRestart = useCallback(() => {
    setState({
      ...initialState,
      playerBoard: createEmptyBoard(),
      botBoard: createEmptyBoard(),
    });
  }, []);

  const { phase, gameId, playerBoard, botBoard, playerShips, botShips, eventLog, winner, isLoading, error } =
    state;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Menu
          </button>
          <h1 className="text-sm sm:text-base font-bold text-cyan-400 tracking-widest uppercase">
            Solo vs Bot
          </h1>
          <div className="w-16" />
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 px-3 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-xs sm:text-sm text-center">
              {error}
            </div>
          )}

          {phase === 'IDLE' && (
            <DifficultySelector onGameCreated={handleGameCreated} onError={handleError} />
          )}

          {phase === 'PLACEMENT' && gameId && (
            <PlacementPhase gameId={gameId} onShipsPlaced={handleShipsPlaced} onError={handleError} />
          )}

          {phase === 'BATTLE' && gameId && (
            <BattlePhase
              gameId={gameId}
              playerBoard={playerBoard}
              botBoard={botBoard}
              playerShips={playerShips}
              botShips={botShips}
              eventLog={eventLog}
              isLoading={isLoading}
              onFire={handleFire}
              onLoadingChange={handleLoadingChange}
              onError={handleError}
            />
          )}

          {phase === 'FINISHED' && winner && (
            <GameOver winner={winner} onRestart={handleRestart} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SchiffeversenkenGame;
