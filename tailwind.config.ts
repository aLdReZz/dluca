import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#161617',
        'bg-secondary': '#1d1d1f',
        'bg-tertiary': '#2c2c2e',
        'text-primary': '#f5f5f7',
        'text-secondary': '#a1a1a6',
        'accent-blue': '#007aff',
        'accent-green': '#30d158',
        'accent-orange': '#ff9f40',
        'accent-red': '#ff453a',
        'accent-yellow': '#ffd60a',
        'accent-purple': '#bf5af2',
        'border-color': '#424245',
        'hover-bg': '#3a3a3c'
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.2s ease-out forwards',
        shake: 'shake 0.4s ease-in-out',
        'pop-in': 'popIn 0.3s ease-out forwards'
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%, 75%': { transform: 'translateX(-5px)' },
          '50%': { transform: 'translateX(5px)' }
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
};

export default config;
