/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FAF7F2',
          card: '#FFFFFF',
          muted: '#F3EFEA'
        },
        rose: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337'
        },
        sage: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          700: '#15803D'
        },
        charcoal: {
          DEFAULT: '#2D3748',
          light: '#4A5568',
          dark: '#1A202C'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif']
      },
      boxShadow: {
        floral: '0 10px 30px -5px rgba(225, 29, 72, 0.08)',
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
      }
    }
  },
  plugins: []
};
