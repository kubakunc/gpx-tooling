import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        screen: '#fcfbf9',
        ink: {
          DEFAULT: '#1c1917',
          muted: '#5a5f66',
          faint: '#a8a29e'
        },
        line: '#efece6',
        ad: '#f4f1eb'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
