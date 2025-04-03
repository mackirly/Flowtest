import { fetchWithAuth } from './api-utils.js';

async function refreshAccessToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        throw new Error('Refresh token not found');
    }

    try {
        const refreshUrl = config.getFullEndpoint(config.ENDPOINTS.AUTH.REFRESH);
        
        const response = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        localStorage.setItem('access', data.access);
        return data.access;
    } catch (error) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        throw error;
    }
}

async function fetchProjects() {
    try {
        const projectsUrl = config.getFullEndpoint(config.ENDPOINTS.PROJECTS.ALL);
        const response = await fetchWithAuth(projectsUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching projects:', error);
        showNotification('Error loading projects', 'error');
        throw error;
    }
}

function updateProjectsList(projects) {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
        projectsList.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>${window.i18n.t('noProjects')}</p>
            </div>
        `;
        return;
    }

    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow';
        projectCard.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${project.name}</h3>
                    <p class="text-sm text-gray-500">${project.description || ''}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-800" onclick="editProject(${project.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800" onclick="deleteProject(${project.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mt-4 flex justify-between text-sm text-gray-500">
                <span>${project.test_cases_count || 0} tests</span>
                <span>Created: ${new Date(project.created_at).toLocaleDateString()}</span>
            </div>
        `;
        projectsList.appendChild(projectCard);
    });
}

function updateProjectSelect(projects) {
    const projectSelector = document.getElementById('projectSelector');
    if (!projectSelector) return;

    // Сохраняем текущий выбранный проект
    const currentProjectId = projectSelector.value;

    projectSelector.innerHTML = '';
    
    // Добавляем опцию по умолчанию
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = t('selectProject');
    defaultOption.disabled = true;
    defaultOption.selected = true;
    projectSelector.appendChild(defaultOption);
    
    // Добавляем проекты
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelector.appendChild(option);
    });

    // Восстанавливаем выбранный проект если он есть в списке
    if (currentProjectId && projects.some(p => p.id === parseInt(currentProjectId))) {
        projectSelector.value = currentProjectId;
    }

    // Вызываем событие change чтобы обновить графики
    const event = new Event('change');
    projectSelector.dispatchEvent(event);
}

async function createProject(event) {
    event.preventDefault();
    
    const projectNameInput = document.getElementById('projectName');
    const projectDescriptionInput = document.getElementById('projectDescription');
    const createProjectModal = document.getElementById('createProjectModal');
    
    const projectData = {
        name: projectNameInput.value.trim(),
        description: projectDescriptionInput.value.trim()
    };

    try {
        const response = await fetchWithAuth('/api/projects/', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            throw new Error('Failed to create project');
        }

        const newProject = await response.json();
        
        // Показываем уведомление об успехе
        showNotification(
            window.i18n.t('projectCreated'),
            'success'
        );

        // Закрываем модальное окно
        createProjectModal.classList.add('hidden');
        
        // Очищаем форму
        projectNameInput.value = '';
        projectDescriptionInput.value = '';

        // Обновляем список проектов
        await fetchProjects();

    } catch (error) {
        console.error('Error creating project:', error);
        showNotification(
            window.i18n.t('projectCreationError'),
            'error'
        );
    }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white min-w-[300px] z-50`;
    
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function loadProjects() {
    const projectsContainer = document.getElementById('projects-container');
    if (projectsContainer) {
        projectsContainer.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading projects...</div>';
    }
    
    await fetchProjects();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadProjects(); // Загрузка проектов
        
        // Привязываем обработчик к форме создания проекта
        const createProjectForm = document.getElementById('createProjectForm');
        if (createProjectForm) {
            createProjectForm.addEventListener('submit', createProject);
        }
    } catch (error) {
        console.error('Failed to initialize projects page:', error);
        showNotification('Failed to load projects', 'error');
    }
});

// Инициализация селектора проектов
function initializeProjectSelector() {
    const projectSelector = document.getElementById('projectSelector');
    if (projectSelector) {
        projectSelector.addEventListener('change', async function() {
            const selectedProject = this.value;
            if (selectedProject) {
                console.log('Project selected:', selectedProject);
                try {
                    await fetchData(selectedProject);
                } catch (error) {
                    console.error('Error loading project data:', error);
                }
            }
        });
    }
}

// Делаем функции доступными глобально
window.initializeProjectSelector = initializeProjectSelector;

console.log('projects.js загружен');

// Function to load projects into selector with support for dashboard
async function loadProjectsToSelector(selector) {
    if (!selector) {
        console.error('No selector provided for loadProjectsToSelector');
        return;
    }
    
    try {
        const projects = await fetchProjects();
        
        // Сохраняем текущее выбранное значение, если оно есть
        const currentValue = selector.value;
        
        // Очищаем селектор, сохраняя первый элемент (обычно "Все проекты")
        const firstOption = selector.options[0];
        selector.innerHTML = '';
        if (firstOption) {
            selector.appendChild(firstOption);
        }
        
        // Добавляем проекты
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selector.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение, если оно есть в новом списке
        if (currentValue) {
            for (let i = 0; i < selector.options.length; i++) {
                if (selector.options[i].value === currentValue) {
                    selector.value = currentValue;
                    break;
                }
            }
        }
        
        // Если ничего не выбрано и есть проекты, выбираем первый проект
        if (!selector.value && selector.options.length > 1) {
            selector.value = selector.options[1].value;
        }
        
        return projects;
    } catch (error) {
        console.error('Error loading projects into selector:', error);
        return [];
    }
}

// Делаем функцию доступной глобально для использования в других скриптах
window.loadProjectsToSelector = loadProjectsToSelector;
