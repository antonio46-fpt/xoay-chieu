/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#17203a', soft: '#2a3450', muted: '#5d6679' },
        paper: '#fffdf9',
        sand: '#f3eee4',
        gold: { DEFAULT: '#b07d24', soft: '#e8d3a8' },
        indigo: { DEFAULT: '#23305f', mid: '#3d4d92' }
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Segoe UI Variable Display"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: { xl2: '1.375rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.05), 0 12px 28px -12px rgba(23,32,58,.20)',
        lift: '0 4px 10px rgba(16,24,40,.06), 0 26px 52px -20px rgba(23,32,58,.32)'
      }
    }
  },
  plugins: []
};
