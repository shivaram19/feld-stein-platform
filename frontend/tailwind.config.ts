import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#faf8f5",
        primary: "#1c1917",
        accent: "#c2410c",
        secondary: "#78716c",
        surface: "#f5f5f4",
        "border-subtle": "#e7e5e4",
        success: "#16a34a",
        danger: "#dc2626",
        brand: {
          green: "#2D5A3D",
          gold: "#C17F24",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
}

export default config
