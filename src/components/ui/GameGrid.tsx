import React from "react";
import { GridCell } from "./GridCell";
import type { CellState } from "./GridCell";

interface GameGridProps {
  grid: CellState[][];          // 10x10 2D array
  label?: string;
  interactive?: boolean;
  showShips?: boolean;
  onCellClick?: (row: number, col: number) => void;
}

const COLS = ["1","2","3","4","5","6","7","8","9","10"];
const ROWS = ["A","B","C","D","E","F","G","H","I","J"];

export const GameGrid: React.FC<GameGridProps> = ({
                                                    grid,
                                                    label,
                                                    interactive = false,
                                                    showShips = false,
                                                    onCellClick,
                                                  }) => {
  const headerStyle: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "10px",
    color: "#4A7090",
    letterSpacing: "0.1em",
    textAlign: "center" as const,
    width: "40px",
    userSelect: "none" as const,
  };

  return (
      <div style={{ display: "inline-flex", flexDirection: "column", gap: "4px" }}>
        {label && (
            <div
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#4DF0B0",
                  marginBottom: "8px",
                  paddingLeft: "28px",
                  opacity: 0.8,
                }}
            >
              ◈ {label}
            </div>
        )}

        {/* Column headers */}
        <div style={{ display: "flex", gap: "2px", paddingLeft: "28px" }}>
          {COLS.map((c) => (
              <div key={c} style={headerStyle}>{c}</div>
          ))}
        </div>

        {/* Rows */}
        {grid.map((row, rIdx) => (
            <div key={rIdx} style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              {/* Row label */}
              <div
                  style={{
                    ...headerStyle,
                    width: "24px",
                    textAlign: "right" as const,
                    marginRight: "4px",
                  }}
              >
                {ROWS[rIdx]}
              </div>
              {row.map((cellState, cIdx) => (
                  <GridCell
                      key={cIdx}
                      row={rIdx}
                      col={cIdx}
                      state={cellState}
                      interactive={interactive}
                      showShip={showShips}
                      onClick={onCellClick}
                  />
              ))}
            </div>
        ))}
      </div>
  );
};
