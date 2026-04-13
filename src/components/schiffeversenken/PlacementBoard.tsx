import React, { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { PlacedShip } from '../../types/game';
import type { DragData } from './ShipDock';
import { isValidPlacement, getShipCells } from './placementUtils';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

interface PlacementBoardProps {
  placedShips: PlacedShip[];
  isHorizontal: boolean;
  dragDataRef: MutableRefObject<DragData | null>;
  onPlaceShip: (id: string, shipType: string, x: number, y: number, horizontal: boolean, size: number) => void;
  onRemoveShip: (id: string) => void;
}

interface HoverState {
  cells: { x: number; y: number }[];
  valid: boolean;
}

const PlacementBoard: React.FC<PlacementBoardProps> = ({
  placedShips,
  isHorizontal,
  dragDataRef,
  onPlaceShip,
  onRemoveShip,
}) => {
  const [hover, setHover] = useState<HoverState>({ cells: [], valid: false });

  const lastHoverKey = useRef('');
  const lastHoverCell = useRef<{ x: number; y: number } | null>(null);
  const lastHoverOrientation = useRef(isHorizontal);

  const isHorizontalRef = useRef(isHorizontal);
  isHorizontalRef.current = isHorizontal;

  const computeHover = (dropX: number, dropY: number, currentOrientation: boolean): HoverState => {
    const drag = dragDataRef.current;
    if (!drag) return { cells: [], valid: false };

    const startX = currentOrientation ? dropX - drag.offset : dropX;
    const startY = currentOrientation ? dropY : dropY - drag.offset;

    const candidate = { x: startX, y: startY, size: drag.size, horizontal: currentOrientation };
    const cells = getShipCells(candidate);
    const valid = isValidPlacement(candidate, placedShips);

    return { cells, valid };
  };

  useEffect(() => {
    if (dragDataRef.current && lastHoverCell.current) {
      lastHoverKey.current = '';
      lastHoverOrientation.current = isHorizontal;
      setHover(computeHover(lastHoverCell.current.x, lastHoverCell.current.y, isHorizontal));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHorizontal]);

  const occupiedMap = new Map<string, PlacedShip>();
  for (const ship of placedShips) {
    const cells = getShipCells(ship);
    for (const c of cells) {
      occupiedMap.set(`${c.x},${c.y}`, ship);
    }
  }

  const handleCellDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const currentOrientation = e.shiftKey ? !isHorizontalRef.current : isHorizontalRef.current;

    const key = `${x},${y}`;
    const orientationChanged = currentOrientation !== lastHoverOrientation.current;

    if (key === lastHoverKey.current && !orientationChanged) return;

    lastHoverKey.current = key;
    lastHoverCell.current = { x, y };
    lastHoverOrientation.current = currentOrientation;

    setHover(computeHover(x, y, currentOrientation));
  };

  const handleContainerDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setHover({ cells: [], valid: false });
      lastHoverKey.current = '';
      lastHoverCell.current = null;
      lastHoverOrientation.current = isHorizontalRef.current;
    }
  };

  const handleCellDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    const drag = dragDataRef.current;
    if (!drag) return;

    const currentOrientation = e.shiftKey ? !isHorizontalRef.current : isHorizontalRef.current;

    const startX = currentOrientation ? x - drag.offset : x;
    const startY = currentOrientation ? y : y - drag.offset;

    const candidate = { x: startX, y: startY, size: drag.size, horizontal: currentOrientation };
    if (isValidPlacement(candidate, placedShips)) {
      onPlaceShip(drag.id, drag.shipType, startX, startY, currentOrientation, drag.size);
    }

    setHover({ cells: [], valid: false });
    lastHoverKey.current = '';
    dragDataRef.current = null;
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHover({ cells: [], valid: false });
    lastHoverKey.current = '';
  };

  const hoverSet = new Set(hover.cells.map(c => `${c.x},${c.y}`));

  const getCellStyle = (x: number, y: number): string => {
    const base = 'placement-cell border border-slate-700/60 flex items-center justify-center transition-colors duration-150';
    const key = `${x},${y}`;

    if (hoverSet.has(key)) {
      return hover.valid
        ? `${base} bg-emerald-600/40 border-emerald-500/60`
        : `${base} bg-red-600/40 border-red-500/60`;
    }

    if (occupiedMap.has(key)) {
      return `${base} bg-cyan-800/70 border-cyan-700/50 cursor-pointer hover:bg-red-900/60`;
    }

    return `${base} bg-slate-800/60 hover:bg-slate-700/40`;
  };

  return (
    <div
      className="inline-flex flex-col gap-0 select-none"
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
      onDragOver={e => e.preventDefault()}
    >
      {/* Column headers */}
      <div className="flex gap-0" style={{ paddingLeft: 'clamp(20px, 5vw, 28px)' }}>
        {COLS.map(col => (
          <div key={col} className="game-label-col text-center text-[10px] sm:text-xs text-slate-600 font-mono">
            {col}
          </div>
        ))}
      </div>

      {Array.from({ length: 10 }, (_, y) => (
        <div key={y} className="flex gap-0 items-center">
          <div className="game-label-row text-right text-[10px] sm:text-xs text-slate-600 font-mono pr-0.5">
            {ROWS[y]}
          </div>
          {Array.from({ length: 10 }, (_, x) => {
            const occupant = occupiedMap.get(`${x},${y}`);
            return (
              <div
                key={x}
                className={getCellStyle(x, y)}
                onDragOver={e => handleCellDragOver(e, x, y)}
                onDrop={e => handleCellDrop(e, x, y)}
                onClick={() => occupant && onRemoveShip(occupant.id)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default PlacementBoard;
