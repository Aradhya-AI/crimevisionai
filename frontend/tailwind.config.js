/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#06090e',
          900: '#0b111a',
          850: '#101826',
          800: '#152033',
          700: '#1e2d47',
          600: '#2b3f61',
        },
        forensic: {
          cyan: '#00e5ff',
          blue: '#2979ff',
          teal: '#00b4d8',
          amber: '#ffb703',
          crimson: '#ff3366',
          emerald: '#00f59b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 229, 255, 0.25)',
        'glow-crimson': '0 0 20px -3px rgba(255, 51, 102, 0.25)',
        'glow-amber': '0 0 20px -3px rgba(255, 183, 3, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
