// Import core utilities (wrapped in try/catch for compatibility)
let apiUtils, i18nConfig, TestCaseManagerModule;

// Использование ES модулей через асинхронный механизм загрузки
async function loadModules() {
    try {
        const apiUtilsModule = await import('./api-utils.js');
        apiUtils = apiUtilsModule.default;
        
        const i18nConfigModule = await import('./i18n-config.js');
        i18nConfig = i18nConfigModule.I18N_CONFIG;
        
        // Загружаем модуль TestCaseManager из testcase-core.js
        const testCaseCore = await import('./testcase-core.js');
        TestCaseManagerModule = testCaseCore.TestCaseManager;
        
        console.log('Modules loaded successfully');
        return true;
    } catch (err) {
        console.error('Error loading modules:', err);
        
        // Fallback для fetchWithAuth
        apiUtils = {
            fetchWithAuth: async function(url, options = {}) {
                const token = localStorage.getItem('authToken');
                const headers = options.headers || {};
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                return fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    }
                });
            }
        };
        
        // Fallback для i18nConfig
        i18nConfig = {
            API_BASE_URL: 'http://127.0.0.1:8000',
            API_PREFIX: '/api',
            // Добавляем общие настройки
            DEFAULT_LANGUAGE: 'ru',
            SUPPORTED_LANGUAGES: ['ru', 'en'],
            FALLBACK_LANGUAGE: 'en',
            LOCALE_PATH: '/locales',
            TRANSLATIONS: {
                ru: {
                    'app_title': 'Система управления тестированием',
                    // ... другие переводы
                },
                en: {
                    'app_title': 'Test Management System',
                    // ... другие переводы
                }
            }
        };
        return false;
    }
}

// Создаем объект менеджера тест-кейсов
const testCaseManager = {
    currentProject: null,
    folders: [],
    testCases: [],
    
    // Инициализация
    async init() {
        console.log('Инициализация менеджера тест-кейсов...');
        
        try {
            // Сначала загружаем модули
            await loadModules();
            
            // Сначала получаем сохраненный ID (используем единый ключ)
            const selectedProjectId = localStorage.getItem('selectedProject');
            this.currentProject = selectedProjectId; // Устанавливаем сразу

            // Загружаем проекты
            const projects = await this.loadProjects();
            // Заполняем селектор
            this.initializeProjectSelector(projects);

            // Устанавливаем обработчики событий
            this.initializeButtonHandlers();

            // Теперь, когда селектор заполнен, устанавливаем выбранное значение
            if (selectedProjectId) {
                const projectSelector = document.getElementById('projectSelector');
                if (projectSelector) {
                    projectSelector.value = selectedProjectId;
                    // Загружаем данные, если ID был найден и установлен
                    await this.fetchFoldersAndTestCases();
                } else {
                     console.error("Project selector not found after initialization!");
                     this.showNotification('Ошибка: Селектор проектов не найден.', 'error');
                }
            } else {
                // Если ID не сохранен, возможно, очистить дерево или показать сообщение
                this.updateFolderTree([], []); // Очищаем дерево
                this.showNotification('Проект не выбран. Выберите проект из списка.', 'info');
            }
            
            // Показываем уведомление об успешной инициализации
            this.showNotification('Менеджер тест-кейсов инициализирован успешно', 'success');
            
        } catch (error) {
            console.error('Ошибка при инициализации:', error);
            this.showNotification(`Ошибка при инициализации: ${error.message}`, 'error');
        }
    },

    // Инициализация обработчиков кнопок
    initializeButtonHandlers() {
        const projectSelector = document.getElementById('projectSelector');
        if (projectSelector) {
            projectSelector.addEventListener('change', async () => {
                const projectId = projectSelector.value;
                if (projectId) {
                    this.currentProject = projectId;
                    // Используем единый ключ 'selectedProject'
                    localStorage.setItem('selectedProject', projectId);
                    // Удаляем старые ключи
                    localStorage.removeItem('selectedProjectId');
                    localStorage.removeItem('currentProjectId');
                    await this.fetchFoldersAndTestCases();
                } else {
                    // Если выбран пустой вариант ("Выберите проект")
                    this.currentProject = null;
                    localStorage.removeItem('selectedProject'); // Используем единый ключ
                    // Убедимся, что старые ключи тоже удалены
                    localStorage.removeItem('selectedProjectId');
                    localStorage.removeItem('currentProjectId');
                    this.updateFolderTree([], []); // Очищаем дерево
                    this.showNotification('Проект не выбран.', 'info');
                }
            });
        }
        
        // Кнопка создания новой папки
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                this.createFolder(null); // null = корневая папка
            });
        }
    },

    // Загрузка проектов
    async loadProjects() {
        console.log('Загрузка проектов...');
        try {
            const response = await apiUtils.fetchWithAuth(`${i18nConfig.API_PREFIX}/projects/`);
            
            if (!response.ok) {
                throw new Error(`Ошибка при загрузке проектов: ${response.statusText}`);
            }
            
            const projects = await response.json();
            console.log('Проекты загружены:', projects);
            return projects;
            
        } catch (error) {
            console.error('Ошибка при загрузке проектов:', error);
            this.showNotification(`Не удалось загрузить проекты: ${error.message}`, 'error');
            return [];
        }
    },

    // Загрузка папок и тест-кейсов
    async fetchFoldersAndTestCases() {
        if (!this.currentProject) {
            console.warn('Проект не выбран');
            return;
        }
        
        try {
            // Загружаем папки
            const foldersResponse = await apiUtils.fetchWithAuth(`${i18nConfig.API_PREFIX}/projects/${this.currentProject}/folders/`);
            
            if (!foldersResponse.ok) {
                throw new Error(`Ошибка при загрузке папок: ${foldersResponse.statusText}`);
            }
            
            this.folders = await foldersResponse.json();
            console.log('Папки загружены:', this.folders);
            
            // Загружаем тест-кейсы
            const testCasesResponse = await apiUtils.fetchWithAuth(`${i18nConfig.API_PREFIX}/projects/${this.currentProject}/test-cases/`);
            
            if (!testCasesResponse.ok) {
                throw new Error(`Ошибка при загрузке тест-кейсов: ${testCasesResponse.statusText}`);
            }
            
            this.testCases = await testCasesResponse.json();
            console.log('Тест-кейсы загружены:', this.testCases);
            
            // Обновляем дерево папок
            this.updateFolderTree(this.folders, this.testCases);
            
            return {
                folders: this.folders,
                testCases: this.testCases
            };
            
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            this.showNotification(`Не удалось загрузить данные: ${error.message}`, 'error');
            return {
                folders: [],
                testCases: []
            };
        }
    },

    // Helper function for notifications
    showNotification(message, type = 'info') {
        const notificationArea = document.getElementById('notificationArea');
        if (!notificationArea) {
            console.warn('Notification area not found');
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        const notificationId = `notification-${Date.now()}`;
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification ${type}`;
        
        // Определяем иконку в зависимости от типа
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
                break;
            case 'error':
                icon = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1-5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>';
                break;
            default:
                icon = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm0 6a1 1 0 10-2 0h2z" clip-rule="evenodd"></path></svg>';
        }
        
        notification.innerHTML = `
            <div class="flex items-center">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${message}</div>
                <button class="close-btn ml-auto" onclick="document.getElementById('${notificationId}').remove()">&times;</button>
            </div>
        `;
        
        notificationArea.appendChild(notification);
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            const notificationElement = document.getElementById(notificationId);
            if (notificationElement) {
                notificationElement.remove();
            }
        }, 5000);
    },

    // Создание папки
    createFolder(parentId) {
        console.log('Создание новой папки внутри:', parentId);
        // Здесь будет код для создания папки
        this.showNotification('Функциональность создания папки еще не реализована', 'info');
    },

    // Run a test
    runTest() {
        console.log('Запуск теста...');
        // Здесь будет код для запуска теста
        this.showNotification('Функциональность запуска теста еще не реализована', 'info');
    },

    // Minimum implementation of other key methods
    updateFolderTree(folders, testCases) {
        console.log('Обновление дерева папок с', folders.length, 'папками и', testCases.length, 'тест-кейсами');
        // Здесь будет код для обновления дерева папок в UI
    }
};

// Immediately make this available globally
// Используем TestCaseManager из testcase-core.js, если доступен
window.testCaseManager = testCaseManager;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing test case manager...');

    try {
        // Загружаем модули
        await loadModules();
        
        // Используем TestCaseManager из testcase-core.js, если доступен
        if (TestCaseManagerModule && typeof TestCaseManagerModule.init === 'function') {
            console.log('Using TestCaseManager from testcase-core.js');
            window.TestCaseManager = TestCaseManagerModule;
            await TestCaseManagerModule.init();
        } else {
            console.log('Using local testCaseManager fallback');
            await testCaseManager.init();
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
