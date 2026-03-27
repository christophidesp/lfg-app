/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        black: '#0A0A0A',
        white: '#FAFAFA',
        accent: { DEFAULT: '#E8C547', dark: '#B8991E' },
        gray: {
          100: '#F0F0EE',
          200: '#E0DFDB',
          400: '#A8A7A2',
          600: '#6B6A66',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '9999px',
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
      },
    },
  },
  plugins: [],
}
