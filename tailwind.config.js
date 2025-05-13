/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        card: 'rgb(255, 255, 255)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      boxShadow: {
        sidebar: '8px 0 15px 2px rgba(51, 51, 51, 0.4)'
      },
      backgroundImage: {
        'pattern': 'radial-gradient(circle, #3498db 20%, transparent 30%), radial-gradient(circle, transparent 20%, #3498db 30%)',
      },
      backgroundSize: {
        'pattern': '30px 30px',
      },
      animation: {
        'bg-move': 'bgMove 8s linear infinite',
      },
      keyframes: {
        bgMove: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(20%, 20%)' },
        },
      },
    },
  },
  plugins: [],
} 