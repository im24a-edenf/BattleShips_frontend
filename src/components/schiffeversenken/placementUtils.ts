import type { PlacedShip, DockShip } from '../../types/game';

export interface PlacementCandidate {
  x: number;
  y: number;
  size: number;
  horizontal: boolean;
}

export const getShipCells = (ship: PlacementCandidate): { x: number; y: number }[] =>
  Array.from({ length: ship.size }, (_, i) => ({
    x: ship.horizontal ? ship.x + i : ship.x,
    y: ship.horizontal ? ship.y : ship.y + i,
  }));

export const isValidPlacement = (
  candidate: PlacementCandidate,
  existingShips: PlacedShip[],
  excludeId?: string,
): boolean => {
  const cells = getShipCells(candidate);

  for (const cell of cells) {
    if (cell.x < 0 || cell.x > 9 || cell.y < 0 || cell.y > 9) return false;
  }

  const forbidden = new Set<string>();
  for (const ship of existingShips) {
    if (ship.id === excludeId) continue;
    const shipCells = getShipCells(ship);
    for (const c of shipCells) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          forbidden.add(`${c.x + dx},${c.y + dy}`);
        }
      }
    }
  }

  for (const cell of cells) {
    if (forbidden.has(`${cell.x},${cell.y}`)) return false;
  }

  return true;
};

export const autoPlaceFleet = (dockShips: DockShip[], existingShips: PlacedShip[] = []): PlacedShip[] | null => {
  const result: PlacedShip[] = [...existingShips];

  for (const dock of dockShips) {
    let placed = false;

    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const horizontal = Math.random() > 0.5;
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);

      const candidate: PlacedShip = { id: dock.id, shipType: dock.shipType, x, y, horizontal, size: dock.size };

      if (isValidPlacement(candidate, result)) {
        result.push(candidate);
        placed = true;
      }
    }

    if (!placed) return null;
  }

  return result;
};
