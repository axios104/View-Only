/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        sap: 'var(--color-bg-sap-function)',
        legacy: 'var(--color-bg-legacy-function)',
        manual: 'var(--color-bg-manual-function)',
        'node-neutral': 'var(--color-bg-neutral-node)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'primary-foreground': 'var(--primary-foreground)',
        'text-btn': 'var(--color-text-btn)',
        card: 'var(--color-bg-card)',
        'btn-border': 'var(--color-secondary)',
        border: 'var(--color-border)',
        footer: 'var(--color-bg-footer)',
        btn: 'var(--color-bg-btn)',
        'nav-btn': 'var(--color-bg-btn)',
        icon: 'var(--color-bg-icon)',
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-md)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-blob': 'var(--gradient-blob)',
      },
      fontFamily: {
        samsung: ['var(--font-primary)'],
      },
      height: {
        'main-section': 'var(--h-main-section)',
      },
      screens: {
        xl: '1600px',
      },
    },
  },
  plugins: [],
}

