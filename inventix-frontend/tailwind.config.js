/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0D1B2A", 800: "#1A2744", 700: "#243357" },
        electric: { DEFAULT: "#00C2FF", dark: "#0099CC" },
        violet: { DEFAULT: "#7B2FBE" },
        mint: { DEFAULT: "#00E5A0" },
        amber: { DEFAULT: "#FFB800" },
        danger: { DEFAULT: "#FF4757" },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
