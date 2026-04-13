import React, { useCallback, useState } from 'react';
import axios from 'axios';

type Status = 'idle' | 'checking' | 'online' | 'starting' | 'offline';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const PING_URL = `${BASE_URL}/api/v1/auth/register`;

// Ping via OPTIONS (CORS preflight) — always unauthenticated, always responds
const ping = (): Promise<number> => {
  const start = Date.now();
  return axios
    .options(PING_URL, { timeout: 40_000, withCredentials: false })
    .then(() => Date.now() - start)
    .catch((err) => {
      if (axios.isAxiosError(err) && err.response) {
        return Date.now() - start; // got any response — server is alive
      }
      throw err;
    });
};

const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [ms, setMs] = useState<number | null>(null);

  const check = useCallback(async () => {
    setStatus('checking');
    try {
      const elapsed = await ping();
      setMs(elapsed);
      setStatus(elapsed > 8_000 ? 'starting' : 'online');
    } catch {
      setStatus('offline');
    }
  }, []);

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <button
          onClick={check}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition duration-200"
        >
          Connect to Server
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs">
          The server goes to sleep after inactivity. Click to wake it up — this can take up to 60 seconds on the first request.
        </p>
      </div>
    );
  }

  const dot: Record<Exclude<Status, 'idle'>, string> = {
    checking: 'bg-yellow-400 animate-pulse',
    online:   'bg-emerald-400',
    starting: 'bg-orange-400 animate-pulse',
    offline:  'bg-red-500',
  };

  const label: Record<Exclude<Status, 'idle'>, string> = {
    checking: 'Waking up server, please wait...',
    online:   `Server online${ms ? ` (${ms}ms)` : ''}`,
    starting: 'Server is waking up, almost there...',
    offline:  'Server unreachable',
  };

  const textColor: Record<Exclude<Status, 'idle'>, string> = {
    checking: 'text-yellow-600 dark:text-yellow-400',
    online:   'text-emerald-600 dark:text-emerald-400',
    starting: 'text-orange-600 dark:text-orange-400',
    offline:  'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${textColor[status]}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot[status]}`} />
        {label[status]}
      </div>
      {status === 'offline' && (
        <button
          onClick={check}
          className="text-xs text-blue-500 hover:text-blue-400 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default BackendStatus;
