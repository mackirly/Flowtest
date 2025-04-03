/**
 * Report Editor script
 *
 * Provides functionality for the report editor:
 * - Dragging report elements
 * - Configuring and resizing charts
 * - API integration for saving/loading report templates
 * - Previewing and exporting reports
 */

console.log('Loading report editor script...');

// Override console.error to display notifications in the UI
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    try {
        if (typeof showToast === 'function') {
            showToast(`Error: ${args.join(' ')}`, 'error');
        }
    } catch (e) {
        originalConsoleError('Error in console.error handler:', e);
    }
};

function initializeEditor() {
    console.log('Initializing report editor...');

    // Initialize i18n if available
    if (typeof i18n !== 'undefined') {
        i18n.init();
    }

    try {
        // Check edit mode from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const isEditMode = mode === 'edit' || !mode; // Default to edit mode if not specified
        const projectId = urlParams.get('projectId');

        console.log('URL parameters:', {
            mode,
            isEditMode,
            projectId,
            templateId: urlParams.get('templateId')
        });

        if (!isEditMode) {
            document.body.style.cursor = 'not-allowed';
            showToast('View mode: Editing is disabled', 'info');
            return;
        }

        // Set projectId in template if provided in URL
        if (projectId) {
            currentTemplate.project = parseInt(projectId, 10);
            console.log('Project ID set from URL:', currentTemplate.project);
        }

        // Initialize user menu
        initializeUserMenu();

        // Load project data
        loadProjects();

        // Set up drag and drop functionality
        setupDragAndDrop();

        // Set up event listeners
        setupEventListeners();

        // Analyze URL parameters to check if editing an existing template
        const templateId = urlParams.get('templateId');

        if (templateId) {
            loadTemplate(templateId);
            showToast('Editing template #' + templateId, 'info');
        } else {
            // Initialize empty template when creating a new report
            console.log('Creating new template, resetting metrics');

            // Clear metrics in template
            currentTemplate.configuration.metrics = [];

            // Clear DOM container of metrics, if it exists
            const metricsContainer = document.getElementById('metrics-container');
            if (metricsContainer) {
                metricsContainer.innerHTML = '';
                console.log('Metrics container cleared');
            }

            showToast('Creating new template', 'info');
        }

        // Enable dragging for report elements
        const reportElements = document.querySelectorAll('.report-element');
        reportElements.forEach(element => {
            element.style.cursor = 'grab';
            element.draggable = true;

            // Add tooltip on hover
            element.title = "Drag this element to the report area";
        });

        // Load metrics data if there is a selected project
        if (currentTemplate && currentTemplate.project) {
            setTimeout(() => {
                console.log('Loading metrics data from initializeEditor...');
                loadMetricsData();
            }, 1000);
        }

    } catch (error) {
        console.error('Error initializing report editor:', error);
    }
}

// Use both DOMContentLoaded and window.onload to ensure everything is initialized
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded: Initializing report editor...');

    // Check for access token
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
        console.warn('No access token found, redirecting to login page');
        window.location.replace('login.html?redirect=' + encodeURIComponent(window.location.href));
        return;
    }

    // Initialize report editor
    initializeEditor();

    // Initialize metrics data if there is a selected project
    setTimeout(() => {
        if (currentTemplate && currentTemplate.project) {
            console.log('Loading initial metrics data...');
            loadMetricsData();
        }
    }, 1000);
});

window.onload = function() {
    // Re-run initialization after window load to ensure all resources are available
    console.log('Window loaded, reinitializing editor...');

    // Re-setup drag and drop functionality
    setupDragAndDrop();

    // Check if any metrics are loaded and reload if needed
    if (currentTemplate && currentTemplate.project &&
        currentTemplate.configuration &&
        currentTemplate.configuration.metrics &&
        currentTemplate.configuration.metrics.length > 0) {
        loadMetricsData();
    }

    console.log('Editor reinitialized after window load');
};

// Current template data
let currentTemplate = {
    id: null,
    name: 'New Report Template',
    description: '',
    configuration: {
        metrics: [],
        charts: [],
        layout: {},
        components: {}
    },
    is_public: true
};

// Chart elements on the canvas
let chartElements = [];

// Current element being configured
let currentElement = null;

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
 * Load user info from localStorage or API
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
 * Load projects from the API
 */
function loadProjects() {
    console.log('Loading projects for report editor');
    
    // Get both selectors - one in header, one in sidebar panel
    const projectSelector = document.getElementById('projectSelector');
    const projectSelectorPanel = document.getElementById('projectSelectorPanel');
    
    if (!projectSelector && !projectSelectorPanel) {
        console.error('Both project selectors not found');
        return;
    }
    
    // Get project ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdFromUrl = urlParams.get('projectId');
    console.log('Project ID from URL:', projectIdFromUrl);
    
    // Clear existing options in main selector
    if (projectSelector) {
        while (projectSelector.options.length > 1) {
            projectSelector.remove(1);
        }
        
        // Show loading option
        const loadingOption = document.createElement('option');
        loadingOption.textContent = 'Loading projects...';
        loadingOption.disabled = true;
        projectSelector.appendChild(loadingOption);
    }
    
    // Clear existing options in sidebar panel selector
    if (projectSelectorPanel) {
        while (projectSelectorPanel.options.length > 1) {
            projectSelectorPanel.remove(1);
        }
        
        // Show loading option
        const loadingOptionPanel = document.createElement('option');
        loadingOptionPanel.textContent = 'Loading projects...';
        loadingOptionPanel.disabled = true;
        projectSelectorPanel.appendChild(loadingOptionPanel);
    }
    
    // Fetch projects from API
    fetchWithAuth(`${config.API_BASE_URL}${config.ENDPOINTS.PROJECTS}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load projects: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(projects => {
        console.log('Projects loaded:', projects);
        
        // Remove loading options
        if (projectSelector) {
            const loadOption = projectSelector.querySelector('option:not([value=""]):disabled');
            if (loadOption) projectSelector.removeChild(loadOption);
        }
        
        if (projectSelectorPanel) {
            const loadOptionPanel = projectSelectorPanel.querySelector('option:not([value=""]):disabled');
            if (loadOptionPanel) projectSelectorPanel.removeChild(loadOptionPanel);
        }
        
        // Check if projects is an array
        if (!Array.isArray(projects)) {
            throw new Error('Invalid projects data format');
        }
        
        // Add projects to both selectors and select the one from URL if available
        projects.forEach(project => {
            // For header selector
            if (projectSelector) {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                // Select if matches URL project ID
                if (projectIdFromUrl && project.id.toString() === projectIdFromUrl) {
                    option.selected = true;
                }
                projectSelector.appendChild(option);
            }
            
            // For sidebar panel selector
            if (projectSelectorPanel) {
                const optionPanel = document.createElement('option');
                optionPanel.value = project.id;
                optionPanel.textContent = project.name;
                // Select if matches URL project ID
                if (projectIdFromUrl && project.id.toString() === projectIdFromUrl) {
                    optionPanel.selected = true;
                }
                projectSelectorPanel.appendChild(optionPanel);
            }
        });
        
        // Handle selection based on URL or first project
        if (projectIdFromUrl) {
            // Set from URL
            currentTemplate.project = parseInt(projectIdFromUrl, 10);
            showToast('Project selected from URL', 'success');
        } else if (projects.length > 0) {
            // Set first project as selected
            if (projectSelector && projectSelector.options.length > 1) {
                projectSelector.selectedIndex = 1;
                
                // Also set in panel selector
                if (projectSelectorPanel && projectSelectorPanel.options.length > 1) {
                    projectSelectorPanel.selectedIndex = 1;
                }
                
                // Update current template
                currentTemplate.project = parseInt(projectSelector.value, 10);
            }
            showToast('Projects loaded successfully', 'success');
        } else {
            // No projects found
            const noProjectsMsg = 'No projects found';
            
            if (projectSelector) {
                const noProjectsOption = document.createElement('option');
                noProjectsOption.textContent = noProjectsMsg;
                noProjectsOption.disabled = true;
                projectSelector.appendChild(noProjectsOption);
            }
            
            if (projectSelectorPanel) {
                const noProjectsOptionPanel = document.createElement('option');
                noProjectsOptionPanel.textContent = noProjectsMsg;
                noProjectsOptionPanel.disabled = true;
                projectSelectorPanel.appendChild(noProjectsOptionPanel);
            }
            
            showToast('No projects found. Please create a project first.', 'warning');
        }
    })
    .catch(error => {
        console.error('Error loading projects:', error);
        
        // Remove loading options
        if (projectSelector) {
            const loadOption = projectSelector.querySelector('option:not([value=""]):disabled');
            if (loadOption) projectSelector.removeChild(loadOption);
        }
        
        if (projectSelectorPanel) {
            const loadOptionPanel = projectSelectorPanel.querySelector('option:not([value=""]):disabled');
            if (loadOptionPanel) projectSelectorPanel.removeChild(loadOptionPanel);
        }
        
        // При ошибке НЕ ВЫБИРАЕМ option с ошибкой
        // Просто показываем сообщение пользователю
        showToast(`Error loading projects: ${error.message}`, 'error');
        
        // Вместо добавления option с ошибкой, добавим disabled option "Не удалось загрузить проекты"
        const errorMsg = 'Не удалось загрузить проекты';
        
        if (projectSelector) {
            const errorOption = document.createElement('option');
            errorOption.textContent = errorMsg;
            errorOption.disabled = true;
            errorOption.value = ""; // Пустое значение!
            projectSelector.appendChild(errorOption);
            // Установим empty option обратно как selected
            projectSelector.value = "";
        }
        
        if (projectSelectorPanel) {
            const errorOptionPanel = document.createElement('option');
            errorOptionPanel.textContent = errorMsg;
            errorOptionPanel.disabled = true;
            errorOptionPanel.value = ""; // Пустое значение!
            projectSelectorPanel.appendChild(errorOptionPanel);
            // Установим empty option обратно как selected
            projectSelectorPanel.value = "";
        }
        
        showToast(`Error loading projects: ${error.message}`, 'error');
        
        // Add fallback projects for testing
        const fallbackProjects = [
            { id: 1, name: "Web Testing Project" },
            { id: 2, name: "Mobile Testing Project" },
            { id: 3, name: "API Testing Project" }
        ];
        
        fallbackProjects.forEach(project => {
            // For header selector
            if (projectSelector) {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                // Select if matches URL project ID
                if (projectIdFromUrl && project.id.toString() === projectIdFromUrl) {
                    option.selected = true;
                }
                projectSelector.appendChild(option);
            }
            
            // For sidebar panel selector
            if (projectSelectorPanel) {
                const optionPanel = document.createElement('option');
                optionPanel.value = project.id;
                optionPanel.textContent = project.name;
                // Select if matches URL project ID
                if (projectIdFromUrl && project.id.toString() === projectIdFromUrl) {
                    optionPanel.selected = true;
                }
                projectSelectorPanel.appendChild(optionPanel);
            }
        });
        
        // Set project from URL if available
        if (projectIdFromUrl) {
            currentTemplate.project = parseInt(projectIdFromUrl, 10);
        }
        
        if (projectSelector.options.length > 1) {
            projectSelector.selectedIndex = 1;
            projectSelector.dispatchEvent(new Event('change')); // Trigger change event
        }
    });
}

/**
 * Load test runs for the current project
 */
function loadTestRuns() {
    console.log('Loading test runs for metrics');
    
    // Get project ID from current template or URL
    const projectId = currentTemplate.project;
    
    if (!projectId) {
        console.warn('No project selected, cannot load test runs');
        return;
    }
    
    // Get test run selector
    const testRunSelector = document.getElementById('test-run-selector');
    if (!testRunSelector) {
        console.error('Test run selector not found');
        return;
    }
    
    // Clear existing options except the first one
    while (testRunSelector.options.length > 1) {
        testRunSelector.remove(1);
    }
    
    // Add loading option
    const loadingOption = document.createElement('option');
    loadingOption.textContent = 'Loading test runs...';
    loadingOption.disabled = true;
    testRunSelector.appendChild(loadingOption);
    
    // Get Test Runs API endpoint
    const apiUrl = `${config.API_BASE_URL}/projects/${projectId}/test-runs/`;
    
    // Fetch test runs data
    fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Loaded test runs:', data);
        
        // Remove loading option
        testRunSelector.remove(testRunSelector.options.length - 1);
        
        // Add test runs to selector
        if (data && data.length > 0) {
            data.forEach(testRun => {
                const option = document.createElement('option');
                option.value = testRun.id;
                // Format date if available
                const runDate = testRun.start_time ? new Date(testRun.start_time).toLocaleDateString() : 'Unknown';
                option.textContent = `${testRun.name || `Test Run #${testRun.id}`} (${runDate})`;
                testRunSelector.appendChild(option);
            });
        } else {
            const noRunsOption = document.createElement('option');
            noRunsOption.textContent = 'No test runs available';
            noRunsOption.disabled = true;
            testRunSelector.appendChild(noRunsOption);
        }
    })
    .catch(error => {
        console.error('Error loading test runs:', error);
        
        // Remove loading option
        testRunSelector.remove(testRunSelector.options.length - 1);
        
        // Add error option
        const errorOption = document.createElement('option');
        errorOption.textContent = 'Error loading test runs';
        errorOption.disabled = true;
        testRunSelector.appendChild(errorOption);
        
        // Add some fallback test runs for testing
        const fallbackRuns = [
            { id: 1, name: "Weekly Regression Test", date: "01/03/2025" },
            { id: 2, name: "Full Product Test", date: "28/02/2025" },
            { id: 3, name: "API Integration Test", date: "25/02/2025" }
        ];
        
        fallbackRuns.forEach(run => {
            const option = document.createElement('option');
            option.value = run.id;
            option.textContent = `${run.name} (${run.date})`;
            testRunSelector.appendChild(option);
        });
    });
}

/**
 * Initialize default date range for custom period
 */
function initializeDefaultDateRange() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    // If inputs are already filled, don't override them
    if (startDateInput.value && endDateInput.value) {
        return;
    }
    
    // Set end date to today
    const today = new Date();
    const endDateStr = formatDateForInput(today);
    endDateInput.value = endDateStr;
    
    // Set start date to 30 days ago
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);
    const startDateStr = formatDateForInput(startDate);
    startDateInput.value = startDateStr;
    
    // Save to template configuration
    if (!currentTemplate.configuration.dataSource) {
        currentTemplate.configuration.dataSource = { type: 'general', timePeriod: 'custom' };
    }
    currentTemplate.configuration.dataSource.startDate = startDateStr;
    currentTemplate.configuration.dataSource.endDate = endDateStr;
    
    console.log(`Default date range initialized: ${startDateStr} to ${endDateStr}`);
}

/**
 * Format date for date input field (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Set up drag and drop functionality for report elements
 */
function setupDragAndDrop() {
    console.log('Setting up drag and drop functionality');
    
    // Get all draggable elements and drop zones
    const reportElements = document.querySelectorAll('.report-element');
    const dropZone = document.getElementById('main-drop-zone');
    
    console.log('Found report elements:', reportElements.length);
    console.log('Found drop zone:', dropZone);
    
    // Define the event handlers inline to ensure they're available
    const dragStartHandler = function(e) {
        console.log('Drag start on element:', e.target);
        
        // Get element data
        const elementType = e.target.getAttribute('data-element-type');
        const elementId = e.target.getAttribute('data-metric-id') || e.target.getAttribute('data-chart-id') || null;
        
        console.log('Element being dragged:', { elementType, elementId });
        
        if (!elementType) {
            console.error('Missing data-element-type attribute on dragged element');
            return;
        }
        
        // Set the data
        const data = {
            elementType: elementType,
            id: elementId,
            isNew: true
        };
        
        try {
            e.dataTransfer.setData('text/plain', JSON.stringify(data));
            e.dataTransfer.effectAllowed = 'copy'; // Изменено с 'move' на 'copy'
            
            // Добавляем данные в другом формате для кросс-браузерной совместимости
            e.dataTransfer.setData('application/json', JSON.stringify(data));
            
            // Добавляем визуальную обратную связь
            e.target.classList.add('opacity-50');
            
            // Отображаем сообщение пользователю
            showToast('Перетащите элемент в область отчета', 'info');
            
            console.log('Drag data set successfully:', data);
        } catch (error) {
            console.error('Error setting drag data:', error);
            showToast('Ошибка при начале перетаскивания', 'error');
        }
    };
    
    const dragEndHandler = function(e) {
        e.target.classList.remove('opacity-50');
    };
    
    // Make elements draggable
    reportElements.forEach(element => {
        console.log('Adding drag events to element:', element);
        element.setAttribute('draggable', 'true');
        
        // Remove existing event listeners to prevent duplicates
        element.removeEventListener('dragstart', handleDragStart);
        element.removeEventListener('dragend', handleDragEnd);
        element.removeEventListener('dragstart', dragStartHandler);
        element.removeEventListener('dragend', dragEndHandler);
        
        // Add event listeners using the inline handlers
        element.addEventListener('dragstart', dragStartHandler);
        element.addEventListener('dragend', dragEndHandler);
        
        // Store the handlers on the element for future reference
        element._dragStartHandler = dragStartHandler;
        element._dragEndHandler = dragEndHandler;
        
        // Add visual feedback
        element.classList.add('cursor-grab');
        element.addEventListener('mousedown', () => {
            element.classList.remove('cursor-grab');
            element.classList.add('cursor-grabbing');
        });
        element.addEventListener('mouseup', () => {
            element.classList.remove('cursor-grabbing');
            element.classList.add('cursor-grab');
        });
    });
    
    // Set up drop zone
    if (dropZone) {
        // Define drop handlers inline
        const dragOverHandler = function(e) {
            e.preventDefault();
            return false;
        };
        
        const dragEnterHandler = function(e) {
            e.preventDefault();
            e.target.closest('.drop-zone')?.classList.add('highlight');
        };
        
        const dragLeaveHandler = function(e) {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget)) {
                e.target.closest('.drop-zone')?.classList.remove('highlight');
            }
        };
        
        const dropHandler = function(e) {
            e.preventDefault();
            console.log('Drop event triggered');
            
            const dropZone = e.target.closest('.drop-zone');
            
            if (!dropZone) {
                console.warn('No drop zone found in the event target hierarchy');
                return false;
            }
            
            dropZone.classList.remove('highlight');
            
            try {
                let dataText;
                try {
                    dataText = e.dataTransfer.getData('text/plain');
                    console.log('Retrieved drop data:', dataText);
                } catch (error) {
                    console.error('Error getting data from dataTransfer:', error);
                    showToast('Error retrieving drag data', 'error');
                    return false;
                }
                
                if (!dataText) {
                    console.error('No data in dataTransfer');
                    showToast('No data found in drop', 'error');
                    return false;
                }
                
                let data;
                try {
                    data = JSON.parse(dataText);
                    console.log('Parsed drop data:', data);
                } catch (parseError) {
                    console.error('Error parsing drop data:', parseError, 'Raw data:', dataText);
                    showToast('Error parsing element data', 'error');
                    return false;
                }
                
                if (!data || !data.elementType) {
                    console.error('Invalid data format:', data);
                    showToast('Invalid element data', 'error');
                    return false;
                }
                
                console.log('Processing drop of element type:', data.elementType);
                
                // Handle the dropped element
                switch (data.elementType) {
                    case 'metric':
                        addMetricToReport(data.id);
                        showToast('Metric added to report', 'success');
                        break;
                    case 'chart':
                        addChartToReport(data.id, dropZone);
                        showToast('Chart added to report', 'success');
                        break;
                    case 'text':
                        addTextBlockToReport(dropZone);
                        showToast('Text block added to report', 'success');
                        break;
                    case 'table':
                        addTableToReport(data.id, dropZone);
                        break;
                    case 'divider':
                        addDividerToReport(dropZone);
                        break;
                    default:
                        console.warn('Unknown element type dropped:', data.elementType);
                        showToast('Unknown element type', 'error');
                        return false;
                }
                
                // If it's an existing element being moved (not isNew), remove it from its original position
                if (!data.isNew && data.elementId) {
                    const element = document.getElementById(data.elementId);
                    if (element) {
                        element.remove();
                    }
                }
                
                console.log('Element added successfully');
                // Trigger a refresh of drag-drop setup
                setTimeout(() => {
                    setupDragAndDrop();
                    
                    // Force redraw of the page to refresh the UI
                    document.body.style.display = 'none';
                    document.body.offsetHeight; // Force reflow
                    document.body.style.display = '';
                }, 500);
                
            } catch (error) {
                console.error('Error handling drop event:', error);
                showToast('Error adding element to report', 'error');
            }
            
            return false;
        };

        // Remove existing event listeners to prevent duplicates
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragenter', handleDragEnter);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
        
        // Also remove any previously added inline handlers
        if (dropZone._dragOverHandler) dropZone.removeEventListener('dragover', dropZone._dragOverHandler);
        if (dropZone._dragEnterHandler) dropZone.removeEventListener('dragenter', dropZone._dragEnterHandler);
        if (dropZone._dragLeaveHandler) dropZone.removeEventListener('dragleave', dropZone._dragLeaveHandler);
        if (dropZone._dropHandler) dropZone.removeEventListener('drop', dropZone._dropHandler);
        
        // Add event listeners with the inline handlers
        dropZone.addEventListener('dragover', dragOverHandler);
        dropZone.addEventListener('dragenter', dragEnterHandler);
        dropZone.addEventListener('dragleave', dragLeaveHandler);
        dropZone.addEventListener('drop', dropHandler);
        
        // Store the handlers on the dropZone for future reference
        dropZone._dragOverHandler = dragOverHandler;
        dropZone._dragEnterHandler = dragEnterHandler;
        dropZone._dragLeaveHandler = dragLeaveHandler;
        dropZone._dropHandler = dropHandler;
        
        console.log('Drop zone event listeners added successfully');
    } else {
        console.error('Drop zone not found!');
    }
    
    // Run a second setup after a delay to catch any elements that might be added dynamically
    setTimeout(() => {
        const refreshElements = document.querySelectorAll('.report-element');
        refreshElements.forEach(element => {
            if (!element.getAttribute('data-drag-initialized')) {
                console.log('Adding drag events to new element:', element);
                element.setAttribute('draggable', 'true');
                element.setAttribute('data-drag-initialized', 'true');
                element.addEventListener('dragstart', handleDragStart);
                element.addEventListener('dragend', handleDragEnd);
            }
        });
    }, 1000);
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Project selector change - main selector in header
    const projectSelector = document.getElementById('projectSelector');
    if (projectSelector) {
        projectSelector.addEventListener('change', () => {
            const selectedProjectId = projectSelector.value;
            if (selectedProjectId) {
                currentTemplate.project = parseInt(selectedProjectId, 10);
                console.log('Project changed to:', currentTemplate.project);
            }
        });
    }
    
    // Report name input (в основном заголовке)
    const reportNameInput = document.getElementById('report-name');
    if (reportNameInput) {
        reportNameInput.addEventListener('input', () => {
            currentTemplate.name = reportNameInput.value;
            console.log('Report name changed to:', currentTemplate.name);
            
            // Update title in configuration
            if (!currentTemplate.configuration.title) {
                currentTemplate.configuration.title = {};
            }
            currentTemplate.configuration.title.text = reportNameInput.value;
        });
        
        // Set initial value
        reportNameInput.value = currentTemplate.name;
    }
    
    // Preview button
    const previewButton = document.getElementById('preview-report');
    if (previewButton) {
        previewButton.addEventListener('click', previewReport);
    }
    
    // Save button
    const saveButton = document.getElementById('save-report');
    if (saveButton) {
        saveButton.addEventListener('click', saveReport);
    }
    
    // Chart settings modal
    const chartSettingsModal = document.getElementById('chart-settings-modal');
    const closeChartSettings = document.getElementById('close-chart-settings');
    const cancelChartSettings = document.getElementById('cancel-chart-settings');
    const applyChartSettings = document.getElementById('apply-chart-settings');
    
    if (closeChartSettings) {
        closeChartSettings.addEventListener('click', () => {
            chartSettingsModal.classList.add('hidden');
            chartSettingsModal.classList.remove('flex');
        });
    }
    
    if (cancelChartSettings) {
        cancelChartSettings.addEventListener('click', () => {
            chartSettingsModal.classList.add('hidden');
            chartSettingsModal.classList.remove('flex');
        });
    }
    
    if (applyChartSettings) {
        applyChartSettings.addEventListener('click', applyChartSettingsToElement);
    }
    
    // Text editor modal
    const textEditorModal = document.getElementById('text-editor-modal');
    const closeTextEditor = document.getElementById('close-text-editor');
    const cancelTextEditor = document.getElementById('cancel-text-editor');
    const applyTextEditor = document.getElementById('apply-text-editor');
    
    if (closeTextEditor) {
        closeTextEditor.addEventListener('click', () => {
            textEditorModal.classList.add('hidden');
            textEditorModal.classList.remove('flex');
        });
    }
    
    if (cancelTextEditor) {
        cancelTextEditor.addEventListener('click', () => {
            textEditorModal.classList.add('hidden');
            textEditorModal.classList.remove('flex');
        });
    }
    
    if (applyTextEditor) {
        applyTextEditor.addEventListener('click', applyTextEditorContent);
    }

    const metricsDataSource = document.getElementById('metrics-data-source');
if (metricsDataSource) {
    metricsDataSource.addEventListener('change', function() {
        const testRunSelection = document.getElementById('test-run-selection');
        const timePeriodSelection = document.getElementById('time-period-selection');
        
        if (this.value === 'specific') {
            // Show test run selector and load test runs if needed
            testRunSelection.classList.remove('hidden');
            // Hide time period selector for specific test runs
            timePeriodSelection.classList.add('hidden');
            loadTestRuns();
        } else {
            // Hide test run selector
            testRunSelection.classList.add('hidden');
            // Show time period selector for general data
            timePeriodSelection.classList.remove('hidden');
        }
        
        // Update data source in template configuration
        if (!currentTemplate.configuration.dataSource) {
            currentTemplate.configuration.dataSource = {};
        }
        currentTemplate.configuration.dataSource.type = this.value;
        console.log(`Metrics data source set to: ${this.value}`);
    });
}

// Add event listener for test run selector
const testRunSelector = document.getElementById('test-run-selector');
if (testRunSelector) {
    testRunSelector.addEventListener('change', function() {
        // Store selected test run ID in template configuration
        if (!currentTemplate.configuration.dataSource) {
            currentTemplate.configuration.dataSource = { type: 'specific' };
        }
        currentTemplate.configuration.dataSource.testRunId = this.value;
        console.log(`Selected test run ID: ${this.value}`);
    });
}

// Add event listener for time period selector
const timePeriodSelector = document.getElementById('time-period-selector');
if (timePeriodSelector) {
    timePeriodSelector.addEventListener('change', function() {
        const customDateRange = document.getElementById('custom-date-range');
        
        // Show or hide custom date range fields
        if (this.value === 'custom') {
            customDateRange.classList.remove('hidden');
            // Initialize default date values if not already set
            initializeDefaultDateRange();
        } else {
            customDateRange.classList.add('hidden');
        }
        
        // Save selected time period in template configuration
        if (!currentTemplate.configuration.dataSource) {
            currentTemplate.configuration.dataSource = { type: 'general' };
        }
        currentTemplate.configuration.dataSource.timePeriod = this.value;
        console.log(`Time period set to: ${this.value}`);
        
        // Reload metrics data with new time period
        if (this.value !== 'custom') {
            // Для предопределенных периодов сразу загружаем данные
            loadMetricsData();
        }
    });
}

// Event handlers for custom date range inputs
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

if (startDateInput) {
    startDateInput.addEventListener('change', function() {
        if (!currentTemplate.configuration.dataSource) {
            currentTemplate.configuration.dataSource = { type: 'general', timePeriod: 'custom' };
        }
        currentTemplate.configuration.dataSource.startDate = this.value;
        console.log(`Start date set to: ${this.value}`);
        
        // Ensure start date is not after end date
        const endDate = document.getElementById('end-date').value;
        if (endDate && this.value > endDate) {
            document.getElementById('end-date').value = this.value;
            currentTemplate.configuration.dataSource.endDate = this.value;
        }
        
        // Если обе даты выбраны, загружаем данные
        if (this.value && endDate) {
            loadMetricsData();
        }
    });
}

if (endDateInput) {
    endDateInput.addEventListener('change', function() {
        if (!currentTemplate.configuration.dataSource) {
            currentTemplate.configuration.dataSource = { type: 'general', timePeriod: 'custom' };
        }
        currentTemplate.configuration.dataSource.endDate = this.value;
        console.log(`End date set to: ${this.value}`);
        
        // Ensure end date is not before start date
        const startDate = document.getElementById('start-date').value;
        if (startDate && this.value < startDate) {
            document.getElementById('start-date').value = this.value;
            currentTemplate.configuration.dataSource.startDate = this.value;
        }
        
        // Если обе даты выбраны, загружаем данные
        if (this.value && startDate) {
            loadMetricsData();
        }
    });
}
    
    // Note: initializePreviewModalButtons() is now called directly in previewReport() function
}

/**
 * Handle drag start event
 * @param {Event} e - The dragstart event
 */
function handleDragStart(e) {
    console.log('Drag start on element:', e.target);
    
    // Get element data
    const elementType = e.target.getAttribute('data-element-type');
    const elementId = e.target.getAttribute('data-metric-id') || e.target.getAttribute('data-chart-id') || null;
    
    console.log('Element being dragged:', { elementType, elementId });
    
    if (!elementType) {
        console.error('Missing data-element-type attribute on dragged element');
        return;
    }
    
    // Set the data
    const data = {
        elementType: elementType,
        id: elementId,
        isNew: true
    };
    
    try {
        // Важно: установка данных должна произойти ДО изменения effectAllowed
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
        e.dataTransfer.effectAllowed = 'copy'; // Изменено с 'move' на 'copy'
        
        // Добавляем данные в другом формате для кросс-браузерной совместимости
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        // Добавляем визуальную обратную связь
        e.target.classList.add('opacity-50');
        
        // Отображаем сообщение пользователю
        showToast('Перетащите элемент в область отчета', 'info');
        
        console.log('Drag data set successfully:', data);
    } catch (error) {
        console.error('Error setting drag data:', error);
        showToast('Ошибка при начале перетаскивания', 'error');
    }
}

/**
 * Handle drag end event
 * @param {Event} e - The dragend event
 */
function handleDragEnd(e) {
    e.target.classList.remove('opacity-50');
}

/**
 * Handle drag over event
 * @param {Event} e - The dragover event
 */
function handleDragOver(e) {
    e.preventDefault();
    return false;
}

/**
 * Handle drag enter event
 * @param {Event} e - The dragenter event
 */
function handleDragEnter(e) {
    e.preventDefault();
    e.target.closest('.drop-zone')?.classList.add('highlight');
}

/**
 * Handle drag leave event
 * @param {Event} e - The dragleave event
 */
function handleDragLeave(e) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.target.closest('.drop-zone')?.classList.remove('highlight');
    }
}

/**
 * Handle drop event
 * @param {Event} e - The drop event
 */
function handleDrop(e) {
    e.preventDefault();
    console.log('Drop event triggered');
    
    const dropZone = e.target.closest('.drop-zone');
    
    if (!dropZone) {
        console.warn('No drop zone found in the event target hierarchy');
        return false;
    }
    
    dropZone.classList.remove('highlight');
    
    try {
        let dataText;
        try {
            dataText = e.dataTransfer.getData('text/plain');
            console.log('Retrieved drop data:', dataText);
        } catch (error) {
            console.error('Error getting data from dataTransfer:', error);
            showToast('Error retrieving drag data', 'error');
            return false;
        }
        
        if (!dataText) {
            console.error('No data in dataTransfer');
            showToast('No data found in drop', 'error');
            return false;
        }
        
        let data;
        try {
            data = JSON.parse(dataText);
            console.log('Parsed drop data:', data);
        } catch (parseError) {
            console.error('Error parsing drop data:', parseError, 'Raw data:', dataText);
            showToast('Error parsing element data', 'error');
            return false;
        }
        
        if (!data || !data.elementType) {
            console.error('Invalid data format:', data);
            showToast('Invalid element data', 'error');
            return false;
        }
        
        console.log('Processing drop of element type:', data.elementType);
        
        // Remove empty state if it exists
        const emptyState = dropZone.querySelector('.flex.flex-col.items-center.justify-center');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Handle the dropped element
        switch (data.elementType) {
            case 'metric':
                addMetricToReport(data.id);
                showToast('Metric added to report', 'success');
                break;
            case 'chart':
                addChartToReport(data.id, dropZone);
                showToast('Chart added to report', 'success');
                break;
            case 'text':
                addTextBlockToReport(dropZone);
                showToast('Text block added to report', 'success');
                break;
            case 'table':
                addTableToReport(data.id, dropZone);
                break;
            case 'divider':
                addDividerToReport(dropZone);
                break;
            default:
                console.warn('Unknown element type dropped:', data.elementType);
                showToast('Unknown element type', 'error');
                return false;
        }
        
        // If it's an existing element being moved (not isNew), remove it from its original position
        if (!data.isNew && data.elementId) {
            const element = document.getElementById(data.elementId);
            if (element) {
                element.remove();
            }
        }
        
        console.log('Element added successfully');
        // Trigger a refresh of drag-drop setup
        setTimeout(() => {
            setupDragAndDrop();
            
            // Force redraw of the page to refresh the UI
            document.body.style.display = 'none';
            document.body.offsetHeight; // Force reflow
            document.body.style.display = '';
        }, 500);
        
    } catch (error) {
        console.error('Error handling drop event:', error);
        showToast('Error adding element to report', 'error');
    }
    
    return false;
}

/**
 * Add a metric to the report
 * @param {string} metricId - The metric ID
 */
function addMetricToReport(metricId) {
    console.log(`Attempting to add metric: ${metricId}`);
    
    let metricsContainer = document.getElementById('metrics-container');
    
    // Если контейнер не найден, создаем его
    if (!metricsContainer) {
        console.log('Creating metrics container because it does not exist');
        const dropZone = document.getElementById('main-drop-zone');
        if (!dropZone) {
            console.error('Cannot find drop zone to add metrics container');
            return;
        }
        
        // Создаем новый контейнер для метрик - использовать CSS Grid вместо Tailwind
        metricsContainer = document.createElement('div');
        metricsContainer.id = 'metrics-container';
        // Не используем классы Tailwind для гридов, они переопределяются в стилях
        metricsContainer.style.marginTop = '32px';
        dropZone.appendChild(metricsContainer);
    }
    
    // Скрываем empty state при добавлении элементов
    const dropZone = document.getElementById('main-drop-zone');
    if (dropZone) {
        const emptyState = dropZone.querySelector('.flex.flex-col.items-center.justify-center');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
    
    // Проверяем, не существует ли уже метрика в DOM
    const existingMetricElement = document.querySelector(`#metrics-container [data-metric-id="${metricId}"]`);
    if (existingMetricElement) {
        console.log(`Metric ${metricId} already exists in DOM, skipping`);
        showToast('This metric is already added to the report', 'info');
        return;
    }
    
    // Check if metric already exists in the configuration
    if (currentTemplate.configuration.metrics.includes(metricId)) {
        console.log(`Metric ${metricId} already exists in configuration, skipping`);
        // Если метрика есть в конфигурации, но отсутствует в DOM - это несоответствие, исправим
        if (!existingMetricElement) {
            console.log(`Inconsistency detected: metric ${metricId} in configuration but not in DOM`);
        } else {
            showToast('This metric is already added to the report', 'info');
            return;
        }
    }
    
    // Add metric to the configuration
    if (!currentTemplate.configuration.metrics.includes(metricId)) {
        currentTemplate.configuration.metrics.push(metricId);
        console.log(`Added metric ${metricId} to configuration`);
    }
    
    // Add metric to the container
    const metricElement = document.createElement('div');
    metricElement.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow metric-card';
    metricElement.setAttribute('data-metric-id', metricId);
    
    // Усиливаем стили метрик для лучшего отображения
    metricElement.style.margin = '8px';
    metricElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
    metricElement.style.border = '1px solid #eaeaea';
    metricElement.style.borderRadius = '8px';
    
    // Determine metric display information
    let iconClass = 'ri-checkbox-multiple-line';
    let iconColor = 'text-blue-500';
    let metricName = 'Unknown Metric';
    
    switch (metricId) {
        case 'totalTests':
            iconClass = 'ri-checkbox-multiple-line';
            iconColor = 'text-blue-500';
            metricName = 'Total Tests';
            break;
        case 'successRate':
            iconClass = 'ri-percent-line';
            iconColor = 'text-green-500';
            metricName = 'Success Rate';
            break;
        case 'failedTests':
            iconClass = 'ri-close-circle-line';
            iconColor = 'text-red-500';
            metricName = 'Failed Tests';
            break;
        case 'averageTime':
            iconClass = 'ri-time-line';
            iconColor = 'text-amber-500';
            metricName = 'Average Time';
            break;
        case 'testStability':
            iconClass = 'ri-rhythm-line';
            iconColor = 'text-indigo-500';
            metricName = 'Test Stability';
            break;
        case 'blockedTests':
            iconClass = 'ri-lock-line';
            iconColor = 'text-orange-500';
            metricName = 'Blocked Tests';
            break;
        case 'automationRate':
            iconClass = 'ri-robot-line';
            iconColor = 'text-cyan-500';
            metricName = 'Automation Rate';
            break;
        case 'flakiness':
            iconClass = 'ri-error-warning-line';
            iconColor = 'text-pink-500';
            metricName = 'Flakiness';
            break;
        case 'testsByPriority':
            iconClass = 'ri-list-check';
            iconColor = 'text-purple-500';
            metricName = 'Tests by Priority';
            break;
    }
    
    // Try to use translated name if i18n is available
    if (typeof i18n !== 'undefined') {
        metricName = i18n.t(metricId) || i18n.t(metricName) || metricName;
    }
    
    metricElement.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <i class="${iconClass} text-xl mr-2 ${iconColor}"></i>
                <span>${metricName}</span>
            </div>
            <button class="text-gray-400 hover:text-red-500 remove-metric" data-metric-id="${metricId}">
                <i class="ri-close-line"></i>
            </button>
        </div>
        <div class="text-2xl font-semibold mt-4">--</div>
    `;
    
    metricsContainer.appendChild(metricElement);
    console.log(`Metric ${metricId} added to DOM`);
    
    // Add remove event
    metricElement.querySelector('.remove-metric').addEventListener('click', () => {
        removeMetricFromReport(metricId);
    });
}

/**
 * Remove a metric from the report
 * @param {string} metricId - The metric ID
 */
function removeMetricFromReport(metricId) {
    console.log(`Removing metric: ${metricId}`);
    
    // Remove from DOM - ищем только в metrics-container
    const metricElement = document.querySelector(`#metrics-container [data-metric-id="${metricId}"]`);
    if (metricElement) {
        metricElement.remove();
        console.log(`Removed metric ${metricId} from DOM`);
    } else {
        console.warn(`Metric element for ${metricId} not found in DOM`);
    }
    
    // Remove from configuration
    const index = currentTemplate.configuration.metrics.indexOf(metricId);
    if (index !== -1) {
        currentTemplate.configuration.metrics.splice(index, 1);
        console.log(`Removed metric ${metricId} from configuration`);
    } else {
        console.warn(`Metric ${metricId} not found in configuration`);
    }
    
    // Show empty state if no metrics left
    const metricsContainer = document.getElementById('metrics-container');
    if (metricsContainer && metricsContainer.children.length === 0) {
        const dropZone = document.getElementById('main-drop-zone');
        if (dropZone) {
            const emptyState = dropZone.querySelector('.flex.flex-col.items-center.justify-center');
            if (emptyState) {
                emptyState.style.display = '';
                console.log('Showing empty state as all metrics are removed');
            }
        }
    }
}

/**
 * Add a chart to the report
 * @param {string} chartId - The chart ID
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addChartToReport(chartId, dropZone) {
    // Create a unique ID for this chart instance
    const chartInstanceId = `chart-${chartId}-${Date.now()}`;
    
    // Add chart to the configuration
    const chartConfig = {
        id: chartInstanceId,
        type: chartId,
        title: getChartTitle(chartId),
        width: 800,
        height: 400,
        // New metrics configuration for customizable charts
        xAxis: 'timeStamp',
        yAxis: 'totalTests',
        showLegend: true,
        colorScheme: 'default'
    };
    
    currentTemplate.configuration.charts = currentTemplate.configuration.charts || [];
    currentTemplate.configuration.charts.push(chartConfig);
    
    // Create chart element
    const chartElement = document.createElement('div');
    chartElement.id = chartInstanceId;
    chartElement.className = 'chart-container relative';
    chartElement.style.width = '100%';
    chartElement.style.height = '400px';
    chartElement.setAttribute('data-chart-id', chartId);
    chartElement.setAttribute('data-instance-id', chartInstanceId);
    
    // Get sample chart data based on chart type for preview
    let chartData;
    let chartCanvas = '';
    
    // Get chart data based on type - supporting both legacy and new chart types
    switch (chartId) {
        case 'executionTrend':
            chartData = getExecutionTrendSampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        case 'statusDistribution':
            chartData = getStatusDistributionSampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        case 'testExecutionTime':
            chartData = getExecutionTimeSampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        case 'testStability':
            chartData = getTestStabilitySampleData();
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        // New chart types
        case 'line':
        case 'bar':
        case 'pie':
        case 'doughnut':
        case 'radar':
            // Generate data based on chart type
            chartData = getFallbackChartData(chartId);
            chartCanvas = '<canvas class="chart-preview w-full h-full"></canvas>';
            break;
        default:
            chartCanvas = `<div class="w-full h-full bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                <i class="ri-line-chart-line text-4xl text-gray-400 dark:text-gray-500"></i>
            </div>`;
    }
    
    // Get translatable title
    const chartTitle = getChartTitle(chartId);
    const translatedTitle = typeof i18n !== 'undefined' ? (i18n.translate(chartId) || i18n.translate(chartTitle) || chartTitle) : chartTitle;
    
    chartElement.innerHTML = `
        <div class="chart-controls">
            <button class="chart-control-btn edit-chart" data-instance-id="${chartInstanceId}">
                <i class="ri-settings-line mr-1"></i> <span data-i18n="settings">Settings</span>
            </button>
            <button class="chart-control-btn delete-chart" data-instance-id="${chartInstanceId}">
                <i class="ri-delete-bin-line mr-1"></i> <span data-i18n="delete">Delete</span>
            </button>
        </div>
        <h3 class="text-lg font-medium mb-4">${translatedTitle}</h3>
        <div class="chart-placeholder w-full h-64">
            ${chartCanvas}
        </div>
        <div class="chart-resizer">
            <i class="ri-drag-move-line"></i>
        </div>
        <div class="resize-handle se"></div>
    `;
    
    // Ensure there's proper margin between charts and clean styling
    chartElement.style.margin = '32px 0';
    chartElement.style.clear = 'both';
    
    // Create a wrapper div to ensure proper layout
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-wrapper';
    chartWrapper.style.marginBottom = '32px';
    chartWrapper.style.width = '100%';
    
    // Add chart to wrapper, then wrapper to drop zone
    chartWrapper.appendChild(chartElement);
    dropZone.appendChild(chartWrapper);
    
    // Initialize chart if we have data
    if (chartData) {
        const canvas = chartElement.querySelector('canvas.chart-preview');
        if (canvas) {
            // Add a slight delay to ensure canvas is properly rendered in DOM
            setTimeout(() => {
                try {
                    initializeChartPreview(canvas, chartId, chartData);
                    console.log(`Chart ${chartId} initialized successfully`);
                } catch (err) {
                    console.error(`Error initializing chart ${chartId}:`, err);
                }
            }, 100);
        }
    }
    
    // Make chart element draggable for repositioning
    makeChartDraggable(chartElement);
    
    // Make chart resizable
    makeChartResizable(chartElement);
    
    // Add event listeners for chart controls
    addChartControlEventListeners(chartElement);
    
    // Add chart to the list of chart elements
    chartElements.push({
        id: chartInstanceId,
        element: chartElement,
        config: chartConfig
    });
}

// Helper function to initialize chart preview
function initializeChartPreview(canvas, chartType, chartData) {
    if (!canvas) {
        console.error('Canvas element is null or undefined');
        return;
    }

    // Force canvas to be visible and have dimensions
    canvas.style.display = 'block';
    canvas.style.height = '100%';
    canvas.style.width = '100%';
    canvas.height = canvas.offsetHeight || 300;
    canvas.width = canvas.offsetWidth || 400;

    // Determine actual chart type based on legacy or new types
    let actualChartType;
    switch (chartType) {
        case 'executionTrend':
            actualChartType = 'line';
            break;
        case 'statusDistribution':
            actualChartType = 'pie';
            break;
        case 'testExecutionTime':
        case 'testStability':
            actualChartType = 'bar';
            break;
        default:
            actualChartType = chartType; // For new types: line, bar, pie, etc.
    }
    
    // Define basic chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                callbacks: {
                    title: function(tooltipItems) {
                        // Translate tooltip title if needed
                        const title = tooltipItems[0].label;
                        return i18n ? i18n.translate(title) || title : title;
                    },
                    label: function(context) {
                        // Translate tooltip label if needed
                        let label = context.dataset.label || '';
                        if (i18n && label) {
                            label = i18n.translate(label) || label;
                        }
                        return label + ': ' + context.parsed.y;
                    }
                }
            }
        },
        animation: {
            duration: 500 // Shorter animation for better performance
        }
    };
    
    // Add specific options for different chart types
    if (['line', 'bar'].includes(actualChartType)) {
        chartOptions.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    color: document.body.classList.contains('dark') ? '#fff' : '#666'
                },
                grid: {
                    color: document.body.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
            },
            x: {
                ticks: {
                    color: document.body.classList.contains('dark') ? '#fff' : '#666'
                },
                grid: {
                    color: document.body.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
            }
        };
    }
    
    // Create chart config
    const chartConfig = {
        type: actualChartType,
        data: chartData,
        options: chartOptions
    };
    
    try {
        // Check if chart already exists and destroy it
        let existingChart;
        try {
            existingChart = Chart.getChart(canvas);
        } catch (e) {
            console.log('No existing chart found, creating new one');
        }
        
        if (existingChart) {
            existingChart.destroy();
        }
        
        // Create new chart
        console.log(`Creating new ${actualChartType} chart`);
        new Chart(canvas, chartConfig);
    } catch (error) {
        console.error('Error initializing chart preview:', error);
        
        // Fallback - create a basic visualization for the chart
        try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = document.body.classList.contains('dark') ? '#334155' : '#f1f5f9';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = document.body.classList.contains('dark') ? '#fff' : '#000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${chartType} Chart Preview`, canvas.width/2, canvas.height/2);
        } catch (e) {
            console.error('Fallback rendering also failed:', e);
        }
    }
}

// Functions to generate sample chart data
function getExecutionTrendSampleData() {
    // Get translatable labels
    let passedLabel = 'Passed';
    let failedLabel = 'Failed';
    let skippedLabel = 'Skipped';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        passedLabel = i18n.translate('passedTests') || passedLabel;
        failedLabel = i18n.translate('failedTests') || failedLabel;
        skippedLabel = i18n.translate('skippedTests') || skippedLabel;
    }
    
    return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: passedLabel,
                data: [65, 59, 80, 81, 56, 55, 40],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)'
            },
            {
                label: failedLabel,
                data: [28, 12, 40, 19, 28, 27, 10],
                borderColor: '#F44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)'
            },
            {
                label: skippedLabel,
                data: [10, 5, 12, 9, 5, 4, 8],
                borderColor: '#FFC107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)'
            }
        ]
    };
}

function getStatusDistributionSampleData() {
    // Get translatable labels
    let passedLabel = 'Passed';
    let failedLabel = 'Failed';
    let skippedLabel = 'Skipped';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        passedLabel = i18n.translate('passedTests') || passedLabel;
        failedLabel = i18n.translate('failedTests') || failedLabel;
        skippedLabel = i18n.translate('skippedTests') || skippedLabel;
    }
    
    return {
        labels: [passedLabel, failedLabel, skippedLabel],
        datasets: [{
            data: [70, 20, 10],
            backgroundColor: [
                '#4CAF50',  // Green
                '#F44336',  // Red
                '#FFC107'   // Yellow
            ]
        }]
    };
}

function getExecutionTimeSampleData() {
    // Get translatable label
    let executionTimeLabel = 'Execution Time (s)';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        executionTimeLabel = i18n.translate('executionTime') || executionTimeLabel;
    }
    
    return {
        labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
        datasets: [{
            label: executionTimeLabel,
            data: [120, 90, 60, 45, 30],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };
}

function getTestStabilitySampleData() {
    // Get translatable label
    let stabilityLabel = 'Stability (%)';
    
    // Try to translate if i18n is available
    if (typeof i18n !== 'undefined') {
        stabilityLabel = i18n.translate('testStability') || stabilityLabel;
    }
    
    return {
        labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
        datasets: [{
            label: stabilityLabel,
            data: [95, 85, 75, 65, 55],
            backgroundColor: [
                'rgba(13, 220, 0, 0.7)',
                'rgba(92, 220, 0, 0.7)',
                'rgba(160, 220, 0, 0.7)',
                'rgba(255, 160, 0, 0.7)',
                'rgba(255, 80, 0, 0.7)'
            ]
        }]
    };
}

/**
 * Get the title for a chart based on its ID
 * @param {string} chartId - The chart ID
 * @returns {string} The chart title
 */
function getChartTitle(chartId) {
    switch (chartId) {
        case 'executionTrend':
            return 'Test Execution Trend';
        case 'statusDistribution':
            return 'Test Status Distribution';
        case 'testExecutionTime':
            return 'Test Execution Time';
        case 'testStability':
            return 'Test Stability';
        default:
            return 'Chart';
    }
}

/**
 * Make a chart element draggable
 * @param {HTMLElement} chartElement - The chart element
 */
function makeChartDraggable(chartElement) {
    chartElement.setAttribute('draggable', 'true');
    
    chartElement.addEventListener('dragstart', (e) => {
        const instanceId = chartElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'chart',
            id: chartElement.getAttribute('data-chart-id'),
            elementId: instanceId,
            isNew: false
        }));
        
        chartElement.classList.add('opacity-50');
    });
    
    chartElement.addEventListener('dragend', () => {
        chartElement.classList.remove('opacity-50');
    });
}

/**
 * Make a chart element resizable
 * @param {HTMLElement} chartElement - The chart element
 */
function makeChartResizable(chartElement) {
    const resizer = chartElement.querySelector('.chart-resizer');
    const seHandle = chartElement.querySelector('.resize-handle.se');
    
    if (resizer) {
        resizer.addEventListener('mousedown', initResize, false);
    }
    
    if (seHandle) {
        seHandle.addEventListener('mousedown', initResize, false);
    }
    
    function initResize(e) {
        e.preventDefault();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = chartElement.offsetWidth;
        const startHeight = chartElement.offsetHeight;
        
        // Store the instance ID
        const instanceId = chartElement.getAttribute('data-instance-id');
        
        // Find the chart config
        const chartConfig = currentTemplate.configuration.charts.find(chart => chart.id === instanceId);
        
        document.addEventListener('mousemove', resize, false);
        document.addEventListener('mouseup', stopResize, false);
        
        function resize(e) {
            const width = startWidth + e.clientX - startX;
            const height = startHeight + e.clientY - startY;
            
            chartElement.style.width = `${width}px`;
            chartElement.style.height = `${height}px`;
            
            // Update chart config
            if (chartConfig) {
                chartConfig.width = width;
                chartConfig.height = height;
            }
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize, false);
            document.removeEventListener('mouseup', stopResize, false);
        }
    }
}

/**
 * Add event listeners for chart controls
 * @param {HTMLElement} chartElement - The chart element
 */
function addChartControlEventListeners(chartElement) {
    const editButton = chartElement.querySelector('.edit-chart');
    const deleteButton = chartElement.querySelector('.delete-chart');
    
    if (editButton) {
        editButton.addEventListener('click', () => {
            const instanceId = editButton.getAttribute('data-instance-id');
            openChartSettings(instanceId);
        });
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeChartFromReport(instanceId);
        });
    }
}

/**
 * Open chart settings modal
 * @param {string} chartInstanceId - The chart instance ID
 */
function openChartSettings(chartInstanceId) {
    const chartSettingsModal = document.getElementById('chart-settings-modal');
    if (!chartSettingsModal) return;
    
    // Find the chart config
    const chartConfig = currentTemplate.configuration.charts.find(chart => chart.id === chartInstanceId);
    if (!chartConfig) return;
    
    // Set the current element for reference
    currentElement = {
        type: 'chart',
        id: chartInstanceId,
        config: chartConfig
    };
    
    // Set form values
    const chartTitleInput = document.getElementById('chart-title');
    const chartWidthInput = document.getElementById('chart-width');
    const chartHeightInput = document.getElementById('chart-height');
    const chartTypeSelector = document.getElementById('chart-type-selector');
    const xAxisMetric = document.getElementById('x-axis-metric');
    const yAxisMetric = document.getElementById('y-axis-metric');
    const showLegend = document.getElementById('show-legend');
    
    if (chartTitleInput) chartTitleInput.value = chartConfig.title || '';
    if (chartWidthInput) chartWidthInput.value = chartConfig.width || 800;
    if (chartHeightInput) chartHeightInput.value = chartConfig.height || 400;
    
    // Set chart type in selector
    if (chartTypeSelector) {
        // Find option with matching value
        const chartTypeOption = Array.from(chartTypeSelector.options).find(
            option => option.value === chartConfig.type
        );
        
        // If found, select it, otherwise default to first option
        if (chartTypeOption) {
            chartTypeSelector.value = chartConfig.type;
        } else {
            // For legacy chart types (executionTrend, statusDistribution, etc.)
            // Map to new generic types
            switch (chartConfig.type) {
                case 'executionTrend':
                    chartTypeSelector.value = 'line';
                    break;
                case 'statusDistribution':
                    chartTypeSelector.value = 'pie';
                    break;
                case 'testExecutionTime':
                case 'testStability':
                    chartTypeSelector.value = 'bar';
                    break;
                default:
                    chartTypeSelector.value = 'line';
            }
        }
    }
    
    // Set axis metrics
    if (xAxisMetric) {
        xAxisMetric.value = chartConfig.xAxis || 'timeStamp';
    }
    
    if (yAxisMetric) {
        yAxisMetric.value = chartConfig.yAxis || 'totalTests';
    }
    
    // Set show legend checkbox
    if (showLegend) {
        showLegend.checked = chartConfig.showLegend !== false;
    }
    
    // Show chart-specific options
    const chartTypeOptions = document.getElementById('chart-type-options');
    if (chartTypeOptions) {
        chartTypeOptions.classList.remove('hidden');
        
        // Clear previous options
        chartTypeOptions.innerHTML = '';
        
        // Add options based on chart type
        switch (chartConfig.type) {
            case 'executionTrend':
            case 'line':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <input id="show-passed" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showPassed !== false ? 'checked' : ''}>
                            <label for="show-passed" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n="showPassed">Show Passed Tests</label>
                        </div>
                        <div class="flex items-center">
                            <input id="show-failed" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showFailed !== false ? 'checked' : ''}>
                            <label for="show-failed" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n="showFailed">Show Failed Tests</label>
                        </div>
                        <div class="flex items-center">
                            <input id="show-grid" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showGrid !== false ? 'checked' : ''}>
                            <label for="show-grid" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Show Grid Lines</label>
                        </div>
                        <div class="flex items-center">
                            <input id="enable-animation" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.enableAnimation !== false ? 'checked' : ''}>
                            <label for="enable-animation" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable Animation</label>
                        </div>
                    </div>
                `;
                break;
            case 'bar':
            case 'testExecutionTime':
            case 'testStability':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div>
                            <label for="limit-entries" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300" data-i18n="limitEntries">Limit Entries</label>
                            <input type="number" id="limit-entries" min="5" max="20" value="${chartConfig.limit || 10}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-coral-500 dark:focus:border-coral-500">
                        </div>
                        <div class="flex items-center">
                            <input id="show-grid" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.showGrid !== false ? 'checked' : ''}>
                            <label for="show-grid" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Show Grid Lines</label>
                        </div>
                    </div>
                `;
                break;
            case 'pie':
            case 'doughnut':
            case 'statusDistribution':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <input id="enable-animation" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.enableAnimation !== false ? 'checked' : ''}>
                            <label for="enable-animation" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable Animation</label>
                        </div>
                    </div>
                `;
                break;
            case 'radar':
                chartTypeOptions.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <input id="fill-area" type="checkbox" class="w-4 h-4 text-coral-600 bg-gray-100 border-gray-300 rounded focus:ring-coral-500" ${chartConfig.fillArea !== false ? 'checked' : ''}>
                            <label for="fill-area" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Fill Area</label>
                        </div>
                    </div>
                `;
                break;
        }
    }
    
    // Show modal
    chartSettingsModal.classList.remove('hidden');
    chartSettingsModal.classList.add('flex');
}

/**
 * Apply chart settings to the element
 */
function applyChartSettingsToElement() {
    if (!currentElement || currentElement.type !== 'chart') return;
    
    const chartSettingsModal = document.getElementById('chart-settings-modal');
    const chartTitleInput = document.getElementById('chart-title');
    const chartWidthInput = document.getElementById('chart-width');
    const chartHeightInput = document.getElementById('chart-height');
    const chartTypeSelector = document.getElementById('chart-type-selector');
    const xAxisMetric = document.getElementById('x-axis-metric');
    const yAxisMetric = document.getElementById('y-axis-metric');
    const showLegend = document.getElementById('show-legend');
    
    // Get chart element
    const chartElement = document.getElementById(currentElement.id);
    if (!chartElement) return;
    
    // Update chart title in the element
    const chartTitleElement = chartElement.querySelector('h3');
    if (chartTitleElement && chartTitleInput) {
        chartTitleElement.textContent = chartTitleInput.value;
    }
    
    // Update chart dimensions
    if (chartWidthInput && chartHeightInput) {
        chartElement.style.width = `${chartWidthInput.value}px`;
        chartElement.style.height = `${chartHeightInput.value}px`;
    }
    
    // Update chart config
    const chartConfig = currentTemplate.configuration.charts.find(chart => chart.id === currentElement.id);
    if (chartConfig) {
        if (chartTitleInput) chartConfig.title = chartTitleInput.value;
        if (chartWidthInput) chartConfig.width = parseInt(chartWidthInput.value, 10);
        if (chartHeightInput) chartConfig.height = parseInt(chartHeightInput.value, 10);
        
        // Update chart type if changed
        if (chartTypeSelector) {
            // Save old type in case we need it for legacy compatibility
            const oldType = chartConfig.type;
            chartConfig.type = chartTypeSelector.value;
            
            // Update the chart element's data attribute
            chartElement.setAttribute('data-chart-id', chartConfig.type);
        }
        
        // Update axis metrics
        if (xAxisMetric) chartConfig.xAxis = xAxisMetric.value;
        if (yAxisMetric) chartConfig.yAxis = yAxisMetric.value;
        
        // Update show legend setting
        if (showLegend) chartConfig.showLegend = showLegend.checked;
        
        // Update chart-specific options
        switch (chartConfig.type) {
            case 'executionTrend':
            case 'line':
                const showPassed = document.getElementById('show-passed');
                const showFailed = document.getElementById('show-failed');
                const showGrid = document.getElementById('show-grid');
                const enableAnimation = document.getElementById('enable-animation');
                
                if (showPassed) chartConfig.showPassed = showPassed.checked;
                if (showFailed) chartConfig.showFailed = showFailed.checked;
                if (showGrid) chartConfig.showGrid = showGrid.checked;
                if (enableAnimation) chartConfig.enableAnimation = enableAnimation.checked;
                break;
                
            case 'bar':
            case 'testExecutionTime':
            case 'testStability':
                const limitEntries = document.getElementById('limit-entries');
                const barShowGrid = document.getElementById('show-grid');
                
                if (limitEntries) chartConfig.limit = parseInt(limitEntries.value, 10);
                if (barShowGrid) chartConfig.showGrid = barShowGrid.checked;
                break;
                
            case 'pie':
            case 'doughnut':
            case 'statusDistribution':
                const pieEnableAnimation = document.getElementById('enable-animation');
                if (pieEnableAnimation) chartConfig.enableAnimation = pieEnableAnimation.checked;
                break;
                
            case 'radar':
                const fillArea = document.getElementById('fill-area');
                if (fillArea) chartConfig.fillArea = fillArea.checked;
                break;
        }
        
        // After updating the config, refresh the chart if it exists
        const canvas = chartElement.querySelector('canvas.chart-preview');
        if (canvas) {
            // Get existing Chart.js instance if it exists
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
            
            // Get new chart data based on selected metrics
            fetchCustomChartData(currentTemplate.project, chartConfig.xAxis, chartConfig.yAxis)
                .then(chartData => {
                    initializeCustomChart(canvas, chartConfig, chartData);
                })
                .catch(error => {
                    console.error('Error refreshing chart:', error);
                    // Use fallback data
                    const fallbackData = getFallbackChartData(chartConfig.type);
                    initializeCustomChart(canvas, chartConfig, fallbackData);
                });
        }
    }
    
    // Close modal
    chartSettingsModal.classList.add('hidden');
    chartSettingsModal.classList.remove('flex');
    
    // Clear current element
    currentElement = null;
}

/**
 * Fetch custom chart data based on selected metrics
 * @param {number} projectId - Project ID
 * @param {string} xAxis - X-axis metric
 * @param {string} yAxis - Y-axis metric
 * @returns {Promise<Object>} Chart data object
 */
async function fetchCustomChartData(projectId, xAxis, yAxis) {
    try {
        // In a real implementation, this would make an API call
        // For now, generate sample data based on the selected metrics
        console.log(`Fetching custom chart data for metrics: x=${xAxis}, y=${yAxis}`);
        
        // Generate labels based on x-axis metric
        let labels = [];
        
        if (xAxis === 'timeStamp') {
            // Generate date labels for the last 7 days
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                labels.push(date.toLocaleDateString());
            }
        } else if (xAxis === 'testName') {
            labels = ['Login Test', 'Registration Test', 'Search Test', 'Checkout Test', 'Profile Test'];
        } else if (xAxis === 'component') {
            labels = ['Authentication', 'User Interface', 'Database', 'API', 'Payment'];
        } else if (xAxis === 'priority') {
            labels = ['Critical', 'High', 'Medium', 'Low', 'Trivial'];
        }
        
        // Generate data values based on y-axis metric
        let data = [];
        
        switch (yAxis) {
            case 'totalTests':
                data = labels.map(() => Math.floor(Math.random() * 100) + 50);
                break;
            case 'successRate':
                data = labels.map(() => Math.floor(Math.random() * 30) + 70);
                break;
            case 'failedTests':
                data = labels.map(() => Math.floor(Math.random() * 50));
                break;
            case 'averageTime':
                data = labels.map(() => Math.floor(Math.random() * 120) + 30);
                break;
            case 'testStability':
                data = labels.map(() => Math.floor(Math.random() * 30) + 70);
                break;
            case 'blockedTests':
                data = labels.map(() => Math.floor(Math.random() * 15));
                break;
            case 'automationRate':
                data = labels.map(() => Math.floor(Math.random() * 40) + 60);
                break;
            case 'flakiness':
                data = labels.map(() => Math.floor(Math.random() * 20));
                break;
            default:
                data = labels.map(() => Math.floor(Math.random() * 100));
        }
        
        // Return data in Chart.js format
        return {
            labels: labels,
            datasets: [{
                label: getMetricLabel(yAxis),
                data: data,
                backgroundColor: 'rgba(255, 99, 71, 0.2)',
                borderColor: 'rgb(255, 99, 71)',
                borderWidth: 2
            }]
        };
    } catch (error) {
        console.error('Error fetching custom chart data:', error);
        throw error;
    }
}

/**
 * Get human-readable label for a metric
 * @param {string} metricId - Metric ID
 * @returns {string} Human-readable label
 */
function getMetricLabel(metricId) {
    const metricLabels = {
        'totalTests': 'Total Tests',
        'successRate': 'Success Rate',
        'failedTests': 'Failed Tests',
        'averageTime': 'Average Time',
        'testStability': 'Test Stability',
        'blockedTests': 'Blocked Tests',
        'automationRate': 'Automation Rate',
        'flakiness': 'Flakiness',
        'testsByPriority': 'Tests by Priority'
    };
    
    return metricLabels[metricId] || metricId;
}

/**
 * Initialize a custom chart with the provided configuration and data
 * @param {HTMLElement} canvas - Canvas element for the chart
 * @param {Object} chartConfig - Chart configuration
 * @param {Object} chartData - Chart data
 */
function initializeCustomChart(canvas, chartConfig, chartData) {
    // Determine chart type and options based on configuration
    const chartType = chartConfig.type || 'line';
    
    // Define chart options based on type and config
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: chartConfig.showLegend !== false,
                position: 'top'
            },
            title: {
                display: !!chartConfig.title,
                text: chartConfig.title || ''
            }
        },
        animation: {
            duration: chartConfig.enableAnimation !== false ? 1000 : 0
        }
    };
    
    // Add axis options for charts that support them
    if (['line', 'bar'].includes(chartType)) {
        chartOptions.scales = {
            x: {
                title: {
                    display: true,
                    text: getMetricLabel(chartConfig.xAxis || 'timeStamp')
                },
                grid: {
                    display: chartConfig.showGrid !== false
                }
            },
            y: {
                title: {
                    display: true,
                    text: getMetricLabel(chartConfig.yAxis || 'totalTests')
                },
                grid: {
                    display: chartConfig.showGrid !== false
                },
                beginAtZero: true
            }
        };
    }
    
    // Special options for radar charts
    if (chartType === 'radar') {
        chartOptions.elements = {
            line: {
                borderWidth: 2,
                fill: chartConfig.fillArea !== false
            }
        };
    }
    
    // Create the chart
    try {
        new Chart(canvas, {
            type: chartType,
            data: chartData,
            options: chartOptions
        });
        console.log(`Custom chart created with type: ${chartType}`);
    } catch (error) {
        console.error('Error creating custom chart:', error);
    }
}

/**
 * Get fallback chart data for a given chart type
 * @param {string} chartType - Chart type (line, bar, pie, etc.)
 * @returns {Object} Fallback chart data
 */
function getFallbackChartData(chartType) {
    // Default labels and data
    const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'statusDistribution') {
        return {
            labels: ['Passed', 'Failed', 'Skipped'],
            datasets: [{
                data: [70, 20, 10],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)',
                    'rgb(255, 205, 86)'
                ],
                borderWidth: 1
            }]
        };
    } else if (chartType === 'radar') {
        return {
            labels: ['Performance', 'Reliability', 'Usability', 'Security', 'Functionality'],
            datasets: [{
                label: 'Test Coverage',
                data: [85, 70, 90, 65, 80],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 2,
                pointBackgroundColor: 'rgb(54, 162, 235)'
            }]
        };
    } else {
        // Line or bar chart data
        return {
            labels: labels,
            datasets: [{
                label: 'Test Executions',
                data: [12, 19, 3, 5, 2, 3, 7],
                backgroundColor: 'rgba(255, 99, 71, 0.2)',
                borderColor: 'rgb(255, 99, 71)',
                borderWidth: 2
            }]
        };
    }
}

/**
 * Remove a chart from the report
 * @param {string} chartInstanceId - The chart instance ID
 */
function removeChartFromReport(chartInstanceId) {
    // Remove chart element from the DOM
    const chartElement = document.getElementById(chartInstanceId);
    if (chartElement) {
        chartElement.remove();
    }
    
    // Remove chart from the configuration
    const index = currentTemplate.configuration.charts.findIndex(chart => chart.id === chartInstanceId);
    if (index !== -1) {
        currentTemplate.configuration.charts.splice(index, 1);
    }
    
    // Remove chart from the chart elements list
    const chartIndex = chartElements.findIndex(chart => chart.id === chartInstanceId);
    if (chartIndex !== -1) {
        chartElements.splice(chartIndex, 1);
    }
}

/**
 * Add a text block to the report
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addTextBlockToReport(dropZone) {
    // Create a unique ID for this text block instance
    const textBlockId = `text-block-${Date.now()}`;
    
    // Add text block to the configuration
    const textBlockConfig = {
        id: textBlockId,
        type: 'text',
        content: 'Enter your text here...',
        style: {
            fontSize: '14px',
            textAlign: 'left'
        }
    };
    
    currentTemplate.configuration.textBlocks = currentTemplate.configuration.textBlocks || [];
    currentTemplate.configuration.textBlocks.push(textBlockConfig);
    
    // Create text block element
    const textBlockElement = document.createElement('div');
    textBlockElement.id = textBlockId;
    textBlockElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
    textBlockElement.setAttribute('data-element-type', 'text');
    textBlockElement.setAttribute('data-instance-id', textBlockId);
    
    textBlockElement.innerHTML = `
        <div class="absolute top-2 right-2 flex space-x-2">
            <button class="text-gray-400 hover:text-blue-500 edit-text" data-instance-id="${textBlockId}">
                <i class="ri-edit-line"></i>
            </button>
            <button class="text-gray-400 hover:text-red-500 delete-text" data-instance-id="${textBlockId}">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <div class="text-content mt-2 prose dark:prose-invert max-w-none">
            <p>Enter your text here...</p>
        </div>
    `;
    
    // Add text block to drop zone
    dropZone.appendChild(textBlockElement);
    
    // Make text block draggable
    makeTextBlockDraggable(textBlockElement);
    
    // Add event listeners for text block controls
    addTextBlockEventListeners(textBlockElement);
}

/**
 * Make a text block element draggable
 * @param {HTMLElement} textBlockElement - The text block element
 */
function makeTextBlockDraggable(textBlockElement) {
    textBlockElement.setAttribute('draggable', 'true');
    
    textBlockElement.addEventListener('dragstart', (e) => {
        const instanceId = textBlockElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'text',
            elementId: instanceId,
            isNew: false
        }));
        
        textBlockElement.classList.add('opacity-50');
    });
    
    textBlockElement.addEventListener('dragend', () => {
        textBlockElement.classList.remove('opacity-50');
    });
}

/**
 * Add event listeners for text block controls
 * @param {HTMLElement} textBlockElement - The text block element
 */
function addTextBlockEventListeners(textBlockElement) {
    const editButton = textBlockElement.querySelector('.edit-text');
    const deleteButton = textBlockElement.querySelector('.delete-text');
    
    if (editButton) {
        editButton.addEventListener('click', () => {
            const instanceId = editButton.getAttribute('data-instance-id');
            openTextEditor(instanceId);
        });
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeTextBlockFromReport(instanceId);
        });
    }
}

/**
 * Open text editor modal
 * @param {string} textBlockId - The text block ID
 */
function openTextEditor(textBlockId) {
    const textBlock = currentTemplate.configuration.textBlocks.find(block => block.id === textBlockId);
    if (!textBlock) return;
    
    const textEditor = document.getElementById('text-editor-modal');
    const textContent = document.getElementById('text-editor-content');
    
    if (textEditor && textContent) {
        textContent.value = textBlock.content;
        textEditor.setAttribute('data-text-block-id', textBlockId);
        
        textEditor.classList.remove('hidden');
        textEditor.classList.add('flex');
        textContent.focus();
    }
}

/**
 * Apply text editor content
 */
function applyTextEditorContent() {
    if (!currentElement || currentElement.type !== 'text') return;
    
    const textEditorModal = document.getElementById('text-editor-modal');
    const textContentTextarea = document.getElementById('text-content');
    
    // Get text block element
    const textBlockElement = document.getElementById(currentElement.id);
    if (!textBlockElement) return;
    
    // Update text content in the element
    const textContentElement = textBlockElement.querySelector('.text-content');
    if (textContentElement && textContentTextarea) {
        // Parse markdown or simply wrap in paragraph tags
        const formattedContent = textContentTextarea.value
            .split('\n\n')
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
            
        textContentElement.innerHTML = formattedContent;
    }
    
    // Update text block config
    const textBlockConfig = currentTemplate.configuration.textBlocks.find(block => block.id === currentElement.id);
    if (textBlockConfig && textContentTextarea) {
        textBlockConfig.content = textContentTextarea.value;
    }
    
    // Close modal
    textEditorModal.classList.add('hidden');
    textEditorModal.classList.remove('flex');
    
    // Clear current element
    currentElement = null;
}

/**
 * Remove a text block from the report
 * @param {string} textBlockId - The text block ID
 */
function removeTextBlockFromReport(textBlockId) {
    // Remove text block element from the DOM
    const textBlockElement = document.getElementById(textBlockId);
    if (textBlockElement) {
        textBlockElement.remove();
    }
    
    // Remove text block from the configuration
    const index = currentTemplate.configuration.textBlocks.findIndex(block => block.id === textBlockId);
    if (index !== -1) {
        currentTemplate.configuration.textBlocks.splice(index, 1);
    }
}

/**
 * Add a table to the report
 * @param {string} tableId - The table ID
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addTableToReport(tableId, dropZone) {
    // Create a unique ID for this table instance
    const tableInstanceId = `table-${tableId}-${Date.now()}`;
    
    // Add table to the configuration
    const tableConfig = {
        id: tableInstanceId,
        type: tableId,
        title: getTableTitle(tableId),
        limit: 10,
        columns: getDefaultTableColumns(tableId)
    };
    
    currentTemplate.configuration.tables = currentTemplate.configuration.tables || [];
    currentTemplate.configuration.tables.push(tableConfig);
    
    // Create table element
    const tableElement = document.createElement('div');
    tableElement.id = tableInstanceId;
    tableElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
    tableElement.setAttribute('data-table-id', tableId);
    tableElement.setAttribute('data-instance-id', tableInstanceId);
    
    tableElement.innerHTML = `
        <div class="absolute top-2 right-2 flex space-x-2">
            <button class="text-gray-400 hover:text-blue-500 edit-table" data-instance-id="${tableInstanceId}">
                <i class="ri-settings-line"></i>
            </button>
            <button class="text-gray-400 hover:text-red-500 delete-table" data-instance-id="${tableInstanceId}">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <h3 class="text-lg font-medium mb-4">${getTableTitle(tableId)}</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        ${getDefaultTableColumns(tableId).map(column => 
                            `<th scope="col" class="px-6 py-3">${column.name}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-white dark:bg-gray-800">
                        ${getDefaultTableColumns(tableId).map(() => 
                            `<td class="px-6 py-4">--</td>`
                        ).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Add table to drop zone
    dropZone.appendChild(tableElement);
    
    // Make table draggable
    makeTableDraggable(tableElement);
    
    // Add event listeners for table controls
    addTableEventListeners(tableElement);
}

/**
 * Get the title for a table based on its ID
 * @param {string} tableId - The table ID
 * @returns {string} The table title
 */
function getTableTitle(tableId) {
    switch (tableId) {
        case 'testResults':
            return 'Test Results';
        default:
            return 'Table';
    }
}

/**
 * Get default table columns based on table ID
 * @param {string} tableId - The table ID
 * @returns {Array} Array of column objects
 */
function getDefaultTableColumns(tableId) {
    switch (tableId) {
        case 'testResults':
            return [
                { id: 'name', name: 'Test Name' },
                { id: 'status', name: 'Status' },
                { id: 'duration', name: 'Duration' },
                { id: 'date', name: 'Date' }
            ];
        default:
            return [
                { id: 'col1', name: 'Column 1' },
                { id: 'col2', name: 'Column 2' }
            ];
    }
}

/**
 * Make a table element draggable
 * @param {HTMLElement} tableElement - The table element
 */
function makeTableDraggable(tableElement) {
    tableElement.setAttribute('draggable', 'true');
    
    tableElement.addEventListener('dragstart', (e) => {
        const instanceId = tableElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'table',
            id: tableElement.getAttribute('data-table-id'),
            elementId: instanceId,
            isNew: false
        }));
        
        tableElement.classList.add('opacity-50');
    });
    
    tableElement.addEventListener('dragend', () => {
        tableElement.classList.remove('opacity-50');
    });
}

/**
 * Add event listeners for table controls
 * @param {HTMLElement} tableElement - The table element
 */
function addTableEventListeners(tableElement) {
    const editButton = tableElement.querySelector('.edit-table');
    const deleteButton = tableElement.querySelector('.delete-table');
    
    if (editButton) {
        editButton.addEventListener('click', () => {
            const instanceId = editButton.getAttribute('data-instance-id');
            // Open table settings here (not implemented in this example)
            showToast('Table settings not implemented yet', 'info');
        });
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeTableFromReport(instanceId);
        });
    }
}

/**
 * Remove a table from the report
 * @param {string} tableInstanceId - The table instance ID
 */
function removeTableFromReport(tableInstanceId) {
    // Remove table element from the DOM
    const tableElement = document.getElementById(tableInstanceId);
    if (tableElement) {
        tableElement.remove();
    }
    
    // Remove table from the configuration
    const index = currentTemplate.configuration.tables.findIndex(table => table.id === tableInstanceId);
    if (index !== -1) {
        currentTemplate.configuration.tables.splice(index, 1);
    }
}

/**
 * Add a divider to the report
 * @param {HTMLElement} dropZone - The drop zone element
 */
function addDividerToReport(dropZone) {
    // Create a unique ID for this divider instance
    const dividerId = `divider-${Date.now()}`;
    
    // Create divider element
    const dividerElement = document.createElement('div');
    dividerElement.id = dividerId;
    dividerElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
    dividerElement.setAttribute('data-element-type', 'divider');
    dividerElement.setAttribute('data-instance-id', dividerId);
    
    dividerElement.innerHTML = `
        <div class="absolute top-2 right-2">
            <button class="text-gray-400 hover:text-red-500 delete-divider" data-instance-id="${dividerId}">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 my-4"></div>
    `;
    
    // Add divider to drop zone
    dropZone.appendChild(dividerElement);
    
    // Make divider draggable
    makeDividerDraggable(dividerElement);
    
    // Add event listeners for divider controls
    addDividerEventListeners(dividerElement);
}

/**
 * Make a divider element draggable
 * @param {HTMLElement} dividerElement - The divider element
 */
function makeDividerDraggable(dividerElement) {
    dividerElement.setAttribute('draggable', 'true');
    
    dividerElement.addEventListener('dragstart', (e) => {
        const instanceId = dividerElement.getAttribute('data-instance-id');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            elementType: 'divider',
            elementId: instanceId,
            isNew: false
        }));
        
        dividerElement.classList.add('opacity-50');
    });
    
    dividerElement.addEventListener('dragend', () => {
        dividerElement.classList.remove('opacity-50');
    });
}

/**
 * Add event listeners for divider controls
 * @param {HTMLElement} dividerElement - The divider element
 */
function addDividerEventListeners(dividerElement) {
    const deleteButton = dividerElement.querySelector('.delete-divider');
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const instanceId = deleteButton.getAttribute('data-instance-id');
            removeDividerFromReport(instanceId);
        });
    }
}

/**
 * Remove a divider from the report
 * @param {string} dividerId - The divider ID
 */
function removeDividerFromReport(dividerId) {
    // Remove divider element from the DOM
    const dividerElement = document.getElementById(dividerId);
    if (dividerElement) {
        dividerElement.remove();
    }
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
        console.log(`Toast (${type}): ${message}`);
        alert(message);
    }
}

/**
 * Preview the report
 */
async function previewReport() {
    console.log('Opening preview modal');
    showToast('Generating preview...', 'info');
    
    // Get project ID
    const projectSelector = document.getElementById('projectSelector');
    const projectId = projectSelector ? parseInt(projectSelector.value, 10) : null;
    
    if (!projectId) {
        showToast('Please select a project first', 'warning');
        return;
    }
    
    const previewModal = document.getElementById('preview-modal');
    const previewContent = document.getElementById('preview-content');
    
    if (!previewModal || !previewContent) {
        console.error('Preview modal or content not found');
        showToast('Preview modal not found. Please try again.', 'error');
        return;
    }
    
    // Открываем модальное окно превью 
    previewModal.classList.remove('hidden');
    previewModal.classList.add('flex');
    previewModal.style.display = 'flex';
    
    // Add event listeners to close buttons if they're not already initialized
    initializePreviewModalButtons();
    
    // Show loading indicator
    previewContent.innerHTML = `
        <div class="flex items-center justify-center h-48">
            <div class="spinner-border text-primary" role="status">
                <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-coral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <span class="ml-2 text-xl">Загрузка данных...</span>
        </div>
    `;
    
    try {
        // Prepare the report data
        const reportData = await prepareReportData();
        console.log('Report data for preview:', reportData);
        
        if (!reportData) {
            throw new Error('Failed to get report data');
        }
        
        // Clear previous content
        previewContent.innerHTML = '';
        
        // Format the date range for display
        let dateRangeDisplay = "Last 7 days"; // Default
        const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
        
        if (dataSource.type === 'specific' && dataSource.testRunId) {
            dateRangeDisplay = `Test Run #${dataSource.testRunId}`;
        } else {
            const timePeriod = dataSource.timePeriod || 'week';
            
            if (timePeriod === 'custom' && dataSource.startDate && dataSource.endDate) {
                // Format the date range nicely
                const startDate = new Date(dataSource.startDate);
                const endDate = new Date(dataSource.endDate);
                dateRangeDisplay = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
            } else {
                // Map frontend time periods to human readable
                switch(timePeriod) {
                    case 'day':
                        dateRangeDisplay = 'Last 24 Hours';
                        break;
                    case 'week':
                        dateRangeDisplay = 'Last 7 Days';
                        break;
                    case 'month':
                        dateRangeDisplay = 'Last 30 Days';
                        break;
                    case 'year':
                        dateRangeDisplay = 'Last 365 Days';
                        break;
                }
            }
        }
        
        // Add header
        const headerElement = document.createElement('div');
        headerElement.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">${reportData.name}</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                <span class="font-medium">Project:</span> ${reportData.project.name || 'Unknown Project'}
                <span class="ml-4 font-medium">Date Range:</span> ${dateRangeDisplay}
            </p>
        `;
        previewContent.appendChild(headerElement);
        
        // Add metrics only if there are any in the current configuration
        if (currentTemplate.configuration.metrics && currentTemplate.configuration.metrics.length > 0 && 
            reportData.metrics && Object.keys(reportData.metrics).length > 0) {
        
            const metricsRow = document.createElement('div');
            metricsRow.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6';
            
            // Only display metrics that are in the template
            currentTemplate.configuration.metrics.forEach(metricId => {
                if (!reportData.metrics[metricId]) return;
                
                const metricData = reportData.metrics[metricId];
                
                // Determine metric display information
                let iconClass = 'ri-checkbox-multiple-line';
                let iconColor = 'text-blue-500';
                let metricName = 'Unknown Metric';
                
                switch (metricId) {
                    case 'totalTests':
                        iconClass = 'ri-checkbox-multiple-line';
                        iconColor = 'text-blue-500';
                        metricName = 'Total Tests';
                        break;
                    case 'successRate':
                        iconClass = 'ri-percent-line';
                        iconColor = 'text-green-500';
                        metricName = 'Success Rate';
                        break;
                    case 'failedTests':
                        iconClass = 'ri-close-circle-line';
                        iconColor = 'text-red-500';
                        metricName = 'Failed Tests';
                        break;
                    case 'averageTime':
                        iconClass = 'ri-time-line';
                        iconColor = 'text-amber-500';
                        metricName = 'Average Time';
                        break;
                    case 'testStability':
                        iconClass = 'ri-rhythm-line';
                        iconColor = 'text-indigo-500';
                        metricName = 'Test Stability';
                        break;
                    case 'blockedTests':
                        iconClass = 'ri-lock-line';
                        iconColor = 'text-orange-500';
                        metricName = 'Blocked Tests';
                        break;
                    case 'automationRate':
                        iconClass = 'ri-robot-line';
                        iconColor = 'text-cyan-500';
                        metricName = 'Automation Rate';
                        break;
                    case 'flakiness':
                        iconClass = 'ri-error-warning-line';
                        iconColor = 'text-pink-500';
                        metricName = 'Flakiness';
                        break;
                }
                
                const metricElement = document.createElement('div');
                metricElement.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
                
                metricElement.innerHTML = `
                    <div class="flex items-center">
                        <i class="${iconClass} text-xl mr-2 ${iconColor}"></i>
                        <span>${metricName}</span>
                    </div>
                    <div class="text-2xl font-semibold mt-2">${metricData.value || '--'}</div>
                `;
                
                metricsRow.appendChild(metricElement);
            });
            
            if (metricsRow.children.length > 0) {
                previewContent.appendChild(metricsRow);
            }
        }
        
        // Add charts
        if (currentTemplate.configuration.charts && currentTemplate.configuration.charts.length > 0) {
            currentTemplate.configuration.charts.forEach(chart => {
                const chartElement = document.createElement('div');
                chartElement.className = 'mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
                chartElement.style.width = `${chart.width}px`;
                chartElement.style.maxWidth = '100%';
                
                // Get chart data based on chart type
                let chartData;
                let chartHtml;
                
                switch (chart.type) {
                    case 'executionTrend':
                        chartData = getExecutionTrendSampleData();
                        chartHtml = generateChartHtml(chartData, chart.title, chart.height);
                        break;
                    case 'statusDistribution':
                        chartData = getStatusDistributionSampleData();
                        chartHtml = generatePieChartHtml(chartData, chart.title, chart.height);
                        break;
                    case 'testExecutionTime':
                        chartData = getExecutionTimeSampleData();
                        chartHtml = generateBarChartHtml(chartData, chart.title, chart.height);
                        break;
                    case 'testStability':
                        chartData = getTestStabilitySampleData();
                        chartHtml = generateBarChartHtml(chartData, chart.title, chart.height);
                        break;
                    default:
                        // Default chart placeholder
                        chartHtml = `
                            <h3 class="text-lg font-medium mb-4">${chart.title}</h3>
                            <div style="height: ${chart.height}px;">
                                <div class="w-full h-full bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                    <i class="ri-line-chart-line text-4xl text-gray-400 dark:text-gray-500"></i>
                                </div>
                            </div>
                        `;
                }
                
                chartElement.innerHTML = chartHtml;
                previewContent.appendChild(chartElement);
                
                // Initialize the chart if there's a canvas
                const canvas = chartElement.querySelector('canvas');
                if (canvas && chart.type) {
                    initializeChart(canvas, chart.type, chartData);
                }
            });
        }
        
        // Helper functions for chart data generation and rendering
        function getExecutionTrendSampleData() {
            return {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Passed',
                        data: [65, 59, 80, 81, 56, 55, 40],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)'
                    },
                    {
                        label: 'Failed',
                        data: [28, 12, 40, 19, 28, 27, 10],
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)'
                    },
                    {
                        label: 'Skipped',
                        data: [10, 5, 12, 9, 5, 4, 8],
                        borderColor: '#FFC107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)'
                    }
                ]
            };
        }
        
        function getStatusDistributionSampleData() {
            return {
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{
                    data: [70, 20, 10],
                    backgroundColor: [
                        '#4CAF50',  // Green
                        '#F44336',  // Red
                        '#FFC107'   // Yellow
                    ]
                }]
            };
        }
        
        function getExecutionTimeSampleData() {
            return {
                labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
                datasets: [{
                    label: 'Execution Time (s)',
                    data: [120, 90, 60, 45, 30],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            };
        }
        
        function getTestStabilitySampleData() {
            return {
                labels: ['Test A', 'Test B', 'Test C', 'Test D', 'Test E'],
                datasets: [{
                    label: 'Stability (%)',
                    data: [95, 85, 75, 65, 55],
                    backgroundColor: [
                        'rgba(13, 220, 0, 0.7)',
                        'rgba(92, 220, 0, 0.7)',
                        'rgba(160, 220, 0, 0.7)',
                        'rgba(255, 160, 0, 0.7)',
                        'rgba(255, 80, 0, 0.7)'
                    ]
                }]
            };
        }
        
        function generateChartHtml(data, title, height) {
            return `
                <h3 class="text-lg font-medium mb-4">${title}</h3>
                <div style="height: ${height}px; position: relative;">
                    <canvas></canvas>
                </div>
            `;
        }
        
        function generatePieChartHtml(data, title, height) {
            return `
                <h3 class="text-lg font-medium mb-4">${title}</h3>
                <div style="height: ${height}px; position: relative;">
                    <canvas></canvas>
                </div>
            `;
        }
        
        function generateBarChartHtml(data, title, height) {
            return `
                <h3 class="text-lg font-medium mb-4">${title}</h3>
                <div style="height: ${height}px; position: relative;">
                    <canvas></canvas>
                </div>
            `;
        }
        
        function initializeChart(canvas, chartType, chartData) {
            let chartConfig;
            
            switch (chartType) {
                case 'executionTrend':
                    chartConfig = {
                        type: 'line',
                        data: chartData,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    };
                    break;
                case 'statusDistribution':
                    chartConfig = {
                        type: 'pie',
                        data: chartData,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false
                        }
                    };
                    break;
                case 'testExecutionTime':
                case 'testStability':
                    chartConfig = {
                        type: 'bar',
                        data: chartData,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    };
                    break;
                default:
                    return;
            }
            
            try {
                new Chart(canvas, chartConfig);
            } catch (error) {
                console.error('Error initializing chart:', error);
            }
        }
        
        // Add text blocks
        if (reportData.textBlocks && reportData.textBlocks.length > 0) {
            reportData.textBlocks.forEach(textBlock => {
                const textBlockElement = document.createElement('div');
                textBlockElement.className = 'mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
                
                // Parse markdown or simply wrap in paragraph tags
                const formattedContent = textBlock.content
                    .split('\n\n')
                    .map(paragraph => `<p>${paragraph}</p>`)
                    .join('');
                    
                textBlockElement.innerHTML = formattedContent;
                
                previewContent.appendChild(textBlockElement);
            });
        }
        
        // Add tables
        if (reportData.tables && reportData.tables.length > 0) {
            reportData.tables.forEach(table => {
                const tableElement = document.createElement('div');
                tableElement.className = 'mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
                
                tableElement.innerHTML = `
                    <h3 class="text-lg font-medium mb-4">${table.title}</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    ${table.columns.map(column => 
                                        `<th scope="col" class="px-6 py-3">${column.name}</th>`
                                    ).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="bg-white dark:bg-gray-800">
                                    ${table.columns.map(() => 
                                        `<td class="px-6 py-4">--</td>`
                                    ).join('')}
                                </tr>
                                <tr class="bg-gray-50 dark:bg-gray-700">
                                    ${table.columns.map(() => 
                                        `<td class="px-6 py-4">--</td>`
                                    ).join('')}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
                
                previewContent.appendChild(tableElement);
            });
        }
        
        // Show success message
        showToast('Preview generated successfully', 'success');
    } catch (error) {
        console.error('Error generating preview:', error);
        
        // Show error message in the preview content
        previewContent.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Ошибка!</strong>
                <span class="block sm:inline">${error.message || 'Произошла ошибка при формировании предпросмотра отчета.'}</span>
            </div>
        `;
        
        showToast('Error generating preview: ' + error.message, 'error');
    }
}

/**
 * Prepare report data for preview or saving
 * @returns {Promise<Object>} Report data
 */
async function prepareReportData() {
    // Get project info
    const projectSelector = document.getElementById('projectSelector');
    const projectId = projectSelector ? parseInt(projectSelector.value, 10) : null;
    const projectName = projectSelector ? projectSelector.options[projectSelector.selectedIndex]?.textContent : 'Unknown Project';
    
    // Get report name
    const reportNameInput = document.getElementById('report-name');
    const reportName = reportNameInput ? reportNameInput.value : currentTemplate.name;
    
    // Get data source configuration
    const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
    
    // Determine appropriate time range parameter for API calls
    let timeRangeParam = 'lastWeek'; // Default
    
    if (dataSource.type === 'specific' && dataSource.testRunId) {
        // For specific test runs - handled separately
        console.log(`Using specific test run #${dataSource.testRunId}`);
    } else {
        // Map frontend time periods to backend values
        if (dataSource.timePeriod === 'custom' && dataSource.startDate && dataSource.endDate) {
            timeRangeParam = 'custom';
            console.log(`Using custom date range: ${dataSource.startDate} to ${dataSource.endDate}`);
        } else {
            const timePeriod = dataSource.timePeriod || 'week';
            switch (timePeriod) {
                case 'day':
                    timeRangeParam = 'last24Hours';
                    break;
                case 'week':
                    timeRangeParam = 'lastWeek';
                    break;
                case 'month':
                    timeRangeParam = 'lastMonth';
                    break;
                case 'year':
                    timeRangeParam = 'lastYear';
                    break;
                default:
                    timeRangeParam = 'lastWeek';
            }
            console.log(`Using predefined time period: ${timeRangeParam}`);
        }
    }
    
    if (!projectId) {
        console.error('No project ID found');
        showToast('Пожалуйста, выберите проект', 'error');
        return null;
    }
    
    try {
        // Skip the preview endpoint since it's giving 500 errors
        // We'll directly use the individual data fetching which works
        console.log('Using direct data fetching method instead of preview endpoint');
        
        // For debugging purposes, log the current template configuration
        console.log('Current template configuration:', currentTemplate.configuration);
        
        // For new templates or if the preview endpoint fails, fetch data individually
        console.log('Fetching metrics and charts data individually');
        const metricsData = await fetchMetricsData(projectId);
        const chartsData = await fetchChartsData(projectId, timeRangeParam, currentTemplate.configuration.charts);
        
        return {
            name: reportName,
            project: {
                id: projectId,
                name: projectName
            },
            metrics: metricsData,
            charts: chartsData,
            textBlocks: currentTemplate.configuration.textBlocks || [],
            tables: currentTemplate.configuration.tables || []
        };
    } catch (error) {
        console.error('Error fetching report data:', error);
        showToast(`Ошибка при получении данных: ${error.message}`, 'error');
        
        // Return empty/mock data as fallback
        return {
            name: reportName,
            project: {
                id: projectId,
                name: projectName
            },
            metrics: currentTemplate.configuration.metrics.reduce((acc, metricId) => {
                // Generate fallback values
                let value = '--';
                acc[metricId] = { value };
                return acc;
            }, {}),
            charts: {},
            textBlocks: currentTemplate.configuration.textBlocks || [],
            tables: currentTemplate.configuration.tables || []
        };
    }
}

/**
 * Fetch metrics data from API
 * @param {number} projectId - Project ID
 * @param {string} timeRange - Time range
  * @returns {Promise<Object>} Metrics data
 */
async function fetchMetricsData(projectId, timeRange) {
    try {
        // Определяем тип источника данных и параметры
        const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
        let apiUrl = `${config.API_BASE_URL}${config.ENDPOINTS.REPORTS.ANALYTICS}metrics`;
        let queryParams = new URLSearchParams();
        
        // Always add project ID
        queryParams.append('project', projectId);
        
        if (dataSource.type === 'specific' && dataSource.testRunId) {
            // Используем URL для получения метрик по конкретному тестовому прогону
            apiUrl = `${config.API_BASE_URL}/test-runs/${dataSource.testRunId}/metrics/`;
            console.log(`Fetching metrics for specific test run #${dataSource.testRunId}`);
        } else {
            console.log('Fetching general project metrics');
            
            // Добавляем параметры временного периода
            const timePeriod = dataSource.timePeriod || 'week';
            
            if (timePeriod === 'custom' && dataSource.startDate && dataSource.endDate) {
                // Для пользовательского диапазона используем конкретные даты
                queryParams.append('start_date', dataSource.startDate);
                queryParams.append('end_date', dataSource.endDate);
                console.log(`Using custom date range: ${dataSource.startDate} to ${dataSource.endDate}`);
            } else {
                // Map frontend time periods to backend time_range values
                let backendTimePeriod;
                switch(timePeriod) {
                    case 'day':
                        backendTimePeriod = 'last24Hours';
                        break;
                    case 'week':
                        backendTimePeriod = 'lastWeek';
                        break;
                    case 'month':
                        backendTimePeriod = 'lastMonth';
                        break;
                    case 'year':
                        backendTimePeriod = 'lastYear';
                        break;
                    default:
                        backendTimePeriod = 'lastWeek'; // Default
                }
                
                // Для предопределенных периодов используем строковый идентификатор
                queryParams.append('time_range', backendTimePeriod);
                console.log(`Using predefined time period: ${backendTimePeriod}`);
            }
        }
        
        // Добавляем параметры к URL
        apiUrl += `?${queryParams.toString()}`;
        
        console.log(`Fetching metrics from: ${apiUrl}`);
        
        const response = await fetchWithAuth(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Metrics API endpoint not available: ${response.status}. Using mock data.`);
            return getMockMetricsData();
        }

        const data = await response.json();
        console.log('Metrics data from API:', data);
        return data;
    } catch (error) {
        console.error('Error fetching metrics data:', error);
        return getMockMetricsData();
    }
}

/**
 * Generate mock metrics data for preview
 * @returns {Object} Mock metrics data
 */
function getMockMetricsData() {
    const mockData = {};
    
    if (currentTemplate.configuration.metrics) {
        currentTemplate.configuration.metrics.forEach(metricId => {
            // Generate mock values based on metric type
            switch (metricId) {
                case 'totalTests':
                    mockData[metricId] = { 
                        value: Math.floor(Math.random() * 100) + 50,
                        trend: Math.floor(Math.random() * 30) - 15
                    };
                    break;
                case 'successRate':
                    mockData[metricId] = { 
                        value: `${Math.floor(Math.random() * 30) + 70}%`,
                        trend: Math.floor(Math.random() * 20) - 5
                    };
                    break;
                case 'failedTests':
                    mockData[metricId] = { 
                        value: Math.floor(Math.random() * 10) + 5,
                        trend: Math.floor(Math.random() * 10) - 5
                    };
                    break;
                case 'averageTime':
                    mockData[metricId] = { 
                        value: `${Math.floor(Math.random() * 60) + 30}s`,
                        trend: Math.floor(Math.random() * 20) - 10
                    };
                    break;
                default:
                    mockData[metricId] = { value: '--' };
            }
        });
    }
    
    console.log('Generated mock metrics data:', mockData);
    return mockData;
}

/**
 * Fetch charts data from API
 * @param {number} projectId - Project ID
 * @param {string} timeRange - Time range
 * @param {Array} charts - Charts configuration
 * @returns {Promise<Object>} Charts data
 */
async function fetchChartsData(projectId, timeRange, charts) {
    if (!charts || charts.length === 0) {
        return {};
    }
    
    const chartsData = {};
    
    try {
        // Determine date range parameters based on selected time period
        const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
        let timeRangeParam;
        let startDateParam;
        let endDateParam;
        
        if (dataSource.type === 'specific' && dataSource.testRunId) {
            // For specific test runs, just use the run ID
            // Not implemented for charts yet
            console.log('Specific test run charts not implemented, using time period instead');
            timeRangeParam = 'lastWeek'; // Default
        } else {
            const timePeriod = dataSource.timePeriod || 'week';
            
            if (timePeriod === 'custom' && dataSource.startDate && dataSource.endDate) {
                // For custom date range
                startDateParam = dataSource.startDate;
                endDateParam = dataSource.endDate;
                timeRangeParam = 'custom';
            } else {
                // Map frontend time periods to backend time_range values
                switch(timePeriod) {
                    case 'day':
                        timeRangeParam = 'last24Hours';
                        break;
                    case 'week':
                        timeRangeParam = 'lastWeek';
                        break;
                    case 'month':
                        timeRangeParam = 'lastMonth';
                        break;
                    case 'year':
                        timeRangeParam = 'lastYear';
                        break;
                    default:
                        timeRangeParam = 'lastWeek'; // Default
                }
            }
        }

        // Process each chart in sequence
        for (const chart of charts) {
            const chartType = chart.type;
            
            // Build base URL - ensure we use the correctly formatted endpoint
            // Convert chart type from camelCase to kebab-case to match backend requirements
            const camelToKebab = (str) => {
                return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            };
            const formattedChartType = camelToKebab(chartType);
            
            // Use the correct backend API URL pattern
            let chartEndpoint = `${config.API_BASE_URL}/backend/report-templates/analytics/charts/${formattedChartType}/?project=${projectId}`;
            
            // Add time parameters
            if (timeRangeParam === 'custom' && startDateParam && endDateParam) {
                chartEndpoint += `&time_range=${timeRangeParam}&start_date=${startDateParam}&end_date=${endDateParam}`;
            } else {
                chartEndpoint += `&time_range=${timeRangeParam}`;
            }
            
            try {
                console.log(`Fetching chart data from: ${chartEndpoint}`);
                
                const response = await fetchWithAuth(chartEndpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch chart data: ${response.status}`);
                }
                
                const data = await response.json();
                chartsData[chart.id] = data;
            } catch (chartError) {
                console.warn(`Error fetching data for chart ${chartType}:`, chartError.message);
                // Use fallback data for this chart
                chartsData[chart.id] = getFallbackChartData(chartType);
            }
        }
        
        return chartsData;
    } catch (error) {
        console.error('Error in fetchChartsData:', error);
        
        // Return fallback data for all charts
        if (charts) {
            for (const chart of charts) {
                chartsData[chart.id] = getFallbackChartData(chart.type);
            }
        }
        
        return chartsData;
    }
}

/**
 * Get fallback chart data for a given chart type
 * @param {string} chartType - Chart type
 * @returns {Object} Fallback chart data
 */
function getFallbackChartData(chartType) {
    switch (chartType) {
        case 'executionTrend':
            return getExecutionTrendSampleData();
        case 'statusDistribution':
            return getStatusDistributionSampleData();
        case 'testExecutionTime':
            return getExecutionTimeSampleData();
        case 'testStability':
            return getTestStabilitySampleData();
        default:
            return {
                labels: ['No data'],
                datasets: [{
                    label: 'No data available',
                    data: [0],
                    backgroundColor: 'rgba(200, 200, 200, 0.5)'
                }]
            };
    }
}

/**
 * Download report as PDF
 */
async function downloadReportAsPdf() {
    try {
        // Check if template is saved first
        if (!currentTemplate.id) {
            showToast('Please save the report template before downloading PDF', 'warning');
            return;
        }
        
        // Get project ID
        const projectSelector = document.getElementById('projectSelector');
        const projectId = projectSelector ? parseInt(projectSelector.value, 10) : null;
        
        if (!projectId) {
            showToast('Please select a project first', 'warning');
            return;
        }
        
        // Show loading toast
        showToast('Generating PDF...', 'info');
        
        // Generate the report first
        const generateUrl = `${config.API_BASE_URL}${config.ENDPOINTS.REPORTS.ANALYTICS}generate_report/${currentTemplate.id}/`;
        const generateResponse = await fetchWithAuth(generateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                project: projectId,
                name: currentTemplate.name,
                time_range: 'lastWeek' // Default to last week
            })
        });
        
        if (!generateResponse.ok) {
            const errorData = await generateResponse.json();
            throw new Error(errorData.error || `Failed to generate report: ${generateResponse.status}`);
        }
        
        const reportData = await generateResponse.json();
        
        // Download the PDF
        if (reportData.id) {
            const downloadUrl = `${config.API_BASE_URL}${config.ENDPOINTS.REPORTS.ANALYTICS}reports/${reportData.id}/download_pdf/`;
            
            // Create a temporary link and click it to download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${reportData.name || 'report'}.pdf`);
            link.setAttribute('target', '_blank');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('PDF download started', 'success');
        } else {
            throw new Error('Report was generated but no ID was returned');
        }
    } catch (error) {
        console.error('Error downloading PDF:', error);
        showToast(`Error downloading PDF: ${error.message}`, 'error');
    }
}

/**
 * Initialize buttons in the preview modal
 */
function initializePreviewModalButtons() {
    const previewModal = document.getElementById('preview-modal');
    const closePreview = document.getElementById('close-preview');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const exportPdf = document.getElementById('export-pdf');
    
    if (!previewModal) {
        console.error('Preview modal not found');
        return;
    }
    
    // Check if event listeners are already attached (using a data attribute to track)
    if (previewModal.getAttribute('data-listeners-initialized') === 'true') {
        console.log('Preview modal buttons already initialized');
        return;
    }
    
    console.log('Initializing preview modal buttons');
    
    // Close button (X) in the top-right
    if (closePreview) {
        closePreview.addEventListener('click', () => {
            console.log('Close preview button clicked');
            closePreviewModal();
        });
    } else {
        console.warn('Close preview button not found');
    }
    
    // Close button at the bottom of the modal
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            console.log('Close preview button (bottom) clicked');
            closePreviewModal(); 
        });
    } else {
        console.warn('Close preview button (bottom) not found');
    }
    
    // Export PDF button
    if (exportPdf) {
        exportPdf.addEventListener('click', () => {
            console.log('Export PDF button clicked');
            // First close the modal
            closePreviewModal();
            
            // Then download the PDF
            downloadReportAsPdf();
        });
    } else {
        console.warn('Export PDF button not found');
    }
    
    // Add keyboard event listener to close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && 
            !previewModal.classList.contains('hidden') && 
            previewModal.style.display !== 'none') {
            console.log('Escape key pressed, closing preview modal');
            closePreviewModal();
        }
    });
    
    // Mark that we've initialized the listeners
    previewModal.setAttribute('data-listeners-initialized', 'true');
    console.log('Preview modal buttons initialization complete');
}

/**
 * Close the preview modal
 */
function closePreviewModal() {
    console.log('Closing preview modal');
    const previewModal = document.getElementById('preview-modal');
    if (previewModal) {
        previewModal.classList.add('hidden');
        previewModal.classList.remove('flex');
        previewModal.style.display = 'none';
        console.log('Preview modal closed');
    } else {
        console.warn('Preview modal element not found when trying to close it');
    }
}

/**
 * Save the report template to the backend API
 */
function saveReport() {
    // Validate report data
    if (!validateReportData()) {
        return;
    }
    
    // Get project ID from URL if not selected
    if (!currentTemplate.project) {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');
        if (projectId) {
            currentTemplate.project = parseInt(projectId, 10);
            console.log('Using project ID from URL for save:', currentTemplate.project);
        }
    }
    
    // Double-check if project ID exists and is valid
    if (!currentTemplate.project || isNaN(currentTemplate.project)) {
        showToast('Please select a project before saving', 'error');
        return;
    }
    
    // Prepare the data for saving
    const reportData = prepareReportData();
    
    // Set the report data in the template
    currentTemplate.name = reportData.name;
    
    // Get title from the panel if it exists
    const reportTitleInput = document.getElementById('report-title');
    if (reportTitleInput && reportTitleInput.value) {
        if (!currentTemplate.configuration.title) {
            currentTemplate.configuration.title = {};
        }
        currentTemplate.configuration.title.text = reportTitleInput.value;
    }
    
    // Show saving notification
    showToast('Saving report template...', 'info');
    
    console.log('Saving report template:', currentTemplate);
    
    // Display the template data for troubleshooting
    console.log('Template data before save:', JSON.stringify(currentTemplate, null, 2));
    
    // Prepare the request data
    const requestData = {
        name: currentTemplate.name,
        description: currentTemplate.description || '',
        project: currentTemplate.project,
        is_public: currentTemplate.is_public !== false, // Default to true if not specified
        configuration: currentTemplate.configuration
    };
    
    // Determine if it's a create or update request
    const isUpdate = !!currentTemplate.id;
    const method = isUpdate ? 'PUT' : 'POST';
    const url = isUpdate 
        ? `${config.API_BASE_URL}${config.ENDPOINTS.REPORTS.TEMPLATES}${currentTemplate.id}/`
        : `${config.API_BASE_URL}${config.ENDPOINTS.REPORTS.TEMPLATES}`;

    // Send the request to the API
    fetchWithAuth(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                // Try to parse error as JSON
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.detail || errorData.error || 'An error occurred while saving the template');
                } catch (e) {
                    // If not JSON, use text
                    throw new Error(text || `Server returned ${response.status}: ${response.statusText}`);
                }
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Template saved successfully:', data);
        
        // Update current template with server data
        currentTemplate = data;
        
        // Show success message
        showToast('Report template saved successfully', 'success');
        
        // Redirect to reports page after a short delay
        setTimeout(() => {
            window.location.href = 'reports.html';
        }, 1500);
    })
    .catch(error => {
        console.error('Error saving template:', error);
        showToast(`Error saving template: ${error.message}`, 'error');
    });
}

/**
 * Validate report data before saving
 * @returns {boolean} True if valid, false otherwise
 */
function validateReportData() {
    // Check if report name is provided
    const reportNameInput = document.getElementById('report-name');
    if (!reportNameInput || !reportNameInput.value.trim()) {
        showToast('Please enter a report name', 'error');
        reportNameInput.focus();
        return false;
    }
    
    // Check if project is selected
    const projectSelector = document.getElementById('projectSelector');
    if (!projectSelector || !projectSelector.value) {
        // Try to get project ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');
        if (!projectId) {
            showToast('Please select a project', 'error');
            projectSelector.focus();
            return false;
        } else {
            // Set the project ID from URL
            currentTemplate.project = parseInt(projectId, 10);
            console.log('Using project ID from URL:', currentTemplate.project);
        }
    }
    
    // Check if at least one element is added
    const hasMetrics = currentTemplate.configuration.metrics && currentTemplate.configuration.metrics.length > 0;
    const hasCharts = currentTemplate.configuration.charts && currentTemplate.configuration.charts.length > 0;
    const hasTextBlocks = currentTemplate.configuration.textBlocks && currentTemplate.configuration.textBlocks.length > 0;
    const hasTables = currentTemplate.configuration.tables && currentTemplate.configuration.tables.length > 0;
    
    if (!hasMetrics && !hasCharts && !hasTextBlocks && !hasTables) {
        showToast('Please add at least one element to the report', 'error');
        return false;
    }
    
    return true;
}

/**
 * Initialize default settings for a new template
 * @param {Object} template - The template to initialize defaults for
 */
function initializeDefaultSettings(template) {
    if (!template.configuration) {
        template.configuration = {};
    }
    
    // Set default data source settings if not already set
    if (!template.configuration.dataSource) {
        template.configuration.dataSource = {
            type: 'general',
            timePeriod: 'week'
        };
        
        // Initialize UI elements based on default settings
        const metricsDataSource = document.getElementById('metrics-data-source');
        const timePeriodSelector = document.getElementById('time-period-selector');
        const testRunSelection = document.getElementById('test-run-selection');
        
        if (metricsDataSource) {
            metricsDataSource.value = 'general';
        }
        
        if (timePeriodSelector) {
            timePeriodSelector.value = 'week';
        }
        
        if (testRunSelection) {
            testRunSelection.classList.add('hidden');
        }
        
        console.log('Default data source settings initialized');
    }
    
    // Initialize other default settings as needed
    if (!template.configuration.metrics) {
        template.configuration.metrics = [];
    }
    
    if (!template.configuration.charts) {
        template.configuration.charts = [];
    }
    
    if (!template.configuration.textBlocks) {
        template.configuration.textBlocks = [];
    }
    
    if (!template.configuration.tables) {
        template.configuration.tables = [];
    }
    
    console.log('Template default settings initialized');
    return template;
}

/**
 * Initialize template from server response or create a new one
 * @param {Object} data - Template data from server
 */
function initTemplate(data) {
    if (data) {
        // Update current template with server data
        currentTemplate = data;
        console.log('Template data loaded:', currentTemplate);
        
        // Update report name in main header
        const reportNameInput = document.getElementById('report-name');
        if (reportNameInput) {
            reportNameInput.value = currentTemplate.name || 'Untitled Report';
            console.log('Set report name input value to:', reportNameInput.value);
        } else {
            console.error('Report name input not found');
        }
        
        // Also update report title in sidebar panel
        const reportTitleInput = document.getElementById('report-title');
        if (reportTitleInput) {
            reportTitleInput.value = currentTemplate.name || 'Untitled Report';
            console.log('Set report title input value to:', reportTitleInput.value);
        }
        
        // Set the project from template in both selectors
        if (currentTemplate.project) {
            const projectId = currentTemplate.project;
            console.log('Setting project ID:', projectId);
            
            // For main header selector
            const projectSelector = document.getElementById('projectSelector');
            if (projectSelector) {
                // Immediately try to set the selection if options are already loaded
                if (projectSelector.options.length > 1) {
                    // Try to find the matching project
                    let found = false;
                    for (let i = 0; i < projectSelector.options.length; i++) {
                        if (parseInt(projectSelector.options[i].value, 10) === projectId) {
                            projectSelector.selectedIndex = i;
                            found = true;
                            break;
                        }
                    }
                    
                    if (found) {
                        console.log('Selected project in header:', projectSelector.value);
                    } else {
                        console.warn('Project not found in header selector:', projectId);
                    }
                }
                
                // Also set up wait loop to handle the case where projects load after template
                const checkProjectsLoaded = setInterval(() => {
                    // Check if projects have been loaded
                    if (projectSelector.options.length > 1) {
                        clearInterval(checkProjectsLoaded);
                        
                        // Try to find the matching project
                        let found = false;
                        for (let i = 0; i <projectSelector.options.length; i++) {
                            if (parseInt(projectSelector.options[i].value, 10) === projectId) {
                                projectSelector.selectedIndex = i;
                                found = true;
                                break;
                            }
                        }
                        
                        if (!found) {
                            console.warn('Project not found in header selector after loading:', projectId);
                        } else {
                            console.log('Selected project in header after loading:', projectSelector.value);
                            
                            // Trigger change event to update UI
                            const event = new Event('change');
                            projectSelector.dispatchEvent(event);
                        }
                    }
                }, 200);
                
                // Set a timeout to stop checking after 5 seconds
                setTimeout(() => clearInterval(checkProjectsLoaded), 5000);
            }
            
            // For sidebar panel selector
            const projectSelectorPanel = document.getElementById('projectSelectorPanel');
            if (projectSelectorPanel) {
                // Immediately try to set the selection if options are already loaded
                if (projectSelectorPanel.options.length > 1) {
                    // Try to find the matching project
                    for (let i = 0; i < projectSelectorPanel.options.length; i++) {
                        if (parseInt(projectSelectorPanel.options[i].value, 10) === projectId) {
                            projectSelectorPanel.selectedIndex = i;
                            console.log('Selected project in panel:', projectSelectorPanel.value);
                            break;
                        }
                    }
                }
                
                // Also set up wait loop for panel selector
                const checkPanelProjectsLoaded = setInterval(() => {
                    if (projectSelectorPanel.options.length > 1) {
                        clearInterval(checkPanelProjectsLoaded);
                        
                        let found = false;
                        for (let i = 0; i < projectSelectorPanel.options.length; i++) {
                            if (parseInt(projectSelectorPanel.options[i].value, 10) === projectId) {
                                projectSelectorPanel.selectedIndex = i;
                                found = true;
                                break;
                            }
                        }
                        
                        if (!found) {
                            console.warn('Project not found in panel selector after loading:', projectId);
                        } else {
                            console.log('Selected project in panel after loading:', projectSelectorPanel.value);
                        }
                    }
                }, 200);
                
                setTimeout(() => clearInterval(checkPanelProjectsLoaded), 5000);
            }
        }
        
        // Process template configuration
        if (!currentTemplate.configuration) {
            currentTemplate.configuration = {};
            console.warn('Template has no configuration, initializing empty configuration');
        }
        
        // Initialize metrics
        if (currentTemplate.configuration.metrics) {
            currentTemplate.configuration.metrics.forEach(metricId => {
                addMetricToReport(metricId);
            });
        } else {
            currentTemplate.configuration.metrics = [];
        }
        
        // Initialize charts, textBlocks, and tables if not present
        if (!currentTemplate.configuration.charts) currentTemplate.configuration.charts = [];
        if (!currentTemplate.configuration.textBlocks) currentTemplate.configuration.textBlocks = [];
        if (!currentTemplate.configuration.tables) currentTemplate.configuration.tables = [];
        
        // Clear main drop zone
        const mainDropZone = document.getElementById('main-drop-zone');
        if (mainDropZone) {
            // Clear empty state
            const emptyState = mainDropZone.querySelector('.flex.flex-col.items-center.justify-center');
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            
            // Load charts
            currentTemplate.configuration.charts.forEach(chartConfig => {
                // Create chart element based on config
                const chartElement = document.createElement('div');
                chartElement.id = chartConfig.id;
                chartElement.className = 'chart-container relative';
                chartElement.style.width = `${chartConfig.width || 800}px`;
                chartElement.style.height = `${chartConfig.height || 400}px`;
                chartElement.setAttribute('data-chart-id', chartConfig.type);
                chartElement.setAttribute('data-instance-id', chartConfig.id);
                
                chartElement.innerHTML = `
                    <div class="chart-controls">
                        <button class="chart-control-btn edit-chart" data-instance-id="${chartConfig.id}">
                            <i class="ri-settings-line"></i>
                        </button>
                        <button class="chart-control-btn delete-chart" data-instance-id="${chartConfig.id}">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                    <h3 class="text-lg font-medium mb-4">${chartConfig.title || getChartTitle(chartConfig.type)}</h3>
                    <div class="chart-placeholder w-full h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                        <i class="ri-line-chart-line text-4xl text-gray-400 dark:text-gray-500"></i>
                    </div>
                    <div class="chart-resizer">
                        <i class="ri-drag-move-line"></i>
                    </div>
                    <div class="resize-handle se"></div>
                `;
                
                // Add chart to drop zone
                mainDropZone.appendChild(chartElement);
                
                // Make chart element draggable for repositioning
                makeChartDraggable(chartElement);
                
                // Make chart resizable
                makeChartResizable(chartElement);
                
                // Add event listeners for chart controls
                addChartControlEventListeners(chartElement);
                
                // Add chart to the list of chart elements
                chartElements.push({
                    id: chartConfig.id,
                    element: chartElement,
                    config: chartConfig
                });
            });
            
            // Load text blocks
            if (currentTemplate.configuration.textBlocks) {
                currentTemplate.configuration.textBlocks.forEach(textBlockConfig => {
                    // Create text block element based on config
                    const textBlockElement = document.createElement('div');
                    textBlockElement.id = textBlockConfig.id;
                    textBlockElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
                    textBlockElement.setAttribute('data-element-type', 'text');
                    textBlockElement.setAttribute('data-instance-id', textBlockConfig.id);
                    
                    textBlockElement.innerHTML = `
                        <div class="absolute top-2 right-2 flex space-x-2">
                            <button class="text-gray-400 hover:text-blue-500 edit-text" data-instance-id="${textBlockConfig.id}">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="text-gray-400 hover:text-red-500 delete-text" data-instance-id="${textBlockConfig.id}">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                        <div class="text-content pt-6">
                            ${textBlockConfig.content.split('\n\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
                        </div>
                    `;
                    
                    // Add text block to drop zone
                    mainDropZone.appendChild(textBlockElement);
                    
                    // Make text block draggable
                    makeTextBlockDraggable(textBlockElement);
                    
                    // Add event listeners for text block controls
                    addTextBlockEventListeners(textBlockElement);
                });
            }
            
            // Load tables
            if (currentTemplate.configuration.tables) {
                currentTemplate.configuration.tables.forEach(tableConfig => {
                    // Create table element based on config
                    const tableElement = document.createElement('div');
                    tableElement.id = tableConfig.id;
                    tableElement.className = 'relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4';
                    tableElement.setAttribute('data-table-id', tableConfig.type);
                    tableElement.setAttribute('data-instance-id', tableConfig.id);
                    
                    tableElement.innerHTML = `
                        <div class="absolute top-2 right-2 flex space-x-2">
                            <button class="text-gray-400 hover:text-blue-500 edit-table" data-instance-id="${tableConfig.id}">
                                <i class="ri-settings-line"></i>
                            </button>
                            <button class="text-gray-400 hover:text-red-500 delete-table" data-instance-id="${tableConfig.id}">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                        <h3 class="text-lg font-medium mb-4 pt-4">${tableConfig.title || getTableTitle(tableConfig.type)}</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        ${tableConfig.columns.map(column => 
                                            `<th scope="col" class="px-6 py-3">${column.name}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="bg-white dark:bg-gray-800">
                                        ${tableConfig.columns.map(() => 
                                            `<td class="px-6 py-4">--</td>`
                                        ).join('')}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    // Add table to drop zone
                    mainDropZone.appendChild(tableElement);
                    
                    // Make table draggable
                    makeTableDraggable(tableElement);
                    
                    // Add event listeners for table controls
                    addTableEventListeners(tableElement);
                });
            }
        }
        
        // Show success message
        showToast('Template loaded successfully', 'success');
        
        // Re-setup drag and drop
        setTimeout(setupDragAndDrop, 500);
    } else {
        // Create a new template
        currentTemplate = {
            name: 'New Report Template',
            description: '',
            configuration: {
                metrics: [],
                charts: [],
                textBlocks: [],
                tables: []
            },
            is_public: true
        };
        
        // Update form values
        const reportNameInput = document.getElementById('report-name');
        if (reportNameInput) {
            reportNameInput.value = currentTemplate.name;
        }
        
        // Initialize default settings
        currentTemplate = initializeDefaultSettings(currentTemplate);
    }
}

/**
 * Load template data by ID from the API
 * @param {string} templateId - The template ID
 */
function loadTemplate(templateId) {
    // Show loading notification
    showToast('Loading template...', 'info');
    
    // Get project ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    
    let apiUrl = `${config.API_BASE_URL}${config.ENDPOINTS.REPORTS.TEMPLATES}${templateId}/`;
    // Add project ID to URL if available
    if (projectId) {
        apiUrl += `?project=${projectId}`;
    }
    console.log('Loading template from API URL:', apiUrl);
    
    // Fetch template data from API
    fetchWithAuth(apiUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Template loaded:', data);
        
        // Update current template
        currentTemplate = data;
        console.log('Template data loaded:', currentTemplate);
        
        // Update report name in main header
        const reportNameInput = document.getElementById('report-name');
        if (reportNameInput) {
            reportNameInput.value = currentTemplate.name || 'Untitled Report';
            console.log('Set report name input value to:', reportNameInput.value);
        } else {
            console.error('Report name input not found');
        }
        
        // Also update report title in sidebar panel
        const reportTitleInput = document.getElementById('report-title');
        if (reportTitleInput) {
            reportTitleInput.value = currentTemplate.name || 'Untitled Report';
            console.log('Set report title input value to:', reportTitleInput.value);
        }
        
        // Set the project from template in both selectors
        if (currentTemplate.project) {
            const projectId = currentTemplate.project;
            console.log('Setting project ID:', projectId);
            
            // For main header selector
            const projectSelector = document.getElementById('projectSelector');
            if (projectSelector) {
                // Immediately try to set the selection if options are already loaded
                if (projectSelector.options.length > 1) {
                    // Try to find the matching project
                    let found = false;
                    for (let i = 0; i < projectSelector.options.length; i++) {
                        if (parseInt(projectSelector.options[i].value, 10) === projectId) {
                            projectSelector.selectedIndex = i;
                            found = true;
                            break;
                        }
                    }
                    
                    if (found) {
                        console.log('Selected project in header:', projectSelector.value);
                    } else {
                        console.warn('Project not found in header selector:', projectId);
                    }
                }
                
                // Also set up wait loop to handle the case where projects load after template
                const checkProjectsLoaded = setInterval(() => {
                    // Check if projects have been loaded
                    if (projectSelector.options.length > 1) {
                        clearInterval(checkProjectsLoaded);
                        
                        // Try to find the matching project
                        let found = false;
                        for (let i = 0; i <projectSelector.options.length; i++) {
                            if (parseInt(projectSelector.options[i].value, 10) === projectId) {
                                projectSelector.selectedIndex = i;
                                found = true;
                                break;
                            }
                        }
                        
                        if (!found) {
                            console.warn('Project not found in header selector after loading:', projectId);
                        } else {
                            console.log('Selected project in header after loading:', projectSelector.value);
                            
                            // Trigger change event to update UI
                            const event = new Event('change');
                            projectSelector.dispatchEvent(event);
                        }
                    }
                }, 200);
                
                // Set a timeout to stop checking after 5 seconds
                setTimeout(() => clearInterval(checkProjectsLoaded), 5000);
            }
            
            // For sidebar panel selector
            const projectSelectorPanel = document.getElementById('projectSelectorPanel');
            if (projectSelectorPanel) {
                // Immediately try to set the selection if options are already loaded
                if (projectSelectorPanel.options.length > 1) {
                    // Try to find the matching project
                    for (let i = 0; i < projectSelectorPanel.options.length; i++) {
                        if (parseInt(projectSelectorPanel.options[i].value, 10) === projectId) {
                            projectSelectorPanel.selectedIndex = i;
                            console.log('Selected project in panel:', projectSelectorPanel.value);
                            break;
                        }
                    }
                }
                
                // Also set up wait loop for panel selector
                const checkPanelProjectsLoaded = setInterval(() => {
                    if (projectSelectorPanel.options.length > 1) {
                        clearInterval(checkPanelProjectsLoaded);
                        
                        let found = false;
                        for (let i = 0; i < projectSelectorPanel.options.length; i++) {
                            if (parseInt(projectSelectorPanel.options[i].value, 10) === projectId) {
                                projectSelectorPanel.selectedIndex = i;
                                found = true;
                                break;
                            }
                        }
                        
                        if (!found) {
                            console.warn('Project not found in panel selector after loading:', projectId);
                        } else {
                            console.log('Selected project in panel after loading:', projectSelectorPanel.value);
                        }
                    }
                }, 200);
                
                setTimeout(() => clearInterval(checkPanelProjectsLoaded), 5000);
            }
        }
        
        // Process template configuration
        if (!currentTemplate.configuration) {
            currentTemplate.configuration = {};
            console.warn('Template has no configuration, initializing empty configuration');
        }
        
        // Initialize metrics array but dont add any to the report
        if (!currentTemplate.configuration.metrics) {
            currentTemplate.configuration.metrics = [];
        }
        if (!currentTemplate.configuration.tables) currentTemplate.configuration.tables = [];
        
        // Clear main drop zone
        const mainDropZone = document.getElementById('main-drop-zone');
        if (mainDropZone) {
            // Clear empty state
            const emptyState = mainDropZone.querySelector('.flex.flex-col.items-center.justify-center');
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            
            // Load charts
            currentTemplate.configuration.charts.forEach(chartConfig => {
                // Create chart element based on config
                const chartElement = document.createElement('div');
            // No charts to load - custom charts will be added by the user
                    // Create text block element based on config
                    const textBlockElement = document.createElement('div');
                    textBlockElement.id = textBlockConfig.id;
            // No charts to load - custom charts will be added by the user
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        ${tableConfig.columns.map(column => 
                                            `<th scope="col" class="px-6 py-3">${column.name}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="bg-white dark:bg-gray-800">
                                        ${tableConfig.columns.map(() => 
                                            `<td class="px-6 py-4">--</td>`
                                        ).join('')}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    // Add table to drop zone
                    mainDropZone.appendChild(tableElement);
                    
                    // Make table draggable
                    makeTableDraggable(tableElement);
                    
                    // Add event listeners for table controls
                    addTableEventListeners(tableElement);
                });
            }
        }
        
        // Show success message
        showToast('Template loaded successfully', 'success');
        
        // Re-setup drag and drop
        setTimeout(setupDragAndDrop, 500);
    })
    .catch(error => {
        console.error('Error loading template:', error);
        showToast(`Error loading template: ${error.message}`, 'error');
        
        // Initialize with empty template
        currentTemplate = {
            name: 'New Report Template',
            description: '',
            configuration: {
                metrics: [],
                charts: [],
                textBlocks: [],
                tables: []
            },
            is_public: true
        };
        
        // Update form values
        const reportNameInput = document.getElementById('report-name');
        if (reportNameInput) {
            reportNameInput.value = currentTemplate.name;
        }
    });
}

/**
 * Load metrics data for the current template
 */
async function loadMetricsData() {
    try {
        if (!currentTemplate.project) {
            console.warn('No project selected, metrics data could not be loaded');
            return;
        }
        
        console.log('Loading metrics data for project ID:', currentTemplate.project);
        
        // Get data source configuration
        const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
        
        // Prepare API parameters
        let apiParams = new URLSearchParams();
        apiParams.append('project', currentTemplate.project);
        
        if (dataSource.type === 'specific' && dataSource.testRunId) {
            // For specific test run - this would need a different endpoint
            // Currently using the same endpoint with time filter
            console.log('Loading metrics for specific test run:', dataSource.testRunId);
            apiParams.append('test_run', dataSource.testRunId);
        } else {
            // For general time-period based data
            const timePeriod = dataSource.timePeriod || 'week';
            if (timePeriod === 'custom' && dataSource.startDate && dataSource.endDate) {
                apiParams.append('time_range', 'custom');
                apiParams.append('start_date', dataSource.startDate);
                apiParams.append('end_date', dataSource.endDate);
                console.log(`Using custom date range: ${dataSource.startDate} to ${dataSource.endDate}`);
            } else {
                // Map frontend time periods to backend values
                let backendTimePeriod;
                switch (timePeriod) {
                    case 'day':
                        backendTimePeriod = 'last24Hours';
                        break;
                    case 'week':
                        backendTimePeriod = 'lastWeek';
                        break;
                    case 'month':
                        backendTimePeriod = 'lastMonth';
                        break;
                    case 'year':
                        backendTimePeriod = 'lastYear';
                        break;
                    default:
                        backendTimePeriod = 'lastWeek';
                }
                apiParams.append('time_range', backendTimePeriod);
                console.log(`Using time period: ${backendTimePeriod}`);
            }
        }
        
        // Fetch metrics data with appropriate filters
        console.log(`Fetching metrics with params: ${apiParams.toString()}`);
        const metricsData = await fetchMetricsData(currentTemplate.project, apiParams);
        
        // Update metric values in the DOM
        updateMetricValues(metricsData);
        
        console.log('Metrics data loaded successfully');
    } catch (error) {
        console.error('Error loading metrics data:', error);
        showToast('Failed to load metrics data', 'error');
    }
}

/**
 * Update metric values in the DOM
 * @param {Object} metricsData - Data returned from the API
 */
function updateMetricValues(metricsData) {
    // Если данных нет, просто выходим
    if (!metricsData || Object.keys(metricsData).length === 0) {
        console.warn('No metrics data available to update');
        return;
    }
    
    // Получаем все метрики на странице
    const metricElements = document.querySelectorAll('[data-metric-id]');
    
    // Обновляем каждую метрику, если для неё есть данные
    metricElements.forEach(metricElement => {
        const metricId = metricElement.getAttribute('data-metric-id');
        const valueElement = metricElement.querySelector('.text-2xl');
        
        if (valueElement && metricsData[metricId]) {
            // Обновляем значение метрики
            valueElement.textContent = metricsData[metricId].value || '--';
            console.log(`Updated metric ${metricId} with value ${metricsData[metricId].value}`);
            
            // Добавляем класс для анимации обновления
            valueElement.classList.add('updated');
            setTimeout(() => {
                valueElement.classList.remove('updated');
            }, 1000);
        } else {
            console.warn(`Metric data not found for metric ID: ${metricId}`);
            // Если данных нет, показываем плейсхолдер
            if (valueElement) {
                valueElement.textContent = '--';
            }
        }
    });
}

/**
 * Get mock metrics data for testing
 * @returns {Object} Mock metrics data
 */
function getMockMetricsData() {
    console.log('Using mock metrics data');
    
    // Определяем тип источника данных
    const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
    let period = 'за последнюю неделю';
    
    if (dataSource.type === 'specific') {
        period = 'для выбранного тестового прогона';
    } else if (dataSource.timePeriod) {
        switch (dataSource.timePeriod) {
            case 'day':
                period = 'за последние 24 часа';
                break;
            case 'week':
                period = 'за последнюю неделю';
                break;
            case 'month':
                period = 'за последний месяц';
                break;
            case 'year':
                period = 'за последний год';
                break;
            case 'custom':
                if (dataSource.startDate && dataSource.endDate) {
                    period = `с ${dataSource.startDate} по ${dataSource.endDate}`;
                } else {
                    period = 'за пользовательский период';
                }
                break;
        }
    }
    
    return {
        'total-tests': {
            id: 'total-tests',
            name: 'Total Tests',
            value: Math.floor(Math.random() * 1000) + 100,
            description: `Общее количество тестов ${period}`
        },
        'success-rate': {
            id: 'success-rate',
            name: 'Success Rate',
            value: `${(Math.random() * 30 + 70).toFixed(1)}%`,
            description: `Процент успешных тестов ${period}`
        },
        'failed-tests': {
            id: 'failed-tests',
            name: 'Failed Tests',
            value: Math.floor(Math.random() * 50) + 5,
            description: `Количество проваленных тестов ${period}`
        },
        'pending-tests': {
            id: 'pending-tests',
            name: 'Pending Tests',
            value: Math.floor(Math.random() * 20) + 1,
            description: `Количество ожидающих тестов ${period}`
        },
        'blocked-tests': {
            id: 'blocked-tests',
            name: 'Blocked Tests',
            value: Math.floor(Math.random() * 15) + 1,
            description: `Количество заблокированных тестов ${period}`
        },
        'execution-time': {
            id: 'execution-time',
            name: 'Execution Time',
            value: `${(Math.random() * 100 + 50).toFixed(1)} мин`,
            description: `Среднее время выполнения тестов ${period}`
        }
    };
}
