import type { Config } from 'tailwindcss';

// IESE Africa Business Club brand book v1.0, section 05 (colors) and 06 (typography).
// Brand colors: Deep Green, Orange, Ribbon Green, Off-White, Sand, White.
// The other tokens are tints of Deep Green, needed for UI states (muted text, borders).
// Rules: orange is never text on off-white below 60 px (2.5:1) — use `accent` for links.
// IESE red #C70409 and navy #022055 belong to the logo only (L8): never add them here.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#053129',          // Deep Green — text, primary buttons, dark panels
        orange: '#FD790C',       // Orange — accent fills, rules, highlight words ≥ 60 px
        green: '#145D36',        // Ribbon Green — verified, secondary panels
        offwhite: '#F8F7F2',     // Off-White — page background
        sand: '#EAE2CD',         // Sand — pattern lines, dividers, neutral fills
        surface: '#FFFFFF',      // White — cards, inputs
        accent: '#145D36',       // link / accent text on light backgrounds (7.9:1)
        'accent-hover': '#053129',
        muted: '#4E6C65',        // Deep Green 70 % on Off-White — secondary text (5.6:1)
        line: '#EAE2CD',         // card borders (Sand)
        'line-soft': '#F1ECDF',  // row dividers
        'line-strong': '#7F948E',// input and secondary-button borders (Deep Green 50 %)
        'ink-muted': '#C0CCC9',  // secondary text on Deep Green
        'ink-line': '#234A43',   // dividers on Deep Green (12 % lighter)
        'ink-border': '#3D605A', // button borders on Deep Green
        danger: '#A1261A',       // functional errors only (missing CV, remove)
      },
      fontFamily: {
        display: ['Anton', '"Bebas Neue"', '"Oswald"', 'Impact', 'sans-serif'],
        sans: ['Montserrat', 'Poppins', 'Arial', 'sans-serif'],
      },
      letterSpacing: { display: '0.005em', overline: '0.08em' },
      borderRadius: { field: '10px' },
      maxWidth: { page: '1440px' },
    },
  },
  plugins: [],
} satisfies Config;
