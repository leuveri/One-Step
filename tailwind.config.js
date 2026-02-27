/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf6f0',
        amberAccent: '#f97316',
        warmText: '#1c1917'
      },
      fontFamily: {
        heading: ['Lora', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}

