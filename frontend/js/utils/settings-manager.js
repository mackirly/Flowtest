/**
 * Settings Manager - Centralized settings management for FlowTest
 * Handles theme, language and other user preferences across all pages
 */

class SettingsManager {
    constructor() {
        this.STORAGE_KEYS = {
            THEME: 'flowtest-theme',
            LANGUAGE: 'flowtest-language',
            SETTINGS_VERSION: 'flowtest-settings-version'
        };
        
        this.CURRENT_VERSION = '1.0';
        
        // Default settings
        this.defaultSettings = {
            theme: 'system',
            language: 'en'
        };
        
        // Initialize settings
        this.settings = this.loadSettings();
        
        // Listen for storage changes (from other tabs/windows)
        window.addEventListener('storage', (e) => this.handleStorageChange(e));
        
        // Listen for custom events
        window.addEventListener('theme-change-request', (e) => this.setTheme(e.detail.theme));
        window.addEventListener('language-change-request', (e) => this.setLanguage(e.detail.language));
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const settings = {
            theme: localStorage.getItem(this.STORAGE_KEYS.THEME) || this.defaultSettings.theme,
            language: localStorage.getItem(this.STORAGE_KEYS.LANGUAGE) || this.defaultSettings.language
        };
        
        // Check version
        const version = localStorage.getItem(this.STORAGE_KEYS.SETTINGS_VERSION);
        if (version !== this.CURRENT_VERSION) {
            // Migrate settings if needed
            this.migrateSettings(settings, version);
        }
        
        return settings;
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem(this.STORAGE_KEYS.THEME, this.settings.theme);
        localStorage.setItem(this.STORAGE_KEYS.LANGUAGE, this.settings.language);
        localStorage.setItem(this.STORAGE_KEYS.SETTINGS_VERSION, this.CURRENT_VERSION);
    }
    
    /**
     * Migrate settings from older versions
     */
    migrateSettings(settings, oldVersion) {
        // Future migration logic here
        localStorage.setItem(this.STORAGE_KEYS.SETTINGS_VERSION, this.CURRENT_VERSION);
    }
    
    /**
     * Handle storage changes from other tabs/windows
     */
    handleStorageChange(event) {
        if (event.key === this.STORAGE_KEYS.THEME) {
            this.settings.theme = event.newValue || this.defaultSettings.theme;
            this.applyTheme();
        } else if (event.key === this.STORAGE_KEYS.LANGUAGE) {
            this.settings.language = event.newValue || this.defaultSettings.language;
            this.applyLanguage();
        }
    }
    
    /**
     * Set theme
     */
    setTheme(theme) {
        if (this.settings.theme !== theme) {
            this.settings.theme = theme;
            this.saveSettings();
            this.applyTheme();
            
            // Notify all listeners
            window.dispatchEvent(new CustomEvent('theme-changed', {
                detail: { theme: theme }
            }));
        }
    }
    
    /**
     * Apply current theme
     */
    applyTheme() {
        const theme = this.settings.theme;
        
        if (theme === 'system') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.classList.toggle('dark', prefersDark);
        } else {
            // Apply specific theme
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
        
        // Update theme selectors if present
        const themeSelectors = document.querySelectorAll('[data-theme-selector]');
        themeSelectors.forEach(selector => {
            if (selector.tagName === 'SELECT') {
                selector.value = theme;
            }
        });
    }
    
    /**
     * Set language
     */
    setLanguage(language) {
        if (this.settings.language !== language) {
            this.settings.language = language;
            this.saveSettings();
            this.applyLanguage();
            
            // Notify all listeners
            window.dispatchEvent(new CustomEvent('language-changed', {
                detail: { language: language }
            }));
        }
    }
    
    /**
     * Apply current language
     */
    applyLanguage() {
        // Import i18n dynamically to avoid circular dependencies
        import('../i18n/i18n.js').then(module => {
            const i18n = module.default;
            if (i18n && typeof i18n.setLanguageFromManager === 'function') {
                i18n.setLanguageFromManager(this.settings.language);
            }
        }).catch(error => {
            console.warn('[SettingsManager] Failed to load i18n module:', error);
        });
        
        // Update language selectors if present
        const languageSelectors = document.querySelectorAll('[data-language-selector]');
        languageSelectors.forEach(selector => {
            if (selector.tagName === 'SELECT') {
                selector.value = this.settings.language;
            }
        });
    }
    
    /**
     * Get current theme
     */
    getTheme() {
        return this.settings.theme;
    }
    
    /**
     * Get current language
     */
    getLanguage() {
        return this.settings.language;
    }
    
    /**
     * Check if dark mode is active
     */
    isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }
    
    /**
     * Initialize settings on page load
     */
    initialize() {
        this.applyTheme();
        this.applyLanguage();
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', () => {
                if (this.settings.theme === 'system') {
                    this.applyTheme();
                }
            });
        }
    }
}

// Create singleton instance
const settingsManager = new SettingsManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => settingsManager.initialize());
} else {
    settingsManager.initialize();
}

// Export for use in other modules
export default settingsManager;