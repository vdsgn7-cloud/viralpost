/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-geist)', 'Inter', 'sans-serif'] },
      colors: {
        bg: '#080808', bg1: '#0d0d0d', bg2: '#111111', bg3: '#161616',
        accent: '#e4e4e7',
      },
      borderColor: { DEFAULT: 'rgba(255,255,255,0.07)' },
    },
  },
  plugins: [],
}
