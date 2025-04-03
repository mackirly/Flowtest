/**
 * Report Editor Templates Module
 * 
 * Provides functionality for loading, saving, and previewing report templates
 */

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
 * Load template data by ID from the API
 * @param {string} templateId - The template ID
 */
function loadTemplate(templateId) {
    // Show loading notification
    showToast('Loading template...', 'info');
    
    // Get project ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    
    let apiUrl = `${i18nConfig.API_BASE_URL}${config.ENDPOINTS.REPORTS.TEMPLATES}${templateId}/`;
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
        
        // Initialize metrics array but don't add any to the report
        if (!currentTemplate.configuration.metrics) {
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
            
            // No charts to load - custom charts will be added by the user
            
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
                                            `<td class="px-6 py-4">0</td>`
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
    
    // Open the preview modal
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
                    <div class="text-2xl font-semibold mt-2">${metricData.value || '0'}</div>
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
                                        `<td class="px-6 py-4">0</td>`
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
 * Helper functions for chart display in preview
 */
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
                let value = '0';
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

// Export functions for use in other modules
window.initializeDefaultSettings = initializeDefaultSettings;
window.loadTemplate = loadTemplate;
window.previewReport = previewReport;
window.prepareReportData = prepareReportData;
window.fetchChartsData = fetchChartsData;
window.saveReport = saveReport;
window.validateReportData = validateReportData;
window.downloadReportAsPdf = downloadReportAsPdf;
window.initializePreviewModalButtons = initializePreviewModalButtons;
window.closePreviewModal = closePreviewModal;
