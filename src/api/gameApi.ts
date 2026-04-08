import api from './axios';
import type { PlacementRequest, FireResponse, GameStateResponse } from '../types/game';

export const createGame = (difficulty: 'EASY' | 'HARD'): Promise<{ gameId: string }> =>
  api.post<{ gameId: string }>('/api/game/new', { difficulty }).then(r => r.data);

export const placeShips = (
  gameId: string,
  placements: PlacementRequest[],
): Promise<{ success: boolean; errors?: string[] }> =>
  api
    .post<{ success: boolean; errors?: string[] }>(`/api/game/${gameId}/place`, placements)
    .then(r => r.data);

export const fireShot = (gameId: string, x: number, y: number): Promise<FireResponse> =>
  api.post<FireResponse>(`/api/game/${gameId}/fire`, { x, y }).then(r => r.data);

export const getGameState = (gameId: string): Promise<GameStateResponse> =>
  api.get<GameStateResponse>(`/api/game/${gameId}/state`).then(r => r.data);
