import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // Enable dark mode by adding class "dark"
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1', // Indigo-500
          light: '#818CF8',   // Indigo-400
          dark: '#4F46E5',    // Indigo-600
        },
        secondary: {
          DEFAULT: '#F59E0B', // Amber-500
          light: '#FBBF24',   // Amber-400
          dark: '#D97706',    // Amber-600
        },
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
