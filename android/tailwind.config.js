// Reuses server/src/index.css's @theme tokens (DESIGN.md), translated from
// Tailwind v4's CSS-native @theme syntax into the JS config NativeWind 4 (on
// Tailwind v3) expects — the values themselves are copied, not reinvented.
//
// Font families are NOT yet wired to the actual Archivo Black/Inter/IBM Plex
// Mono typefaces server/ self-hosts via @fontsource — that needs expo-font +
// bundled .ttf assets, which is real, separate setup. Until that lands,
// font-numeral/font-body/font-mono fall back to system fonts, which is a
// visible (not silent) gap: text renders in the wrong typeface, not broken.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#15181c" },
        steel: { 700: "#3a4046", 300: "#c7cdd3" },
        chalk: { 50: "#f1f2f0" },
        surface: { white: "#ffffff" },
        signal: { yellow: "#f2b705" },
        rubber: { red: "#c43d3d" },
        turf: { green: "#3f8f5f" },
      },
      fontFamily: {
        // TODO(fonts): swap for Archivo Black/Inter/IBM Plex Mono once loaded
        // via expo-font — see the file header.
        numeral: ["system-ui", "sans-serif"],
        body: ["system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      borderRadius: {
        "ds-sm": "6px",
        "ds-lg": "12px",
      },
      boxShadow: {
        "key-rest": "0 4px 0 #c7cdd3",
        "key-pressed": "0 1px 0 #c7cdd3",
        card: "0 12px 32px rgba(21, 24, 28, 0.18)",
      },
    },
  },
  plugins: [],
};
