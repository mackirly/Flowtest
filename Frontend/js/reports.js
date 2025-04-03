/**
 * Reports.js - Handles all report functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize i18n if available
    if (typeof i18n !== 'undefined') {
        i18n.init();
    }

    initializeUserMenu();
    loadProjects();
    setupEventListeners();
    
    // Load templates data
    loadTemplatesData();
});

// Tab functionality removed to simplify the UI

/**
 * Initialize user menu functionality
 */
function initializeUserMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenu = document.getElementById('userMenu');

    if (userMenuButton && userMenu) {
        userMenuButton.addEventListener('click', () => {
            const expanded = userMenuButton.getAttribute('aria-expanded') === 'true' || false;
            userMenuButton.setAttribute('aria-expanded', !expanded);
            userMenu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                userMenuButton.setAttribute('aria-expanded', 'false');
                userMenu.classList.add('hidden');
            }
        });
    }

    // Load user info
    loadUserInfo();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Date range change
    const dateRange = document.getElementById('date-range');
    const customDateRange = document.getElementById('custom-date-range');
    
    if (dateRange) {
        dateRange.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateRange.classList.remove('hidden');
            } else {
                customDateRange.classList.add('hidden');
            }
        });
    }

    // Apply filters
    const applyFilters = document.getElementById('apply-filters');
    if (applyFilters) {
        applyFilters.addEventListener('click', loadTestResultsData);
    }

    // Export buttons
    const exportPdf = document.getElementById('export-pdf');
    const exportExcel = document.getElementById('export-excel');
    
    if (exportPdf) {
        exportPdf.addEventListener('click', () => exportReport('pdf'));
    }
    
    if (exportExcel) {
        exportExcel.addEventListener('click', () => exportReport('excel'));
    }

    // Pagination
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadTestResultsData();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadTestResultsData();
            }
        });
    }

    // Template Modal
    const createTemplateBtn = document.getElementById('create-template-btn');
    const closeModal = document.getElementById('close-modal');
    const cancelTemplate = document.getElementById('cancel-template');
    const saveTemplate = document.getElementById('save-template');
    const templateModal = document.getElementById('template-modal');
    
    if (createTemplateBtn) {
        createTemplateBtn.addEventListener('click', () => {
            // Reset form
            document.getElementById('template-name').value = '';
            document.getElementById('template-description').value = '';
            // Элемент report-type удален из формы
            document.getElementById('default-time-range').value = '30d';
            
            // Show modal
            templateModal.classList.remove('hidden');
            templateModal.classList.add('flex');
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            templateModal.classList.add('hidden');
            templateModal.classList.remove('flex');
        });
    }
    
    if (cancelTemplate) {
        cancelTemplate.addEventListener('click', () => {
            templateModal.classList.add('hidden');
            templateModal.classList.remove('flex');
        });
    }
    
    if (saveTemplate) {
        saveTemplate.addEventListener('click', saveTemplateData);
    }

    // Test Details Modal
    const closeTestDetails = document.getElementById('close-test-details');
    const testDetailsModal = document.getElementById('test-details-modal');
    
    if (closeTestDetails) {
        closeTestDetails.addEventListener('click', () => {
            testDetailsModal.classList.add('hidden');
            testDetailsModal.classList.remove('flex');
        });
    }

    // Project selector
    const projectSelector = document.getElementById('projectSelector');
    if (projectSelector) {
        projectSelector.addEventListener('change', () => {
            // Reload templates data
            loadTemplatesData();
        });
    }
    
    // Report editor button removed - no longer needed
}

/**
 * Load user info
 */
function loadUserInfo() {
    // Try to get user data from localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('user-avatar');
            
            if (userName) {
                userName.textContent = user.username || user.name || 'User';
            }
            
            if (userAvatar) {
                if (user.avatar) {
                    const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${i18nConfig.API_BASE_URL}${user.avatar}`;
                    userAvatar.innerHTML = `<img src="${avatarUrl}" class="w-8 h-8 rounded-full" alt="User avatar">`;
                } else {
                    // Set initials if no avatar
                    const initials = (user.username || user.name || 'U').charAt(0).toUpperCase();
                    userAvatar.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-coral-500 flex items-center justify-center text-white">
                            ${initials}
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error parsing user data from localStorage:', error);
            setDefaultUserInfo();
        }
    } else {
        // No user data found, load it from API
        if (typeof loadUserData === 'function') {
            loadUserData().catch(error => {
                console.error('Error loading user data from API:', error);
                setDefaultUserInfo();
            });
        } else {
            setDefaultUserInfo();
        }
    }
}

/**
 * Set default user info when data is not available
 */
function setDefaultUserInfo() {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('user-avatar');
    
    if (userName) {
        userName.textContent = 'User';
    }
    
    if (userAvatar) {
        userAvatar.innerHTML = `<span class="text-sm font-medium text-gray-600">U</span>`;
    }
}

/**
 * Load projects from API
 */
function loadProjects() {
    const projectSelector = document.getElementById('projectSelector');
    if (!projectSelector) return;
    
    // Clear existing options except the first one
    while (projectSelector.options.length > 1) {
        projectSelector.remove(1);
    }
    
    // Show loading option
    const loadingOption = document.createElement('option');
    loadingOption.textContent = 'Loading projects...';
    loadingOption.disabled = true;
    projectSelector.appendChild(loadingOption);
    
    // Fetch projects from API
    fetchWithAuth(config.ENDPOINTS.PROJECTS, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load projects');
        }
        return response.json();
    })
    .then(data => {
        console.log('Projects loaded:', data);
        
        // Remove loading option
        if (projectSelector.contains(loadingOption)) {
            projectSelector.removeChild(loadingOption);
        }
        
        if (Array.isArray(data) && data.length > 0) {
            // Add projects to selector
            data.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelector.appendChild(option);
            });
            
            // Set first project as selected and trigger change event
            if (projectSelector.options.length > 1) {
                projectSelector.selectedIndex = 1;
                // Trigger change event to load templates for selected project
                const event = new Event('change');
                projectSelector.dispatchEvent(event);
            }
        } else {
            // No projects found
            const noProjectsOption = document.createElement('option');
            noProjectsOption.textContent = 'No projects found';
            noProjectsOption.disabled = true;
            projectSelector.appendChild(noProjectsOption);
        }
    })
    .catch(error => {
        console.error('Error loading projects:', error);
        
        // Remove loading option
        if (projectSelector.contains(loadingOption)) {
            projectSelector.removeChild(loadingOption);
        }
        
        // Show error option
        const errorOption = document.createElement('option');
        errorOption.textContent = 'Error loading projects';
        errorOption.disabled = true;
        projectSelector.appendChild(errorOption);
        
        // Show fallback projects for testing
        const fallbackProjects = [
            { id: 1, name: 'Test Project 1' },
            { id: 2, name: 'Test Project 2' }
        ];
        
        fallbackProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelector.appendChild(option);
        });
    });
}

// Pagination variables
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;

// Overview and Test Results functionality removed to simplify the UI

/**
 * Load templates data
 */
function loadTemplatesData() {
    const projectId = document.getElementById('projectSelector').value;
    
    if (!projectId) {
        console.log('No project selected');
        return;
    }
    
    // Show loading indicator
    const templatesGrid = document.getElementById('templates-grid');
    templatesGrid.innerHTML = `<div class="col-span-3 text-center p-8">
        <i class="ri-loader-4-line text-4xl text-coral-500 animate-spin mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400 text-lg" data-i18n="loadingTemplates">Loading templates...</p>
    </div>`;
    
    // Fetch templates from API using fetchWithAuth
    fetchWithAuth(`${config.ENDPOINTS.REPORTS.TEMPLATES}?project=${projectId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Process API data
        let templates = data;
        
        // If API returns no templates or fails, use sample templates
        if (!templates || templates.length === 0) {
            templates = [
                {
                    id: 1,
                    name: "Test Results Summary",
                    description: "Shows overall test execution results with pass/fail/skip statistics.",
                    icon: "pie-chart-line",
                    color: "green"
                },
                {
                    id: 2,
                    name: "Execution Trend Report",
                    description: "Tracks test execution trends over time with success rate analysis.",
                    icon: "line-chart-line",
                    color: "blue"
                },
                {
                    id: 3,
                    name: "Test Duration Analysis",
                    description: "Analyzes test execution duration across different test types.",
                    icon: "timer-line",
                    color: "orange"
                },
                {
                    id: 4,
                    name: "Failure Analysis Report",
                    description: "Deep analysis of test failures with error categorization.",
                    icon: "error-warning-line",
                    color: "red"
                },
                {
                    id: 5,
                    name: "Test Coverage Summary",
                    description: "Overview of test coverage across different components.",
                    icon: "checkbox-multiple-line",
                    color: "purple"
                }
            ];
        } else {
            // Map API data to expected format if needed
            templates = templates.map(template => {
                return {
                    id: template.id,
                    name: template.name,
                    description: template.description || "No description provided",
                    icon: template.configuration?.icon || "pie-chart-line",
                    color: template.configuration?.color || "green"
                };
            });
        }
        
        renderTemplates(templates);
    })
    .catch(error => {
        console.error('Error loading templates:', error);
        
        // Fallback to sample templates
        const templates = [
            {
                id: 1,
                name: "Test Results Summary",
                description: "Shows overall test execution results with pass/fail/skip statistics.",
                icon: "pie-chart-line",
                color: "green"
            },
            {
                id: 2, 
                name: "Execution Trend Report",
                description: "Tracks test execution trends over time with success rate analysis.",
                icon: "line-chart-line",
                color: "blue"
            },
            {
                id: 3,
                name: "Test Duration Analysis",
                description: "Analyzes test execution duration across different test types.",
                icon: "timer-line",
                color: "orange"
            }
        ];
        
        renderTemplates(templates);
        showToast('Ошибка загрузки шаблонов с сервера, показаны примеры', 'error');
    });
}

/**
 * Render templates to the grid
 * @param {Array} templates - The templates to render
 */
function renderTemplates(templates) {
    const templatesGrid = document.getElementById('templates-grid');
    
    // Clear loading indicator
    templatesGrid.innerHTML = '';
    
    if (templates.length === 0) {
        templatesGrid.innerHTML = `<div class="col-span-3 text-center p-8">
            <i class="ri-file-list-3-line text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 dark:text-gray-400 text-lg" data-i18n="noTemplatesFound">No templates found</p>
            <button id="create-first-template" class="mt-4 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600">
                <i class="ri-add-line mr-1"></i> <span data-i18n="createFirstTemplate">Create your first template</span>
            </button>
        </div>`;
        
        document.getElementById('create-first-template').addEventListener('click', () => {
            document.getElementById('create-template-btn').click();
        });
    } else {
        // Generate template cards
        templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300';
            
            card.innerHTML = `
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 class="font-medium text-gray-900 dark:text-white">${template.name}</h3>
                    <div class="flex space-x-2">
                        <button class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 edit-template" data-id="${template.id}" title="Edit Template">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="text-gray-500 hover:text-red-500 delete-template" data-id="${template.id}" title="Delete Template">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
                <div class="p-4">
                    <div class="flex justify-center items-center mb-4 h-40 bg-gray-100 dark:bg-gray-700 rounded">
                        <div class="text-${template.color}-500 dark:text-${template.color}-400 text-center">
                            <i class="ri-${template.icon} text-5xl"></i>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        ${template.description}
                    </p>
                    <div class="flex justify-end">
                        <button class="px-4 py-2 bg-coral-100 text-coral-600 rounded-lg hover:bg-coral-200 use-template" data-id="${template.id}">
                            <span data-i18n="useTemplate">Use Template</span>
                        </button>
                    </div>
                </div>
            `;
            
            templatesGrid.appendChild(card);
        });
        
        // Add event listeners to template buttons
        document.querySelectorAll('.edit-template').forEach(button => {
            button.addEventListener('click', (e) => {
                const templateId = e.currentTarget.getAttribute('data-id');
                editTemplate(templateId);
            });
        });
        
        document.querySelectorAll('.delete-template').forEach(button => {
            button.addEventListener('click', (e) => {
                const templateId = e.currentTarget.getAttribute('data-id');
                deleteTemplate(templateId);
            });
        });
        
        document.querySelectorAll('.use-template').forEach(button => {
            button.addEventListener('click', (e) => {
                const templateId = e.currentTarget.getAttribute('data-id');
                useTemplate(templateId);
            });
        });
    }
}

// Helper function to edit a template
function editTemplate(templateId) {
    // Get current project ID
    const projectId = document.getElementById('projectSelector').value;
    
    // Immediately redirect to the report editor without showing the modal
    // since the modal will be lost when we redirect anyway
    window.location.href = `report-editor.html?templateId=${templateId}&projectId=${projectId}&mode=edit`;
}

// Helper function to delete a template
function deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
        // Show deleting notification
        showToast('Удаление шаблона...', 'info');
        
        // Delete template via API using fetchWithAuth
        fetchWithAuth(`${config.ENDPOINTS.REPORTS.TEMPLATES}${templateId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Template not found');
                }
                throw new Error('Network response was not ok');
            }
            
            showToast('Шаблон успешно удален', 'success');
            
            // Reload templates
            loadTemplatesData();
        })
        .catch(error => {
            console.error('Error deleting template:', error);
            showToast('Ошибка при удалении шаблона', 'error');
        });
    }
}

// Helper function to use a template
function useTemplate(templateId) {
    // Show loading message
    showToast('Открытие редактора шаблона...', 'info');
    
    // Get current project ID
    const projectId = document.getElementById('projectSelector').value;
    
    // Open template editor on the same page
    // This will open the template for editing with all components
    window.location.href = `report-editor.html?templateId=${templateId}&projectId=${projectId}&mode=edit`;
}

// Chart and test run functionality removed to simplify the UI

/**
 * Show test details
 * @param {string} testId - The test ID
 */
function showTestDetails(testId) {
    const testDetailsModal = document.getElementById('test-details-modal');
    
    // Simulated API call to get test details
    setTimeout(() => {
        // In a real app, you'd fetch the test details from the server
        const test = generateSampleTestResults(1)[0];
        test.id = testId;
        
        // Update modal content
        document.getElementById('test-details-title').textContent = test.name;
        
        // Status with color
        const statusElement = document.getElementById('test-details-status');
        statusElement.textContent = test.status;
        statusElement.className = 'font-medium text-gray-900 dark:text-white capitalize';
        
        if (test.status === 'passed') {
            statusElement.classList.add('text-green-500');
        } else if (test.status === 'failed') {
            statusElement.classList.add('text-red-500');
        } else {
            statusElement.classList.add('text-yellow-500');
        }
        
        document.getElementById('test-details-duration').textContent = test.duration;
        document.getElementById('test-details-type').textContent = test.type;
        document.getElementById('test-details-date').textContent = test.date;
        
        // Sample test output
        document.getElementById('test-details-output').textContent = generateTestOutput(test);
        
        // Create test history chart
        createTestHistoryChart();
        
        // Show modal
        testDetailsModal.classList.remove('hidden');
        testDetailsModal.classList.add('flex');
    }, 300);
}

/**
 * Create test history chart
 */
function createTestHistoryChart() {
    const ctx = document.getElementById('test-history-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.historyChart) {
        window.historyChart.destroy();
    }
    
    // Sample data - last 10 runs
    const labels = [];
    for (let i = 10; i >= 1; i--) {
        labels.push(`Run ${i}`);
    }
    
    // Generate random durations between 1 and 3 minutes (in seconds)
    const durations = Array.from({ length: 10 }, () => Math.floor(Math.random() * 120) + 60);
    
    // Status 1 = passed, 0 = failed
    const statuses = Array.from({ length: 10 }, () => Math.random() > 0.2 ? 1 : 0);
    
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Duration (seconds)',
                data: durations,
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                yAxisID: 'y',
                tension: 0.3
            },
            {
                label: 'Status',
                data: statuses,
                backgroundColor: ctx => {
                    const value = ctx.raw;
                    return value === 1 ? 'rgba(72, 187, 120, 0.7)' : 'rgba(237, 100, 100, 0.7)';
                },
                borderColor: ctx => {
                    const value = ctx.raw;
                    return value === 1 ? 'rgba(72, 187, 120, 1)' : 'rgba(237, 100, 100, 1)';
                },
                borderWidth: 1,
                yAxisID: 'y1',
                type: 'bar'
            }
        ]
    };
    
    // Create chart
    window.historyChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#4a5568'
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Duration (seconds)',
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#4a5568'
                    },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#4a5568'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Status (0=Failed, 1=Passed)',
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#4a5568'
                    },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#4a5568',
                        callback: function(value) {
                            return value === 0 ? 'Failed' : 'Passed';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#4a5568'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

/**
 * Save template data
 */
function saveTemplateData() {
    try {
        const templateName = document.getElementById('template-name').value;
        const templateDescription = document.getElementById('template-description').value;
        const defaultTimeRange = document.getElementById('default-time-range').value;
        const projectId = document.getElementById('projectSelector').value;
        console.log('Form values:', { templateName, templateDescription, defaultTimeRange, projectId });
        
        // Validate required fields
        if (!templateName) {
            showToast('Please enter a template name', 'error');
            return;
        }
        
        if (!projectId) {
            showToast('Please select a project', 'error');
            return;
        }
        
        // Components
        const includeSummary = document.getElementById('include-summary').checked;
        const includeStatusChart = document.getElementById('include-status-chart').checked;
        const includeTrendChart = document.getElementById('include-trend-chart').checked;
        const includeTestTable = document.getElementById('include-test-table').checked;
        
        // Prepare template data for API
        const templateData = {
            name: templateName,
            description: templateDescription,
            project: parseInt(projectId, 10),
            is_public: true,
            configuration: {
                defaultTimeRange: defaultTimeRange,
                metrics: ['totalTests', 'successRate', 'averageTime'],
                components: {
                    summary: includeSummary,
                    statusChart: includeStatusChart,
                    trendChart: includeTrendChart,
                    testTable: includeTestTable
                }
            }
        };
        
        // Show saving notification
        showToast('Сохранение шаблона...', 'info');
        
        console.log('Template data:', templateData);
        
        // First get the base URL for the API
        let apiUrl = config.API_BASE_URL;
        if (apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }
        
        // Using fetch directly for debugging
        fetch(`${apiUrl}/report-templates/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            },
            body: JSON.stringify(templateData)
        })
    .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            return response.text().then(text => {
                if (!response.ok) {
                    console.error('Error response body:', text);
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                
                try {
                    return text ? JSON.parse(text) : {};
                } catch (e) {
                    console.log('Response is not JSON:', text);
                    return { message: text };
                }
            });
        })
        .then(data => {
            console.log('Template saved:', data);
            
            // Close modal and show success message
            document.getElementById('template-modal').classList.add('hidden');
            document.getElementById('template-modal').classList.remove('flex');
            
            showToast('Шаблон успешно сохранен', 'success');
            
            // Reload templates
            loadTemplatesData();
        })
        .catch(error => {
            console.error('Error saving template:', error);
            showToast(`Ошибка при сохранении шаблона: ${error.message}`, 'error');
        });
    } catch (error) {
        console.error('Exception in saveTemplateData:', error);
        showToast(`Unexpected error: ${error.message}`, 'error');
    }
}

// Get access token from localStorage
function getAccessToken() {
    return localStorage.getItem('access') || '';
}

/**
 * Export report
 * @param {string} format - The export format (pdf, excel)
 */
function exportReport(format) {
    // In a real app, you'd call an API to generate and download the report
    const formatName = format === 'pdf' ? 'PDF' : 'Excel';
    showToast(`Exporting report as ${formatName}...`, 'info');
    
    // Simulate export delay
    setTimeout(() => {
        showToast(`Report exported as ${formatName} successfully`, 'success');
    }, 1500);
}

/**
 * Show toast notification
 * @param {string} message - The message to display
 * @param {string} type - The toast type (success, error, info)
 */
function showToast(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // Fallback if toast.js is not loaded
        const toastContainer = document.getElementById('toast-container');
        
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        
        // Set toast classes based on type
        toast.className = 'mb-3 p-4 rounded-lg shadow-lg flex items-center';
        
        if (type === 'success') {
            toast.classList.add('bg-green-500', 'text-white');
        } else if (type === 'error') {
            toast.classList.add('bg-red-500', 'text-white');
        } else {
            toast.classList.add('bg-blue-500', 'text-white');
        }
        
        // Set toast content
        toast.innerHTML = `
            <div class="mr-3">
                <i class="ri-${type === 'success' ? 'check' : type === 'error' ? 'close' : 'information'}-line text-xl"></i>
            </div>
            <div>
                ${message}
            </div>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

/**
 * Generate sample test results
 * @param {number} count - Number of results to generate
 * @returns {Array} Array of test results
 */
function generateSampleTestResults(count) {
    const results = [];
    const testTypes = ['unit', 'integration', 'e2e'];
    const statuses = ['passed', 'failed', 'skipped'];
    const statusWeights = [0.8, 0.15, 0.05]; // 80% pass, 15% fail, 5% skip
    
    for (let i = 0; i < count; i++) {
        // Generate weighted random status
        let status;
        const rand = Math.random();
        if (rand < statusWeights[0]) {
            status = statuses[0]; // passed
        } else if (rand < statusWeights[0] + statusWeights[1]) {
            status = statuses[1]; // failed
        } else {
            status = statuses[2]; // skipped
        }
        
        // Generate random date in the last 30 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        results.push({
            id: `test-${i + 1}`,
            name: `Test Case ${i + 1}: Verify ${['Login', 'Signup', 'Dashboard', 'Profile', 'Settings'][i % 5]} functionality`,
            status: status,
            type: testTypes[Math.floor(Math.random() * testTypes.length)],
            duration: `${Math.floor(Math.random() * 3) + 1}m ${Math.floor(Math.random() * 60)}s`,
            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        });
    }
    
    return results;
}

/**
 * Generate sample test output
 * @param {Object} test - Test object
 * @returns {string} Test output
 */
function generateTestOutput(test) {
    if (test.status === 'passed') {
        return `
=== Test Started at ${test.date} ===
Running ${test.name} (${test.type})
...
Test completed successfully in ${test.duration}
All assertions passed
=== Test Passed ===
        `;
    } else if (test.status === 'failed') {
        return `
=== Test Started at ${test.date} ===
Running ${test.name} (${test.type})
...
ERROR: Assertion failed at line 42
Expected: true
Actual: false
Stack trace:
  at testFunction (test_file.js:42:5)
  at runTest (test_runner.js:123:10)
  at executeTest (test_executor.js:77:8)
=== Test Failed after ${test.duration} ===
        `;
    } else {
        return `
=== Test Started at ${test.date} ===
Running ${test.name} (${test.type})
...
WARNING: Test skipped due to dependency failure
Dependency 'Authentication Service' is not available
=== Test Skipped ===
        `;
    }
}

// Toggle notifications panel
function toggleNotifications() {
    const notificationList = document.getElementById('notificationList');
    notificationList.classList.toggle('hidden');
    
    // If showing notifications, load them
    if (!notificationList.classList.contains('hidden')) {
        loadNotifications();
    }
}

// Load notifications
function loadNotifications() {
    const notificationList = document.getElementById('notificationList');
    
    // Simulated notifications
    const notifications = [
        { id: 1, message: 'Test suite "Authentication" completed', time: '10 minutes ago', read: false },
        { id: 2, message: 'New test case added by John Doe', time: '1 hour ago', read: false },
        { id: 3, message: '3 tests failed in "Payment Processing"', time: '3 hours ago', read: true }
    ];
    
    // Update notification count
    const unreadCount = notifications.filter(n => !n.read).length;
    const notificationCount = document.getElementById('notification-count');
    
    if (unreadCount > 0) {
        notificationCount.textContent = unreadCount;
        notificationCount.classList.remove('hidden');
    } else {
        notificationCount.classList.add('hidden');
    }
    
    // Generate HTML
    let html = `
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="notifications">Notifications</h3>
        </div>
    `;
    
    if (notifications.length === 0) {
        html += `
            <div class="p-4 text-center text-gray-500 dark:text-gray-400" data-i18n="noNotifications">
                No notifications
            </div>
        `;
    } else {
        html += `<div class="max-h-60 overflow-y-auto">`;
        
        notifications.forEach(notification => {
            html += `
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 ${notification.read ? '' : 'bg-blue-50 dark:bg-blue-900'}">
                    <div class="flex items-start">
                        <div class="flex-1">
                            <p class="text-sm text-gray-900 dark:text-white">${notification.message}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${notification.time}</p>
                        </div>
                        ${!notification.read ? `
                            <button class="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 mark-read" data-id="${notification.id}">
                                <i class="ri-check-double-line"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        html += `
            <div class="p-2 text-center border-t border-gray-200 dark:border-gray-700">
                <a href="#" class="text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400" data-i18n="viewAllNotifications">View all notifications</a>
            </div>
        `;
    }
    
    // Update notification list
    notificationList.innerHTML = html;
    
    // Add event listeners to mark-read buttons
    document.querySelectorAll('.mark-read').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = button.getAttribute('data-id');
            markNotificationAsRead(id);
        });
    });
}

// Mark notification as read
function markNotificationAsRead(id) {
    // In a real app, you'd call an API to mark the notification as read
    console.log(`Marking notification ${id} as read`);
    
    // Refresh notifications
    loadNotifications();
}
