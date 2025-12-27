import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}'
  ],
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape and small tablets
      'md': '768px',   // Tablets
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // Extra large desktop
    },
    fontSize: {
      'xs': ['0.65rem', { lineHeight: '1rem' }],       // 10.4px
      'sm': ['0.75rem', { lineHeight: '1.25rem' }],    // 12px
      'base': ['0.8125rem', { lineHeight: '1.5rem' }], // 13px
      'lg': ['0.9375rem', { lineHeight: '1.75rem' }],  // 15px
      'xl': ['1.0625rem', { lineHeight: '1.75rem' }],  // 17px
      '2xl': ['1.3125rem', { lineHeight: '2rem' }],    // 21px
      '3xl': ['1.625rem', { lineHeight: '2.25rem' }],  // 26px
      '4xl': ['1.9375rem', { lineHeight: '2.5rem' }],  // 31px
      '5xl': ['2.1875rem', { lineHeight: '1' }],       // 35px
      '6xl': ['2.5rem', { lineHeight: '1' }],          // 40px
      '7xl': ['3.125rem', { lineHeight: '1' }],        // 50px
      '8xl': ['4.375rem', { lineHeight: '1' }],        // 70px
      '9xl': ['5.625rem', { lineHeight: '1' }],        // 90px
    },
    extend: {
      scale: {
        '102': '1.02',
      },
      colors: {
        // Refined dark theme with better contrast
        'bg-primary': '#0d0d0e',      // Darker base for better contrast
        'bg-secondary': '#1a1a1c',     // Cards and surfaces
        'bg-tertiary': '#26262a',      // Elevated elements
        'bg-quaternary': '#323236',    // Hover states
        'text-primary': '#fafafa',     // High contrast text
        'text-secondary': '#a8a8ad',   // Medium contrast
        'text-tertiary': '#71717a',    // Low contrast labels
        'accent-blue': '#0a84ff',      // Brighter for dark bg
        'accent-cyan': '#64d2ff',      // Softer cyan
        'accent-green': '#32d74b',     // Brighter green
        'accent-orange': '#ff9f0a',    // Warmer orange
        'accent-red': '#ff453a',       // Keep vibrant
        'accent-yellow': '#ffd60a',    // Keep vibrant
        'accent-purple': '#bf5af2',    // Keep vibrant
        'border-color': '#38383d',     // Subtle borders
        'border-emphasis': '#48484d',  // Emphasized borders
        'hover-bg': '#2c2c30',         // Interactive hover
        'active-bg': '#3a3a3e',        // Active/pressed state
      },
      spacing: {
        '18': '4.5rem',    // 72px
        '88': '22rem',     // 352px
        '128': '32rem',    // 512px
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(10, 132, 255, 0.3)',
        'glow-green': '0 0 20px rgba(50, 215, 75, 0.3)',
        'glow-red': '0 0 20px rgba(255, 69, 58, 0.3)',
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
