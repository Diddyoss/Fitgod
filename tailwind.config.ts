import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg)",
        surface: "var(--surface)",
        "surface-hi": "var(--surface-hi)",
        hairline: "var(--hairline)",
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          muted: "var(--accent-muted)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
        },
      },
      fontFamily: {
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        display: "-0.03em",
      },
    },
  },
  plugins: [],
};
export default config;
