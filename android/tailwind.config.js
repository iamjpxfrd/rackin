// Kinetic Court palette — see [[Decisions/UI Port Uses NativeWind]] in the
// Rackin Obsidian vault for the direction, and android/src/theme/colors.js
// for the same hex values kept as plain JS (icons need a `color` prop, not
// a className). This is a full light->dark reskin, not an additive change,
// so the old DESIGN.md token names (ink-900, chalk-50, signal-yellow, ...)
// are gone rather than repointed — keeping them would mean a name like
// "ink-900" (originally: near-black text on a white page) now meaning
// "off-white text on a near-black page", which reads backwards everywhere
// it's used.
//
// Font families are NOT yet wired to real typefaces (Archivo Black + Work
// Sans in this direction) — needs expo-font + bundled .ttf assets, same gap
// as the previous design's fonts. font-numeral/font-body fall back to
// system fonts, a visible (not silent) gap.
//
// Kinetic Court uses sharp corners everywhere except circular avatar badges
// and the diagonal-cut buttons/active-tabs (ui/DiagonalCut.jsx — CSS
// clip-path has no RN equivalent, so that shape is drawn with
// react-native-svg instead of a border-radius utility). The old ds-sm/ds-lg
// radius tokens are dropped along with everything else that assumed rounded
// corners.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        page: "#0a0a0a",
        card: "#141414",
        border: "#262626",
        hairline: "#1e1e1e",
        muted: "#8a8a8a",
        dim: "#666666",
        accent: "#d4ff3f",
        danger: "#ff5c5c",
      },
      fontFamily: {
        // TODO(fonts): swap for Archivo Black + Work Sans once loaded via
        // expo-font — see the file header.
        numeral: ["system-ui", "sans-serif"],
        body: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
