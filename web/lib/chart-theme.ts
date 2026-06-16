import { useSettings } from "./settings-store";

/**
 * Returns chart-safe color constants that react to the current theme.
 * Call inside any client component that renders Recharts.
 */
export function useChartTheme() {
  const { theme } = useSettings();
  const dark = theme === "dark";

  return {
    GRID: dark ? "#1a2f2f" : "#dde8e7",
    TICK: {
      fontSize: 11,
      fill:       dark ? "#4a7070" : "#6b9088",
      fontFamily: "Inter, sans-serif",
    },
    TIP: {
      contentStyle: {
        background:   dark ? "#0c1414" : "#ffffff",
        border:       dark ? "0.5px solid #1a2f2f" : "0.5px solid #d4e3e1",
        borderRadius: 6,
        fontSize:     11,
        color:        dark ? "#c8e8e4" : "#0f2a2a",
        boxShadow:    dark ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
      },
      cursor: { fill: "rgba(20,184,166,0.06)" },
    },
    LEGEND: { fontSize: 11, color: dark ? "#7aa8a0" : "#6b9088" },
  };
}
