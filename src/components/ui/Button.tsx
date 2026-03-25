import React, { useState } from "react";

type ButtonVariant = "primary" | "danger" | "ghost" | "confirm";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const baseStyle: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  border: "2px solid",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.15s ease",
  outline: "none",
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 14px", fontSize: "11px" },
  md: { padding: "10px 22px", fontSize: "12px" },
  lg: { padding: "14px 30px", fontSize: "14px" },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "transparent",
    color: "#4DF0B0",
    borderColor: "#4DF0B0",
    boxShadow: "0 0 12px rgba(77,240,176,0.2), inset 0 0 12px rgba(77,240,176,0.05)",
  },
  danger: {
    background: "transparent",
    color: "#F04D4D",
    borderColor: "#F04D4D",
    boxShadow: "0 0 12px rgba(240,77,77,0.2), inset 0 0 12px rgba(240,77,77,0.05)",
  },
  ghost: {
    background: "transparent",
    color: "#8899AA",
    borderColor: "#334455",
  },
  confirm: {
    background: "#4DF0B0",
    color: "#0A1628",
    borderColor: "#4DF0B0",
    boxShadow: "0 0 20px rgba(77,240,176,0.4)",
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;

  const combinedStyle: React.CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    opacity: isDisabled ? 0.4 : 1,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transform: pressed && !isDisabled ? "scale(0.97)" : "scale(1)",
    ...style,
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={combinedStyle}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      {loading ? <Spinner color={variantStyles[variant].color as string} /> : icon}
      {children}
    </button>
  );
};

const Spinner: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    style={{
      animation: "spin 0.7s linear infinite",
    }}
  >
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="2" strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round" />
  </svg>
);

export default Button;
