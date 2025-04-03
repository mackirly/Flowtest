// Импортируем конфигурацию
import { I18N_CONFIG } from './i18n-config.js';

// Используем глобальные переменные из CDN
const i18next = window.i18next;
const Backend = window.i18nextHttpBackend;

// Модуль управления настройками
const SettingsManager = {
    // Состояние
    state: {
        isChangingLanguage: false,
        currentLanguage: localStorage.getItem('language') || (I18N_CONFIG ? I18N_CONFIG.DEFAULT_LANGUAGE : 'en'), // Используем дефолтный язык из конфига
        currentTheme: localStorage.getItem('theme') || 'system'
    },

    // Инициализация
    init() {
        document.addEventListener('DOMContentLoaded', async () => { // Делаем async
            await this.initI18next(); // Сначала инициализируем i18next
            this.initLanguageSelector(); // Затем настраиваем селектор
            this.initTheme();
            this.bindEvents();
            // Убираем вызов updatePageTranslations() отсюда, он будет в колбэке initI18next
            // this.updatePageTranslations(); 
        });
    },

    // Инициализация i18next
    async initI18next() {
        try {
            if (!i18next || !Backend) {
                console.log('i18next и Backend не загружены. Проверьте загрузку скриптов и i18n-config.js.');
                return; // Не выводим ошибку, просто прерываем инициализацию
            }

            // Проверяем, инициализирован ли i18next
            if (i18next.isInitialized) {
                console.log('i18next уже инициализирован.');
                // Убедимся, что язык соответствует сохраненному
                const savedLang = localStorage.getItem('language') || this.state.currentLanguage;
                if (i18next.language !== savedLang) {
                    await this.changeLanguageInternal(savedLang, false); // Меняем без уведомления
                }
                return;
            }

            try {
                await i18next
                    .use(Backend)
                    .init({
                        lng: this.state.currentLanguage,
                        fallbackLng: 'en',
                        debug: true, // Включим для отладки
                        // Указываем, что у нас нет неймспейсов в именах файлов
                        ns: [], // Пустой массив или можно указать ['translation'] если файлы так называются, но у нас нет
                        defaultNS: 'translation', // Стандартный неймспейс для ключей без префикса
                        backend: {
                            // Исправляем путь для соответствия именам файлов en.json, ru.json и т.д.
                            // Исправляем путь для соответствия именам файлов en.json, ru.json и т.д.
                            loadPath: `/locales/{{lng}}.json`, // Используем относительный путь, если файлы статические
                        }
                    }); // Убираем колбэк отсюда
                
                console.log('i18next инициализирован успешно.');
                // Вызываем обновление переводов ПОСЛЕ успешного await init()
                this.updatePageTranslations(); 
                // Также обновим значение селектора здесь
                this.initLanguageSelector(); 

            } catch (error) { 
                console.error('Ошибка инициализации i18next:', error); // Ловим ошибки инициализации
                this.showNotification(this.t('loadingTranslationsError'), 'error'); // Используем this.t()
            }
        } catch (error) {
            console.error('Ошибка инициализации i18next:', error); // Ловим ошибки инициализации
            this.showNotification(this.t('loadingTranslationsError'), 'error'); // Используем this.t()
        }
    },

    // Настройка селектора языка (отдельно от инициализации i18next)
    initLanguageSelector() {
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            // Устанавливаем значение селектора в соответствии с текущим языком i18next
            languageSelect.value = i18next.language; 
            this.updateFlag(i18next.language);
        } else {
            console.log('Страница не содержит селектор языка - язык устанавливается в странице настроек');
        }
    },

    // Инициализация темы
    initTheme() {
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            const currentTheme = localStorage.getItem('theme') || 'system';
            themeSelect.value = currentTheme;
            this.applyTheme(currentTheme);
        }
    },

    // Применение темы
    applyTheme(theme) {
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
        this.state.currentTheme = theme;
    },

    // Привязка обработчиков событий
    bindEvents() {
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                const newLang = e.target.value;
                this.changeLanguage(newLang);
            });
        }

        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            // Удаляем старый обработчик, если он был (на всякий случай)
            // themeSelect.removeEventListener('change', this.handleThemeChange); // Нужна ссылка на функцию
            // Добавляем новый
            themeSelect.addEventListener('change', (e) => { // Используем стрелочную функцию для сохранения this
                const newTheme = e.target.value;
                this.applyTheme(newTheme);
            });
        }

        // Слушаем изменения системной темы
        // Удаляем старый обработчик, если он был
        // window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.handleSystemThemeChange);
        // Добавляем новый
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => { // Используем стрелочную функцию
            if (this.state.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    },

    // Обновление флага
    updateFlag(lang) {
        const flagElement = document.getElementById('selectedFlag');
        if (flagElement) {
            // Очищаем все классы fi-*
            flagElement.className = flagElement.className.split(' ').filter(c => !c.startsWith('fi-')).join(' ');
            // Добавляем класс флага
            flagElement.classList.add('fi');
            switch (lang) {
                case 'en':
                    flagElement.classList.add('fi-gb');
                    break;
                case 'ru':
                    flagElement.classList.add('fi-ru');
                    break;
                case 'de':
                    flagElement.classList.add('fi-de');
                    break;
                // Добавим default на всякий случай
                default:
                    flagElement.classList.add('fi-us'); // Или другой флаг по умолчанию
                    break;
            }
        }
    },

    // Внутренний метод смены языка без уведомлений и блокировки
    // Возвращаем Promise для обработки в changeLanguage
    changeLanguageInternal(lang, saveToLocalStorage = true) {
        return new Promise((resolve, reject) => {
            if (!i18next.isInitialized) {
                console.error("i18next is not initialized yet.");
                return reject(new Error("i18next not initialized"));
            }
            // Используем колбэк changeLanguage
            i18next.changeLanguage(lang, (err, t) => {
                if (err) {
                    console.error('Error changing language internally:', err);
                    return reject(err); // Отклоняем промис при ошибке
                }
                // Этот код выполнится ПОСЛЕ загрузки нового языка
                if (saveToLocalStorage) {
                    localStorage.setItem('language', lang);
                }
                this.state.currentLanguage = lang; // Обновляем состояние
                this.updateFlag(lang);
                this.updatePageTranslations(); // Обновляем переводы на странице ЗДЕСЬ
                console.log(`Language changed to ${lang}`);
                resolve(); // Разрешаем промис при успехе
            });
        });
    },

    // Публичный метод смены языка с уведомлениями и блокировкой
    // Снова делаем async для использования await
    async changeLanguage(lang) {
        if (this.state.isChangingLanguage || !i18next.isInitialized) return;
        this.state.isChangingLanguage = true;
        this.showNotification(this.t('changingLanguage'), 'info'); // Уведомление о начале смены

        try {
            await this.changeLanguageInternal(lang, true); // Вызываем внутренний метод и ждем Promise
            this.showNotification(this.t('languageChangeSuccess'), 'success'); // Уведомление об успехе после завершения
        } catch (error) {
            // Ошибка уже залогирована во внутреннем методе
            this.showNotification(this.t('languageChangeError'), 'error');
        } finally {
            this.state.isChangingLanguage = false; // Сбрасываем флаг в любом случае
        }
    },

    // Получение перевода
    t(key, options) {
        if (!i18next.isInitialized) {
            console.warn("i18next not initialized, returning key:", key);
            return key; // Возвращаем ключ, если i18next не готов
        }
        return i18next.t(key, options);
    },

    // Обновление переводов на странице
    updatePageTranslations() {
        if (!i18next.isInitialized) return;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.t(key); // Используем this.t()
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                element.placeholder = this.t(key); // Используем this.t()
            }
         });
         // Обновляем title страницы, если есть ключ у тега <title>
         const titleElement = document.querySelector('title');
         if (titleElement) {
             const titleKey = titleElement.getAttribute('data-i18n-title');
             if (titleKey) {
                 document.title = this.t(titleKey);
             }
         }
    },


    // Показ уведомлений (используем глобальную функцию, если она есть)
    showNotification(message, type = 'info') {
        if (typeof window.showGlobalNotification === 'function') {
            window.showGlobalNotification(message, type);
        } else {
            // Фоллбэк на console.log, если глобальной функции нет
            console.log(`[${type}] ${message}`);
        }
    },

    // Навигация назад
    goBack() {
        window.location.href = '/index.html';
    }
};

// Делаем функцию доступной глобально
window.goBack = function() {
    window.location.href = '/index.html';
};

// Инициализация
console.log('Initializing SettingsManager');
SettingsManager.init();
