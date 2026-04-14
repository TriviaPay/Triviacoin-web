/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
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
