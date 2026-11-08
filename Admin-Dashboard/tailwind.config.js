/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        trixul: {
          dark:    '#0b1120',   // primary ultra-dark background
          card:    '#0f172a',   // deep card background
          panel:   '#1e293b',   // elevated panel background
          border:  '#334155',   // crisp slate border
          accent:  '#3b82f6',   // electric command blue
          success: '#10b981',   // emerald
          warning: '#f59e0b',   // amber warning
          danger:  '#ef4444',   // crimson alert
          text:    '#f8fafc',   // primary text
          muted:   '#94a3b8',   // secondary text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
