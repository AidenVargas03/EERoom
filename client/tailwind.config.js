/** @type {import('tailwindcss').Config} */

// The palette lives in src/theme.js so that the canvas and SVG drawing
// code can import the same values. See the comment at the top of that
// file for why.
import { palette } from "./src/theme.js";

export default {
  // Tell Tailwind which files to scan for class names so it can
  // tree-shake unused styles out of the production build.
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ground: palette.ground,
        panel: palette.panel,
        raised: palette.raised,
        display: palette.display,
        "display-grid": palette.displayGrid,
        grid: palette.grid,
        rule: palette.rule,
        "rule-strong": palette.ruleStrong,
        ink: palette.ink,
        "ink-muted": palette.inkMuted,
        "ink-faint": palette.inkFaint,
        signal: palette.traceTrue,
        copper: palette.copper,
        "copper-bright": palette.copperBright,
        "copper-dim": palette.copperDim,
        warning: palette.warning,
        "warning-surface": palette.warningSurface,
        danger: palette.danger,
        "danger-surface": palette.dangerSurface,
        ok: palette.ok,
      },
      fontFamily: {
        // IBM Plex was drawn for IBM's technical documentation, so the
        // sans and the mono are designed to sit together. The mono is
        // here to do a job, not for looks: it keeps digits the same
        // width, so a readout does not jiggle as the value changes and
        // truth table columns line up.
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
