/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        brand: {
          bg: '#030712',
          panel: '#0B0F1A',
          card: '#111827',
          accent: '#3B82F6',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
