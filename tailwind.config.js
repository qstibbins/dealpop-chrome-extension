/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f7fafd',
          100: '#e8fafe',
          200: '#ffd6ef',
          300: '#ffb6e6',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
} 