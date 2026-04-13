import React, { useState } from 'react';
import type { CellState, ShipDTO, LogEntry, FireCallbackPayload } from '../../types/game';
import { fireShot, getGameState } from '../../api/gameApi';
import GameBoard from './GameBoard';
import FleetStatus from './FleetStatus';
import EventLog from './EventLog';
import type { ShotResult, ShipType } from '../../types/game';

const SHIP_DISPLAY: Record<ShipType, string> = {
  SCHLACHTSCHIFF: 'Schlachtschiff',
  KREUZER: 'Kreuzer',
  ZERSTOERER: 'Zerstörer',
  UBOOT: 'U-Boot',
};

let logIdCounter = 0;
const nextId = () => `log-${++logIdCounter}`;

const buildLogEntry = (shot: ShotResult, isBot: boolean): LogEntry => {
  const ship = shot.shipType ? SHIP_DISPLAY[shot.shipType] : null;
  const timestamp = new Date();

  if (isBot) {
    if (shot.result === 'SUNK') return { id: nextId(), message: `Bot hat dein${ship ? ` ${ship}` : ' Schiff'} versenkt!`, type: 'sunk', timestamp };
    if (shot.result === 'HIT') return { id: nextId(), message: `Bot hat dein${ship ? ` ${ship}` : ' Schiff'} getroffen!`, type: 'hit', timestamp };
    return { id: nextId(), message: 'Bot hat das Wasser getroffen.', type: 'miss', timestamp };
  } else {
    if (shot.result === 'SUNK') return { id: nextId(), message: `Du hast den ${ship ?? 'Schiff'} versenkt!`, type: 'sunk', timestamp };
    if (shot.result === 'HIT') return { id: nextId(), message: `Du hast einen ${ship ?? 'Treffer'} getroffen!`, type: 'hit', timestamp };
    return { id: nextId(), message: 'Fehlschuss!', type: 'miss', timestamp };
  }
};

interface BattlePhaseProps {
  gameId: string;
  playerBoard: CellState[][];
  botBoard: CellState[][];
  playerShips: ShipDTO[];
  botShips: ShipDTO[];
  eventLog: LogEntry[];
  isLoading: boolean;
  onFire: (payload: FireCallbackPayload) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

const BattlePhase: React.FC<BattlePhaseProps> = ({
  gameId,
  playerBoard,
  botBoard,
  playerShips,
  botShips,
  eventLog,
  isLoading,
  onFire,
  onLoadingChange,
  onError,
}) => {
  const [lastPlayerShot, setLastPlayerShot] = useState<{ x: number; y: number } | null>(null);
  const [lastBotShot, setLastBotShot] = useState<{ x: number; y: number } | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Bot denkt nach...');
  const [optimisticBotBoard, setOptimisticBotBoard] = useState<CellState[][] | null>(null);

  const handleCellClick = async (x: number, y: number) => {
    if (isLoading) return;
    onError(null);
    onLoadingChange(true);
    setLoadingMsg('Du schießt...');

    try {
      const fireResult = await fireShot(gameId, x, y);

      const newBotBoard = botBoard.map(row => [...row]);
      const cellResult: CellState = fireResult.playerShot.result === 'MISS' ? 'MISS' :
                                     fireResult.playerShot.result === 'SUNK' ? 'SUNK' : 'HIT';
      const sx = fireResult.playerShot.x;
      const sy = fireResult.playerShot.y;
      newBotBoard[sx][sy] = cellResult;
      if (cellResult === 'SUNK') {
        for (let cx = sx - 1; cx >= 0 && newBotBoard[cx][sy] === 'HIT'; cx--) newBotBoard[cx][sy] = 'SUNK';
        for (let cx = sx + 1; cx < 10 && newBotBoard[cx][sy] === 'HIT'; cx++) newBotBoard[cx][sy] = 'SUNK';
        for (let cy = sy - 1; cy >= 0 && newBotBoard[sx][cy] === 'HIT'; cy--) newBotBoard[sx][cy] = 'SUNK';
        for (let cy = sy + 1; cy < 10 && newBotBoard[sx][cy] === 'HIT'; cy++) newBotBoard[sx][cy] = 'SUNK';
      }
      setOptimisticBotBoard(newBotBoard);
      setLastPlayerShot({ x, y });

      if (fireResult.botShot) {
        setLoadingMsg('Bot schießt zurück...');
        await new Promise<void>(resolve => setTimeout(resolve, 900));
      }

      const gameState = await getGameState(gameId);

      const playerEntry = buildLogEntry(fireResult.playerShot, false);
      const newEntries: LogEntry[] = [];

      if (fireResult.botShot) {
        const botEntry = buildLogEntry(fireResult.botShot, true);
        setLastBotShot({ x: fireResult.botShot.x, y: fireResult.botShot.y });
        newEntries.push(botEntry);
      }
      newEntries.push(playerEntry);

      onFire({
        playerBoard: gameState.playerBoard,
        botBoard: gameState.botBoard,
        playerShips: gameState.playerShips,
        botShips: gameState.botShips,
        newEntries,
        winner: fireResult.winner,
      });
      setOptimisticBotBoard(null);
    } catch {
      onError('Fehler beim Schießen. Bitte versuche es erneut.');
      onLoadingChange(false);
    } finally {
      setLoadingMsg('Bot denkt nach...');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Boards — stack on mobile, side by side on desktop */}
      <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
        {/* Player board */}
        <div className="flex flex-col items-center gap-1">
          <GameBoard
            board={playerBoard}
            isEnemy={false}
            lastShot={lastBotShot ?? undefined}
            label="Dein Feld"
          />
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center xl:mt-20 py-1 xl:py-0 xl:w-32 flex-shrink-0">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] sm:text-xs text-slate-500">{loadingMsg}</span>
            </div>
          ) : (
            <div className="text-slate-700 text-xl select-none hidden xl:block">⚔</div>
          )}
        </div>

        {/* Bot board */}
        <div className="flex flex-col items-center gap-1">
          <GameBoard
            board={optimisticBotBoard ?? botBoard}
            isEnemy
            disabled={isLoading}
            onCellClick={handleCellClick}
            lastShot={lastPlayerShot ?? undefined}
            label="Gegner"
          />
        </div>
      </div>

      {/* Fleet status + event log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-4xl mx-auto w-full">
        <FleetStatus playerShips={playerShips} botShips={botShips} />
        <EventLog entries={eventLog} />
      </div>
    </div>
  );
};

export default BattlePhase;
