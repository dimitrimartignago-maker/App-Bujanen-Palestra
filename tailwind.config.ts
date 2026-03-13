import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:          '#0a0a0a',
        surface:     '#141414',
        'surface-2': '#1e1e1e',
        dim:         '#252525',
        accent:      '#c8f520',
        muted:       '#888888',
      },
      fontFamily: {
        display: ['var(--font-oswald)', 'sans-serif'],
        sans:    ['var(--font-dm-sans)', 'sans-serif'],
      },
      maxWidth: {
        client: '430px',
      },
    },
  },
  plugins: [],
}

export default config
