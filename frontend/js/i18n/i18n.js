/**
 * Internationalization (i18n) module for FlowTest 2.0
 */

import translations from './translations.js';

class I18n {
    constructor() {
        this.translations = translations;
        this.currentLanguage = localStorage.getItem('flowtest-language') || 'en';
        this.initLanguageSelector();
        this.updateLanguageDisplay();
        this.translatePage();
    }

    /**
     * Initialize language selector
     */
    initLanguageSelector() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            // Set current language in select
            languageSelect.value = this.currentLanguage;
            
            // Update language flag
            this.updateLanguageFlag(this.currentLanguage);
            
            // Add event listener
            languageSelect.addEventListener('change', (event) => {
                this.setLanguage(event.target.value);
            });
        }
    }

    /**
     * Update language flag in the UI
     */
    updateLanguageFlag(language) {
        const flagElement = document.getElementById('selected-language-flag');
        if (flagElement) {
            // Remove all flag classes
            flagElement.className = '';
            
            // Add appropriate flag class
            switch (language) {
                case 'en':
                    flagElement.classList.add('fi', 'fi-gb');
                    break;
                case 'ru':
                    flagElement.classList.add('fi', 'fi-ru');
                    break;
                case 'de':
                    flagElement.classList.add('fi', 'fi-de');
                    break;
                default:
                    flagElement.classList.add('fi', 'fi-gb');
            }
        }
    }

    /**
     * Set current language and update UI
     */
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('flowtest-language', language);
            this.updateLanguageFlag(language);
            this.translatePage();
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('language-changed', {
                detail: { language }
            }));
        }
    }

    /**
     * Get current language
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get translation for a key
     */
    t(key) {
        const translation = this.translations[this.currentLanguage];
        return translation && translation[key] ? translation[key] : key;
    }

    /**
     * Update all elements with data-i18n attribute
     */
    translatePage() {
        // Translate all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
        
        // Translate all placeholders with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
        
        // Translate all titles with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    /**
     * Update language display in UI
     */
    updateLanguageDisplay() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            const options = languageSelect.options;
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const langCode = option.value;
                
                if (this.translations[langCode]) {
                    option.textContent = this.translations[langCode].language;
                }
            }
        }
    }
}

// Create and export i18n instance
const i18n = new I18n();
export default i18n;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    i18n.translatePage();
});

// Re-translate after dynamic content loads
window.addEventListener('content-loaded', () => {
    i18n.translatePage();
});