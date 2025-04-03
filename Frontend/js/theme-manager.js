const ThemeManager = {
    // Состояние
    state: {
        currentTheme: localStorage.getItem('theme') || 'dark'
    },

    // Получение текущей темы
    getCurrentTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return savedTheme || 'dark';
    },

    // Применение темы
    applyTheme(theme) {
        const root = document.documentElement;
        const body = document.body;
        
        root.classList.remove('light', 'dark');
        if (body) body.classList.remove('light', 'dark');
        
        const themeToApply = theme === 'system' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
        
        root.classList.add(themeToApply);
        if (body) body.classList.add(themeToApply);
        
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeToApply === 'dark' ? '#1a1f2e' : '#f3f4f6');
        }

        // Обновляем иконку темы в интерфейсе
        const iconElement = document.getElementById('selectedThemeIcon')?.querySelector('i');
        if (iconElement) {
            iconElement.className = `fas fa-${themeToApply === 'dark' ? 'moon' : theme === 'system' ? 'computer' : 'sun'}`;
        }
    },

    // Сохранение темы
    async saveTheme(theme) {
        try {
            // Apply theme immediately
            this.applyTheme(theme);

            // Only try to save to server if we're on a page that requires auth
            if (!window.location.pathname.includes('login.html')) {
                const response = await fetch('http://127.0.0.1:8000/api/users/theme/', {
                    method: 'PATCH',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('access')
                    },
                    body: JSON.stringify({ theme })
                });

                if (!response.ok) {
                    throw new Error('Failed to update theme');
                }
            }
        } catch (error) {
            console.error('Error saving theme:', error);
            // Don't show error on login page
            if (!window.location.pathname.includes('login.html')) {
                alert(i18n.t('theme_save_error'));
            }
        }
    },

    // Получение темы с сервера
    async getThemeFromServer() {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/users/get_theme/', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access')
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get theme');
            }

            const data = await response.json();
            if (data.theme) {
                await this.saveTheme(data.theme);
            }
        } catch (error) {
            console.error('Error getting theme from server:', error);
        }
    },

    // Инициализация
    init() {
        // Get theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || systemTheme;

        // Apply theme
        this.applyTheme(theme);

        // Set theme selector value if it exists
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.value = theme;
            this.updateThemeIcon(theme);
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    },

    updateThemeIcon(theme) {
        const iconElement = document.getElementById('selectedThemeIcon');
        if (iconElement) {
            const icon = iconElement.querySelector('i');
            if (icon) {
                icon.className = 'fas ' + (theme === 'dark' ? 'fa-moon' : theme === 'light' ? 'fa-sun' : 'fa-computer');
            }
        }
    }
};

// Make theme manager globally available
window.ThemeManager = ThemeManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());

// Make saveTheme function globally available
window.saveTheme = function(theme) {
    ThemeManager.saveTheme(theme);
};