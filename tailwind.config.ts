import type { Config } from "tailwindcss";

/**
 * Tokens lifted straight out of the landing page's globals.css so /start and /
 * read as one product. Change a value here, not in a component.
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#fbfaf8", // page background
          card: "#ffffff",
          warm: "#f3f0eb", // the "how it works" band
          soft: "#f7f5f2",
          tint: "#f4f1ed", // industry cards
        },
        ink: {
          DEFAULT: "#20202b",
          soft: "#403d4b",
          dim: "#706d79",
          faint: "#827d89",
          ghost: "#a4a0ac",
        },
        line: {
          DEFAULT: "#ebe7e1",
          soft: "#f0eeeb",
          strong: "#ddd8d0",
        },
        brand: {
          DEFAULT: "#6d4ed8",
          hover: "#7558dc",
          ink: "#5b43b8",
          soft: "#f1edff",
          mist: "#ece6ff",
          label: "#7563b7",
        },
        night: {
          DEFAULT: "#29273a",
          soft: "#39364a",
          deep: "#1b1a26",
        },
        leaf: {
          DEFAULT: "#43a875",
          soft: "#edfff5",
          line: "#bfe9d3",
          bright: "#6cda9b",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'DM Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
