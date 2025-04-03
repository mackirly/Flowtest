/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./Frontend/*.html",
    "./Frontend/components/*.html",
    "./Frontend/templates/*.html",
    "./Frontend/js/**/*.js",
    "./Frontend/flowtest-vue/src/**/*.vue",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#fff5f2',
          100: '#ffe6e2',
          200: '#ffc5b8',
          300: '#ff9c8f',
          400: '#ff7f50',
          500: '#ff6347',
          600: '#ed4c2d',
          700: '#d63d1f',
          800: '#b2331b',
          900: '#912a16',
        },
      },
    },
  },
  plugins: [],
}
