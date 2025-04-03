/**
 * Report Editor Core Module
 * 
 * This is the main entry point for the report editor functionality
 * It imports all other modules and initializes the editor
 */

// Current template data - shared across modules
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
 * Initialize the report editor
 */
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

        // Initialize user menu functionality
        initializeUserMenu();
        
        // Load projects data
        loadProjects();
        
        // Set up drag and drop functionality
        setupDragAndDrop();
        
        // Set up event listeners
        setupEventListeners();
        
        // Parse URL parameters to check if we're editing an existing template
        const templateId = urlParams.get('templateId');
        
        if (templateId) {
            loadTemplate(templateId);
            showToast('Editing template #' + templateId, 'info');
        } else {
            // Initialize empty template when creating a new report
            console.log('Creating new template, resetting metrics');
            
            // Clear metrics in template
            currentTemplate.configuration.metrics = [];
            
            // Clear metrics container if it exists
            const metricsContainer = document.getElementById('metrics-container');
            if (metricsContainer) {
                metricsContainer.innerHTML = '';
                console.log('Cleared metrics container');
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
        
        // Load metrics data if a project is selected
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
    fetchWithAuth(`${i18nConfig.API_BASE_URL}${config.ENDPOINTS.PROJECTS}`, {
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
        
        // Don't select error option
        // Just show message to user
        showToast(`Error loading projects: ${error.message}`, 'error');
        
        // Add disabled option "Failed to load projects"
        const errorMsg = 'Не удалось загрузить проекты';
        
        if (projectSelector) {
            const errorOption = document.createElement('option');
            errorOption.textContent = errorMsg;
            errorOption.disabled = true;
            errorOption.value = ""; // Empty value!
            projectSelector.appendChild(errorOption);
            // Set empty option back to selected
            projectSelector.value = "";
        }
        
        if (projectSelectorPanel) {
            const errorOptionPanel = document.createElement('option');
            errorOptionPanel.textContent = errorMsg;
            errorOptionPanel.disabled = true;
            errorOptionPanel.value = ""; // Empty value!
            projectSelectorPanel.appendChild(errorOptionPanel);
            // Set empty option back to selected
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
 * Set up drag and drop functionality for report elements
 */
function setupDragAndDrop() {
    console.log('Setting up drag and drop functionality');
    
    // Get all draggable elements and drop zones
    const reportElements = document.querySelectorAll('.report-element');
    const dropZone = document.getElementById('main-drop-zone');
    
    console.log('Found report elements:', reportElements.length);
    console.log('Found drop zone:', dropZone);
    
    // Make elements draggable
    reportElements.forEach(element => {
        console.log('Adding drag events to element:', element);
        element.setAttribute('draggable', 'true');
        
        // Remove existing event listeners to prevent duplicates
        element.removeEventListener('dragstart', handleDragStart);
        element.removeEventListener('dragend', handleDragEnd);
        
        // Add event listeners
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragend', handleDragEnd);
        
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
        // Remove existing event listeners to prevent duplicates
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragenter', handleDragEnter);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
        
        // Add event listeners
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragenter', handleDragEnter);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
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
                // For predefined periods, load data immediately
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
            
            // If both dates are selected, load data
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
            
            // If both dates are selected, load data
            if (this.value && startDate) {
                loadMetricsData();
            }
        });
    }
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
        // Important: set data before changing effectAllowed
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
        e.dataTransfer.effectAllowed = 'copy'; // Changed from 'move' to 'copy'
        
        // Add data in another format for cross-browser compatibility
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        
        // Add visual feedback
        e.target.classList.add('opacity-50');
        
        // Show message to user
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

// Use both DOMContentLoaded and window.onload to ensure everything is initialized
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded: Initializing report editor...');
    
    // Check for access token
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
        console.warn('No access token found, redirecting to login page');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    // Initialize report editor
    initializeEditor();
    
    // Initialize metrics data if project is already selected
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

// Export variables and functions for other modules
window.currentTemplate = currentTemplate;
window.chartElements = chartElements;
window.currentElement = currentElement;
window.initializeEditor = initializeEditor;
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDragEnter = handleDragEnter;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.showToast = showToast;
