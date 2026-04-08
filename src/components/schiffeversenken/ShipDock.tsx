import React from 'react';
import type { DockShip } from '../../types/game';

const CELL_SIZE = 40;

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
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    // Offset = which cell along the ship's length was grabbed
    const rawOffset = isHorizontal
      ? Math.floor(relX / CELL_SIZE)
      : Math.floor(relY / CELL_SIZE);
    const offset = Math.max(0, Math.min(rawOffset, ship.size - 1));

    onDragStart({ id: ship.id, shipType: ship.shipType, size: ship.size, offset });
  };

  if (ships.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Flotte</h3>
        <p className="text-slate-500 text-sm italic">Alle Schiffe platziert!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 min-w-[200px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Flotte</h3>
      <div className="space-y-3">
        {ships.map(ship => (
          <div key={ship.id} className="cursor-grab active:cursor-grabbing">
            <div className="text-xs text-slate-400 mb-1">{ship.displayName}</div>
            <div
              draggable
              onDragStart={e => handleDragStart(e, ship)}
              onDragEnd={onDragEnd}
              className="flex gap-0.5 w-fit"
              style={{ flexDirection: isHorizontal ? 'row' : 'column' }}
            >
              {Array.from({ length: ship.size }, (_, i) => (
                <div
                  key={i}
                  className="bg-blue-800 border border-blue-600 hover:bg-blue-700 transition-colors"
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
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
