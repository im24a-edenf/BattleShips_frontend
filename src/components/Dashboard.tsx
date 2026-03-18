import React, { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { createLoginPath } from '../authNavigation';

interface ChatSender {
  id: string;
  email: string;
}

interface ChatMessageOutput {
  from: ChatSender;
  message: string;
  datetime: string;
}

interface ChatErrorPayload {
  code: string;
  message: string;
  timestamp: string;
}

type ChatConnectionState = 'connecting' | 'connected' | 'disconnected';

const CHAT_SUBSCRIPTIONS = {
  messages: '/topic/messages',
  errors: '/user/queue/errors',
} as const;

const CHAT_DESTINATIONS = {
  send: '/app/chat',
} as const;

const parseChatErrorPayload = (body: string): ChatErrorPayload | null => {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as Partial<ChatErrorPayload>;
    if (typeof parsed.message !== 'string' || typeof parsed.code !== 'string') {
      return null;
    }

    return {
      code: parsed.code,
      message: parsed.message,
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : '',
    };
  } catch {
    return null;
  }
};

const isAuthFailureMessage = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('jwt')
    || normalized.includes('authorization')
    || normalized.includes('unauthenticated')
    || normalized.includes('expired');
};

const getWebSocketUrl = () => {
  const configuredUrl = import.meta.env.VITE_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl && /^https?:\/\//i.test(configuredApiBaseUrl)) {
    const apiUrl = new URL(configuredApiBaseUrl);
    const protocol = apiUrl.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${apiUrl.host}/chat`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = import.meta.env.DEV
    ? `${window.location.hostname}:8080`
    : window.location.host;

  return `${protocol}://${host}/chat`;
};

/**
 * Dashboard Component
 * 
 * This is the main page that users see once they are logged in.
 * It demonstrates how to fetch protected data and how roles work.
 */
const Dashboard: React.FC = () => {
  // Authentication data and navigation functions.
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const clientRef = useRef<Client | null>(null);
  
  // State for holding responses and errors from the API.
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageOutput[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatConnectionState>('disconnected');

  useEffect(() => {
    if (!user?.id || !user.email) {
      return;
    }

    if (!token) {
      return;
    }

    let isDisposed = false;

    const handleSessionExpiry = async (reason: string) => {
      if (isDisposed) {
        return;
      }

      setChatState('disconnected');
      setChatError(reason);

      if (clientRef.current) {
        const activeClient = clientRef.current;
        clientRef.current = null;
        await activeClient.deactivate();
      }

      logout();
      navigate(createLoginPath(reason), { replace: true });
    };

    const client = new Client({
      brokerURL: getWebSocketUrl(),
      reconnectDelay: 5000,
      maxReconnectDelay: 30000,
      connectionTimeout: 4000,
      beforeConnect: async () => {
        setChatState('connecting');
        setChatError(null);

        const currentToken = localStorage.getItem('authToken');
        if (!currentToken) {
          throw new Error('Missing JWT token. Log in again to connect chat.');
        }

        client.connectHeaders = {
          Authorization: `Bearer ${currentToken}`,
        };
      },
      debug: () => undefined,
      onConnect: () => {
        if (isDisposed) {
          return;
        }

        setChatState('connected');
        setChatError(null);
        client.subscribe(CHAT_SUBSCRIPTIONS.messages, (frame) => {
          const payload = JSON.parse(frame.body) as ChatMessageOutput;
          setChatMessages((currentMessages) => [...currentMessages, payload]);
        });
        client.subscribe(CHAT_SUBSCRIPTIONS.errors, (frame) => {
          const payload = parseChatErrorPayload(frame.body);
          const message = payload?.message ?? 'Unable to process chat message.';
          setChatError(message);

          if (payload?.code === 'CHAT_UNAUTHORIZED') {
            void handleSessionExpiry(message);
          }
        });
      },
      onStompError: (frame) => {
        if (isDisposed) {
          return;
        }

        setChatState('disconnected');
        const payload = parseChatErrorPayload(frame.body);
        const message = payload?.message || frame.headers.message || 'Chat broker rejected the connection.';
        setChatError(message);

        if (isAuthFailureMessage(message)) {
          void handleSessionExpiry('Your chat session expired. Please log in again.');
        }
      },
      onWebSocketError: () => {
        if (isDisposed) {
          return;
        }

        setChatState('disconnected');
        setChatError('Unable to connect to the chat server.');
      },
      onWebSocketClose: () => {
        if (isDisposed) {
          return;
        }

        setChatState('disconnected');
        setChatError('Chat disconnected. Reconnecting if your session is still valid.');
      },
      onDisconnect: () => {
        if (isDisposed) {
          return;
        }

        setChatState('disconnected');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      isDisposed = true;
      if (clientRef.current === client) {
        clientRef.current = null;
      }
      void client.deactivate();
    };
  }, [navigate, logout, token, user?.email, user?.id]);

  /**
   * handleLogout
   * 
   * This function notifies the backend that the session is over 
   * and clears the user state in the frontend.
   */
  const handleLogout = async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.deactivate();
        clientRef.current = null;
      }

      // Step 1: Tell the backend to invalidate the session.
      await api.post('/api/v1/auth/logout');
      
      // Step 2: Clear user data from context and localStorage.
      logout();
      
      // Step 3: Redirect back to login page.
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
      // Even if the API call fails, we still want to log the user out on the frontend.
      logout();
      navigate('/login');
    }
  };

  /**
   * testUserResource
   * 
   * Sends a request to a 'User' specific API endpoint. 
   * Only users with the USER role (or higher) should be able to see this.
   */
  const testUserResource = async () => {
    setApiMessage(null);
    setApiError(null);
    try {
      const response = await api.post('/api/v1/user/resource');
      setApiMessage(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message || 'Access Denied (User Resource)');
      } else {
        setApiError('An unexpected error occurred');
      }
    }
  };

  /**
   * testAdminResource
   * 
   * Sends a request to an 'Admin' specific API endpoint. 
   * ONLY users with the ADMIN role will get a success response.
   */
  const testAdminResource = async () => {
    setApiMessage(null);
    setApiError(null);
    try {
      const response = await api.get('/api/v1/admin/resource');
      setApiMessage(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message || 'Access Denied (Admin Resource)');
      } else {
        setApiError('An unexpected error occurred');
      }
    }
  };

  const sendChatMessage = () => {
    const trimmedMessage = chatInput.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!clientRef.current?.connected) {
      setChatError('Chat is not connected yet.');
      return;
    }

    clientRef.current.publish({
      destination: CHAT_DESTINATIONS.send,
      body: JSON.stringify({
        message: trimmedMessage,
      }),
    });

    setChatInput('');
    setChatError(null);
  };

  const handleChatSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendChatMessage();
  };

  const resolvedChatError = !user?.id || !user.email
    ? null
    : !token
      ? 'Missing JWT token. Log in again to connect chat.'
      : chatError;

  const resolvedChatState: ChatConnectionState = !user?.id || !user.email || !token
    ? 'disconnected'
    : chatState;

  const connectionBadgeClassName =
    resolvedChatState === 'connected'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : resolvedChatState === 'connecting'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

  return (
    <div className="flex items-start justify-center min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-5xl p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Welcome back, <span className="font-semibold text-gray-900 dark:text-white">{user?.email}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg shadow-sm transition duration-200"
          >
            Logout
          </button>
        </div>

        {/* This section displays the user's current roles/authorities. */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Authorities</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {user?.roles.map((role) => (
              <span key={role} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 w-full">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Live Chat</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Subscribed to <span className="font-semibold text-gray-700 dark:text-gray-300">{CHAT_SUBSCRIPTIONS.messages}</span>
                </p>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${connectionBadgeClassName}`}>
                {resolvedChatState}
              </span>
            </div>

            <div className="mt-4 h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No messages yet. Send one to verify the subscription is live.</p>
              ) : (
                chatMessages.map((entry, index) => (
                  <div
                    key={`${entry.from.id}-${entry.datetime}-${index}`}
                    className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-gray-400">
                      <span>{entry.from.email}</span>
                      <span>{entry.datetime}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{entry.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Write a message"
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={resolvedChatState !== 'connected' || !chatInput.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900/50"
              >
                Send
              </button>
            </form>

            {resolvedChatError && (
              <p className="mt-3 text-sm font-medium text-red-500">{resolvedChatError}</p>
            )}
          </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">API Resource Testing</h3>
          <p className="text-sm text-gray-500">Use these buttons to test if your user can access different backend resources.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={testUserResource}
              className="p-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition duration-200 text-center"
            >
              Test User Resource
              <span className="block text-xs font-normal text-gray-500 mt-1">Requires USER role</span>
            </button>
            <button
              onClick={testAdminResource}
              className="p-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition duration-200 text-center"
            >
              Test Admin Resource
              <span className="block text-xs font-normal text-gray-500 mt-1">Requires ADMIN role</span>
            </button>
          </div>
        </div>

        {/* Displaying responses from the API tests. */}
        <div className="min-h-[100px] p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Response from Server</h4>
          {apiMessage && (
            <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">
                <span className="mr-2">✅</span> {apiMessage}
              </p>
            </div>
          )}
          {apiError && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 font-medium">
                <span className="mr-2">❌</span> {apiError}
              </p>
            </div>
          )}
          {!apiMessage && !apiError && (
            <p className="text-gray-400 text-sm italic">Click a resource button above to see authorization in action.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
