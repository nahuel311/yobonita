import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        oliva: {
          DEFAULT: "#A3B18A",
          dark: "#708238",
          light: "#C5D1B2",
        },
        lino: "#EAE2D6",
        crema: "#F4F1EA",
        musgo: "#2F3E46",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
