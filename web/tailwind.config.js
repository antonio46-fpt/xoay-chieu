/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Xanh cổ vịt làm màu chính, xanh ngọc làm màu nhấn.
        primary: { DEFAULT: '#0F4C5C', dark: '#0B3A46', soft: '#E6F2F4' },
        accent: { DEFAULT: '#0D9488', hover: '#0F766E', soft: '#F0FDFA' },
        surface: '#FFFFFF',
        canvas: '#F4F7F9',
        ink: { DEFAULT: '#475569', strong: '#0F172A', muted: '#64748B' },
        line: '#E2E8F0',
        success: { DEFAULT: '#15803D', soft: '#DCFCE7' },
        warning: { DEFAULT: '#B45309', soft: '#FEF3C7' },
        danger: { DEFAULT: '#B91C1C', soft: '#FEE2E2' }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Be Vietnam Pro"', 'system-ui', 'sans-serif']
      },
      borderRadius: { card: '16px' },
      boxShadow: {
        card: '0 2px 10px rgba(15, 23, 42, 0.04)',
        pop: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
