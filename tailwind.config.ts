import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#10294A', deep: '#0B1D36', mid: '#1E3A5F', soft: '#33476B' },
        amber: { DEFAULT: '#E8892B', dark: '#C96F16', light: '#F7B563', pale: '#FBEEDD' },
        cream: '#FAF9F6',
        sand: '#F1EBE1',
        ink: '#22314A'
      },
      fontFamily: { sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(16,41,74,.06), 0 8px 24px rgba(16,41,74,.08)',
        lift: '0 4px 8px rgba(16,41,74,.10), 0 16px 40px rgba(16,41,74,.14)'
      }
    }
  },
  plugins: []
};
export default config;
