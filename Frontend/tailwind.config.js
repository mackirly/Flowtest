/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./Frontend/**/*.{html,js}",
        "./**/*.{html,js}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                coral: {
                    50: '#fff5f2',
                    100: '#ffe6e0',
                    200: '#ffc7b8',
                    300: '#ffa590',
                    400: '#ff7f50',  // Base coral color
                    500: '#ff6347',  // Slightly darker
                    600: '#ed4c2d',
                    700: '#db3c1d',
                    800: '#b32d15',
                    900: '#8f2311',
                    950: '#4b0404',
                },
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                secondary: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                }
            },
            fontFamily: {
                sans: ['Inter var', 'sans-serif'],
            },
        }
    },
    plugins: [],
}