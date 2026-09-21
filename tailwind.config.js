/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arctic: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#b6cadc',
          300: '#8ea1b3',
          400: '#647687',
          500: '#4e6578',
          600: '#3a4e60',
          700: '#2a3b4c',
          800: '#1b2633',
          900: '#10161d'
        },
        glacier: {
          light: '#e2e8f0',
          DEFAULT: '#cbd5e1',
          dark: '#94a3b8'
        },
        neon: {
          cyan: '#00f2ff'
        },
        gold: {
          light: '#F3E5AB',
          DEFAULT: '#D4AF37',
          dark: '#AA801E'
        },
        chrome: {
          light: '#E5E4E2',
          DEFAULT: '#C0C0C0',
          dark: '#8E8D8A'
        },
        obsidian: {
          950: '#0a0a0a',
          900: '#121212',
          800: '#1e1e1e',
          700: '#2c2c2c'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      animation: {
        'marquee': 'marquee 35s linear infinite',
        'fade-in': 'fadeIn 1s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: [],
};
