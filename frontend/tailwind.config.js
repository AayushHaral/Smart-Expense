/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36a9f8',
          500: '#0c8de9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b83',
          900: '#0c3f6e',
          950: '#082849',
        },
        accent: {
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
          indigo: '#6366f1',
          violet: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
