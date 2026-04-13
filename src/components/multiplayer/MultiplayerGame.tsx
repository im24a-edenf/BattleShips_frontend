import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';
import {
  createLobby,
  joinLobby,
  placeShipsMulti,
  fireShotMulti,
  getGameStateMulti,
} from '../../api/gameApi';
import PlacementPhase from '../schiffeversenken/PlacementPhase';
import GameBoard from '../schiffeversenken/GameBoard';
import FleetStatus from '../schiffeversenken/FleetStatus';
import EventLog from '../schiffeversenken/EventLog';
import type {
  CellState,
  ShipDTO,
  LogEntry,
  ShotResult,
  ShipType,
  GameWsEvent,
} from '../../types/game';

type MultiPhase =
  | 'LOBBY'
  | 'WAITING_FOR_PLAYER'
  | 'PLACEMENT'
  | 'WAITING_FOR_READY'
  | 'BATTLE'
  | 'FINISHED';

interface MultiState {
  phase: MultiPhase;
  gameId: string | null;
  roomCode: string | null;
  playerBoard: CellState[][];
  botBoard: CellState[][];
  playerShips: ShipDTO[];
  botShips: ShipDTO[];
  isMyTurn: boolean;
  isLoading: boolean;
  eventLog: LogEntry[];
  winner: string | null;
  opponentEmail: string | null;
  error: string | null;
}

const SHIP_DISPLAY: Record<ShipType, string> = {
  SCHLACHTSCHIFF: 'Schlachtschiff',
  KREUZER: 'Kreuzer',
  ZERSTOERER: 'Zerstörer',
  UBOOT: 'U-Boot',
};

let logId = 0;
const nextLogId = () => `mlog-${++logId}`;

const createEmptyBoard = (): CellState[][] =>
  Array.from({ length: 10 }, () => Array<CellState>(10).fill('EMPTY'));

const initialState: MultiState = {
  phase: 'LOBBY',
  gameId: null,
  roomCode: null,
  playerBoard: createEmptyBoard(),
  botBoard: createEmptyBoard(),
  playerShips: [],
  botShips: [],
  isMyTurn: false,
  isLoading: false,
  eventLog: [],
  winner: null,
  opponentEmail: null,
  error: null,
};

const buildShotLogEntry = (shot: ShotResult, byOpponent: boolean): LogEntry => {
  const ship = shot.shipType ? SHIP_DISPLAY[shot.shipType] : null;
  const timestamp = new Date();
  if (byOpponent) {
    if (shot.result === 'SUNK') return { id: nextLogId(), message: `Gegner hat dein${ship ? ` ${ship}` : ' Schiff'} versenkt!`, type: 'sunk', timestamp };
    if (shot.result === 'HIT') return { id: nextLogId(), message: `Gegner hat dein${ship ? ` ${ship}` : ' Schiff'} getroffen!`, type: 'hit', timestamp };
    return { id: nextLogId(), message: 'Gegner hat das Wasser getroffen.', type: 'miss', timestamp };
  } else {
    if (shot.result === 'SUNK') return { id: nextLogId(), message: `Du hast den ${ship ?? 'Schiff'} versenkt!`, type: 'sunk', timestamp };
    if (shot.result === 'HIT') return { id: nextLogId(), message: `Du hast einen Treffer gelandet!`, type: 'hit', timestamp };
    return { id: nextLogId(), message: 'Fehlschuss!', type: 'miss', timestamp };
  }
};

const MultiplayerGame: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<MultiState>(initialState);
  const [joinCode, setJoinCode] = useState('');
  const [lastPlayerShot, setLastPlayerShot] = useState<{ x: number; y: number } | null>(null);
  const [lastOpponentShot, setLastOpponentShot] = useState<{ x: number; y: number } | null>(null);
  const [optimisticBotBoard, setOptimisticBotBoard] = useState<CellState[][] | null>(null);

  const gameIdRef = useRef<string | null>(null);
  gameIdRef.current = state.gameId;
  const myEmailRef = useRef<string | undefined>(user?.email);
  myEmailRef.current = user?.email;

  const handleWsEvent = useCallback(async (event: GameWsEvent) => {
    const gameId = gameIdRef.current;
    const myEmail = myEmailRef.current;

    switch (event.type) {
      case 'PLAYER_JOINED':
        setState(prev => ({
          ...prev,
          phase: 'PLACEMENT',
          opponentEmail: event.playerTwoEmail,
          error: null,
        }));
        break;

      case 'BOTH_READY': {
        const isMyTurn = event.firstTurnEmail === myEmail;
        try {
          const gs = await getGameStateMulti(gameId!);
          setState(prev => ({
            ...prev,
            phase: 'BATTLE',
            isMyTurn,
            playerBoard: gs.playerBoard,
            botBoard: gs.botBoard,
            playerShips: gs.playerShips,
            botShips: gs.botShips,
            error: null,
          }));
        } catch {
          setState(prev => ({ ...prev, phase: 'BATTLE', isMyTurn, error: null }));
        }
        break;
      }

      case 'SHOT_FIRED': {
        const byOpponent = event.firingPlayerEmail !== myEmail;
        const logEntry = buildShotLogEntry(event.shot, byOpponent);
        const isMyTurn = event.nextTurnEmail === myEmail;

        if (byOpponent) {
          setLastOpponentShot({ x: event.shot.x, y: event.shot.y });
        }

        try {
          const gs = await getGameStateMulti(gameId!);
          setOptimisticBotBoard(null);
          setState(prev => ({
            ...prev,
            isMyTurn,
            isLoading: false,
            playerBoard: gs.playerBoard,
            botBoard: gs.botBoard,
            playerShips: gs.playerShips,
            botShips: gs.botShips,
            eventLog: [logEntry, ...prev.eventLog],
            winner: event.gameOver ? event.winner : null,
            phase: event.gameOver ? 'FINISHED' : 'BATTLE',
          }));
        } catch {
          setState(prev => ({
            ...prev,
            isMyTurn,
            isLoading: false,
            eventLog: [logEntry, ...prev.eventLog],
          }));
        }
        break;
      }

      case 'GAME_OVER':
        setState(prev => ({
          ...prev,
          phase: 'FINISHED',
          winner: event.winnerEmail,
        }));
        break;

      case 'OPPONENT_LEFT':
        setState(prev => ({
          ...prev,
          error: event.message,
          phase: 'LOBBY',
          gameId: null,
          roomCode: null,
        }));
        break;
    }
  }, []);

  useGameWebSocket(state.gameId, token, handleWsEvent);

  useEffect(() => {
    if (state.phase !== 'WAITING_FOR_PLAYER' || !state.gameId) return;
    const gameId = state.gameId;

    const interval = setInterval(async () => {
      try {
        const gs = await getGameStateMulti(gameId);
        if (gs.phase !== 'WAITING_FOR_PLAYER') {
          setState(prev => ({ ...prev, phase: 'PLACEMENT', error: null }));
        }
      } catch { /* keep polling */ }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.phase, state.gameId]);

  const handleCreate = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { gameId, roomCode } = await createLobby();
      setState(prev => ({ ...prev, gameId, roomCode, phase: 'WAITING_FOR_PLAYER', isLoading: false }));
    } catch {
      setState(prev => ({ ...prev, isLoading: false, error: 'Raum konnte nicht erstellt werden.' }));
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { gameId } = await joinLobby(code);
      setState(prev => ({ ...prev, gameId, phase: 'PLACEMENT', isLoading: false }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Beitreten fehlgeschlagen.';
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  const handleShipsPlaced = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'WAITING_FOR_READY' }));
  }, []);

  const handlePlacementError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const handleCellClick = async (x: number, y: number) => {
    if (!state.isMyTurn || state.isLoading || !state.gameId) return;
    setState(prev => ({ ...prev, isLoading: true }));
    setLastPlayerShot({ x, y });

    try {
      const result = await fireShotMulti(state.gameId, x, y);

      const newBotBoard = state.botBoard.map(row => [...row]);
      const cellResult: CellState = result.playerShot.result === 'MISS' ? 'MISS'
        : result.playerShot.result === 'SUNK' ? 'SUNK' : 'HIT';
      newBotBoard[result.playerShot.x][result.playerShot.y] = cellResult;
      if (cellResult === 'SUNK') {
        for (let cx = x - 1; cx >= 0 && newBotBoard[cx][y] === 'HIT'; cx--) newBotBoard[cx][y] = 'SUNK';
        for (let cx = x + 1; cx < 10 && newBotBoard[cx][y] === 'HIT'; cx++) newBotBoard[cx][y] = 'SUNK';
        for (let cy = y - 1; cy >= 0 && newBotBoard[x][cy] === 'HIT'; cy--) newBotBoard[x][cy] = 'SUNK';
        for (let cy = y + 1; cy < 10 && newBotBoard[x][cy] === 'HIT'; cy++) newBotBoard[x][cy] = 'SUNK';
      }
      setOptimisticBotBoard(newBotBoard);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Fehler beim Schießen.';
      setOptimisticBotBoard(null);
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  const { phase, roomCode, playerBoard, botBoard, playerShips, botShips, eventLog,
          winner, opponentEmail, isMyTurn, isLoading, error, gameId } = state;

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
            Multiplayer
          </h1>
          <div className="w-16" />
        </div>
      </nav>

      <div className="flex-1 px-3 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-xs sm:text-sm text-center">
              {error}
            </div>
          )}

          {/* LOBBY */}
          {phase === 'LOBBY' && (
            <div className="flex flex-col items-center gap-6 mt-12 sm:mt-16">
              <p className="text-slate-500 text-sm">Erstelle einen Raum oder tritt bei.</p>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed font-bold rounded-xl text-sm sm:text-base transition-colors"
                >
                  {isLoading ? 'Erstelle...' : 'Raum erstellen'}
                </button>

                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="Code"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-cyan-600/50"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={isLoading || !joinCode.trim()}
                    className="py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/40 disabled:text-slate-700 disabled:cursor-not-allowed font-bold rounded-xl transition-colors text-sm"
                  >
                    Beitreten
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WAITING FOR PLAYER */}
          {phase === 'WAITING_FOR_PLAYER' && (
            <div className="flex flex-col items-center gap-5 mt-12 sm:mt-16">
              <p className="text-slate-500 text-sm">Teile diesen Code:</p>
              <div className="px-8 py-5 bg-slate-800/60 border-2 border-cyan-600/40 rounded-2xl">
                <p className="text-4xl sm:text-5xl font-mono font-bold tracking-[0.3em] text-cyan-300 select-all">
                  {roomCode}
                </p>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                Warte auf Gegner...
              </div>
            </div>
          )}

          {/* PLACEMENT */}
          {phase === 'PLACEMENT' && gameId && (
            <div>
              {opponentEmail && (
                <p className="text-center text-xs text-slate-500 mb-3">
                  Gegner: <span className="text-cyan-400">{opponentEmail}</span>
                </p>
              )}
              <PlacementPhase
                gameId={gameId}
                onShipsPlaced={handleShipsPlaced}
                onError={handlePlacementError}
                placeFn={placeShipsMulti}
              />
            </div>
          )}

          {/* WAITING FOR READY */}
          {phase === 'WAITING_FOR_READY' && (
            <div className="flex flex-col items-center gap-4 mt-12 sm:mt-16">
              <p className="text-slate-300 text-base font-semibold">Schiffe gesetzt!</p>
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                Warte auf Gegner...
              </div>
            </div>
          )}

          {/* BATTLE */}
          {phase === 'BATTLE' && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                {isMyTurn ? (
                  <span className="inline-block px-4 py-1.5 bg-cyan-900/50 border border-cyan-600/40 rounded-full text-cyan-300 text-xs sm:text-sm font-semibold">
                    Du bist dran
                  </span>
                ) : (
                  <span className="inline-block px-4 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full text-slate-500 text-xs sm:text-sm">
                    Gegner ist dran...
                  </span>
                )}
              </div>

              <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
                <div className="flex flex-col items-center gap-1">
                  <GameBoard
                    board={playerBoard}
                    isEnemy={false}
                    lastShot={lastOpponentShot ?? undefined}
                    label="Dein Feld"
                  />
                </div>

                <div className="flex items-center justify-center xl:mt-20 py-1 xl:py-0 xl:w-32 flex-shrink-0">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="text-slate-700 text-xl select-none hidden xl:block">⚔</div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <GameBoard
                    board={optimisticBotBoard ?? botBoard}
                    isEnemy
                    disabled={!isMyTurn || isLoading}
                    onCellClick={handleCellClick}
                    lastShot={lastPlayerShot ?? undefined}
                    label="Gegner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-4xl mx-auto w-full">
                <FleetStatus playerShips={playerShips} botShips={botShips} />
                <EventLog entries={eventLog} />
              </div>
            </div>
          )}

          {/* FINISHED */}
          {phase === 'FINISHED' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
              <div className="text-center space-y-3">
                <div className="text-5xl sm:text-6xl">{winner === user?.email ? '🎉' : '😔'}</div>
                <h2 className="text-2xl sm:text-4xl font-bold">
                  {winner === user?.email ? (
                    <span className="text-yellow-400">Du hast gewonnen!</span>
                  ) : (
                    <span className="text-slate-400">Du hast verloren.</span>
                  )}
                </h2>
                <p className="text-slate-500 text-sm">
                  {winner === user?.email
                    ? 'Alle Schiffe des Gegners versenkt!'
                    : `${winner} hat gewonnen.`}
                </p>
              </div>
              <button
                onClick={() => {
                  setState({ ...initialState, playerBoard: createEmptyBoard(), botBoard: createEmptyBoard() });
                  setLastPlayerShot(null);
                  setLastOpponentShot(null);
                  setOptimisticBotBoard(null);
                  setJoinCode('');
                }}
                className="px-8 py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
              >
                Zurück zur Lobby
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MultiplayerGame;
