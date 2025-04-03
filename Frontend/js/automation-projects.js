// Модуль управления проектами автоматизации
const AutomationProjectsManager = {
    init() {
        this.loadProjects();
        this.initializeForm();
    },

    // Загрузка списка проектов
    async loadProjects() {
        try {
            const automationProjectsUrl = config.getFullEndpoint(config.ENDPOINTS.AUTOMATION.PROJECTS);
            const response = await fetchWithAuth(automationProjectsUrl);
            
            if (!response.ok) throw new Error('Failed to load projects');
            
            const projects = await response.json();
            this.renderProjects(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            // Можно добавить уведомление об ошибке
        }
    },

    // Отрисовка проектов
    renderProjects(projects) {
        const container = document.getElementById('projectsList');
        container.innerHTML = '';

        projects.forEach(project => {
            const card = this.createProjectCard(project);
            container.appendChild(card);
        });
    },

    // Создание карточки проекта
    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${project.name}</h3>
                <div class="flex space-x-2">
                    <button onclick="AutomationProjectsManager.syncProject(${project.id})" 
                            class="p-2 text-gray-500 hover:text-coral-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button onclick="AutomationProjectsManager.deleteProject(${project.id})"
                            class="p-2 text-gray-500 hover:text-red-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p class="mb-2">Repository: ${project.repository_url}</p>
                <p class="mb-2">Branch: ${project.branch}</p>
                <p>Framework: ${project.framework}</p>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
                Last sync: ${project.last_sync ? new Date(project.last_sync).toLocaleString() : 'Never'}
            </div>
        `;
        return card;
    },

    // Инициализация формы добавления проекта
    initializeForm() {
        const form = document.getElementById('addProjectForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const projectData = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('http://127.0.0.1:8000/api/automation-projects/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access')}`
                    },
                    body: JSON.stringify(projectData)
                });

                if (!response.ok) throw new Error('Failed to create project');

                this.hideAddProjectModal();
                this.loadProjects();
                form.reset();
            } catch (error) {
                console.error('Error creating project:', error);
                // Можно добавить уведомление об ошибке
            }
        });
    },

    // Синхронизация проекта
    async syncProject(projectId) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/automation-projects/${projectId}/sync/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            if (!response.ok) throw new Error('Failed to sync project');

            this.loadProjects(); // Обновляем список после синхронизации
        } catch (error) {
            console.error('Error syncing project:', error);
            // Можно добавить уведомление об ошибке
        }
    },

    // Удаление проекта
    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/automation-projects/${projectId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete project');

            this.loadProjects(); // Обновляем список после удаления
        } catch (error) {
            console.error('Error deleting project:', error);
            // Можно добавить уведомление об ошибке
        }
    }
};

// Глобальные функции для модального окна
window.showAddProjectModal = function() {
    document.getElementById('addProjectModal').classList.remove('hidden');
};

window.hideAddProjectModal = function() {
    document.getElementById('addProjectModal').classList.add('hidden');
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    AutomationProjectsManager.init();
}); 