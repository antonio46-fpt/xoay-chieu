/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bảng màu theo phong cách Sneat: tím chàm làm màu chính, nền xám lạnh.
        primary: { DEFAULT: '#696cff', dark: '#5f61e6', soft: '#e7e7ff' },
        surface: '#ffffff',
        canvas: '#f5f5f9',
        ink: { DEFAULT: '#566a7f', strong: '#384551', muted: '#a1acb8' },
        line: '#e7e7f0',
        success: { DEFAULT: '#71dd37', soft: '#e8fadf' },
        warning: { DEFAULT: '#ffab00', soft: '#fff2d6' },
        danger: { DEFAULT: '#ff3e1d', soft: '#ffe0db' },
        info: { DEFAULT: '#03c3ec', soft: '#d7f8fe' }
      },
      fontFamily: {
        sans: ['"Public Sans"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: { card: '10px', pill: '9999px' },
      boxShadow: {
        card: '0 2px 6px rgba(67, 89, 113, 0.12)',
        pop: '0 6px 20px rgba(67, 89, 113, 0.18)'
      }
    }
  },
  plugins: []
};
