import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PlacedShip, DockShip } from '../../types/game';
import { FULL_FLEET } from '../../types/game';
import { placeShips } from '../../api/gameApi';
import type { PlacementRequest } from '../../types/game';
import { autoPlaceFleet } from './placementUtils';
import ShipDock from './ShipDock';
import type { DragData } from './ShipDock';
import PlacementBoard from './PlacementBoard';

interface PlacementPhaseProps {
  gameId: string;
  onShipsPlaced: () => void;
  onError: (error: string | null) => void;
}

const PlacementPhase: React.FC<PlacementPhaseProps> = ({ gameId, onShipsPlaced, onError }) => {
  const [dockShips, setDockShips] = useState<DockShip[]>(FULL_FLEET);
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [placementErrors, setPlacementErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dragDataRef = useRef<DragData | null>(null);

  // R key to rotate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setIsHorizontal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragStart = useCallback((data: DragData) => {
    dragDataRef.current = data;
  }, []);

  const handleDragEnd = useCallback(() => {
    dragDataRef.current = null;
  }, []);

  const handlePlaceShip = useCallback(
    (id: string, shipType: string, x: number, y: number, horizontal: boolean, size: number) => {
      setDockShips(prev => prev.filter(s => s.id !== id));
      setPlacedShips(prev => [
        ...prev,
        { id, shipType: shipType as PlacedShip['shipType'], x, y, horizontal, size },
      ]);
    },
    [],
  );

  const handleRemoveShip = useCallback((id: string) => {
    setPlacedShips(prev => {
      const ship = prev.find(s => s.id === id);
      if (!ship) return prev;
      const dockEntry = FULL_FLEET.find(f => f.id === id);
      if (dockEntry) {
        setDockShips(dock => [...dock, dockEntry]);
      }
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const handleAutoPlace = useCallback(() => {
    let result = autoPlaceFleet(dockShips, placedShips);
    // Retry once if it fails (very rare)
    if (!result) result = autoPlaceFleet(dockShips, placedShips);
    if (!result) {
      // Clear all and try fresh
      const allShips = FULL_FLEET;
      result = autoPlaceFleet(allShips, []);
      if (result) {
        setDockShips([]);
        setPlacedShips(result);
      }
      return;
    }
    setDockShips([]);
    setPlacedShips(result);
  }, [dockShips, placedShips]);

  const handleClearAll = useCallback(() => {
    setDockShips(FULL_FLEET);
    setPlacedShips([]);
    setPlacementErrors([]);
  }, []);

  const handleSubmit = async () => {
    if (dockShips.length > 0) return;
    setIsSubmitting(true);
    setPlacementErrors([]);
    onError(null);

    const placements: PlacementRequest[] = placedShips.map(s => ({
      shipType: s.shipType,
      x: s.x,
      y: s.y,
      horizontal: s.horizontal,
    }));

    try {
      const result = await placeShips(gameId, placements);
      if (result.success) {
        onShipsPlaced();
      } else {
        setPlacementErrors(result.errors ?? ['Ungültige Platzierung.']);
        setIsSubmitting(false);
      }
    } catch {
      onError('Fehler beim Senden der Platzierung.');
      setIsSubmitting(false);
    }
  };

  const allPlaced = dockShips.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Schiffe platzieren</h2>
          <p className="text-sm text-slate-400 mt-1">
            Ziehe deine Schiffe auf das Feld. Drücke <kbd className="bg-slate-700 px-1 rounded text-xs">Shift</kbd> zum Drehen.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsHorizontal(prev => !prev)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
          >
            Drehen ({isHorizontal ? 'Horizontal' : 'Vertikal'})
          </button>
          <button
            onClick={handleAutoPlace}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
          >
            Auto-Platzieren
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <ShipDock
          ships={dockShips}
          isHorizontal={isHorizontal}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />

        <div className="flex flex-col gap-4">
          <PlacementBoard
            placedShips={placedShips}
            isHorizontal={isHorizontal}
            dragDataRef={dragDataRef}
            onPlaceShip={handlePlaceShip}
            onRemoveShip={handleRemoveShip}
          />

          {placementErrors.length > 0 && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg">
              {placementErrors.map((err, i) => (
                <p key={i} className="text-red-400 text-sm">{err}</p>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!allPlaced || isSubmitting}
            className="w-full py-3 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors duration-150 text-lg shadow-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird gesendet...
              </span>
            ) : allPlaced ? (
              'Bereit!'
            ) : (
              `Noch ${dockShips.length} Schiff${dockShips.length !== 1 ? 'e' : ''} zu platzieren`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlacementPhase;
