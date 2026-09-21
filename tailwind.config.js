/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#f8fafc',
          'dark-light': '#ffffff',
          purple: '#059669',
          pink: '#10b981',
          cyan: '#0d9488',
          light: '#f1f5f9',
          grey: '#64748b',
        },
        obsidian: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#0f172a',
        },
        chrome: {
          light: '#0f172a',
          dark: '#475569',
        },
        gold: {
          DEFAULT: '#059669',
          light: '#10b981',
          dark: '#047857',
        },
        brand: {
          green: {
            light: '#ecfdf5',
            DEFAULT: '#059669',
            dark: '#047857',
            accent: '#10b981',
          },
          silver: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          }
        }
      },
      fontFamily: {
        serif: ['Syne', 'sans-serif'],
        tech: ['Rajdhani', 'sans-serif'],
        sans: ['Outfit', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
