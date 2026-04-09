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
  PlacementRequest,
} from '../../types/game';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

const MultiplayerGame: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<MultiState>(initialState);
  const [joinCode, setJoinCode] = useState('');
  const [lastPlayerShot, setLastPlayerShot] = useState<{ x: number; y: number } | null>(null);
  const [lastOpponentShot, setLastOpponentShot] = useState<{ x: number; y: number } | null>(null);
  const [optimisticBotBoard, setOptimisticBotBoard] = useState<CellState[][] | null>(null);

  // Keep refs for async callbacks to avoid stale closures
  const gameIdRef = useRef<string | null>(null);
  gameIdRef.current = state.gameId;
  const myEmailRef = useRef<string | undefined>(user?.email);
  myEmailRef.current = user?.email;

  // ── WS event handler ────────────────────────────────────────────────────────

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

  // Polling fallback for WAITING_FOR_PLAYER: if the WS event is missed
  // (e.g. connection established after Player 2 already joined), poll
  // the game state every 2s until the phase changes.
  useEffect(() => {
    if (state.phase !== 'WAITING_FOR_PLAYER' || !state.gameId) return;
    const gameId = state.gameId;

    const interval = setInterval(async () => {
      try {
        const gs = await getGameStateMulti(gameId);
        if (gs.phase !== 'WAITING_FOR_PLAYER') {
          setState(prev => ({
            ...prev,
            phase: 'PLACEMENT',
            error: null,
          }));
        }
      } catch {
        // ignore — keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.phase, state.gameId]);

  // ── Lobby actions ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { gameId, roomCode } = await createLobby();
      setState(prev => ({
        ...prev,
        gameId,
        roomCode,
        phase: 'WAITING_FOR_PLAYER',
        isLoading: false,
      }));
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
      setState(prev => ({
        ...prev,
        gameId,
        phase: 'PLACEMENT',
        isLoading: false,
      }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Beitreten fehlgeschlagen.';
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  // ── Placement ────────────────────────────────────────────────────────────────

  const handleShipsPlaced = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'WAITING_FOR_READY' }));
  }, []);

  const handlePlacementError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // ── Battle ───────────────────────────────────────────────────────────────────

  const handleCellClick = async (x: number, y: number) => {
    if (!state.isMyTurn || state.isLoading || !state.gameId) return;
    setState(prev => ({ ...prev, isLoading: true }));

    // Optimistic update — show my shot immediately
    const newBotBoard = state.botBoard.map(row => [...row]);
    newBotBoard[x][y] = 'HIT'; // rough optimistic; WS event will correct to MISS/SUNK
    setOptimisticBotBoard(newBotBoard);
    setLastPlayerShot({ x, y });

    try {
      await fireShotMulti(state.gameId, x, y);
      // Board state update happens via SHOT_FIRED WS event
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Fehler beim Schießen.';
      setOptimisticBotBoard(null);
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const { phase, roomCode, playerBoard, botBoard, playerShips, botShips, eventLog,
          winner, opponentEmail, isMyTurn, isLoading, error, gameId } = state;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            ← Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 tracking-widest uppercase">
              Multiplayer
            </h1>
            {gameId && phase !== 'LOBBY' && (
              <p className="text-xs text-slate-600 mt-1 font-mono">{gameId}</p>
            )}
          </div>
          <div className="w-24" />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* ── LOBBY ─────────────────────────────────────────────────────────── */}
        {phase === 'LOBBY' && (
          <div className="flex flex-col items-center gap-8 mt-16">
            <p className="text-slate-400">Erstelle einen Raum oder tritt einem bestehenden bei.</p>

            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
              {/* Create */}
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="flex-1 py-4 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed font-bold rounded-xl text-lg transition-colors"
              >
                {isLoading ? 'Erstelle...' : 'Raum erstellen'}
              </button>

              {/* Join */}
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="Raumcode eingeben"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleJoin}
                  disabled={isLoading || !joinCode.trim()}
                  className="py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed font-bold rounded-xl transition-colors"
                >
                  Beitreten
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── WAITING FOR PLAYER ────────────────────────────────────────────── */}
        {phase === 'WAITING_FOR_PLAYER' && (
          <div className="flex flex-col items-center gap-6 mt-16">
            <p className="text-slate-400">Teile diesen Code mit deinem Gegner:</p>
            <div className="px-10 py-6 bg-slate-800 border-2 border-cyan-500 rounded-2xl">
              <p className="text-5xl font-mono font-bold tracking-[0.3em] text-cyan-300 select-all">
                {roomCode}
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              Warte auf Gegner...
            </div>
          </div>
        )}

        {/* ── PLACEMENT ─────────────────────────────────────────────────────── */}
        {phase === 'PLACEMENT' && gameId && (
          <div>
            {opponentEmail && (
              <p className="text-center text-sm text-slate-400 mb-4">
                Gegner: <span className="text-cyan-300">{opponentEmail}</span>
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

        {/* ── WAITING FOR BOTH READY ────────────────────────────────────────── */}
        {phase === 'WAITING_FOR_READY' && (
          <div className="flex flex-col items-center gap-4 mt-16">
            <p className="text-slate-200 text-lg font-semibold">Schiffe gesetzt!</p>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              Warte auf Gegner...
            </div>
          </div>
        )}

        {/* ── BATTLE ────────────────────────────────────────────────────────── */}
        {phase === 'BATTLE' && (
          <div className="flex flex-col gap-6">
            {/* Turn indicator */}
            <div className="text-center">
              {isMyTurn ? (
                <span className="px-4 py-1.5 bg-cyan-800 border border-cyan-500 rounded-full text-cyan-200 text-sm font-semibold">
                  Du bist dran
                </span>
              ) : (
                <span className="px-4 py-1.5 bg-slate-800 border border-slate-600 rounded-full text-slate-400 text-sm">
                  Gegner ist dran...
                </span>
              )}
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start justify-center">
              {/* My board */}
              <div className="flex flex-col items-center gap-2">
                <GameBoard
                  board={playerBoard}
                  isEnemy={false}
                  lastShot={lastOpponentShot ?? undefined}
                  label="Dein Feld"
                />
              </div>

              {/* Loading indicator */}
              <div className="flex items-center justify-center xl:mt-20 xl:w-40 flex-shrink-0">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="text-slate-600 text-2xl select-none hidden xl:block">⚔</div>
                )}
              </div>

              {/* Opponent's board */}
              <div className="flex flex-col items-center gap-2">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
              <FleetStatus playerShips={playerShips} botShips={botShips} />
              <EventLog entries={eventLog} />
            </div>
          </div>
        )}

        {/* ── FINISHED ──────────────────────────────────────────────────────── */}
        {phase === 'FINISHED' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center space-y-4">
              <div className="text-6xl">{winner === user?.email ? '🎉' : '😔'}</div>
              <h2 className="text-4xl font-bold">
                {winner === user?.email ? (
                  <span className="text-yellow-400">Du hast gewonnen!</span>
                ) : (
                  <span className="text-slate-400">Du hast verloren.</span>
                )}
              </h2>
              <p className="text-slate-400">
                {winner === user?.email
                  ? 'Alle Schiffe des Gegners wurden versenkt!'
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
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg transition-colors duration-150 text-lg"
            >
              Zurück zur Lobby
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MultiplayerGame;
