/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'pulse-fast': 'pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sold-in': 'soldIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'flash': 'flash 0.4s ease-in-out infinite',
      },
      keyframes: {
        soldIn: {
          '0%': { transform: 'scale(0.4) translateY(-30px)', opacity: '0' },
          '70%': { transform: 'scale(1.08) translateY(0)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        }
      }
    }
  },
  plugins: []
};
