/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: {
          950: '#0a0a0a',
          900: '#141414',
          850: '#1a1a1a',
          800: '#2a2a2a',
          700: '#3a3a3a',
          600: '#5a5a5a',
        },
        gray: {
          600: '#5a5a5a',
          500: '#a0a0a0',
          400: '#6a6a6a',
        },
        orange: {
          glow: '#ff6b35',
          light: '#ff8a50',
          dim: '#cc5428',
          accent: '#ff5722',
          dark: '#ff4500',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        heading: ['Lora', 'Georgia', 'serif'],
        body: ['Aptos', 'Segoe UI', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
        '5xl': '128px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.4)',
        'glow-orange-strong': '0 0 30px rgba(255, 107, 53, 0.6)',
      },
    },
  },
  plugins: [],
}
