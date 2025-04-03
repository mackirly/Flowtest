// i18n.js - Интерфейс для работы с переводами

const i18n = {
    currentLanguage: localStorage.getItem('language') || 'ru',
    
    // Инициализация системы переводов
    init() {
        this.updatePageTranslations();
        this.setupLanguageSelector();
        this.updateLanguageFlag();
    },

    // Получение перевода по ключу
    t(key) {
        return window.t ? window.t(key) : key;
    },

    // Установка языка
    setLanguage(lang) {
        if (window.setLanguage(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updatePageTranslations();
            this.updateLanguageFlag();
            return true;
        }
        return false;
    },

    // Обновление всех переводов на странице
    updatePageTranslations() {
        // Обновляем текстовые элементы
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.t(key);
            }
        });

        // Обновляем плейсхолдеры
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                element.placeholder = this.t(key);
            }
        });
    },

    // Настройка селектора языка
    setupLanguageSelector() {
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.value = this.currentLanguage;
            selector.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    },

    // Обновление флага языка
    updateLanguageFlag() {
        const flagElement = document.querySelector('.language-flag');
        if (flagElement) {
            // Очищаем предыдущие классы флагов
            flagElement.className = 'language-flag fi';
            // Добавляем класс для текущего языка
            switch (this.currentLanguage) {
                case 'en':
                    flagElement.classList.add('fi-gb');
                    break;
                case 'ru':
                    flagElement.classList.add('fi-ru');
                    break;
                case 'de':
                    flagElement.classList.add('fi-de');
                    break;
            }
        }
    }
};

// Глобальная конфигурация для других скриптов
const i18nConfig = {
    defaultLanguage: 'ru',
    supportedLanguages: ['ru', 'en', 'de'],
    apiEndpoint: '/api',
    authEndpoint: '/api/token/',
    refreshTokenEndpoint: '/api/token/refresh/'
};

// Инициализация будет вызываться явно из других скриптов

// Экспортируем для использования в других скриптах
window.i18n = i18n;
window.i18nConfig = i18nConfig;
