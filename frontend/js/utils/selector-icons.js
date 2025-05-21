/**
 * Utility to handle icon updates in selectors
 */
document.addEventListener('DOMContentLoaded', () => {
    // Language selector
    const languageSelect = document.getElementById('language-select');
    const flagContainer = languageSelect.parentElement.querySelector('.flag-icon');
    
    // Map language codes to country codes for display
    const countryLabels = {
        'gb': 'GB',
        'ru': 'RU',
        'de': 'DE'
    };
    
    // Update flag when language is changed
    if (languageSelect && flagContainer) {
        // Update flag when selection changes
        languageSelect.addEventListener('change', () => {
            const lang = languageSelect.value;
            
            // Remove all flag-* classes except flag-icon
            flagContainer.className = 'flag-icon';
            
            // Add the class for the specific flag
            flagContainer.classList.add(`flag-${lang}`);
            
            // Не добавляем текст, чтобы отображались только флаги
            flagContainer.textContent = '';
        });
    }
    
    // Theme selector
    const themeSelect = document.getElementById('theme-select');
    const themeIconContainer = themeSelect.parentElement.querySelector('.theme-icon');
    
    // Map of theme types to icons
    const themeIcons = {
        'light': '☀️',
        'dark': '🌙',
        'system': '⚙️'
    };
    
    // Update theme icon when theme is changed
    if (themeSelect && themeIconContainer) {
        // Update icon when selection changes
        themeSelect.addEventListener('change', () => {
            const theme = themeSelect.value;
            if (themeIcons[theme]) {
                themeIconContainer.textContent = themeIcons[theme];
            }
        });
    }
});
