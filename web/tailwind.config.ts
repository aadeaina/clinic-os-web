import type { Config } from "tailwindcss";

// Colors reference CSS variables so light/dark mode works automatically.
// Variables are space-separated RGB (no #) so Tailwind's opacity modifier works:
//   bg-card/50  →  background-color: rgb(var(--col-card) / 0.5)
function col(v: string) {
  return `rgb(var(${v}) / <alpha-value>)`;
}

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Theme-sensitive ──────────────────────────────────
        surface:  col("--col-surface"),
        card:     col("--col-card"),
        elevated: col("--col-elevated"),
        line:     col("--col-line"),
        line2:    col("--col-line2"),
        body:     col("--col-body"),
        dim:      col("--col-dim"),
        dim2:     col("--col-dim2"),
        // ── Static ───────────────────────────────────────────
        teal:    "#14b8a6",
        mint:    "#2DD4BF",
        seafoam: "#0D7377",
        ink:     "#0c1414",
        danger:  "#ef4444",
        warn:    "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
