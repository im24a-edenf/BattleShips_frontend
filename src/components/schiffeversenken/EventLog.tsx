import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../../types/game';

interface EventLogProps {
  entries: LogEntry[];
}

const TYPE_STYLES: Record<LogEntry['type'], string> = {
  hit: 'text-orange-400',
  miss: 'text-slate-400',
  sunk: 'text-red-400 font-semibold',
  info: 'text-cyan-400',
};

const TYPE_DOT: Record<LogEntry['type'], string> = {
  hit: 'bg-orange-400',
  miss: 'bg-slate-500',
  sunk: 'bg-red-500',
  info: 'bg-cyan-400',
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const EventLog: React.FC<EventLogProps> = ({ entries }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to top (newest entry) without scrolling the page
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries.length]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Kampfprotokoll</h3>
        {entries.length > 0 && (
          <span className="text-xs text-slate-600">{entries.length} Einträge</span>
        )}
      </div>
      <div ref={containerRef} className="h-64 overflow-y-auto p-2 space-y-0.5">
        {entries.length === 0 ? (
          <p className="text-slate-500 text-sm italic px-2 py-2">Noch keine Ereignisse.</p>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-700/30 transition-colors"
            >
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[entry.type]}`} />
              <div className="flex flex-col min-w-0">
                <span className={`text-sm leading-snug ${TYPE_STYLES[entry.type]}`}>{entry.message}</span>
                <span className="text-xs text-slate-600 font-mono">{formatTime(entry.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventLog;
