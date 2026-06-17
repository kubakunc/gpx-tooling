import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#0e0f12', raised: '#16181d', border: '#262a31' },
        accent: { DEFAULT: '#fc4c02', muted: '#c63d04' }, // Strava-like orange
        ink: { DEFAULT: '#f2f4f7', muted: '#9aa3af' }
      }
    }
  },
  plugins: []
} satisfies Config;
