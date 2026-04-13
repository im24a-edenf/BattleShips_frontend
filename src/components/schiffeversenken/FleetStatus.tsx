import React from 'react';
import type { ShipDTO, ShipType } from '../../types/game';
import { BOT_FLEET_COUNTS, FULL_FLEET } from '../../types/game';

interface FleetStatusProps {
  playerShips: ShipDTO[];
  botShips: ShipDTO[];
}

const HitDots: React.FC<{ size: number; hits: number; sunk: boolean }> = ({ size, hits, sunk }) => (
  <div className="flex gap-0.5 mt-0.5">
    {Array.from({ length: size }, (_, i) => (
      <div
        key={i}
        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm border transition-colors duration-150 ${
          sunk
            ? 'bg-red-900/80 border-red-800/50'
            : i < hits
            ? 'bg-red-500 border-red-400'
            : 'bg-cyan-800/50 border-cyan-700/40'
        }`}
      />
    ))}
  </div>
);

const ShipRow: React.FC<{ name: string; size: number; hits: number; sunk: boolean; unknown?: boolean }> = ({
  name,
  size,
  hits,
  sunk,
  unknown,
}) => (
  <div className={`py-0.5 ${sunk ? 'opacity-40' : ''}`}>
    <div className="flex items-center gap-2">
      <span className={`text-[10px] sm:text-xs ${sunk ? 'line-through text-slate-600' : 'text-slate-400'}`}>
        {unknown ? '???' : name}
      </span>
    </div>
    {!unknown && <HitDots size={size} hits={hits} sunk={sunk} />}
    {unknown && (
      <div className="flex gap-0.5 mt-0.5">
        {Array.from({ length: size }, (_, i) => (
          <div key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm border border-slate-700/50 bg-slate-800/50" />
        ))}
      </div>
    )}
  </div>
);

const FleetStatus: React.FC<FleetStatusProps> = ({ playerShips, botShips }) => {
  const botSunkByType: Partial<Record<ShipType, number>> = {};
  for (const ship of botShips) {
    if (ship.sunk) {
      botSunkByType[ship.type] = (botSunkByType[ship.type] ?? 0) + 1;
    }
  }

  const botFleetRows: { type: ShipType; sunk: boolean }[] = [];
  for (const [type, count] of Object.entries(BOT_FLEET_COUNTS) as [ShipType, number][]) {
    const sunkCount = botSunkByType[type] ?? 0;
    for (let i = 0; i < count; i++) {
      botFleetRows.push({ type, sunk: i < sunkCount });
    }
  }

  const shipSizeByType: Record<ShipType, number> = {
    SCHLACHTSCHIFF: 4,
    KREUZER: 3,
    ZERSTOERER: 2,
    UBOOT: 1,
  };

  const displayName = (type: ShipType) =>
    FULL_FLEET.find(s => s.shipType === type)?.displayName ?? type;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
        <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Deine Flotte</h3>
        <div className="space-y-0.5">
          {playerShips.map((ship, i) => (
            <ShipRow
              key={i}
              name={ship.displayName}
              size={ship.size}
              hits={ship.hits}
              sunk={ship.sunk}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
        <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Gegner</h3>
        <div className="space-y-0.5">
          {botFleetRows.map((row, i) => (
            <ShipRow
              key={i}
              name={displayName(row.type)}
              size={shipSizeByType[row.type]}
              hits={row.sunk ? shipSizeByType[row.type] : 0}
              sunk={row.sunk}
              unknown={!row.sunk}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FleetStatus;
