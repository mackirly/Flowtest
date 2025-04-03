/**
 * Report Editor Metrics Module
 * 
 * Provides functionality for adding and managing metrics in the report
 */

/**
 * Add a metric to the report
 * @param {string} metricId - The metric ID
 */
function addMetricToReport(metricId) {
    console.log(`Attempting to add metric: ${metricId}`);
    
    let metricsContainer = document.getElementById('metrics-container');
    
    // Create container if it doesn't exist
    if (!metricsContainer) {
        console.log('Creating metrics container because it does not exist');
        const dropZone = document.getElementById('main-drop-zone');
        if (!dropZone) {
            console.error('Cannot find drop zone to add metrics container');
            return;
        }
        
        // Create new container for metrics - use CSS Grid instead of Tailwind
        metricsContainer = document.createElement('div');
        metricsContainer.id = 'metrics-container';
        // Don't use Tailwind grid classes, they're overridden in styles
        metricsContainer.style.marginTop = '32px';
        dropZone.appendChild(metricsContainer);
    }
    
    // Hide empty state when adding elements
    const dropZone = document.getElementById('main-drop-zone');
    if (dropZone) {
        const emptyState = dropZone.querySelector('.flex.flex-col.items-center.justify-center');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
    
    // Check if metric already exists in DOM
    const existingMetricElement = document.querySelector(`#metrics-container [data-metric-id="${metricId}"]`);
    if (existingMetricElement) {
        console.log(`Metric ${metricId} already exists in DOM, skipping`);
        showToast('This metric is already added to the report', 'info');
        return;
    }
    
    // Check if metric already exists in the configuration
    if (currentTemplate.configuration.metrics.includes(metricId)) {
        console.log(`Metric ${metricId} already exists in configuration, skipping`);
        // If metric is in configuration but not in DOM - this is inconsistency, fix it
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
    
    // Enhance metric styles for better display
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
        <div class="text-2xl font-semibold mt-4">0</div>
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
    
    // Remove from DOM - search only in metrics-container
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
 * Load metrics data from API
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
 * Fetch metrics data from API
 * @param {number} projectId - Project ID
 * @param {URLSearchParams} queryParams - Query parameters
 * @returns {Promise<Object>} Metrics data
 */
async function fetchMetricsData(projectId, queryParams) {
    try {
        // Determine data source type and parameters
        const dataSource = currentTemplate.configuration.dataSource || { type: 'general', timePeriod: 'week' };
        let apiUrl = `${i18nConfig.API_BASE_URL}${config.ENDPOINTS.REPORTS.ANALYTICS}metrics`;
        
        // Always add project ID
        if (!queryParams) {
            queryParams = new URLSearchParams();
            queryParams.append('project', projectId);
        }
        
        if (dataSource.type === 'specific' && dataSource.testRunId) {
            // Use URL for getting metrics for a specific test run
            apiUrl = `${config.API_BASE_URL}/test-runs/${dataSource.testRunId}/metrics/`;
            console.log(`Fetching metrics for specific test run #${dataSource.testRunId}`);
        } else {
            console.log('Fetching general project metrics');
            
            // Add time period parameters
            const timePeriod = dataSource.timePeriod || 'week';
            
            if (timePeriod === 'custom' && dataSource.startDate && dataSource.endDate) {
                // For custom range, use specific dates
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
                
                // For predefined periods, use string identifier
                queryParams.append('time_range', backendTimePeriod);
                console.log(`Using predefined time period: ${backendTimePeriod}`);
            }
        }
        
        // Add parameters to URL
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
 * Update metric values in the DOM
 * @param {Object} metricsData - Data returned from the API
 */
function updateMetricValues(metricsData) {
    // If no data, just exit
    if (!metricsData || Object.keys(metricsData).length === 0) {
        console.warn('No metrics data available to update');
        return;
    }
    
    // Get all metrics on the page
    const metricElements = document.querySelectorAll('[data-metric-id]');
    
    // Update each metric if data is available
    metricElements.forEach(metricElement => {
        const metricId = metricElement.getAttribute('data-metric-id');
        const valueElement = metricElement.querySelector('.text-2xl');
        
        if (valueElement && metricsData[metricId]) {
            // Update metric value
            valueElement.textContent = metricsData[metricId].value || '0';
            console.log(`Updated metric ${metricId} with value ${metricsData[metricId].value}`);
            
            // Add animation class for update
            valueElement.classList.add('updated');
            setTimeout(() => {
                valueElement.classList.remove('updated');
            }, 1000);
        } else {
            console.warn(`Metric data not found for metric ID: ${metricId}`);
            // If no data, show 0 instead of placeholder
            if (valueElement) {
                valueElement.textContent = '0';
            }
        }
    });
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
                    mockData[metricId] = { value: '0' };
            }
        });
    }
    
    console.log('Generated mock metrics data:', mockData);
    return mockData;
}

// Export functions for use in other modules
window.addMetricToReport = addMetricToReport;
window.removeMetricFromReport = removeMetricFromReport;
window.loadMetricsData = loadMetricsData;
window.fetchMetricsData = fetchMetricsData;
window.updateMetricValues = updateMetricValues;
window.getMockMetricsData = getMockMetricsData;
