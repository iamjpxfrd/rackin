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
// Three type roles, each a real bundled typeface loaded via expo-font
// (App.js's FONTS map, registered under the exact names used below) —
// Archivo Black + Work Sans (this direction's original pair) were replaced
// outright, not layered in alongside these.
//
//  - font-display (Zen Dots): reserved for the RACKIN wordmark and the
//    numpad's digits/keys only — the app's one deliberately loud, novelty
//    accent, not a general-purpose numeral face.
//  - font-heading (Fjalla One): every other spot that used to carry the old
//    numeral/bold treatment — ALL-CAPS labels and buttons (mode tabs, CHECK
//    IN, the tab bar, TODAY'S ACTIVITY), badges (member #, avatar initials,
//    activity timestamps), and sheet/dialog titles.
//  - font-body (Inter): running text — names, dates, hints, errors, muted
//    copy. Custom fonts ignore RN's `fontWeight` style on Android (it does
//    not synthesize bold the way a system font does), so each weight in use
//    is its own registered family/key rather than one file plus font-bold:
//    font-body (400), font-body-medium (500), font-body-semibold (600),
//    font-body-bold (700). Use these instead of font-body + font-medium/
//    font-semibold/font-bold, which would leave the weight utility a no-op.
//
// Each fontFamily entry is a SINGLE name, not a CSS-style fallback stack —
// RN's fontFamily style takes exactly one name; it doesn't parse a
// comma-separated list the way a browser does. An earlier version of this
// file had ["system-ui", "sans-serif"], which NativeWind joined into the
// literal string "system-ui, sans-serif" — not a real typeface on Android,
// and the OS's fallback-resolution for an unrecognized name produced
// corrupted glyphs on real text (reported: "NUMPAD" rendering as "NAMPA").
// That failure mode doesn't apply here since these names are registered,
// real families — kept as a one-line warning for the next person editing
// this file by hand.
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
        display: ["ZenDots_400Regular"],
        heading: ["FjallaOne_400Regular"],
        body: ["Inter_400Regular"],
        "body-medium": ["Inter_500Medium"],
        "body-semibold": ["Inter_600SemiBold"],
        "body-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
