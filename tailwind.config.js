/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          page: 'var(--bg-page)',
          card: 'var(--bg-card)',
          border: 'var(--bg-border)',
          elevated: 'var(--bg-elevated)',
          alt: 'var(--bg-hero-alt)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        teal: {
          DEFAULT: 'var(--teal)',
          light: 'var(--teal-light)',
          dark: 'var(--teal-dark)',
          deep: 'var(--teal-deep)',
          glow: 'var(--teal-glow)',
          'glow-soft': 'var(--teal-glow-soft)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          light: 'var(--gold-light)',
          glow: 'var(--gold-glow)',
        },
        status: {
          success: 'var(--status-success)',
          error: 'var(--status-error)',
          warning: 'var(--status-warning)',
          info: 'var(--status-info)',
        },
        onteal: 'var(--text-on-teal)',
      },
      borderColor: {
        DEFAULT: 'var(--bg-border)',
        teal: {
          faint: 'var(--color-teal-border-faint)',
          mid: 'var(--color-teal-border-mid)',
          strong: 'var(--color-teal-border-strong)',
          nav: 'var(--color-teal-border-nav)',
        },
        gold: {
          faint: 'var(--color-gold-border)',
        }
      },
      borderRadius: {
        'pill': 'var(--radius-pill)',
        'card': 'var(--radius-card)',
        'card-lg': 'var(--radius-card-lg)',
        'card-xl': 'var(--radius-card-xl)',
        'tag': 'var(--radius-tag)',
        'input': 'var(--radius-input)',
        'nav': 'var(--radius-nav-item)',
        'logo': 'var(--radius-logo-box)',
        'stamp': 'var(--radius-stamp)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-glow': 'var(--shadow-card-glow)',
        'ticket': 'var(--shadow-ticket)',
        'ticket-vip': 'var(--shadow-ticket-vip)',
        'modal': 'var(--shadow-modal)',
        'dropdown': 'var(--shadow-dropdown)',
      },
      backgroundImage: {
        'gradient-cta': 'var(--gradient-cta)',
        'gradient-ticket': 'var(--gradient-ticket-top)',
        'gradient-vip': 'var(--gradient-vip-top)',
        'gradient-card-dark': 'var(--gradient-card-dark)',
        'gradient-section-bar': 'var(--gradient-section-bar)',
        'gradient-section-line': 'var(--gradient-section-line)',
        'gradient-ticket-back': 'var(--gradient-ticket-back)',
        'gradient-hero': 'var(--gradient-hero-radial)',
        'gradient-glow': 'var(--gradient-glow-radial)',
      },
      spacing: {
        '18': 'var(--spacing-18)',
        '22': 'var(--spacing-22)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'hero': ['var(--text-hero-size)', { lineHeight: 'var(--text-hero-lh)', letterSpacing: 'var(--text-hero-ls)' }],
        'h2': ['var(--text-h2-size)', { lineHeight: 'var(--text-h2-lh)', letterSpacing: 'var(--text-h2-ls)' }],
        'h3': ['var(--text-h3-size)', { lineHeight: 'var(--text-h3-lh)', letterSpacing: 'var(--text-h3-ls)' }],
        'h4': ['var(--text-h4-size)', { lineHeight: 'var(--text-h4-lh)', letterSpacing: 'var(--text-h4-ls)' }],
        'body-lg': ['var(--text-body-lg-size)', { lineHeight: 'var(--text-body-lg-lh)' }],
        'body': ['var(--text-body-base-size)', { lineHeight: 'var(--text-body-base-lh)' }],
        'body-sm': ['var(--text-body-sm-size)', { lineHeight: 'var(--text-body-sm-lh)' }],
        'body-xs': ['var(--text-body-xs-size)', { lineHeight: 'var(--text-body-xs-lh)' }],
        'label': ['var(--text-label-size)', { lineHeight: 'var(--text-label-lh)', letterSpacing: 'var(--text-label-ls)' }],
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'base': 'var(--duration-base)',
        'medium': 'var(--duration-medium)',
        'slow': 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'base': 'var(--ease-base)',
        'out': 'var(--ease-out)',
      }
    },
  },
  plugins: [],
}
