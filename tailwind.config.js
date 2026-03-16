/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c8ee6',
          600: '#0070c4',
          700: '#015a9e',
          800: '#064c82',
          900: '#0b406c',
          950: '#072848',
        },
        // Gold accent
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Semantic colors
        profit: {
          light: '#d1fae5',
          DEFAULT: '#059669',
          dark: '#047857',
        },
        loss: {
          light: '#fee2e2',
          DEFAULT: '#dc2626',
          dark: '#b91c1c',
        },
        // Semantic surface tokens (CSS variable backed)
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          inset: 'var(--surface-inset)',
          overlay: 'var(--surface-overlay)',
        },
        // Semantic text tokens
        heading: 'var(--heading)',
        body: 'var(--body)',
        muted: 'var(--muted)',
        subtle: 'var(--subtle)',
        // Semantic border tokens
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
      },
    },
  },
  plugins: [],
}
