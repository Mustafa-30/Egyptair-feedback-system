/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        egyptair: {
          primary: '#003366',
          secondary: '#004488',
          accent: '#0055AA',
          gold: '#C4A962',
        }
      }
    },
  },
  plugins: [],
}
