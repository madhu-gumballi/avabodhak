/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        dev: ['\"Noto Serif Devanagari\"', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        primary: { DEFAULT: '#0ea5e9' },
        accent: { DEFAULT: '#fbbf24' }
      }
    }
  },
  plugins: []
};
