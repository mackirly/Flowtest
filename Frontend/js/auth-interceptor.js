// Save user preferences before login
export function savePreLoginPreferences() {
    const isDark = document.documentElement.classList.contains('dark');
    const lang = document.documentElement.getAttribute('lang') || 'en';
    localStorage.setItem('preLoginTheme', isDark ? 'dark' : 'light');
    localStorage.setItem('preLoginLanguage', lang);
}

// Function to restore preferences after login
export function restorePreLoginPreferences() {
    const theme = localStorage.getItem('preLoginTheme');
    const lang = localStorage.getItem('preLoginLanguage');
    
    if (theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    if (lang) {
        document.documentElement.setAttribute('lang', lang);
        // If i18n is loaded, update the language
        if (typeof setLanguage === 'function') {
            setLanguage(lang);
        }
    }
}
