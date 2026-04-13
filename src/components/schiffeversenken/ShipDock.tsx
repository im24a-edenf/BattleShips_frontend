import React from 'react';
import type { DockShip } from '../../types/game';

interface DragData {
  id: string;
  shipType: string;
  size: number;
  offset: number;
}

interface ShipDockProps {
  ships: DockShip[];
  isHorizontal: boolean;
  onDragStart: (data: DragData) => void;
  onDragEnd: () => void;
}

const ShipDock: React.FC<ShipDockProps> = ({ ships, isHorizontal, onDragStart, onDragEnd }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ship: DockShip) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ship.id);

    const rect = e.currentTarget.getBoundingClientRect();
    const cellSize = rect.width / (isHorizontal ? ship.size : 1);
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const rawOffset = isHorizontal
      ? Math.floor(relX / cellSize)
      : Math.floor(relY / cellSize);
    const offset = Math.max(0, Math.min(rawOffset, ship.size - 1));

    onDragStart({ id: ship.id, shipType: ship.shipType, size: ship.size, offset });
  };

  if (ships.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Flotte</h3>
        <p className="text-slate-600 text-xs">Alle Schiffe platziert!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 sm:p-4">
      <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Flotte</h3>
      <div className="flex flex-row flex-wrap sm:flex-col gap-3">
        {ships.map(ship => (
          <div key={ship.id} className="cursor-grab active:cursor-grabbing">
            <div className="text-[10px] sm:text-xs text-slate-500 mb-1">{ship.displayName}</div>
            <div
              draggable
              onDragStart={e => handleDragStart(e, ship)}
              onDragEnd={onDragEnd}
              className="flex gap-px w-fit"
              style={{ flexDirection: isHorizontal ? 'row' : 'column' }}
            >
              {Array.from({ length: ship.size }, (_, i) => (
                <div
                  key={i}
                  className="dock-cell bg-cyan-800/70 border border-cyan-700/50 hover:bg-cyan-700/70 rounded-sm transition-colors"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShipDock;
export type { DragData };
