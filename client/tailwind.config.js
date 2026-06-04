/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f5fa',
          100: '#eae9f5',
          200: '#d7d5ed',
          300: '#bab6de',
          400: '#9992cc',
          500: '#7c72bb',
          600: '#6457a6',
          700: '#52468d',
          800: '#453c75',
          900: '#3a3461',
          950: '#231f3c',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
