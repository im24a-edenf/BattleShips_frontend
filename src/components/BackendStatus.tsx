import React, { useCallback, useState } from 'react';
import axios from 'axios';

type Status = 'idle' | 'checking' | 'online' | 'starting' | 'offline';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const PING_URL = `${BASE_URL}/api/v1/auth/register`;

const MAX_RETRIES = 3;

const singlePing = (): Promise<number> => {
  const start = Date.now();
  return axios
    .options(PING_URL, { timeout: 45_000, withCredentials: false })
    .then(() => Date.now() - start)
    .catch((err) => {
      if (axios.isAxiosError(err) && err.response) {
        return Date.now() - start; // any HTTP response = server is alive
      }
      throw err;
    });
};

const pingWithRetries = async (): Promise<number> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await singlePing();
    } catch {
      if (attempt === MAX_RETRIES - 1) throw new Error('unreachable');
      // wait briefly before retrying
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('unreachable');
};

const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [ms, setMs] = useState<number | null>(null);

  const check = useCallback(async () => {
    setStatus('checking');
    try {
      const elapsed = await pingWithRetries();
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
          className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Connect to Server
        </button>
        <p className="text-[10px] text-slate-600 text-center max-w-[280px] leading-relaxed">
          We use a free hosting plan, so the server goes to sleep after 15 minutes of inactivity.
          Waking it up takes about <span className="text-slate-400">~80 seconds</span>. You only need to do this once per session.
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
    checking: 'Waking up server...',
    online:   `Server online${ms ? ` (${ms}ms)` : ''}`,
    starting: 'Almost there...',
    offline:  'Server unreachable',
  };

  const textColor: Record<Exclude<Status, 'idle'>, string> = {
    checking: 'text-yellow-500',
    online:   'text-emerald-500',
    starting: 'text-orange-500',
    offline:  'text-red-500',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-medium ${textColor[status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[status]}`} />
        {label[status]}
      </div>
      {status === 'offline' && (
        <button
          onClick={check}
          className="text-[10px] text-cyan-500 hover:text-cyan-400 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default BackendStatus;
