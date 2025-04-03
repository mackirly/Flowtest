import { API, ApiClient } from './api-config.js';

document.addEventListener('DOMContentLoaded', () => {
    loadRepositories();
    setupEventListeners();
});

// Load connected repositories
async function loadRepositories() {
    try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/api/automation-projects/');
        if (!response.ok) throw new Error('Failed to load repositories');
        
        const repositories = await response.json();
        updateRepositoriesList(repositories);
        updateRepoSelect(repositories);
    } catch (error) {
        console.error('Error loading repositories:', error);
        showNotification('Failed to load repositories', 'error');
    }
}

// Update repositories list in UI
function updateRepositoriesList(repositories) {
    const repositoriesList = document.getElementById('repositoriesList');
    repositoriesList.innerHTML = '';

    repositories.forEach(repo => {
        const repoElement = document.createElement('div');
        repoElement.className = 'border rounded-lg p-4 dark:border-gray-700';
        repoElement.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-bold dark:text-white">${repo.name}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${repo.repository_url}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Branch: ${repo.branch}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Framework: ${repo.framework}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Status: ${repo.sync_status}</p>
                </div>
                <div class="space-x-2">
                    <button class="sync-repo bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700" data-id="${repo.id}">
                        <i class="fas fa-sync"></i> Sync
                    </button>
                    <button class="delete-repo bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700" data-id="${repo.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        repositoriesList.appendChild(repoElement);
    });
}

// Update repository select dropdown
function updateRepoSelect(repositories) {
    const repoSelect = document.getElementById('repoSelect');
    repoSelect.innerHTML = '<option value="">Select Repository</option>';
    repositories.forEach(repo => {
        repoSelect.innerHTML += `<option value="${repo.id}">${repo.name}</option>`;
    });
}

// Load tests for selected repository
async function loadTests(repoId) {
    try {
        const response = await fetchWithAuth(`http://127.0.0.1:8000/api/automation-projects/${repoId}/tests/`);
        if (!response.ok) throw new Error('Failed to load tests');
        
        const tests = await response.json();
        updateTestsList(tests);
    } catch (error) {
        console.error('Error loading tests:', error);
        showNotification('Failed to load tests', 'error');
    }
}

// Update tests list in UI
function updateTestsList(tests) {
    const testsList = document.getElementById('testsList');
    testsList.innerHTML = '';

    tests.forEach(test => {
        const testElement = document.createElement('div');
        testElement.className = 'flex items-center space-x-2';
        testElement.innerHTML = `
            <input type="checkbox" id="test-${test.id}" class="test-checkbox" 
                   value="${test.id}" ${test.available ? '' : 'disabled'}>
            <label for="test-${test.id}" class="text-sm ${test.available ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}">
                ${test.name}
                ${!test.available ? '<span class="text-red-500">(No matching test in repository)</span>' : ''}
            </label>
        `;
        testsList.appendChild(testElement);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Repository form submission
    document.getElementById('repositoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('repoName').value,
            repository_url: document.getElementById('repoUrl').value,
            branch: document.getElementById('branch').value,
            framework: document.getElementById('framework').value,
            tests_directory: document.getElementById('testsDir').value
        };

        try {
            const response = await fetchWithAuth('http://127.0.0.1:8000/api/automation-projects/', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to connect repository');
            
            showNotification('Repository connected successfully', 'success');
            loadRepositories();
            e.target.reset();
        } catch (error) {
            console.error('Error connecting repository:', error);
            showNotification('Failed to connect repository', 'error');
        }
    });

    // Repository selection change
    document.getElementById('repoSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            loadTests(e.target.value);
        }
    });

    // Run selected tests
    document.getElementById('runSelectedTests').addEventListener('click', async () => {
        const selectedTests = Array.from(document.querySelectorAll('.test-checkbox:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedTests.length === 0) {
            showNotification('Please select tests to run', 'warning');
            return;
        }

        const repoId = document.getElementById('repoSelect').value;
        if (!repoId) {
            showNotification('Please select a repository', 'warning');
            return;
        }

        try {
            const response = await fetchWithAuth(`http://127.0.0.1:8000/api/automation-projects/${repoId}/run_tests/`, {
                method: 'POST',
                body: JSON.stringify({ test_ids: selectedTests })
            });

            if (!response.ok) throw new Error('Failed to run tests');
            
            showNotification('Tests started successfully', 'success');
        } catch (error) {
            console.error('Error running tests:', error);
            showNotification('Failed to run tests', 'error');
        }
    });

    // Run all tests
    document.getElementById('runAllTests').addEventListener('click', async () => {
        const repoId = document.getElementById('repoSelect').value;
        if (!repoId) {
            showNotification('Please select a repository', 'warning');
            return;
        }

        try {
            const response = await fetchWithAuth(`http://127.0.0.1:8000/api/automation-projects/${repoId}/run_all_tests/`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to run tests');
            
            showNotification('All tests started successfully', 'success');
        } catch (error) {
            console.error('Error running tests:', error);
            showNotification('Failed to run tests', 'error');
        }
    });

    // Schedule tests
    document.getElementById('scheduleTests').addEventListener('click', () => {
        document.getElementById('scheduleModal').classList.remove('hidden');
    });

    // Cancel schedule
    document.getElementById('cancelSchedule').addEventListener('click', () => {
        document.getElementById('scheduleModal').classList.add('hidden');
    });

    // Schedule type change
    document.getElementById('scheduleType').addEventListener('change', (e) => {
        const weekDaySelector = document.getElementById('weekDaySelector');
        weekDaySelector.classList.toggle('hidden', e.target.value !== 'weekly');
    });

    // Schedule form submission
    document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const repoId = document.getElementById('repoSelect').value;
        if (!repoId) {
            showNotification('Please select a repository', 'warning');
            return;
        }

        const scheduleData = {
            type: document.getElementById('scheduleType').value,
            time: document.getElementById('scheduleTime').value,
            days: Array.from(document.querySelectorAll('.weekday:checked'))
                .map(checkbox => parseInt(checkbox.value))
        };

        try {
            const response = await fetchWithAuth(`http://127.0.0.1:8000/api/automation-projects/${repoId}/schedule/`, {
                method: 'POST',
                body: JSON.stringify(scheduleData)
            });

            if (!response.ok) throw new Error('Failed to schedule tests');
            
            showNotification('Tests scheduled successfully', 'success');
            document.getElementById('scheduleModal').classList.add('hidden');
        } catch (error) {
            console.error('Error scheduling tests:', error);
            showNotification('Failed to schedule tests', 'error');
        }
    });

    // Delete repository
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-repo')) {
            const repoId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this repository?')) {
                try {
                    const response = await fetchWithAuth(`http://127.0.0.1:8000/api/automation-projects/${repoId}/`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) throw new Error('Failed to delete repository');
                    
                    showNotification('Repository deleted successfully', 'success');
                    loadRepositories();
                } catch (error) {
                    console.error('Error deleting repository:', error);
                    showNotification('Failed to delete repository', 'error');
                }
            }
        }
    });

    // Sync repository
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('sync-repo')) {
            const repoId = e.target.dataset.id;
            try {
                const response = await fetchWithAuth(`http://127.0.0.1:8000/api/automation-projects/${repoId}/sync/`, {
                    method: 'POST'
                });

                if (!response.ok) throw new Error('Failed to sync repository');
                
                showNotification('Repository synced successfully', 'success');
                loadRepositories();
            } catch (error) {
                console.error('Error syncing repository:', error);
                showNotification('Failed to sync repository', 'error');
            }
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Implement your notification system here
    console.log(`${type}: ${message}`);
}

export class Repository {
    constructor() {
        this.client = ApiClient;
    }

    async getRepositories() {
        try {
            const response = await this.client.fetch(API.AUTOMATION.ALL);
            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching repositories:', error);
            return [];
        }
    }

    async getRepositoryTests(repoId) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.TESTS(repoId));
            if (!response.ok) {
                throw new Error('Failed to fetch repository tests');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching repository tests:', error);
            return [];
        }
    }

    async createRepository(data) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.ALL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to create repository');
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating repository:', error);
            throw error;
        }
    }

    async runTests(repoId, testIds) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.RUN_TESTS(repoId), {
                method: 'POST',
                body: JSON.stringify({ test_ids: testIds })
            });
            if (!response.ok) {
                throw new Error('Failed to run tests');
            }
            return await response.json();
        } catch (error) {
            console.error('Error running tests:', error);
            throw error;
        }
    }

    async runAllTests(repoId) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.RUN_ALL_TESTS(repoId), {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('Failed to run all tests');
            }
            return await response.json();
        } catch (error) {
            console.error('Error running all tests:', error);
            throw error;
        }
    }

    async scheduleTests(repoId, schedule) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.SCHEDULE(repoId), {
                method: 'POST',
                body: JSON.stringify(schedule)
            });
            if (!response.ok) {
                throw new Error('Failed to schedule tests');
            }
            return await response.json();
        } catch (error) {
            console.error('Error scheduling tests:', error);
            throw error;
        }
    }

    async getRepositoryDetails(repoId) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.DETAILS(repoId), {
                method: 'GET'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch repository details');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching repository details:', error);
            throw error;
        }
    }

    async syncRepository(repoId) {
        try {
            const response = await this.client.fetch(API.AUTOMATION.SYNC(repoId), {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('Failed to sync repository');
            }
            return await response.json();
        } catch (error) {
            console.error('Error syncing repository:', error);
            throw error;
        }
    }
}
