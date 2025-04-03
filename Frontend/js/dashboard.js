import { AuthApi } from './api/auth-api.js';
import { AnalyticsApi } from './api/analytics-api.js';
import { showNotification } from './notifications.js';
import { initializeCharts } from './dashboard-charts.js';
import { API } from './api-config.js';

const authApi = new AuthApi();
const analyticsApi = new AnalyticsApi();
const api = new API();
const LOGIN_PAGE = '/login.html';

async function initializeDashboard() {
    try {
        const userData = await authApi.getCurrentUser();
        if (!userData) {
            window.location.replace(LOGIN_PAGE);
            return;
        }

        // Обновляем информацию о пользователе
        updateUserInfo(userData);

        // Загружаем список проектов
        await loadProjects();

        // Получаем ID текущего проекта
        const projectId = await getCurrentProjectId();
        if (!projectId) {
            showNotification('Не выбран проект', 'warning');
            return;
        }

        // Устанавливаем текущий проект в селекторе
        const projectSelector = document.getElementById('projectSelector');
        if (projectSelector) {
            projectSelector.value = projectId;
        }

        await loadDashboardData(projectId);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showNotification('Ошибка при загрузке панели мониторинга', 'error');
    }
}

async function loadDashboardData(projectId) {
    try {
        // Загружаем основные метрики
        const metrics = await analyticsApi.getBasicMetrics(projectId);
        updateMetrics(metrics);

        // Инициализируем графики
        await initializeCharts(projectId);

        // showNotification('Панель мониторинга успешно загружена', 'success'); // Уведомление удалено по запросу пользователя
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Ошибка при загрузке данных', 'error');
    }
}

async function loadProjects() {
    try {
        const response = await fetch(api.PROJECTS.LIST, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        
        const projects = await response.json();
        console.log('Available projects:', projects);
        
        const projectSelector = document.getElementById('projectSelector');
        if (!projectSelector) {
            console.error('Project selector not found');
            return;
        }

        // Очищаем текущие опции
        projectSelector.innerHTML = '';
        
        // Добавляем опцию "Выберите проект"
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите проект';
        defaultOption.selected = true;
        projectSelector.appendChild(defaultOption);
        
        // Добавляем проекты в селектор
        if (projects && projects.length > 0) {
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelector.appendChild(option);
            });
        } else {
            console.warn('No projects available');
            showNotification('Нет доступных проектов', 'warning');
        }

        // Добавляем обработчик изменения проекта
        projectSelector.addEventListener('change', async (event) => {
            const selectedProjectId = event.target.value;
            if (selectedProjectId) {
                // Используем ключ 'selectedProject', как в testcase-core.js
                localStorage.setItem('selectedProject', selectedProjectId);
                // Удалим старые ключи, чтобы избежать путаницы
                localStorage.removeItem('currentProjectId');
                localStorage.removeItem('selectedProjectId');
                await loadDashboardData(selectedProjectId);
            } else {
                 // Если выбран пустой вариант ("Выберите проект"), очищаем хранилище
                 localStorage.removeItem('selectedProject');
                 localStorage.removeItem('currentProjectId');
                 localStorage.removeItem('selectedProjectId');
                 // Возможно, нужно обновить дашборд для "всех проектов"
                 await loadDashboardData(null); // Передаем null или пустую строку, чтобы показать данные для всех проектов
            }
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Ошибка при загрузке списка проектов', 'error');
    }
}

function updateUserInfo(userData) {
    console.log('Updating user info with:', userData);
    const usernameElement = document.getElementById('userName');
    const avatarElement = document.getElementById('user-avatar');
    const adminPanelLink = document.getElementById('adminPanelLink');
    
    if (usernameElement) {
        usernameElement.textContent = userData.username;
    } else {
        console.error('Username element not found');
    }
    
    if (avatarElement) {
        if (userData.avatar_url) {
            // Если есть аватар, показываем его
            const img = document.createElement('img');
            img.src = userData.avatar_url;
            img.alt = `${userData.username}'s avatar`;
            img.className = 'w-8 h-8 rounded-full';
            img.onerror = () => {
                console.error('Failed to load avatar image');
                avatarElement.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-coral-600">${userData.username.charAt(0).toUpperCase()}</span>
                    </div>`;
            };
            img.onload = () => {
                avatarElement.innerHTML = '';
                avatarElement.appendChild(img);
            };
        } else {
            // Если аватара нет, показываем первую букву имени пользователя
            avatarElement.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center">
                    <span class="text-sm font-medium text-coral-600">${userData.username.charAt(0).toUpperCase()}</span>
                </div>`;
        }
    } else {
        console.error('Avatar element not found');
    }

    // Показываем ссылку на админ-панель, если пользователь админ
    if (adminPanelLink) {
        if (userData.is_superuser || userData.is_staff) {
            adminPanelLink.classList.remove('hidden');
        } else {
            adminPanelLink.classList.add('hidden');
        }
    }
}

function updateMetrics(metrics) {
    const elements = {
        totalTests: document.getElementById('totalTests'),
        successRate: document.getElementById('successRate'),
        avgExecutionTime: document.getElementById('avgExecutionTime')
    };

    // Обновляем значения метрик
    for (const [key, element] of Object.entries(elements)) {
        if (element) {
            let value = metrics[key] !== undefined ? metrics[key] : 0;
            if (key === 'successRate') {
                value = `${(value || 0).toFixed(2)}%`;
            } else if (key === 'avgExecutionTime') {
                value = `${(value || 0).toFixed(2)} сек`;
            }
            element.textContent = value;
        }
    }
}

async function getCurrentProjectId() {
    // Получаем ID проекта из URL
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('project_id');
    
    // Если нет в URL, пробуем получить из localStorage (используем ключ 'selectedProject')
    if (!projectId) {
        projectId = localStorage.getItem('selectedProject');
    }
    // Можно добавить проверку старых ключей для плавного перехода, но пока уберем для чистоты
    // if (!projectId) projectId = localStorage.getItem('currentProjectId');
    // if (!projectId) projectId = localStorage.getItem('selectedProjectId');
    
    return projectId;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Обработчик выхода из системы
document.getElementById('logout-button')?.addEventListener('click', () => {
    authApi.logout();
});
