/** @type {import('tailwindcss').Config} */

/**
 * Fluid scale 320px → 1920px, tuned for 100% browser zoom.
 * Max sizes sit ~15–20% below prior values so layout stays balanced without zoom compensation.
 */
const FLUID_RANGE = 1600
const fluid = (minRem, maxRem) =>
  `clamp(${minRem}rem, calc(${minRem}rem + ${maxRem - minRem} * ((100vw - 320px) / ${FLUID_RANGE})), ${maxRem}rem)`

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      maxWidth: {
        '8xl': '90rem',
        '9xl': '100rem',
      },
      spacing: {
        nav: 'var(--nav-height)',
        chrome: 'var(--app-chrome)',
        'fluid-xs': 'var(--space-xs)',
        'fluid-sm': 'var(--space-sm)',
        'fluid-md': 'var(--space-md)',
        'fluid-lg': 'var(--space-lg)',
        'fluid-xl': 'var(--space-xl)',
      },
      fontSize: {
        'fluid-2xs': [fluid(0.625, 0.75), { lineHeight: '1.35' }],
        'fluid-xs': [fluid(0.6875, 0.8125), { lineHeight: '1.4' }],
        'fluid-sm': [fluid(0.8125, 0.9375), { lineHeight: '1.45' }],
        'fluid-base': [fluid(0.875, 1), { lineHeight: '1.5' }],
        'fluid-lg': [fluid(1, 1.125), { lineHeight: '1.45' }],
        'fluid-xl': [fluid(1.0625, 1.25), { lineHeight: '1.35' }],
        'fluid-2xl': [fluid(1.125, 1.5), { lineHeight: '1.25' }],
        'fluid-3xl': [fluid(1.375, 1.875), { lineHeight: '1.2' }],
        'fluid-4xl': [fluid(1.5, 2.25), { lineHeight: '1.15' }],
        'fluid-5xl': [fluid(1.625, 2.625), { lineHeight: '1.1' }],
      },
      lineHeight: {
        'fluid-tight': '1.25',
        'fluid-snug': '1.35',
        'fluid-normal': '1.5',
        'fluid-relaxed': '1.625',
      },
      fontFamily: {
        heading: ['"Poppins"', 'sans-serif'],
        display: ['"Baloo 2"', 'cursive'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        midnight: '#081f53',
        ocean: '#0b2a6c',
        royal: '#0f4ca8',
        azure: '#1f7bff',
        gold: '#fcb72b',
        goldDark: '#f5a012',
        cream: '#f6e9d7',
        lime: '#43d66b',
        coral: '#f55b6a',
        slate: '#b5c7f5',
        cloud: '#dfe8ff',
      },
      boxShadow: {
        glow: '0 10px 30px rgba(13, 82, 200, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
        soft: '0 8px 16px rgba(0,0,0,0.15)',
        inner: 'inset 0 4px 10px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        xl2: '18px',
        pill: '999px',
      },
      backgroundImage: {
        'page-gradient': 'linear-gradient(180deg, #0a2563 0%, #0b3b8b 50%, #0d4fb6 100%)',
        'panel-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        'button-gold': 'linear-gradient(180deg, #ffd54f 0%, #f7a800 100%)',
        'button-blue': 'linear-gradient(180deg, #4fa9ff 0%, #0e7ff8 100%)',
      },
      dropShadow: {
        glow: '0 0 12px rgba(255,255,255,0.35)',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 199, 77, 0.5)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255, 199, 77, 0)' },
        },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
