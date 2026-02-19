/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // 통합 색상 (shared/design-tokens.ts 기준)
                accent: '#0052CC',
                accentLight: '#E6F0FF',
                accentDark: '#003D99',
                background: '#FFFFFF',
                backgroundAlt: '#F9F9F9',
                backgroundCard: '#FFFFFF',
                border: '#E5E5E5',
                borderLight: '#F0F0F0',
                divider: '#EEEEEE',
                textPrimary: '#333333',
                textSecondary: '#666666',
                textTertiary: '#999999',
                success: '#1B7F37',
                error: '#D93025',
                warning: '#F9AB00',
            },
        },
    },
    plugins: [],
}
