export type CellState = 'EMPTY' | 'SHIP' | 'HIT' | 'MISS' | 'SUNK';
export type ShipType = 'SCHLACHTSCHIFF' | 'KREUZER' | 'ZERSTOERER' | 'UBOOT';
export type Difficulty = 'EASY' | 'HARD';
export type GamePhase = 'IDLE' | 'PLACEMENT' | 'BATTLE' | 'FINISHED';
export type Winner = 'PLAYER' | 'BOT';

export interface ShipDTO {
  type: ShipType;
  displayName: string;
  startX: number;
  startY: number;
  horizontal: boolean;
  size: number;
  hits: number;
  sunk: boolean;
}

export interface ShotResult {
  x: number;
  y: number;
  result: 'MISS' | 'HIT' | 'SUNK';
  shipType: ShipType | null;
}

export interface FireResponse {
  playerShot: ShotResult;
  botShot: ShotResult | null;
  winner: Winner | null;
  gamePhase: 'BATTLE' | 'FINISHED';
}

export interface GameStateResponse {
  gameId: string;
  phase: 'PLACEMENT' | 'BATTLE' | 'FINISHED' | 'WAITING_FOR_PLAYER' | 'WAITING_FOR_PLACEMENT';
  difficulty: Difficulty;
  playerBoard: CellState[][];
  playerShips: ShipDTO[];
  botBoard: CellState[][];
  botShips: ShipDTO[];
  winner: Winner | null;
}

export interface PlacementRequest {
  shipType: ShipType;
  x: number;
  y: number;
  horizontal: boolean;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'hit' | 'miss' | 'sunk' | 'info';
  timestamp: Date;
}

export interface PlacedShip {
  id: string;
  shipType: ShipType;
  x: number;
  y: number;
  horizontal: boolean;
  size: number;
}

export interface DockShip {
  id: string;
  shipType: ShipType;
  size: number;
  displayName: string;
}

export interface FireCallbackPayload {
  playerBoard: CellState[][];
  botBoard: CellState[][];
  playerShips: ShipDTO[];
  botShips: ShipDTO[];
  newEntries: LogEntry[];
  winner: Winner | null;
}

// ── Multiplayer ──────────────────────────────────────────────────────────────

export interface CreateLobbyResponse {
  gameId: string;
  roomCode: string;
}

export interface WsPlayerJoined {
  type: 'PLAYER_JOINED';
  playerTwoEmail: string;
  gameId: string;
}

export interface WsBothReady {
  type: 'BOTH_READY';
  firstTurnEmail: string;
  gameId: string;
}

export interface WsShotFired {
  type: 'SHOT_FIRED';
  firingPlayerEmail: string;
  firingRole: 'PLAYER_ONE' | 'PLAYER_TWO';
  shot: ShotResult;
  nextTurnEmail: string;
  nextTurnRole: 'PLAYER_ONE' | 'PLAYER_TWO';
  winner: string | null;
  gameOver: boolean;
}

export interface WsGameOver {
  type: 'GAME_OVER';
  winnerEmail: string;
  winnerRole: 'PLAYER_ONE' | 'PLAYER_TWO';
}

export interface WsOpponentLeft {
  type: 'OPPONENT_LEFT';
  message: string;
}

export type GameWsEvent =
  | WsPlayerJoined
  | WsBothReady
  | WsShotFired
  | WsGameOver
  | WsOpponentLeft;

export const FULL_FLEET: DockShip[] = [
  { id: 'SCHLACHTSCHIFF-0', shipType: 'SCHLACHTSCHIFF', size: 4, displayName: 'Schlachtschiff' },
  { id: 'KREUZER-0', shipType: 'KREUZER', size: 3, displayName: 'Kreuzer' },
  { id: 'KREUZER-1', shipType: 'KREUZER', size: 3, displayName: 'Kreuzer' },
  { id: 'ZERSTOERER-0', shipType: 'ZERSTOERER', size: 2, displayName: 'Zerstörer' },
  { id: 'ZERSTOERER-1', shipType: 'ZERSTOERER', size: 2, displayName: 'Zerstörer' },
  { id: 'ZERSTOERER-2', shipType: 'ZERSTOERER', size: 2, displayName: 'Zerstörer' },
  { id: 'UBOOT-0', shipType: 'UBOOT', size: 1, displayName: 'U-Boot' },
  { id: 'UBOOT-1', shipType: 'UBOOT', size: 1, displayName: 'U-Boot' },
  { id: 'UBOOT-2', shipType: 'UBOOT', size: 1, displayName: 'U-Boot' },
  { id: 'UBOOT-3', shipType: 'UBOOT', size: 1, displayName: 'U-Boot' },
];

export const BOT_FLEET_COUNTS: Record<ShipType, number> = {
  SCHLACHTSCHIFF: 1,
  KREUZER: 2,
  ZERSTOERER: 3,
  UBOOT: 4,
};
