import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Status = 'checking' | 'online' | 'starting' | 'offline';

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
  const [status, setStatus] = useState<Status>('checking');
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      setStatus('checking');
      try {
        const elapsed = await ping();
        if (cancelled) return;
        setMs(elapsed);
        setStatus(elapsed > 8_000 ? 'starting' : 'online');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    };

    void check();
    return () => { cancelled = true; };
  }, []);

  const dot: Record<Status, string> = {
    checking: 'bg-yellow-400 animate-pulse',
    online:   'bg-emerald-400',
    starting: 'bg-orange-400 animate-pulse',
    offline:  'bg-red-500',
  };

  const label: Record<Status, string> = {
    checking: 'Connecting to server...',
    online:   `Server online${ms ? ` (${ms}ms)` : ''}`,
    starting: 'Server is waking up, please wait...',
    offline:  'Server unreachable',
  };

  const textColor: Record<Status, string> = {
    checking: 'text-yellow-600 dark:text-yellow-400',
    online:   'text-emerald-600 dark:text-emerald-400',
    starting: 'text-orange-600 dark:text-orange-400',
    offline:  'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${textColor[status]}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot[status]}`} />
      {label[status]}
    </div>
  );
};

export default BackendStatus;
