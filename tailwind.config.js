/** @type {import('tailwindcss').Config} */
/*
 * Design System — Dark Navy + Teal
 * Based on: STRUC-FAST reference design (Hanken Grotesk + JetBrains Mono)
 *
 * Strategy: add explicit design-system tokens AND remap legacy
 * orange/navy/slate/material so existing components inherit the new look
 * without touching component files.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Design-system tokens (used in App.tsx sidebar/topbar) ──────────
        'surface':                   '#0b1326',
        'surface-container':         '#171f33',
        'surface-container-low':     '#131b2e',
        'surface-container-high':    '#222a3d',
        'surface-container-highest': '#2d3449',
        'surface-container-lowest':  '#060e20',
        'surface-variant':           '#2d3449',
        'surface-bright':            '#31394d',
        'on-surface':                '#dae2fd',
        'on-surface-variant':        '#bacac5',
        'primary':                   '#57f1db',
        'on-primary':                '#003731',
        'primary-container':         '#2dd4bf',
        'primary-fixed':             '#62fae3',
        'primary-fixed-dim':         '#3cddc7',
        'on-primary-container':      '#00574d',
        'secondary':                 '#d0bcff',
        'on-secondary':              '#3c0091',
        'secondary-container':       '#571bc1',
        'tertiary':                  '#ffd1aa',
        'on-tertiary':               '#4b2800',
        'outline':                   '#859490',
        'outline-variant':           '#3c4a46',
        'error':                     '#ffb4ab',
        'error-container':           '#93000a',
        'background':                '#0b1326',
        'on-background':             '#dae2fd',

        // ── Legacy remap (existing components pick up new dark theme) ───────

        // material-* → dark equivalents
        material: {
          dark:   '#dae2fd',   // was #212121
          accent: '#57f1db',   // was #ff9800
          bg:     '#0b1326',   // was #fafafa
          card:   '#171f33',   // was #f5f5f5
          border: '#3c4a46',   // was #e0e0e0
        },

        // orange → teal/cyan (accent colour)
        orange: {
          200: '#a0f0e8',
          300: '#7de8db',
          400: '#3cddc7',
          500: '#57f1db',   // primary teal
          600: '#2dd4bf',
          700: '#1aad99',
          800: '#0d7a6b',
          900: '#005047',
          950: '#003731',
        },

        // navy → dark surfaces
        navy: {
          800: '#222a3d',
          900: '#171f33',
          950: '#0b1326',
        },

        // slate → dark-theme neutrals (inverted from light)
        slate: {
          50:  '#ffffff',
          100: '#dae2fd',   // primary text
          200: '#c0cfe8',
          300: '#bacac5',   // on-surface-variant
          400: '#859490',   // outline
          500: '#6d7a77',
          600: '#4a5568',
          700: '#3c4a46',   // borders
          800: '#2d3449',
          900: '#171f33',
          950: '#0b1326',
        },

        // ferrari tokens
        ferrari: {
          orange:        '#57f1db',
          'orange-dim':  '#3cddc7',
          'orange-glow': '#57f1db40',
        },

        // verdict semantic tokens
        verdict: {
          valid:    { DEFAULT: '#4ade80', bg: '#052e16' },
          marginal: { DEFAULT: '#fbbf24', bg: '#1c1000' },
          invalid:  { DEFAULT: '#f87171', bg: '#1f0606' },
        },

        // semantic colours — dark-theme versions
        emerald: {
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#4ade80',
          600: '#22c55e',
          700: '#16a34a',
          800: '#166534',
          900: '#052e16',
          950: '#021709',
        },
        amber: {
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#1c1000',
          950: '#0f0800',
        },
        red: {
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#7f1d1d',
          900: '#1f0606',
          950: '#0f0303',
        },
        blue: {
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },

      fontFamily: {
        mono:  ['JetBrains Mono', 'monospace'],
        sans:  ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        hero:  ['Hanken Grotesk', 'sans-serif'],
        title: ['Hanken Grotesk', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
