// Main admin panel initialization
import { initTabSwitching, getTranslation } from './admin-common.js';
import { loadUsers, initUserHandlers } from './admin-user-management.js';
import { loadRoles, initRoleHandlers } from './admin-roles.js';
import { loadPermissions, initPermissionHandlers } from './admin-permissions.js';

// Функция загрузки проектов
async function loadProjects() {
    try {
        const response = await fetchWithAuth('projects/');
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        
        const data = await response.json();
        const projectSelector = document.getElementById('projectSelector');
        
        // Очищаем текущие опции, оставляя только первую (Select Project)
        while (projectSelector.options.length > 1) {
            projectSelector.remove(1);
        }
        
        // Добавляем проекты в селектор
        data.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelector.appendChild(option);
        });

        // Устанавливаем сохраненный проект, если есть
        const savedProjectId = localStorage.getItem('selectedProjectId');
        if (savedProjectId) {
            projectSelector.value = savedProjectId;
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast(getTranslation('errorLoadingProjects', 'Error loading projects'), 'error');
    }
}

// Функция инициализации админ-панели
async function initAdminPanel() {
    try {
        console.log('Initializing admin panel...');
        
        // Проверяем загрузку переводов
        if (!window.translations) {
            console.error('Translations not loaded');
            return;
        }
        
        // Загружаем проекты
        await loadProjects();
        
        // Добавляем обработчик выбора проекта
        const projectSelector = document.getElementById('projectSelector');
        projectSelector.addEventListener('change', async (e) => {
            const projectId = e.target.value;
            localStorage.setItem('selectedProjectId', projectId);
            
            // Перезагружаем данные активной вкладки
            const activeTab = document.querySelector('.tab-link.active');
            if (activeTab) {
                const tabId = activeTab.getAttribute('data-tab');
                if (tabId === 'users') {
                    await loadUsers();
                }
            }
        });
        
        // Инициализируем переключение вкладок
        initTabSwitching();
        
        // Инициализируем обработчики событий
        initUserHandlers();
        initRoleHandlers();
        initPermissionHandlers();
        
        // Загружаем данные для активной вкладки
        const activeTab = document.querySelector('.tab-link.active');
        if (activeTab) {
            const tabId = activeTab.getAttribute('data-tab');
            switch (tabId) {
                case 'users':
                    await loadUsers();
                    break;
                case 'roles':
                    await loadRoles();
                    break;
                case 'permissions':
                    await loadPermissions();
                    break;
            }
        }
        
        // Добавляем обработчики для загрузки данных при переключении вкладок
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', async () => {
                const tab = link.getAttribute('data-tab');
                switch (tab) {
                    case 'users':
                        await loadUsers();
                        break;
                    case 'roles':
                        await loadRoles();
                        break;
                    case 'permissions':
                        await loadPermissions();
                        break;
                }
            });
        });
        
        // Добавляем обработчик для смены языка
        document.addEventListener('languageChanged', async (event) => {
            const language = event.detail.language;
            console.log('Language changed to:', language);
            
            // Перезагружаем данные активной вкладки
            const currentTab = document.querySelector('.tab-link.active');
            if (currentTab) {
                const tabId = currentTab.getAttribute('data-tab');
                switch (tabId) {
                    case 'users':
                        await loadUsers();
                        break;
                    case 'roles':
                        await loadRoles();
                        break;
                    case 'permissions':
                        await loadPermissions();
                        break;
                }
            }
        });
        
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
    }
}

// Экспортируем функцию инициализации для возможности повторной инициализации
export { initAdminPanel };

// Инициализируем админ-панель при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем загрузку переводов перед инициализацией
    if (window.translationsLoaded) {
        initAdminPanel();
    } else {
        document.addEventListener('translations:loaded', initAdminPanel);
    }
});
