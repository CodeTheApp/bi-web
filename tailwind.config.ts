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
        white: '#fafafa',
        black: '#000000',
        orange: '#ff9900',
        baseColor: '#d1d6d0',
        baseColorSecond: '#aeaeae',
        baseColorDark: '#343434',
        baseColorAlt: '#aeaeae',
        titleColor: '#d1d6d0',
        textColor: '#595959',
        bodyColor: '#fafafa',
        transparent: 'transparent',
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
