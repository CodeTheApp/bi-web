import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        alt: ['Georgia', 'serif'],
      },
      colors: {
        white: '#FFFFFF',
        black: '#000000',
        transparent: 'transparent',
        orange: '#ff9900',
        brand: {
          primary: '#D1D6D0',
          secundary: '#AEAEAE',
          dark: '#343434',
        },
        gray: {
          50: '#FAFAFA',
          500: '#595959',
        },
      },
    },
    maxWidth: {
      xl: '1120px',
      'custom-600': '38rem',
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
