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

            // Устанавливаем обработчики событий для кнопок и селектора проекта
            this.initializeProjectAndButtonHandlers();
            // Устанавливаем обработчики для фильтров
            this.initializeFilterHandlers();

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

    // Инициализация обработчиков селектора проекта и кнопок
    initializeProjectAndButtonHandlers() {
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

        // Кнопка создания новой папки
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                this.createFolder(null); // null = корневая папка
            });
        }
        // Добавьте здесь обработчики для других кнопок, если нужно
    },

    // Инициализация обработчиков фильтров
    initializeFilterHandlers() {
        const searchInput = document.getElementById('filterSearchInput'); // Предполагаемый ID
        const prioritySelect = document.getElementById('filterPrioritySelect'); // Предполагаемый ID
        const tagsInput = document.getElementById('filterTagsInput'); // Предполагаемый ID

        const triggerFetch = () => {
            // Небольшая задержка для полей ввода, чтобы не слать запрос на каждую букву
            clearTimeout(this.filterTimeout);
            this.filterTimeout = setTimeout(() => {
                this.fetchFoldersAndTestCases();
            }, 300); // 300ms задержка
        };

        if (searchInput) {
            searchInput.addEventListener('input', triggerFetch);
        }
        if (prioritySelect) {
            prioritySelect.addEventListener('change', () => this.fetchFoldersAndTestCases());
        }
        if (tagsInput) {
            // Для тегов может быть другое событие, например, 'change' или кастомное
            tagsInput.addEventListener('change', () => this.fetchFoldersAndTestCases());
        }
    },

    // Получение текущих значений фильтров
    getFilterParameters() {
        const params = new URLSearchParams();
        const searchInput = document.getElementById('filterSearchInput');
        const prioritySelect = document.getElementById('filterPrioritySelect');
        const tagsInput = document.getElementById('filterTagsInput'); // Или другой элемент для тегов

        if (searchInput && searchInput.value) {
            params.append('search', searchInput.value);
        }
        if (prioritySelect && prioritySelect.value) {
            params.append('priority', prioritySelect.value);
        }
        if (tagsInput && tagsInput.value) {
            // Предполагаем, что теги вводятся через запятую
            params.append('tags', tagsInput.value);
        }
        return params.toString();
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
            console.log(`Загрузка данных для проекта ${this.currentProject}...`);
            this.showNotification('Загрузка данных...', 'loading'); // Показываем индикатор загрузки
        }

        try {
            // Получаем параметры фильтров
            const filterParams = this.getFilterParameters();
            const queryString = filterParams ? `?${filterParams}` : '';

            // Формируем URL с параметрами фильтра
            const url = `${i18nConfig.API_PREFIX}/projects/${this.currentProject}/folders_and_test_cases/${queryString}`;
            console.log('Запрос данных с URL:', url);

            const response = await apiUtils.fetchWithAuth(url);

            if (!response.ok) {
                 const errorData = await response.text(); // Попробуем получить текст ошибки
                 console.error('Server response:', errorData);
                 throw new Error(`Ошибка при загрузке данных: ${response.statusText} (${response.status})`);
            }

            const data = await response.json();
            console.log('Данные (папки и тест-кейсы) загружены:', data);

            // Предполагаем, что API возвращает структуру, похожую на:
            // { folders: [...], test_cases: [...] } или просто массив папок с вложенными тест-кейсами
            // Адаптируем под фактическую структуру ответа от /folders_and_test_cases/
            // В нашем случае бэкенд возвращает массив папок, где каждая папка содержит 'test_cases'
            this.folders = data; // Весь ответ - это массив папок с тест-кейсами
            this.testCases = data.reduce((acc, folder) => {
                if (folder.test_cases) {
                    acc.push(...folder.test_cases);
                }
                return acc;
            }, []); // Собираем все тест-кейсы для возможного использования

            // Обновляем дерево папок, передавая структуру, полученную от API
            this.updateFolderTree(this.folders); // Передаем массив папок с вложенными тест-кейсами

            this.showNotification('Данные успешно загружены', 'success');

            // Возвращаем загруженные данные (хотя это может быть и не нужно, т.к. дерево обновляется)
            return {
                 folders: this.folders, // Массив папок с тест-кейсами
                 testCases: this.testCases // Плоский список всех тест-кейсов
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

    // Обновление дерева папок
    updateFolderTree(foldersWithTestCases) {
        console.log('Обновление дерева папок с данными:', foldersWithTestCases);
        const treeContainer = document.getElementById('folderTree'); // Предполагаемый ID контейнера дерева
        if (!treeContainer) {
            console.error('Контейнер дерева папок не найден!');
            return;
        }

        // Очищаем текущее дерево
        treeContainer.innerHTML = '';

        // Проверяем, есть ли данные
        if (!foldersWithTestCases || foldersWithTestCases.length === 0) {
            treeContainer.innerHTML = '<p class="text-gray-500">Нет папок или тест-кейсов, соответствующих фильтрам.</p>';
            return;
        }

        // Строим дерево (примерная реализация, нужно адаптировать под вашу HTML/CSS структуру)
        const ul = document.createElement('ul');
        foldersWithTestCases.forEach(folder => {
            const li = document.createElement('li');
            li.classList.add('folder-item'); // Добавьте классы для стилизации

            // Иконка папки и название
            let folderHtml = `
                <div class="folder-header flex items-center cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                    <svg class="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                    <span class="folder-name font-semibold">${folder.name || 'Тест-кейсы без папки'}</span>
                    <!-- Добавить кнопки действий для папки (редактировать, удалить, добавить тест-кейс) -->
                </div>
            `;

            // Список тест-кейсов в папке
            if (folder.test_cases && folder.test_cases.length > 0) {
                const testCasesUl = document.createElement('ul');
                testCasesUl.classList.add('test-case-list', 'ml-4', 'hidden'); // Скрыт по умолчанию

                folder.test_cases.forEach(testCase => {
                    const testCaseLi = document.createElement('li');
                    testCaseLi.classList.add('test-case-item', 'p-1', 'hover:bg-blue-100', 'dark:hover:bg-blue-900', 'rounded', 'cursor-pointer');
                    testCaseLi.dataset.testCaseId = testCase.id; // Сохраняем ID
                    testCaseLi.innerHTML = `
                        <div class="flex items-center">
                           <span class="priority-indicator mr-1 text-xs font-bold ${this.getPriorityClass(testCase.priority)}">${testCase.priority || 'N/A'}</span>
                           <span class="test-case-title">${testCase.title}</span>
                           <!-- Добавить иконку статуса последнего запуска, если нужно -->
                        </div>
                    `;
                    // Обработчик клика для отображения деталей тест-кейса
                    testCaseLi.addEventListener('click', (event) => {
                         event.stopPropagation(); // Предотвращаем сворачивание папки
                         this.displayTestCaseDetails(testCase.id);
                    });
                    testCasesUl.appendChild(testCaseLi);
                });
                folderHtml += testCasesUl.outerHTML; // Добавляем HTML список тест-кейсов
            } else if (!folder.id) { // Если это "папка" для нераспределенных и она пуста
                 li.innerHTML = `<div class="p-1 text-gray-500">${folder.name} (пусто)</div>`;
                 ul.appendChild(li);
                 return; // Пропускаем добавление обработчика для пустой "папки"
            }


            li.innerHTML = folderHtml;

            // Добавляем обработчик для сворачивания/разворачивания папки
            const folderHeader = li.querySelector('.folder-header');
            if (folderHeader) {
                folderHeader.addEventListener('click', () => {
                    const tcList = li.querySelector('.test-case-list');
                    if (tcList) {
                        tcList.classList.toggle('hidden');
                        // Можно добавить смену иконки папки (открыта/закрыта)
                    }
                });
            }

            ul.appendChild(li);
        });

        treeContainer.appendChild(ul);
        console.log('Дерево папок обновлено в DOM');
    },

    // Вспомогательная функция для стилизации приоритета
    getPriorityClass(priority) {
        switch (priority?.toLowerCase()) {
            case 'high': return 'text-red-600';
            case 'medium': return 'text-yellow-600';
            case 'low': return 'text-green-600';
            default: return 'text-gray-500';
        }
    },

    // Отображение деталей тест-кейса (заглушка)
    displayTestCaseDetails(testCaseId) {
        console.log(`Отображение деталей для тест-кейса ID: ${testCaseId}`);
        // Здесь должен быть код для загрузки и отображения деталей тест-кейса
        // Например, вызов другого модуля или обновление правой панели
        this.showNotification(`Загрузка деталей для тест-кейса ${testCaseId}...`, 'info');
        // Возможно, нужно будет сделать еще один API-запрос для получения полных данных тест-кейса
        // fetchWithAuth(`/api/test-cases/${testCaseId}/`).then(...)
    },
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
