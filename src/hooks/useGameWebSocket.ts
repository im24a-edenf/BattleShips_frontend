import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { GameWsEvent } from '../types/game';

const resolveGameWsUrl = (): string => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configuredApiBaseUrl && /^https?:\/\//i.test(configuredApiBaseUrl)) {
    const apiUrl = new URL(configuredApiBaseUrl);
    const protocol = apiUrl.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${apiUrl.host}/ws/websocket`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = import.meta.env.DEV
    ? `${window.location.hostname}:8080`
    : window.location.host;

  return `${protocol}://${host}/ws/websocket`;
};

export const useGameWebSocket = (
  gameId: string | null,
  token: string | null,
  onEvent: (event: GameWsEvent) => void,
) => {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!gameId || !token) return;

    const client = new Client({
      brokerURL: resolveGameWsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/game/${gameId}`, (message) => {
          try {
            const event = JSON.parse(message.body) as GameWsEvent;
            onEventRef.current(event);
          } catch {
            // ignore malformed messages
          }
        });
      },
      onStompError: (frame) => {
        console.error('Game WS STOMP error:', frame.headers['message']);
      },
      onWebSocketError: (error) => {
        console.error('Game WS error:', error);
      },
    });

    client.activate();
    return () => { void client.deactivate(); };
  }, [gameId, token]);
};
