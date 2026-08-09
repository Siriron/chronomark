/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D1117',
        surface: '#161B22',
        surfaceRaised: '#1C2128',
        border: '#30363D',
        borderSubtle: '#21262D',
        textPrimary: '#E6EDF3',
        textMuted: '#8B949E',
        verified: '#3FB950',
        verifiedDim: '#2EA043',
        late: '#F0883E',
        lateDim: '#DB7C34',
        unverifiable: '#6E7681',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
