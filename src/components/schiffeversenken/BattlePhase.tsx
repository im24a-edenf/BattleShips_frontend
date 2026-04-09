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

      // Immediately show player's shot on the bot board
      const newBotBoard = botBoard.map(row => [...row]);
      const cellResult: CellState = fireResult.playerShot.result === 'MISS' ? 'MISS' :
                                     fireResult.playerShot.result === 'SUNK' ? 'SUNK' : 'HIT';
      const sx = fireResult.playerShot.x;
      const sy = fireResult.playerShot.y;
      newBotBoard[sx][sy] = cellResult;
      if (cellResult === 'SUNK') {
        // Mark all contiguous HIT cells of the sunk ship as SUNK
        for (let cx = sx - 1; cx >= 0 && newBotBoard[cx][sy] === 'HIT'; cx--) newBotBoard[cx][sy] = 'SUNK';
        for (let cx = sx + 1; cx < 10 && newBotBoard[cx][sy] === 'HIT'; cx++) newBotBoard[cx][sy] = 'SUNK';
        for (let cy = sy - 1; cy >= 0 && newBotBoard[sx][cy] === 'HIT'; cy--) newBotBoard[sx][cy] = 'SUNK';
        for (let cy = sy + 1; cy < 10 && newBotBoard[sx][cy] === 'HIT'; cy++) newBotBoard[sx][cy] = 'SUNK';
      }
      setOptimisticBotBoard(newBotBoard);
      setLastPlayerShot({ x, y });

      // Bot fires back after a delay
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
        // bot entry goes first (it's chronologically later → shown at top of log)
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row gap-8 items-start justify-center">
        {/* Player board */}
        <div className="flex flex-col items-center gap-2">
          <GameBoard
            board={playerBoard}
            isEnemy={false}
            lastShot={lastBotShot ?? undefined}
            label="Dein Feld"
          />
        </div>

        {/* Loading indicator between boards — fixed width so text changes don't shift the boards */}
        <div className="flex items-center justify-center xl:mt-20 xl:w-40 flex-shrink-0">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">{loadingMsg}</span>
            </div>
          ) : (
            <div className="text-slate-600 text-2xl select-none hidden xl:block">⚔</div>
          )}
        </div>

        {/* Bot board */}
        <div className="flex flex-col items-center gap-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        <FleetStatus playerShips={playerShips} botShips={botShips} />
        <EventLog entries={eventLog} />
      </div>
    </div>
  );
};

export default BattlePhase;
