/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'media', //media = Automatically follows system preference - class = user can toggle dark mode, try on console document.documentElement.classList.add("dark")
    theme: {
      extend: {
        colors: {
          'nav': {
            'bar': 'white',
            'topbar': '#F8F8F8',
          },
          gray: {
            700: '#1B1F1B',
            800: '#1e211e',
            900: '#131413',
          }
        },
        maxWidth: {
          '8xl': '96rem', // 1536px - extends beyond default 7xl (80rem/1280px)
        },
        animation: {
          'pop': 'pop 0.3s ease-in-out',
          'slide-up': 'slideUp 0.5s ease-out',
          'fade-in': 'fadeIn 0.3s ease-in',
          'panel-appear': 'panelAppear 0.6s ease-out',
        },
        keyframes: {
          pop: {
            '0%': { transform: 'scale(0.95)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          panelAppear: {
            '0%': { transform: 'scale(0.8) rotate(-5deg)', opacity: '0' },
            '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          },
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
      function({ addUtilities }) {
        const newUtilities = {
          '.line-clamp-2': {
            overflow: 'hidden',
            display: '-webkit-box',
            '-webkit-box-orient': 'vertical',
            '-webkit-line-clamp': '2',
          },
          '.line-clamp-3': {
            overflow: 'hidden',
            display: '-webkit-box',
            '-webkit-box-orient': 'vertical',
            '-webkit-line-clamp': '3',
          },
          '.line-clamp-4': {
            overflow: 'hidden',
            display: '-webkit-box',
            '-webkit-box-orient': 'vertical',
            '-webkit-line-clamp': '4',
          },
        }
        addUtilities(newUtilities)
      }
    ],
  } 