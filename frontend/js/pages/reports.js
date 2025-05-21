/**
 * Reports page functionality
 * Handles report listing, filtering, generation, and charting
 */

import { initializeLanguageMenu } from '../i18n/i18n.js';
import { showToast } from '../utils/toast.js';
import { api } from '../api/client.js';

// DOM Elements
const elements = {
    // Page elements
    totalReportsCount: document.getElementById('total-reports-count'),
    testsExecutedCount: document.getElementById('tests-executed-count'),
    passRate: document.getElementById('pass-rate'),
    scheduledReportsCount: document.getElementById('scheduled-reports-count'),
    projectSelector: document.getElementById('project-selector'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    applyFilterButton: document.getElementById('apply-filter-button'),
    refreshReportsButton: document.getElementById('refresh-reports-button'),
    scheduleReportButton: document.getElementById('schedule-report-button'),
    searchReports: document.getElementById('search-reports'),
    sortSelector: document.getElementById('sort-selector'),
    reportsList: document.getElementById('reports-list'),
    reportCount: document.getElementById('report-count'),
    paginationInfo: document.getElementById('pagination-info'),
    prevPageButton: document.getElementById('prev-page'),
    nextPageButton: document.getElementById('next-page'),
    pageSizeSelector: document.getElementById('page-size-selector'),
    chartPeriodButtons: document.querySelectorAll('.chart-period-button'),
    
    // Modals
    generateReportButton: document.getElementById('generate-report-button'),
    generateReportModal: document.getElementById('generate-report-modal'),
    closeReportModal: document.getElementById('close-report-modal'),
    generateReportForm: document.getElementById('generate-report-form'),
    cancelReportButton: document.getElementById('cancel-report-button'),
    reportNameInput: document.getElementById('report-name'),
    reportTypeSelect: document.getElementById('report-type'),
    reportProjectSelect: document.getElementById('report-project'),
    reportFormatSelect: document.getElementById('report-format'),
    reportDateFromInput: document.getElementById('report-date-from'),
    reportDateToInput: document.getElementById('report-date-to'),
    scheduleGeneration: document.getElementById('schedule-generation'),
    scheduleOptions: document.getElementById('schedule-options'),
    scheduleFrequency: document.getElementById('schedule-frequency'),
    weekdaySelector: document.getElementById('weekday-selector'),
    monthdaySelector: document.getElementById('monthday-selector'),
    
    // Filter modal
    filterButton: document.getElementById('filter-button'),
    filterModal: document.getElementById('filter-modal'),
    closeFilterModal: document.getElementById('close-filter-modal'),
    filterForm: document.getElementById('filter-form'),
    clearFiltersButton: document.getElementById('clear-filters-button')
};

// State
const state = {
    projects: [],
    reports: [],
    totalReports: 0,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    filters: {
        project: '',
        type: '',
        status: '',
        user: '',
        search: ''
    },
    sort: 'date',
    chartPeriod: 'week',
    chartData: null,
    chartInstance: null
};

// Initialize the page
function initPage() {
    // Initialize i18n
    initializeLanguageMenu();
    
    // Setup event listeners
    setupEventListeners();
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    elements.dateFrom.valueAsDate = thirtyDaysAgo;
    elements.dateTo.valueAsDate = today;
    elements.reportDateFromInput.valueAsDate = thirtyDaysAgo;
    elements.reportDateToInput.valueAsDate = today;
    
    // Populate monthday selector
    populateMonthDaySelector();
    
    // Load initial data
    loadDashboardMetrics();
    loadProjects();
    loadReports();
    loadChartData();
    
    // Setup user menu
    setupUserMenu();
}

// Setup event listeners
function setupEventListeners() {
    // Page controls
    elements.applyFilterButton.addEventListener('click', applyDateFilter);
    elements.refreshReportsButton.addEventListener('click', refreshData);
    elements.scheduleReportButton.addEventListener('click', () => {
        openGenerateReportModal();
        elements.scheduleGeneration.checked = true;
        toggleScheduleOptions();
    });
    elements.searchReports.addEventListener('input', handleReportSearch);
    elements.sortSelector.addEventListener('change', handleReportSort);
    elements.prevPageButton.addEventListener('click', () => navigatePage(-1));
    elements.nextPageButton.addEventListener('click', () => navigatePage(1));
    elements.pageSizeSelector.addEventListener('change', handlePageSizeChange);
    elements.projectSelector.addEventListener('change', handleProjectChange);
    
    // Chart period buttons
    elements.chartPeriodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update period and button styling
            state.chartPeriod = button.dataset.period;
            
            // Update active button styling
            elements.chartPeriodButtons.forEach(btn => {
                if (btn === button) {
                    btn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
                    btn.classList.add('bg-coral-500', 'text-white');
                } else {
                    btn.classList.remove('bg-coral-500', 'text-white');
                    btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
                }
            });
            
            // Reload chart data
            loadChartData();
        });
    });
    
    // Generate report modal
    elements.generateReportButton.addEventListener('click', openGenerateReportModal);
    elements.closeReportModal.addEventListener('click', closeGenerateReportModal);
    elements.cancelReportButton.addEventListener('click', closeGenerateReportModal);
    elements.generateReportForm.addEventListener('submit', handleReportGeneration);
    elements.scheduleGeneration.addEventListener('change', toggleScheduleOptions);
    elements.scheduleFrequency.addEventListener('change', handleFrequencyChange);
    
    // Report types buttons
    document.querySelectorAll('[data-report-type]').forEach(button => {
        button.addEventListener('click', () => {
            const reportType = button.dataset.reportType;
            openGenerateReportModal();
            elements.reportTypeSelect.value = reportType;
        });
    });
    
    // Filter modal
    elements.filterButton.addEventListener('click', openFilterModal);
    elements.closeFilterModal.addEventListener('click', closeFilterModal);
    elements.filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
        closeFilterModal();
    });
    elements.clearFiltersButton.addEventListener('click', clearFilters);
    
    // User dropdown
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    
    userMenuButton.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
    });
    
    // Language dropdown
    const languageMenuButton = document.getElementById('language-menu-button');
    const languageDropdown = document.getElementById('language-dropdown');
    
    languageMenuButton.addEventListener('click', () => {
        languageDropdown.classList.toggle('hidden');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
        
        if (!languageMenuButton.contains(e.target) && !languageDropdown.contains(e.target)) {
            languageDropdown.classList.add('hidden');
        }
    });
    
    // Logout button
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', handleLogout);
}

// Load dashboard metrics
async function loadDashboardMetrics() {
    try {
        const response = await api.get('/reports/metrics');
        
        if (response.success) {
            const { total_reports, tests_executed, pass_rate, scheduled_reports } = response.data;
            
            elements.totalReportsCount.textContent = total_reports || 0;
            elements.testsExecutedCount.textContent = tests_executed || 0;
            elements.passRate.textContent = `${pass_rate || 0}%`;
            elements.scheduledReportsCount.textContent = scheduled_reports || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard metrics:', error);
        showToast('error', 'Failed to load dashboard metrics');
    }
}

// Load projects
async function loadProjects() {
    try {
        const response = await api.get('/projects');
        
        if (response.success) {
            state.projects = response.data;
            
            // Clear existing options except the first one
            while (elements.projectSelector.options.length > 1) {
                elements.projectSelector.remove(1);
            }
            
            while (elements.reportProjectSelect.options.length > 1) {
                elements.reportProjectSelect.remove(1);
            }
            
            // Add projects to dropdown
            state.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                
                const option2 = option.cloneNode(true);
                
                elements.projectSelector.appendChild(option);
                elements.reportProjectSelect.appendChild(option2);
            });
            
            // Populate filter modal
            const filterProjectSelect = document.getElementById('filter-project');
            
            // Clear existing options except the first one
            while (filterProjectSelect.options.length > 1) {
                filterProjectSelect.remove(1);
            }
            
            // Add projects
            state.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                filterProjectSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('error', 'Failed to load projects');
    }
}

// Load reports with pagination and filtering
async function loadReports() {
    try {
        // Show loading state
        elements.reportsList.innerHTML = `
            <tr class="animate-pulse">
                <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p data-i18n="loadingReports">Loading reports...</p>
                </td>
            </tr>
        `;
        
        // Prepare query parameters
        const params = {
            page: state.currentPage,
            limit: state.pageSize,
            sort: state.sort
        };
        
        // Add filters if they exist
        if (state.filters.project) params.project = state.filters.project;
        if (state.filters.type) params.type = state.filters.type;
        if (state.filters.status) params.status = state.filters.status;
        if (state.filters.user) params.user = state.filters.user;
        if (state.filters.search) params.search = state.filters.search;
        
        const response = await api.get('/reports', params);
        
        if (response.success) {
            state.reports = response.data.reports;
            state.totalReports = response.data.total;
            state.totalPages = Math.ceil(state.totalReports / state.pageSize);
            
            // Update report count
            elements.reportCount.textContent = state.totalReports;
            
            // Update pagination
            updatePagination();
            
            // Render reports
            renderReports();
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('error', 'Failed to load reports');
        
        elements.reportsList.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <p>Error loading reports. Please try again.</p>
                </td>
            </tr>
        `;
    }
}

// Render reports table
function renderReports() {
    if (state.reports.length === 0) {
        elements.reportsList.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <p data-i18n="noReportsFound">No reports found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    state.reports.forEach(report => {
        // Determine status indicator class
        let statusClass = 'status-recent';
        let statusText = 'Recent';
        
        if (report.status === 'scheduled') {
            statusClass = 'status-scheduled';
            statusText = 'Scheduled';
        } else if (report.status === 'outdated') {
            statusClass = 'status-outdated';
            statusText = 'Outdated';
        }
        
        // Format date
        const date = new Date(report.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        html += `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <i class="ri-file-chart-line text-coral-500 mr-2"></i>
                    <div>
                        <div class="font-medium">${report.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${report.description || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm">${getReportTypeName(report.type)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm">${report.project_name}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs mr-2">
                        ${getInitials(report.user_name)}
                    </div>
                    <span class="text-sm">${report.user_name}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm">${formattedDate}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="status-indicator ${statusClass}"></span>
                    <span class="text-sm">${statusText}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end space-x-2">
                    <button class="export-button p-1 rounded text-gray-500 dark:text-gray-400 hover:text-coral-500 dark:hover:text-coral-400" title="Download" data-report-id="${report.id}">
                        <i class="ri-download-2-line"></i>
                    </button>
                    ${report.status === 'scheduled' ? `
                    <button class="export-button p-1 rounded text-gray-500 dark:text-gray-400 hover:text-coral-500 dark:hover:text-coral-400" title="Edit Schedule" data-schedule-id="${report.id}">
                        <i class="ri-calendar-line"></i>
                    </button>
                    ` : ''}
                    <button class="export-button p-1 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title="Delete" data-delete-id="${report.id}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    });
    
    elements.reportsList.innerHTML = html;
    
    // Add event listeners to action buttons
    elements.reportsList.querySelectorAll('[data-report-id]').forEach(button => {
        button.addEventListener('click', () => downloadReport(button.dataset.reportId));
    });
    
    elements.reportsList.querySelectorAll('[data-schedule-id]').forEach(button => {
        button.addEventListener('click', () => editSchedule(button.dataset.scheduleId));
    });
    
    elements.reportsList.querySelectorAll('[data-delete-id]').forEach(button => {
        button.addEventListener('click', () => deleteReport(button.dataset.deleteId));
    });
}

// Update pagination controls
function updatePagination() {
    elements.paginationInfo.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
    
    // Update button states
    elements.prevPageButton.disabled = state.currentPage <= 1;
    elements.nextPageButton.disabled = state.currentPage >= state.totalPages;
}

// Navigate through pages
function navigatePage(direction) {
    const newPage = state.currentPage + direction;
    
    if (newPage < 1 || newPage > state.totalPages) {
        return;
    }
    
    state.currentPage = newPage;
    loadReports();
}

// Handle page size change
function handlePageSizeChange() {
    state.pageSize = parseInt(elements.pageSizeSelector.value);
    state.currentPage = 1; // Reset to first page
    loadReports();
}

// Handle project change
function handleProjectChange() {
    state.filters.project = elements.projectSelector.value;
    
    // If all projects is selected, clear the filter
    if (state.filters.project === 'all') {
        state.filters.project = '';
    }
    
    loadChartData();
}

// Apply date range filter
function applyDateFilter() {
    // Reset to first page
    state.currentPage = 1;
    
    // Load chart data with date filter
    loadChartData();
    
    // Reload reports
    loadReports();
}

// Handle report search
function handleReportSearch() {
    state.filters.search = elements.searchReports.value.trim();
    
    // Reset to first page when searching
    state.currentPage = 1;
    
    // Debounce search input
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        loadReports();
    }, 300);
}

// Handle sorting
function handleReportSort() {
    state.sort = elements.sortSelector.value;
    loadReports();
}

// Download a report
async function downloadReport(reportId) {
    try {
        showToast('info', 'Preparing report download...');
        
        // In a real implementation, you would make an API call to download the report
        const response = await api.get(`/reports/${reportId}/download`);
        
        if (response.success) {
            // Create a download link and trigger it
            const downloadUrl = response.data.download_url;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showToast('success', 'Report downloaded successfully');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showToast('error', 'Failed to download report');
    }
}

// Edit a scheduled report
function editSchedule(scheduleId) {
    // Find the report with the given schedule ID
    const report = state.reports.find(r => r.id === scheduleId);
    
    if (!report) {
        showToast('error', 'Report not found');
        return;
    }
    
    // Open the report modal with the report data
    openGenerateReportModal();
    
    // Fill in the form with report data
    elements.reportNameInput.value = report.name;
    elements.reportTypeSelect.value = report.type;
    elements.reportProjectSelect.value = report.project_id;
    elements.reportFormatSelect.value = report.format || 'pdf';
    
    // Parse date range
    const fromDate = new Date(report.date_from);
    const toDate = new Date(report.date_to);
    
    elements.reportDateFromInput.valueAsDate = fromDate;
    elements.reportDateToInput.valueAsDate = toDate;
    
    // Enable scheduling options
    elements.scheduleGeneration.checked = true;
    toggleScheduleOptions();
    
    // Set schedule frequency
    elements.scheduleFrequency.value = report.frequency || 'weekly';
    handleFrequencyChange();
    
    // Set weekday or monthday
    if (report.frequency === 'weekly') {
        elements.weekdaySelector.querySelector('#schedule-weekday').value = report.weekday || '1';
    } else if (report.frequency === 'monthly') {
        elements.monthdaySelector.querySelector('#schedule-monthday').value = report.monthday || '1';
    }
    
    // Set emails if any
    if (report.emails) {
        document.querySelector('#schedule-emails').value = report.emails;
    }
    
    // Update form submission to update instead of create
    elements.generateReportForm.dataset.reportId = scheduleId;
}

// Delete a report
async function deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) {
        return;
    }
    
    try {
        const response = await api.delete(`/reports/${reportId}`);
        
        if (response.success) {
            showToast('success', 'Report deleted successfully');
            loadReports();
            loadDashboardMetrics();
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        showToast('error', 'Failed to delete report');
    }
}

// Open generate report modal
function openGenerateReportModal() {
    elements.generateReportModal.classList.remove('hidden');
    elements.generateReportModal.classList.add('flex');
    
    // Reset form
    elements.generateReportForm.reset();
    delete elements.generateReportForm.dataset.reportId;
    
    // Disable schedule options by default
    elements.scheduleOptions.classList.add('hidden');
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    elements.reportDateFromInput.valueAsDate = thirtyDaysAgo;
    elements.reportDateToInput.valueAsDate = today;
}

// Close generate report modal
function closeGenerateReportModal() {
    elements.generateReportModal.classList.add('hidden');
    elements.generateReportModal.classList.remove('flex');
}

// Toggle schedule options
function toggleScheduleOptions() {
    if (elements.scheduleGeneration.checked) {
        elements.scheduleOptions.classList.remove('hidden');
    } else {
        elements.scheduleOptions.classList.add('hidden');
    }
}

// Handle frequency change for scheduling
function handleFrequencyChange() {
    const frequency = elements.scheduleFrequency.value;
    
    if (frequency === 'daily') {
        elements.weekdaySelector.classList.add('hidden');
        elements.monthdaySelector.classList.add('hidden');
    } else if (frequency === 'weekly') {
        elements.weekdaySelector.classList.remove('hidden');
        elements.monthdaySelector.classList.add('hidden');
    } else if (frequency === 'monthly') {
        elements.weekdaySelector.classList.add('hidden');
        elements.monthdaySelector.classList.remove('hidden');
    }
}

// Populate day of month selector
function populateMonthDaySelector() {
    const monthDaySelect = document.getElementById('schedule-monthday');
    
    // Clear existing options
    monthDaySelect.innerHTML = '';
    
    // Add days 1-31
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        monthDaySelect.appendChild(option);
    }
}

// Handle report generation form submission
async function handleReportGeneration(e) {
    e.preventDefault();
    
    try {
        showToast('info', 'Processing request...');
        
        // Collect form data
        const formData = {
            name: elements.reportNameInput.value,
            type: elements.reportTypeSelect.value,
            project_id: elements.reportProjectSelect.value,
            format: elements.reportFormatSelect.value,
            date_from: elements.reportDateFromInput.value,
            date_to: elements.reportDateToInput.value,
            description: document.getElementById('report-description').value,
            scheduled: elements.scheduleGeneration.checked
        };
        
        // Add schedule options if enabled
        if (formData.scheduled) {
            formData.frequency = elements.scheduleFrequency.value;
            
            if (formData.frequency === 'weekly') {
                formData.weekday = document.getElementById('schedule-weekday').value;
            } else if (formData.frequency === 'monthly') {
                formData.monthday = document.getElementById('schedule-monthday').value;
            }
            
            formData.emails = document.getElementById('schedule-emails').value;
        }
        
        // Check if this is an update or a new report
        const reportId = elements.generateReportForm.dataset.reportId;
        let response;
        
        if (reportId) {
            // Update existing report
            response = await api.put(`/reports/${reportId}`, formData);
        } else {
            // Create new report
            response = await api.post('/reports', formData);
        }
        
        if (response.success) {
            showToast('success', reportId ? 'Report updated successfully' : 'Report generated successfully');
            closeGenerateReportModal();
            loadReports();
            loadDashboardMetrics();
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('error', 'Failed to generate report');
    }
}

// Open filter modal
function openFilterModal() {
    elements.filterModal.classList.remove('hidden');
    elements.filterModal.classList.add('flex');
}

// Close filter modal
function closeFilterModal() {
    elements.filterModal.classList.add('hidden');
    elements.filterModal.classList.remove('flex');
}

// Apply filters from modal
function applyFilters() {
    const filterForm = document.getElementById('filter-form');
    const formData = new FormData(filterForm);
    
    state.filters.type = formData.get('type') || '';
    state.filters.project = formData.get('project') || '';
    state.filters.status = formData.get('status') || '';
    state.filters.user = formData.get('user') || '';
    
    // Reset to first page
    state.currentPage = 1;
    
    // Reload reports with filters
    loadReports();
}

// Clear all filters
function clearFilters() {
    const filterForm = document.getElementById('filter-form');
    filterForm.reset();
    
    // Clear state filters
    state.filters = {
        project: '',
        type: '',
        status: '',
        user: '',
        search: ''
    };
    
    // Clear search input
    elements.searchReports.value = '';
    
    // Reset to first page
    state.currentPage = 1;
    
    // Reload reports without filters
    loadReports();
}

// Load chart data
async function loadChartData() {
    try {
        const chartContainer = document.getElementById('main-chart');
        
        // Show loading spinner
        chartContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div class="text-center">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p data-i18n="loadingChart">Loading chart data...</p>
                </div>
            </div>
        `;
        
        // Prepare query parameters
        const params = {
            period: state.chartPeriod,
            from: elements.dateFrom.value,
            to: elements.dateTo.value
        };
        
        // Add project filter if selected
        if (state.filters.project) {
            params.project = state.filters.project;
        }
        
        const response = await api.get('/reports/chart', params);
        
        if (response.success) {
            state.chartData = response.data;
            renderChart();
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
        showToast('error', 'Failed to load chart data');
        
        const chartContainer = document.getElementById('main-chart');
        chartContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>Error loading chart data. Please try again.</p>
            </div>
        `;
    }
}

// Render the chart using mock data for now
// In a real implementation, you would use a charting library like Chart.js
function renderChart() {
    const chartContainer = document.getElementById('main-chart');
    
    // Since we don't have a real chart implementation here, we'll just show a message
    // In a real app, you would initialize your chart with state.chartData
    chartContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
            <div class="text-center mb-4">
                <p class="text-gray-600 dark:text-gray-300"><i class="ri-bar-chart-box-line text-coral-500 text-2xl"></i></p>
                <p class="text-gray-600 dark:text-gray-300 mt-2">Chart would be rendered here with real data</p>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Period: ${state.chartPeriod}, Data points: ${state.chartData ? state.chartData.labels.length : 0}</p>
            </div>
            <div class="w-full h-48 px-4 flex items-end justify-between">
                <!-- Mock chart bars -->
                ${generateMockBars()}
            </div>
            <div class="w-full flex justify-between px-4 mt-2 text-xs text-gray-500">
                ${generateMockLabels()}
            </div>
        </div>
    `;
}

// Generate mock chart bars for visualization
function generateMockBars() {
    // If no chart data, generate random bars
    if (!state.chartData) {
        let html = '';
        for (let i = 0; i < 7; i++) {
            const height = Math.floor(Math.random() * 100) + 20;
            html += `
                <div class="flex items-end">
                    <div class="w-8 bg-coral-500 mr-1" style="height: ${height}px;"></div>
                    <div class="w-8 bg-green-500" style="height: ${Math.floor(height * 0.8)}px;"></div>
                </div>
            `;
        }
        return html;
    }
    
    // Generate bars based on real data
    return state.chartData.datasets.map((dataset, i) => {
        return dataset.data.map((value, j) => {
            const height = Math.min(Math.max(value * 2, 10), 150); // Scale value to height
            return `
                <div class="flex items-end">
                    <div class="w-8 bg-coral-500 mr-1" style="height: ${height}px;"></div>
                    <div class="w-8 bg-green-500" style="height: ${Math.floor(height * 0.8)}px;"></div>
                </div>
            `;
        }).join('');
    }).join('');
}

// Generate mock chart labels for visualization
function generateMockLabels() {
    // If no chart data, generate default labels
    if (!state.chartData) {
        let html = '';
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        for (let i = 0; i < 7; i++) {
            html += `<span>${days[i]}</span>`;
        }
        return html;
    }
    
    // Generate labels based on real data
    return state.chartData.labels.map(label => `<span>${label}</span>`).join('');
}

// Refresh all data
function refreshData() {
    loadDashboardMetrics();
    loadReports();
    loadChartData();
}

// Get report type readable name
function getReportTypeName(type) {
    const types = {
        'execution': 'Test Execution',
        'coverage': 'Test Coverage',
        'performance': 'Performance',
        'trend': 'Trend Analysis',
        'defect': 'Defect Analysis',
        'custom': 'Custom'
    };
    
    return types[type] || type;
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'U';
    
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Setup user menu with user data
function setupUserMenu() {
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'User' };
    const userInitials = document.getElementById('user-initials');
    const userName = document.getElementById('user-name');
    
    if (user.name) {
        userName.textContent = user.name;
        userInitials.textContent = getInitials(user.name);
    }
}

// Handle logout
function handleLogout() {
    // Clear auth tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);