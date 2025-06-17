// Automation project management modal
import { automationAPI } from '../api/automation.js';
import ToastManager from '../utils/toast.js';

export class AutomationModal {
    constructor() {
        this.toastManager = ToastManager;
        this.currentProject = null;
        this.createModal();
    }

    createModal() {
        const modalHTML = `
            <div id="automation-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex items-center justify-between">
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white" data-i18n="automationProjects">Automation Projects</h2>
                            <button onclick="automationModal.close()" class="text-gray-400 hover:text-gray-500">
                                <i class="ri-close-line text-2xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                        <!-- List of automation projects -->
                        <div id="automation-projects-list" class="space-y-4 mb-6">
                            <!-- Projects will be loaded here -->
                        </div>
                        
                        <!-- Add new project form -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 class="text-lg font-semibold mb-4" data-i18n="addRepository">Add Repository</h3>
                            <form id="add-automation-form" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <span data-i18n="repositoryName">Repository Name</span> <span class="text-red-500">*</span>
                                    </label>
                                    <input type="text" name="name" required
                                           class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <span data-i18n="repositoryUrl">Repository URL</span> <span class="text-red-500">*</span>
                                    </label>
                                    <input type="url" name="repository_url" required
                                           placeholder="https://github.com/username/repo"
                                           class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white">
                                </div>
                                
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <span data-i18n="repositoryType">Repository Type</span>
                                        </label>
                                        <select name="repository_type" 
                                                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white">
                                            <option value="github">GitHub</option>
                                            <option value="gitlab">GitLab</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <span data-i18n="branch">Branch</span>
                                        </label>
                                        <input type="text" name="branch" value="main"
                                               class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white">
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <span data-i18n="accessToken">Access Token</span>
                                        <span class="text-xs text-gray-500" data-i18n="forPrivateRepos">(for private repos)</span>
                                    </label>
                                    <input type="password" name="access_token"
                                           class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-coral-500 focus:border-coral-500 dark:bg-gray-700 dark:text-white">
                                </div>
                                
                                <div class="flex justify-end space-x-3">
                                    <button type="button" onclick="automationModal.close()"
                                            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                                        <span data-i18n="cancel">Cancel</span>
                                    </button>
                                    <button type="submit"
                                            class="px-4 py-2 bg-coral-600 text-white rounded-lg hover:bg-coral-700 flex items-center">
                                        <i class="ri-add-line mr-2"></i>
                                        <span data-i18n="addRepository">Add Repository</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup form submission
        const form = document.getElementById('add-automation-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async show(projectId) {
        this.currentProject = projectId;
        const modal = document.getElementById('automation-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        await this.loadProjects();
    }

    close() {
        const modal = document.getElementById('automation-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Reset form
        document.getElementById('add-automation-form').reset();
    }

    async loadProjects() {
        try {
            const response = await automationAPI.getAutomationProjects(this.currentProject);
            const projects = response.results || [];
            
            const listContainer = document.getElementById('automation-projects-list');
            
            if (projects.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <i class="ri-git-repository-line text-4xl mb-2"></i>
                        <p data-i18n="noAutomationProjects">No automation projects connected</p>
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = projects.map(project => `
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 dark:text-white">${project.name}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            <i class="ri-git-branch-line mr-1"></i>${project.branch}
                            <span class="mx-2">•</span>
                            <i class="ri-${project.repository_type === 'github' ? 'github' : 'gitlab'}-fill mr-1"></i>${project.repository_type}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            ${project.repository_url}
                        </p>
                        <div class="mt-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                project.sync_status === 'synced' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                project.sync_status === 'syncing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                            }">
                                ${project.sync_status}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                        <button onclick="automationModal.syncProject(${project.id})"
                                class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                title="Sync repository">
                            <i class="ri-refresh-line"></i>
                        </button>
                        <button onclick="automationModal.deleteProject(${project.id})"
                                class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                title="Delete">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load automation projects:', error);
            this.toastManager.showError('Failed to load automation projects');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const data = {
            name: formData.get('name'),
            repository_url: formData.get('repository_url'),
            repository_type: formData.get('repository_type'),
            branch: formData.get('branch'),
            access_token: formData.get('access_token') || undefined
        };
        
        try {
            await automationAPI.createAutomationProject(this.currentProject, data);
            this.toastManager.showSuccess('Repository added successfully');
            event.target.reset();
            await this.loadProjects();
        } catch (error) {
            console.error('Failed to add repository:', error);
            this.toastManager.showError('Failed to add repository');
        }
    }

    async syncProject(projectId) {
        try {
            await automationAPI.syncRepository(this.currentProject, projectId);
            this.toastManager.showSuccess('Repository sync started');
            await this.loadProjects();
        } catch (error) {
            console.error('Failed to sync repository:', error);
            this.toastManager.showError('Failed to sync repository');
        }
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this automation project?')) {
            return;
        }
        
        try {
            await automationAPI.deleteAutomationProject(this.currentProject, projectId);
            this.toastManager.showSuccess('Repository removed successfully');
            await this.loadProjects();
        } catch (error) {
            console.error('Failed to delete repository:', error);
            this.toastManager.showError('Failed to delete repository');
        }
    }
}

// Create global instance
window.automationModal = new AutomationModal();