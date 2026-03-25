import React from "react";

interface Ship {
  name: string;
  size: number;
  hits: number;
}

interface StatusPanelProps {
  playerName?: string;
  ships: Ship[];
  shotsTotal?: number;
  hitsTotal?: number;
  phase?: "setup" | "battle" | "gameover";
  isActivePlayer?: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  playerName = "PLAYER",
  ships,
  shotsTotal = 0,
  hitsTotal = 0,
  phase = "battle",
  isActivePlayer = false,
}) => {
  const accuracy = shotsTotal > 0 ? Math.round((hitsTotal / shotsTotal) * 100) : 0;

  const panelStyle: React.CSSProperties = {
    background: "rgba(8,18,32,0.95)",
    border: `1px solid ${isActivePlayer ? "#4DF0B0" : "#1A3050"}`,
    boxShadow: isActivePlayer
      ? "0 0 20px rgba(77,240,176,0.1), inset 0 0 30px rgba(77,240,176,0.03)"
      : "none",
    padding: "20px",
    minWidth: "220px",
    fontFamily: "'Courier New', Courier, monospace",
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1A3050", paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#4DF0B0" }}>
            {playerName}
          </span>
          {isActivePlayer && (
            <span style={{ fontSize: "9px", color: "#4DF0B0", letterSpacing: "0.1em", animation: "pulse 1.5s infinite" }}>
              ● ACTIVE
            </span>
          )}
        </div>
        <div style={{ fontSize: "9px", color: "#334466", letterSpacing: "0.15em", marginTop: "2px" }}>
          {phase === "setup" ? "DEPLOYING FLEET" : phase === "gameover" ? "ENGAGEMENT ENDED" : "IN COMBAT"}
        </div>
      </div>

      {/* Fleet Status */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "9px", color: "#4A7090", letterSpacing: "0.15em", marginBottom: "10px" }}>
          FLEET STATUS
        </div>
        {ships.map((ship) => (
          <ShipStatus key={ship.name} ship={ship} />
        ))}
      </div>

      {/* Stats */}
      <div style={{ borderTop: "1px solid #1A3050", paddingTop: "12px" }}>
        <div style={{ fontSize: "9px", color: "#4A7090", letterSpacing: "0.15em", marginBottom: "8px" }}>
          COMBAT STATS
        </div>
        <StatRow label="SHOTS FIRED" value={String(shotsTotal)} />
        <StatRow label="HITS" value={String(hitsTotal)} accent />
        <StatRow label="ACCURACY" value={`${accuracy}%`} />
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

const ShipStatus: React.FC<{ ship: Ship }> = ({ ship }) => {
  const isSunk = ship.hits >= ship.size;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
      <div
        style={{
          fontSize: "9px",
          width: "80px",
          color: isSunk ? "#553333" : "#8899AA",
          letterSpacing: "0.05em",
          textDecoration: isSunk ? "line-through" : "none",
        }}
      >
        {ship.name}
      </div>
      <div style={{ display: "flex", gap: "3px" }}>
        {Array.from({ length: ship.size }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "10px",
              height: "10px",
              border: `1px solid ${i < ship.hits ? "#F04D4D" : isSunk ? "#553333" : "#2A5070"}`,
              background: i < ship.hits ? "rgba(240,77,77,0.3)" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent = false,
}) => (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
    <span style={{ fontSize: "9px", color: "#334466", letterSpacing: "0.1em" }}>{label}</span>
    <span style={{ fontSize: "10px", color: accent ? "#4DF0B0" : "#667788", fontWeight: 700 }}>
      {value}
    </span>
  </div>
);

export default StatusPanel;
