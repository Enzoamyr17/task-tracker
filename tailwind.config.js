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
        sidebar: '8px 0 15px 2px rgba(51, 51, 51, 0.2)'
      },
    },
  },
  plugins: [],
} 