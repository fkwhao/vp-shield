/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0e17',
          darker: '#060912',
          primary: '#00f0ff',
          secondary: '#7b2dff',
          accent: '#ff0055',
          success: '#00ff88',
          warning: '#ffaa00',
          danger: '#ff0055',
          muted: '#1a1f2e',
          border: '#2a3142',
          text: '#e0e6ed',
          'text-dim': '#6b7280',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Orbitron', 'Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        'cyber-glow': '0 0 20px rgba(0, 240, 255, 0.3)',
        'cyber-glow-sm': '0 0 10px rgba(0, 240, 255, 0.2)',
        'danger-glow': '0 0 20px rgba(255, 0, 85, 0.5)',
        'success-glow': '0 0 20px rgba(0, 255, 136, 0.3)',
      },
      animation: {
        'pulse-cyber': 'pulse-cyber 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-cyber': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)' },
        },
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
        'cyber-gradient': 'linear-gradient(135deg, #0a0e17 0%, #1a1f2e 50%, #0a0e17 100%)',
      },
    },
  },
  plugins: [],
}
