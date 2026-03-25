import React, { useState } from "react";

export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

interface GridCellProps {
  state?: CellState;
  row: number;
  col: number;
  interactive?: boolean;
  onClick?: (row: number, col: number) => void;
  showShip?: boolean; // for player board
}

const cellColors: Record<CellState, { bg: string; border: string; glow?: string }> = {
  empty:  { bg: "rgba(10,22,40,0.8)",   border: "#1A3050" },
  ship:   { bg: "rgba(30,60,100,0.9)",  border: "#2A6080", glow: "rgba(42,96,128,0.4)" },
  hit:    { bg: "rgba(240,77,77,0.2)",  border: "#F04D4D", glow: "rgba(240,77,77,0.5)" },
  miss:   { bg: "rgba(20,40,60,0.6)",   border: "#223344" },
  sunk:   { bg: "rgba(120,20,20,0.4)",  border: "#802020", glow: "rgba(128,32,32,0.3)" },
};

export const GridCell: React.FC<GridCellProps> = ({
  state = "empty",
  row,
  col,
  interactive = false,
  onClick,
  showShip = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const colors = cellColors[showShip && state === "ship" ? "ship" : state];

  const isTargetable = interactive && (state === "empty" || (state === "ship" && !showShip));

  const style: React.CSSProperties = {
    width: "40px",
    height: "40px",
    backgroundColor: colors.bg,
    border: `1px solid ${hovered && isTargetable ? "#4DF0B0" : colors.border}`,
    boxShadow: colors.glow
      ? `inset 0 0 10px ${colors.glow}, 0 0 6px ${colors.glow}`
      : hovered && isTargetable
      ? "inset 0 0 10px rgba(77,240,176,0.15), 0 0 6px rgba(77,240,176,0.2)"
      : "none",
    cursor: isTargetable ? "crosshair" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.12s ease",
    position: "relative",
  };

  const handleClick = () => {
    if (isTargetable && onClick) onClick(row, col);
  };

  return (
    <div
      style={style}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Cell ${String.fromCharCode(65 + row)}${col + 1}`}
    >
      {state === "hit" && <HitMarker />}
      {state === "miss" && <MissMarker />}
      {state === "sunk" && <SunkMarker />}
      {showShip && state === "ship" && <ShipMarker />}
    </div>
  );
};

const HitMarker = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <line x1="4" y1="4" x2="16" y2="16" stroke="#F04D4D" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="4" x2="4" y2="16" stroke="#F04D4D" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="10" cy="10" r="7" stroke="#F04D4D" strokeWidth="1" fill="none" opacity="0.4" />
  </svg>
);

const MissMarker = () => (
  <svg width="12" height="12" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="3" stroke="#334466" strokeWidth="1.5" fill="rgba(51,68,102,0.4)" />
  </svg>
);

const SunkMarker = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <line x1="4" y1="4" x2="16" y2="16" stroke="#802020" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="4" x2="4" y2="16" stroke="#802020" strokeWidth="2" strokeLinecap="round" />
    <circle cx="10" cy="10" r="8" stroke="#F04D4D" strokeWidth="1" fill="none" opacity="0.3" />
    <circle cx="10" cy="10" r="4" stroke="#F04D4D" strokeWidth="1" fill="none" opacity="0.2" />
  </svg>
);

const ShipMarker = () => (
  <div
    style={{
      width: "28px",
      height: "28px",
      background: "linear-gradient(135deg, #2A6080 0%, #1A3A5A 100%)",
      border: "1px solid #4A90B0",
      borderRadius: "2px",
    }}
  />
);

export default GridCell;
