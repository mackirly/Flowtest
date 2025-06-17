/**
 * Reports page functionality
 * Handles report listing, filtering, generation, and charting
 */

import i18n from '../i18n/i18n.js';
import ToastManager from '../utils/toast.js';
import ApiClient from '../api/client.js';
import authManager from '../api/auth.js';
import { updateUserUI } from '../services/user.js';
import projects from '../api/projects.js';
import reportsAPI from '../api/reports.js';
import { formatDateTime, formatRelativeTime } from '../utils/date.js';

// DOM Elements - Only reference elements that exist in the current template-focused reports page
const elements = {
    // Project selector (exists in current page)
    projectSelector: document.getElementById('projectSelector'),
    
    // Report modals (exist in current page)  
    generateReportModal: document.getElementById('generateReportModal'),
    generateReportForm: document.getElementById('generateReportForm'),
    reportNameInput: document.getElementById('reportName'),
    reportProjectSelect: document.getElementById('reportProject'),
    reportFormatSelect: document.getElementById('reportFormat'),
    reportDateFromInput: document.getElementById('reportDateFrom'),
    reportDateToInput: document.getElementById('reportDateTo'),
    
    // Template modals (exist in current page)
    newTemplateModal: document.getElementById('newTemplateModal'),
    newTemplateForm: document.getElementById('newTemplateForm'),
    
    // Close buttons
    closeGenerateModal: document.getElementById('closeGenerateModal'),
    cancelGenerateModal: document.getElementById('cancelGenerateModal'),
    closeTemplateModal: document.getElementById('closeTemplateModal'),
    cancelTemplateModal: document.getElementById('cancelTemplateModal')
};

// State
const state = {
    projects: [],
    reports: [],
    templates: [],
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
    chartInstance: null,
    currentTemplate: null,
    editingTemplate: null,
    metricsData: null,
    selectedProject: null,
    dateRange: {
        from: null,
        to: null
    }
};

// Initialize the page
async function initPage() {
    try {
        // Check authentication
        const isAuthenticated = await authManager.isAuthenticated();
        if (!isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize user UI (avatar, username)
        console.log('[Reports] Updating user UI...');
        await updateUserUI();
        console.log('[Reports] User UI updated');

        // i18n is automatically initialized
        
        // Load projects
        await loadProjects();
        
        // Load templates
        await loadTemplates();
        
        // Setup event listeners
        setupEventListeners();
        
        // Set default date range (last 30 days) for modal forms
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        if (elements.reportDateFromInput) elements.reportDateFromInput.valueAsDate = thirtyDaysAgo;
        if (elements.reportDateToInput) elements.reportDateToInput.valueAsDate = today;
        
        // Populate monthday selector
        populateMonthDaySelector();
        
        // Initialize chart configuration modal
        initChartConfigModal();
        
        // Load initial data
        // Dashboard metrics and charts removed - no longer needed
        
        console.log('[Reports] Page initialization completed successfully');
    } catch (error) {
        console.error('[Reports] Error during page initialization:', error);
        ToastManager.error('Failed to initialize reports page');
    }
}

// Setup event listeners
function setupEventListeners() {
    // User menu
    setupUserMenuHandlers();
    
    // Project selector (if exists)
    if (elements.projectSelector) {
        elements.projectSelector.addEventListener('change', handleProjectChange);
    }
    
    // Generate report modal (if exists)
    if (elements.generateReportForm) {
        elements.generateReportForm.addEventListener('submit', handleReportGeneration);
    }
    if (elements.closeGenerateModal) {
        elements.closeGenerateModal.addEventListener('click', closeGenerateReportModal);
    }
    if (elements.cancelGenerateModal) {
        elements.cancelGenerateModal.addEventListener('click', closeGenerateReportModal);
    }
    
    // Template modal (if exists)
    if (elements.newTemplateForm) {
        elements.newTemplateForm.addEventListener('submit', handleTemplateCreation);
    }
    if (elements.closeTemplateModal) {
        elements.closeTemplateModal.addEventListener('click', closeTemplateModal);
    }
    if (elements.cancelTemplateModal) {
        elements.cancelTemplateModal.addEventListener('click', closeTemplateModal);
    }
    
    // New template buttons (multiple on page)
    document.querySelectorAll('#newTemplateBtn').forEach(button => {
        button.addEventListener('click', openTemplateModal);
    });
    
    // Generate report buttons (multiple on page) 
    document.querySelectorAll('#generateReportBtn, #generateReportButton').forEach(button => {
        button.addEventListener('click', openGenerateReportModal);
    });
    
    // Editor buttons
    const backToReportsBtn = document.getElementById('backToReports');
    const backFromReportBtn = document.getElementById('backFromReport');
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    
    // Initialize export buttons
    initExportButtons();
    
    // Initialize chart configuration modal
    initChartConfigModal();
    
    if (backToReportsBtn) {
        backToReportsBtn.addEventListener('click', backToReports);
    }
    if (backFromReportBtn) {
        backFromReportBtn.addEventListener('click', backToReports);
    }
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveCurrentTemplate);
    }
    
    // Setup drag and drop for metrics panel
    setupMetricsDragAndDrop();
    
    // User dropdown - handled in setupUserMenuHandlers
    
    // Language dropdown (if exists)
    const languageMenuButton = document.getElementById('language-menu-button');
    const languageDropdown = document.getElementById('language-dropdown');
    
    if (languageMenuButton && languageDropdown) {
        languageMenuButton.addEventListener('click', () => {
            languageDropdown.classList.toggle('hidden');
        });
        
        // Close language dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!languageMenuButton.contains(e.target) && !languageDropdown.contains(e.target)) {
                languageDropdown.classList.add('hidden');
            }
        });
    }
    // Logout handled in setupUserMenuHandlers
}


// Load projects
async function loadProjects() {
    try {
        console.log('[Reports] Loading projects...');
        const response = await ApiClient.get('/projects/');
        
        console.log('[Reports] Projects response:', response);
        const projectsData = response.results || response;
        
        if (projectsData && Array.isArray(projectsData)) {
            state.projects = projectsData;
            
            // Clear existing options except the first one
            if (elements.projectSelector) {
                while (elements.projectSelector.options.length > 1) {
                    elements.projectSelector.remove(1);
                }
            }
            
            // Check for reportProjectSelect at time of use
            const reportProjectSelect = document.getElementById('reportProject');
            if (reportProjectSelect && reportProjectSelect.options) {
                while (reportProjectSelect.options.length > 1) {
                    reportProjectSelect.remove(1);
                }
            }
            
            // Add projects to dropdown
            state.projects.forEach(project => {
                if (elements.projectSelector) {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name || project.title || `Project ${project.id}`;
                    elements.projectSelector.appendChild(option);
                }
                
                if (reportProjectSelect) {
                    const option2 = document.createElement('option');
                    option2.value = project.id;
                    option2.textContent = project.name || project.title || `Project ${project.id}`;
                    reportProjectSelect.appendChild(option2);
                }
            });
            
            // Populate filter modal
            const filterProjectSelect = document.getElementById('filter-project');
            if (filterProjectSelect && filterProjectSelect.options) {
                // Clear existing options except the first one
                while (filterProjectSelect.options.length > 1) {
                    filterProjectSelect.remove(1);
                }
                
                // Add projects
                state.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name || project.title || `Project ${project.id}`;
                    filterProjectSelect.appendChild(option);
                });
            }
            
            console.log(`[Reports] Successfully loaded ${state.projects.length} projects`);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        ToastManager.error('Failed to load projects');
    }
}

// Default templates data
function getDefaultTemplates() {
    return [
        {
            id: 'template-1',
            name: 'Сводка выполнения тестов',
            description: 'Общий обзор результатов выполнения тестов с ключевыми метриками',
            type: 'execution',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z',
            author: 'System',
            is_default: true,
            metrics: ['test-summary', 'execution-trend', 'test-duration'],
            layout: {
                'test-summary': { x: 50, y: 50, width: 400, height: 300 },
                'execution-trend': { x: 500, y: 50, width: 450, height: 300 },
                'test-duration': { x: 50, y: 400, width: 900, height: 250 }
            }
        },
        {
            id: 'template-2',
            name: 'Анализ покрытия',
            description: 'Детальный анализ покрытия функций и требований',
            type: 'coverage',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z',
            author: 'System',
            is_default: true,
            metrics: ['feature-coverage', 'requirement-coverage'],
            layout: {
                'feature-coverage': { x: 50, y: 50, width: 450, height: 400 },
                'requirement-coverage': { x: 550, y: 50, width: 450, height: 400 }
            }
        },
        {
            id: 'template-3',
            name: 'Отчет по производительности',
            description: 'Анализ производительности тестов и выявление узких мест',
            type: 'performance',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z',
            author: 'System',
            is_default: true,
            metrics: ['performance-trend', 'bottlenecks'],
            layout: {
                'performance-trend': { x: 50, y: 50, width: 900, height: 300 },
                'bottlenecks': { x: 50, y: 400, width: 900, height: 300 }
            }
        },
        {
            id: 'template-4',
            name: 'Анализ качества',
            description: 'Мониторинг качества и плотности дефектов',
            type: 'quality',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z',
            author: 'System',
            is_default: true,
            metrics: ['defect-density', 'quality-trend'],
            layout: {
                'defect-density': { x: 50, y: 50, width: 450, height: 350 },
                'quality-trend': { x: 550, y: 50, width: 450, height: 350 }
            }
        }
    ];
}

// Load templates
async function loadTemplates() {
    try {
        console.log('[Reports] Loading templates...');
        
        // Try to load from localStorage first, fallback to defaults
        let templates = JSON.parse(localStorage.getItem('flowtest_report_templates') || '[]');
        
        // If no saved templates, use defaults
        if (templates.length === 0) {
            templates = getDefaultTemplates();
            // Save defaults to localStorage
            localStorage.setItem('flowtest_report_templates', JSON.stringify(templates));
            console.log('[Reports] Initialized with default templates');
        }
        
        state.templates = templates;
        renderTemplates();
        
        console.log(`[Reports] Successfully loaded ${state.templates.length} templates`);
    } catch (error) {
        console.error('Error loading templates:', error);
        ToastManager.error('Failed to load templates');
    }
}

// Render templates in the grid
function renderTemplates() {
    const templatesGrid = document.getElementById('templatesGrid');
    const templatesList = document.getElementById('templatesList');
    const templatesEmpty = document.getElementById('templatesEmpty');
    
    if (state.templates.length === 0) {
        if (templatesGrid) templatesGrid.classList.add('hidden');
        if (templatesEmpty) templatesEmpty.classList.remove('hidden');
        if (templatesList) {
            templatesList.innerHTML = `
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <i class="ri-file-chart-line text-3xl mb-2"></i>
                    <p class="text-sm" data-i18n="noTemplatesAvailable">Нет доступных шаблонов</p>
                    <p class="text-xs mt-1" data-i18n="createFirstTemplate">Создайте первый шаблон</p>
                </div>
            `;
        }
        return;
    }
    
    if (templatesGrid) templatesGrid.classList.remove('hidden');
    if (templatesEmpty) templatesEmpty.classList.add('hidden');
    
    // Render main grid
    if (templatesGrid) {
        const html = state.templates.map(template => createTemplateCard(template)).join('');
        templatesGrid.innerHTML = html;
        
        // Add event listeners to template cards
        templatesGrid.querySelectorAll('.template-card').forEach(card => {
            const templateId = card.dataset.templateId;
            card.addEventListener('click', () => openTemplate(templateId));
        });
        
        // Add event listeners to edit buttons
        templatesGrid.querySelectorAll('.edit-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.dataset.templateId;
                editTemplate(templateId);
            });
        });
        
        // Add event listeners to delete buttons
        templatesGrid.querySelectorAll('.delete-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.dataset.templateId;
                deleteTemplate(templateId);
            });
        });
    }
    
    // Render sidebar list
    if (templatesList) {
        const sidebarHtml = state.templates.map(template => {
            const typeIcon = getTemplateTypeIcon(template.type);
            return `
                <div class="template-card p-3 mb-2 cursor-pointer" data-template-id="${template.id}">
                    <div class="flex items-center">
                        <div class="w-8 h-8 ${typeIcon.bg} rounded flex items-center justify-center mr-3">
                            <i class="${typeIcon.icon} ${typeIcon.color}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-sm truncate">${template.name}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${getTemplateTypeLabel(template.type)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        templatesList.innerHTML = sidebarHtml;
        
        // Add event listeners to sidebar templates
        templatesList.querySelectorAll('.template-card').forEach(card => {
            const templateId = card.dataset.templateId;
            card.addEventListener('click', () => openTemplate(templateId));
        });
    }
}

// Create template card HTML
function createTemplateCard(template) {
    const typeIcon = getTemplateTypeIcon(template.type);
    const typeLabel = getTemplateTypeLabel(template.type);
    
    return `
        <div class="template-card" data-template-id="${template.id}">
            <div class="card-actions">
                ${!template.is_default ? `
                    <button class="edit-template-btn bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs mr-1" data-template-id="${template.id}">
                        <i class="ri-edit-line mr-1"></i>Изменить
                    </button>
                    <button class="delete-template-btn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs" data-template-id="${template.id}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                ` : ''}
            </div>
            
            <div class="mb-4">
                <div class="w-12 h-12 ${typeIcon.bg} rounded-lg flex items-center justify-center mb-3">
                    <i class="${typeIcon.icon} ${typeIcon.color} text-xl"></i>
                </div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">${template.name}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${template.description}</p>
            </div>
            
            <div class="mt-auto">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>${typeLabel}</span>
                    <span>${template.metrics ? template.metrics.length : 0} метрик</span>
                </div>
                ${template.is_default ? '<div class="mt-2"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">По умолчанию</span></div>' : ''}
            </div>
        </div>
    `;
}

// Get template type icon
function getTemplateTypeIcon(type) {
    const icons = {
        execution: { icon: 'ri-play-circle-line', color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900' },
        coverage: { icon: 'ri-stack-line', color: 'text-green-600 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900' },
        performance: { icon: 'ri-speed-line', color: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900' },
        quality: { icon: 'ri-award-line', color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900' },
        defects: { icon: 'ri-bug-line', color: 'text-red-600 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900' },
        custom: { icon: 'ri-settings-line', color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900' }
    };
    return icons[type] || icons.custom;
}

// Get template type label
function getTemplateTypeLabel(type) {
    const labels = {
        execution: 'Выполнение тестов',
        coverage: 'Покрытие',
        performance: 'Производительность',
        quality: 'Качество',
        defects: 'Дефекты',
        custom: 'Пользовательский'
    };
    return labels[type] || 'Неизвестно';
}

// Save templates to localStorage
function saveTemplates() {
    try {
        localStorage.setItem('flowtest_report_templates', JSON.stringify(state.templates));
        console.log('[Reports] Templates saved successfully');
    } catch (error) {
        console.error('Error saving templates:', error);
        ToastManager.error('Failed to save templates');
    }
}

// Load reports with pagination and filtering
async function loadReports() {
    try {
        // Skip loading reports list for template-focused page
        // This functionality would be used in a traditional reports dashboard
        console.log('[Reports] Reports list not applicable for template-focused page');
    } catch (error) {
        console.error('Error loading reports:', error);
        // Don't show error toast for missing functionality
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
    console.log('[Reports] Pagination not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
}

// Navigate through pages
function navigatePage(direction) {
    console.log('[Reports] Page navigation not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
}

// Handle page size change
function handlePageSizeChange() {
    console.log('[Reports] Page size change not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
}

// Handle project change
async function handleProjectChange() {
    if (!elements.projectSelector) return;
    
    state.filters.project = elements.projectSelector.value;
    state.selectedProject = elements.projectSelector.value;
    
    // If all projects is selected, clear the filter
    if (state.filters.project === 'all' || state.filters.project === '') {
        state.filters.project = '';
        state.selectedProject = null;
    }
    
    console.log('[Reports] Project changed to:', state.filters.project);
    
    // Reload metrics if in editor mode
    if (state.currentTemplate && !document.getElementById('reportEditor').classList.contains('hidden')) {
        try {
            await loadMetricsData();
        } catch (error) {
            console.error('[Reports] Error reloading metrics after project change:', error);
        }
    }
}

// Apply date range filter
function applyDateFilter() {
    console.log('[Reports] Date filter not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
}

// Handle report search
function handleReportSearch() {
    console.log('[Reports] Report search not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
}

// Handle sorting
function handleReportSort() {
    console.log('[Reports] Report sorting not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
}

// Download a report
async function downloadReport(reportId) {
    try {
        ToastManager.info('Preparing report download...');
        
        // In a real implementation, you would make an API call to download the report
        const response = await ApiClient.get(`/reports/${reportId}/download/`);
        
        if (response.success) {
            // Create a download link and trigger it
            const downloadUrl = response.data.download_url;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            ToastManager.success('Report downloaded successfully');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        ToastManager.error('Failed to download report');
    }
}

// Edit a scheduled report
function editSchedule(scheduleId) {
    // Find the report with the given schedule ID
    const report = state.reports.find(r => r.id === scheduleId);
    
    if (!report) {
        ToastManager.error('Report not found');
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
        const response = await ApiClient.delete(`/reports/${reportId}/`);
        
        if (response.success) {
            ToastManager.success('Report deleted successfully');
            loadReports();
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        ToastManager.error('Failed to delete report');
    }
}

// Report modal functions are defined later with proper null checks

// Toggle schedule options
function toggleScheduleOptions() {
    console.log('[Reports] Schedule options not applicable for template-focused page');
    // Skip advanced modal functionality for template-focused page
}

// Handle frequency change for scheduling
function handleFrequencyChange() {
    console.log('[Reports] Frequency change not applicable for template-focused page');
    // Skip advanced modal functionality for template-focused page
}

// Populate day of month selector
function populateMonthDaySelector() {
    const monthDaySelect = document.getElementById('schedule-monthday');
    
    // Only populate if element exists
    if (!monthDaySelect) {
        console.log('[Reports] schedule-monthday element not found, skipping population');
        return;
    }
    
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

// Template management functions

// Open template for editing
async function openTemplate(templateId) {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) {
        ToastManager.error('Template not found');
        return;
    }
    
    state.currentTemplate = template;
    console.log('[Reports] Opening template:', template.name);
    
    // Switch to editor mode
    document.getElementById('reportsOverview').classList.add('hidden');
    document.getElementById('reportEditor').classList.remove('hidden');
    
    // Update editor title
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) {
        editorTitle.textContent = `Редактор: ${template.name}`;
    }
    
    // Load template in editor
    loadTemplateInEditor(template);
    
    // Load metrics data
    try {
        await loadMetricsData();
    } catch (error) {
        console.error('[Reports] Error loading metrics for template:', error);
        // Use mock data if API fails
        state.metricsData = getMockMetricsData();
        updateCanvasMetrics();
    }
}

// Load template in editor
function loadTemplateInEditor(template) {
    const canvas = document.getElementById('reportCanvas');
    const canvasEmpty = document.getElementById('canvasEmpty');
    
    if (!canvas) return;
    
    // Clear canvas
    canvas.querySelectorAll('.chart-element').forEach(el => el.remove());
    
    // Check if template has elements (new format) or metrics (old format)
    if (template.elements && template.elements.length > 0) {
        // New format with charts and metrics
        if (canvasEmpty) canvasEmpty.style.display = 'none';
        
        template.elements.forEach(element => {
            if (element.type === 'chart') {
                addChartToCanvas(element.chartType, element);
            } else if (element.type === 'metric') {
                addMetricValueToCanvas(element.metricType, element);
            }
        });
    } else if (template.metrics && template.metrics.length > 0) {
        // Old format - convert to new
        if (canvasEmpty) canvasEmpty.style.display = 'none';
        
        template.metrics.forEach(metricType => {
            const layout = template.layout && template.layout[metricType] ? template.layout[metricType] : null;
            addMetricToCanvas(metricType, layout);
        });
    } else {
        // Empty template
        if (canvasEmpty) canvasEmpty.style.display = 'block';
    }
}

// Add metric to canvas
function addMetricToCanvas(metricType, layout) {
    const canvas = document.getElementById('reportCanvas');
    if (!canvas) return;
    
    const metricInfo = getMetricInfo(metricType);
    if (!metricInfo) return;
    
    const element = document.createElement('div');
    element.className = 'chart-element';
    element.dataset.metricType = metricType;
    
    // Set position and size
    if (layout) {
        element.style.left = layout.x + 'px';
        element.style.top = layout.y + 'px';
        element.style.width = layout.width + 'px';
        element.style.height = layout.height + 'px';
    } else {
        // Default position
        element.style.left = '50px';
        element.style.top = '50px';
        element.style.width = '400px';
        element.style.height = '300px';
    }
    
    // Add content
    element.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
                <div class="w-6 h-6 ${metricInfo.bg} rounded flex items-center justify-center mr-2">
                    <i class="${metricInfo.icon} ${metricInfo.color} text-sm"></i>
                </div>
                <h3 class="font-medium text-gray-900 dark:text-gray-100">${metricInfo.title}</h3>
            </div>
            <button class="remove-metric text-red-500 hover:text-red-700" data-metric="${metricType}">
                <i class="ri-close-line"></i>
            </button>
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">${metricInfo.description}</div>
        <div class="flex-1 bg-gray-50 dark:bg-gray-800 rounded p-4">
            ${generateMockMetricContent(metricType)}
        </div>
    `;
    
    canvas.appendChild(element);
    
    // Add remove button listener
    element.querySelector('.remove-metric').addEventListener('click', () => {
        element.remove();
        updateTemplateMetrics();
    });
    
    // Make draggable (simplified)
    makeElementDraggable(element);
}

// Get metric information
function getMetricInfo(metricType) {
    const metrics = {
        // Test metrics
        'tests_passed': {
            title: 'Пройденные тесты',
            description: 'Количество успешных тестов',
            icon: 'ri-check-line',
            color: 'text-green-600 dark:text-green-300',
            bg: 'bg-green-100 dark:bg-green-900',
            unit: 'шт'
        },
        'tests_failed': {
            title: 'Проваленные тесты',
            description: 'Количество неудачных тестов',
            icon: 'ri-close-line',
            color: 'text-red-600 dark:text-red-300',
            bg: 'bg-red-100 dark:bg-red-900',
            unit: 'шт'
        },
        'tests_skipped': {
            title: 'Пропущенные тесты',
            description: 'Количество пропущенных тестов',
            icon: 'ri-skip-forward-line',
            color: 'text-gray-600 dark:text-gray-300',
            bg: 'bg-gray-100 dark:bg-gray-900',
            unit: 'шт'
        },
        'tests_total': {
            title: 'Всего тестов',
            description: 'Общее количество тестов',
            icon: 'ri-list-check',
            color: 'text-blue-600 dark:text-blue-300',
            bg: 'bg-blue-100 dark:bg-blue-900',
            unit: 'шт'
        },
        'test_success_rate': {
            title: 'Процент успеха',
            description: 'Процент успешных тестов',
            icon: 'ri-percent-line',
            color: 'text-green-600 dark:text-green-300',
            bg: 'bg-green-100 dark:bg-green-900',
            unit: '%'
        },
        // Time metrics
        'avg_test_duration': {
            title: 'Средняя длительность',
            description: 'Среднее время выполнения теста',
            icon: 'ri-timer-line',
            color: 'text-orange-600 dark:text-orange-300',
            bg: 'bg-orange-100 dark:bg-orange-900',
            unit: 'сек'
        },
        'min_test_duration': {
            title: 'Мин. длительность',
            description: 'Минимальное время выполнения',
            icon: 'ri-speed-line',
            color: 'text-green-600 dark:text-green-300',
            bg: 'bg-green-100 dark:bg-green-900',
            unit: 'сек'
        },
        'max_test_duration': {
            title: 'Макс. длительность',
            description: 'Максимальное время выполнения',
            icon: 'ri-time-line',
            color: 'text-red-600 dark:text-red-300',
            bg: 'bg-red-100 dark:bg-red-900',
            unit: 'сек'
        },
        'total_execution_time': {
            title: 'Общее время',
            description: 'Суммарное время выполнения',
            icon: 'ri-24-hours-line',
            color: 'text-purple-600 dark:text-purple-300',
            bg: 'bg-purple-100 dark:bg-purple-900',
            unit: 'мин'
        },
        // Coverage metrics
        'code_coverage': {
            title: 'Покрытие кода',
            description: 'Процент покрытого кода',
            icon: 'ri-code-line',
            color: 'text-indigo-600 dark:text-indigo-300',
            bg: 'bg-indigo-100 dark:bg-indigo-900',
            unit: '%'
        },
        'feature_coverage': {
            title: 'Покрытие функций',
            description: 'Процент протестированных функций',
            icon: 'ri-function-line',
            color: 'text-blue-600 dark:text-blue-300',
            bg: 'bg-blue-100 dark:bg-blue-900',
            unit: '%'
        },
        'requirement_coverage': {
            title: 'Покрытие требований',
            description: 'Процент проверенных требований',
            icon: 'ri-file-list-line',
            color: 'text-teal-600 dark:text-teal-300',
            bg: 'bg-teal-100 dark:bg-teal-900',
            unit: '%'
        },
        // Quality metrics
        'defect_count': {
            title: 'Количество дефектов',
            description: 'Общее количество дефектов',
            icon: 'ri-bug-line',
            color: 'text-red-600 dark:text-red-300',
            bg: 'bg-red-100 dark:bg-red-900',
            unit: 'шт'
        },
        'defect_density': {
            title: 'Плотность дефектов',
            description: 'Дефектов на 1000 строк кода',
            icon: 'ri-alert-line',
            color: 'text-yellow-600 dark:text-yellow-300',
            bg: 'bg-yellow-100 dark:bg-yellow-900',
            unit: 'деф/KLOC'
        },
        'quality_score': {
            title: 'Оценка качества',
            description: 'Общая оценка качества',
            icon: 'ri-star-line',
            color: 'text-yellow-600 dark:text-yellow-300',
            bg: 'bg-yellow-100 dark:bg-yellow-900',
            unit: 'баллов'
        }
    };
    
    return metrics[metricType] || {
        title: metricType,
        description: 'Пользовательская метрика',
        icon: 'ri-dashboard-line',
        color: 'text-gray-600 dark:text-gray-300',
        bg: 'bg-gray-100 dark:bg-gray-900',
        unit: ''
    };
}

// Generate empty content for metrics
function generateMockMetricContent(metricType) {
    switch (metricType) {
        case 'test-summary':
            return `
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div><div class="text-2xl font-bold text-gray-400">0</div><div class="text-xs text-gray-500">Пройдено</div></div>
                    <div><div class="text-2xl font-bold text-gray-400">0</div><div class="text-xs text-gray-500">Провалено</div></div>
                    <div><div class="text-2xl font-bold text-gray-400">0</div><div class="text-xs text-gray-500">Пропущено</div></div>
                </div>
            `;
        case 'execution-trend':
            return `
                <div class="h-32 flex items-center justify-center text-gray-500">
                    <p class="text-sm">Нет данных</p>
                </div>
            `;
        case 'performance-trend':
            return `
                <div class="space-y-2">
                    <div class="flex justify-between"><span>Средняя скорость</span><span class="font-bold text-gray-400">-</span></div>
                    <div class="flex justify-between"><span>Самый быстрый</span><span class="font-bold text-gray-400">-</span></div>
                    <div class="flex justify-between"><span>Самый медленный</span><span class="font-bold text-gray-400">-</span></div>
                </div>
            `;
        default:
            return `<div class="text-center text-gray-500">Нет данных для ${metricType}</div>`;
    }
}

// Make element draggable (simplified implementation)
function makeElementDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target.closest('.remove-metric')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(element.style.left) || 0;
        startTop = parseInt(element.style.top) || 0;
        
        element.style.zIndex = '1000';
        element.classList.add('selected');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        element.style.left = (startLeft + deltaX) + 'px';
        element.style.top = (startTop + deltaY) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '';
            element.classList.remove('selected');
            updateTemplateMetrics();
        }
    });
}

// Update template metrics based on canvas
function updateTemplateMetrics() {
    if (!state.currentTemplate) return;
    
    const canvas = document.getElementById('reportCanvas');
    if (!canvas) return;
    
    const elements = canvas.querySelectorAll('.chart-element');
    const templateElements = [];
    const layout = {};
    
    elements.forEach(el => {
        const elementId = el.dataset.elementId || 'element-' + Date.now() + Math.random();
        const elementData = {
            id: elementId,
            x: parseInt(el.style.left) || 0,
            y: parseInt(el.style.top) || 0,
            width: parseInt(el.style.width) || 400,
            height: parseInt(el.style.height) || 300
        };
        
        if (el.dataset.chartType) {
            // It's a chart
            elementData.type = 'chart';
            elementData.chartType = el.dataset.chartType;
            elementData.config = {
                xAxis: el.querySelector('.x-axis-metric')?.textContent || 'Не выбрано',
                yAxis: el.querySelector('.y-axis-metric')?.textContent || 'Не выбрано'
            };
        } else if (el.dataset.metricType) {
            // It's a metric value
            elementData.type = 'metric';
            elementData.metricType = el.dataset.metricType;
        }
        
        templateElements.push(elementData);
        layout[elementId] = elementData;
    });
    
    state.currentTemplate.elements = templateElements;
    state.currentTemplate.layout = layout;
    state.currentTemplate.updated_at = new Date().toISOString();
    
    // Save to state.templates
    const templateIndex = state.templates.findIndex(t => t.id === state.currentTemplate.id);
    if (templateIndex !== -1) {
        state.templates[templateIndex] = { ...state.currentTemplate };
        saveTemplates();
    }
}

// Back to reports overview
function backToReports() {
    document.getElementById('reportEditor').classList.add('hidden');
    document.getElementById('reportsOverview').classList.remove('hidden');
    state.currentTemplate = null;
    renderTemplates(); // Refresh templates display
}

// Edit template
function editTemplate(templateId) {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) {
        ToastManager.error('Template not found');
        return;
    }
    
    if (template.is_default) {
        ToastManager.error('Cannot edit default templates');
        return;
    }
    
    state.editingTemplate = { ...template };
    
    // Fill form with template data
    const form = elements.newTemplateForm;
    if (form) {
        form.querySelector('#templateName').value = template.name;
        form.querySelector('#templateDescription').value = template.description || '';
        form.querySelector('#templateType').value = template.type;
    }
    
    // Open modal
    openTemplateModal();
}

// Delete template
function deleteTemplate(templateId) {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) {
        ToastManager.error('Template not found');
        return;
    }
    
    if (template.is_default) {
        ToastManager.error('Cannot delete default templates');
        return;
    }
    
    if (!confirm(`Вы уверены, что хотите удалить шаблон "${template.name}"?`)) {
        return;
    }
    
    // Remove from templates
    state.templates = state.templates.filter(t => t.id !== templateId);
    saveTemplates();
    renderTemplates();
    
    ToastManager.success('Template deleted successfully');
}

// Create new template
function createTemplate(formData) {
    const newTemplate = {
        id: 'template-' + Date.now(),
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: 'User',
        is_default: false,
        metrics: [],
        layout: {}
    };
    
    state.templates.push(newTemplate);
    saveTemplates();
    renderTemplates();
    
    ToastManager.success('Template created successfully');
    return newTemplate;
}

// Update existing template
function updateTemplate(templateId, formData) {
    const templateIndex = state.templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
        ToastManager.error('Template not found');
        return;
    }
    
    const template = state.templates[templateIndex];
    template.name = formData.name;
    template.description = formData.description || '';
    template.type = formData.type;
    template.updated_at = new Date().toISOString();
    
    state.templates[templateIndex] = template;
    saveTemplates();
    renderTemplates();
    
    ToastManager.success('Template updated successfully');
    return template;
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
    console.log('[Reports] Refresh data not applicable for template-focused page');
    // Skip dashboard functionality for template-focused page
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

// Setup user menu handlers
function setupUserMenuHandlers() {
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('logout-button');
    
    // Toggle dropdown
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', function() {
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
    
    // Handle logout
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            
            try {
                await authManager.logout();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                ToastManager.error('Failed to logout. Please try again.');
            }
        });
    }
}

// Handle logout
function handleLogout() {
    // Clear auth tokens
    localStorage.removeItem('flowtest_access_token');
    localStorage.removeItem('flowtest_refresh_token');
    localStorage.removeItem('flowtest_user');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Template modal functions
function openTemplateModal() {
    if (elements.newTemplateModal) {
        elements.newTemplateModal.classList.remove('hidden');
        elements.newTemplateModal.classList.add('flex');
    }
}

function closeTemplateModal() {
    if (elements.newTemplateModal) {
        elements.newTemplateModal.classList.add('hidden');
        elements.newTemplateModal.classList.remove('flex');
    }
}

function handleTemplateCreation(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const templateData = {
        name: formData.get('name')?.trim(),
        description: formData.get('description')?.trim(),
        type: formData.get('type')
    };
    
    // Validation
    if (!templateData.name) {
        ToastManager.error('Template name is required');
        return;
    }
    
    if (!templateData.type) {
        ToastManager.error('Template type is required');
        return;
    }
    
    try {
        if (state.editingTemplate) {
            // Update existing template
            updateTemplate(state.editingTemplate.id, templateData);
            state.editingTemplate = null;
        } else {
            // Create new template
            const newTemplate = createTemplate(templateData);
            // Optionally open the new template for editing
            setTimeout(() => {
                openTemplate(newTemplate.id);
            }, 500);
        }
        
        closeTemplateModal();
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Error handling template creation:', error);
        ToastManager.error('Failed to save template');
    }
}

// Generate report modal functions  
function openGenerateReportModal() {
    if (elements.generateReportModal) {
        elements.generateReportModal.classList.remove('hidden');
        elements.generateReportModal.classList.add('flex');
    }
}

function closeGenerateReportModal() {
    if (elements.generateReportModal) {
        elements.generateReportModal.classList.add('hidden');
        elements.generateReportModal.classList.remove('flex');
    }
}

function handleReportGeneration(e) {
    e.preventDefault();
    console.log('[Reports] Report generation would be handled here');
    ToastManager.info('Report generation functionality coming soon');
    closeGenerateReportModal();
}

// Save current template
function saveCurrentTemplate() {
    if (!state.currentTemplate) {
        ToastManager.error('No template to save');
        return;
    }
    
    // Update metrics based on current canvas state
    updateTemplateMetrics();
    
    ToastManager.success('Template saved successfully');
}

// Setup drag and drop for metrics
function setupMetricsDragAndDrop() {
    // Add drag functionality to metric cards and chart types
    document.querySelectorAll('.metric-card').forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', (e) => {
            const metricType = card.dataset.metric;
            const chartType = card.dataset.chartType;
            
            if (chartType) {
                // Dragging a chart type
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'chart',
                    chartType: chartType
                }));
            } else if (metricType) {
                // Dragging a metric
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'metric',
                    metricType: metricType
                }));
            }
            e.dataTransfer.effectAllowed = 'copy';
        });
    });
    
    // Setup drop zones on canvas
    const canvas = document.getElementById('reportCanvas');
    if (canvas) {
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                
                if (!data || !state.currentTemplate) return;
                
                // Calculate drop position relative to canvas
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const layout = {
                    x: Math.max(0, x - 200), // Center the element on cursor
                    y: Math.max(0, y - 150),
                    width: 400,
                    height: 300
                };
                
                if (data.type === 'chart') {
                    // Add chart to canvas
                    addChartToCanvas(data.chartType, layout);
                    ToastManager.success('График добавлен на холст');
                } else if (data.type === 'metric') {
                    // Add metric value to canvas
                    addMetricValueToCanvas(data.metricType, layout);
                    ToastManager.success('Метрика добавлена на холст');
                }
                
                updateTemplateMetrics();
            } catch (error) {
                console.error('Error handling drop:', error);
            }
        });
    }
}



// Format duration in seconds to readable format
function formatDuration(seconds) {
    if (seconds < 1) {
        return Math.round(seconds * 1000) + 'ms';
    } else if (seconds < 60) {
        return seconds.toFixed(1) + 's';
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}







// Configure chart function (placeholder)
function configureChart(chartId) {
    console.log(`[Reports] Configuring chart: ${chartId}`);
    ToastManager.info('Chart configuration will open in a modal (coming soon)');
}

// Fullscreen chart function (placeholder)
function fullscreenChart(chartId) {
    console.log(`[Reports] Fullscreen chart: ${chartId}`);
    ToastManager.info('Fullscreen chart view coming soon');
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);

// Add chart to canvas
function addChartToCanvas(chartType, layout) {
    const canvas = document.getElementById('reportCanvas');
    if (!canvas) return;
    
    const element = document.createElement('div');
    element.className = 'chart-element';
    element.dataset.chartType = chartType;
    element.dataset.elementId = 'element-' + Date.now();
    
    // Set position and size
    element.style.left = layout.x + 'px';
    element.style.top = layout.y + 'px';
    element.style.width = layout.width + 'px';
    element.style.height = layout.height + 'px';
    
    // Get chart info
    const chartInfo = getChartTypeInfo(chartType);
    
    // Add content
    element.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
                <div class="w-6 h-6 ${chartInfo.bg} rounded flex items-center justify-center mr-2">
                    <i class="${chartInfo.icon} ${chartInfo.color} text-sm"></i>
                </div>
                <h3 class="font-medium text-gray-900 dark:text-gray-100">${chartInfo.title}</h3>
            </div>
            <div class="flex items-center space-x-1">
                <button class="configure-chart text-gray-500 hover:text-coral-500 p-1" title="Настроить">
                    <i class="ri-settings-3-line"></i>
                </button>
                <button class="remove-chart text-red-500 hover:text-red-700 p-1" title="Удалить">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        </div>
        <div class="mb-2">
            <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span class="font-medium">Ось X:</span> <span class="x-axis-metric">Не выбрано</span> | 
                <span class="font-medium">Ось Y:</span> <span class="y-axis-metric">Не выбрано</span>
            </div>
        </div>
        <div class="flex-1 bg-gray-50 dark:bg-gray-800 rounded p-4 min-h-[200px] flex items-center justify-center">
            <div class="text-center text-gray-500 dark:text-gray-400">
                <i class="${chartInfo.icon} text-4xl mb-2"></i>
                <p class="text-sm">Нажмите настроить для выбора метрик</p>
            </div>
        </div>
    `;
    
    canvas.appendChild(element);
    
    // Hide empty state
    const canvasEmpty = document.getElementById('canvasEmpty');
    if (canvasEmpty) canvasEmpty.style.display = 'none';
    
    // Add event listeners
    element.querySelector('.remove-chart').addEventListener('click', () => {
        element.remove();
        updateTemplateMetrics();
    });
    
    element.querySelector('.configure-chart').addEventListener('click', () => {
        openChartConfigModal(element.dataset.elementId);
    });
    
    // Make draggable
    makeElementDraggable(element);
    
    // Update template
    updateTemplateMetrics();
}

// Add metric value to canvas
function addMetricValueToCanvas(metricType, layout) {
    const canvas = document.getElementById('reportCanvas');
    if (!canvas) return;
    
    const metricInfo = getMetricInfo(metricType);
    
    const element = document.createElement('div');
    element.className = 'chart-element';
    element.dataset.metricType = metricType;
    element.dataset.elementType = 'metric-value';
    
    // Set smaller size for metric values
    element.style.left = layout.x + 'px';
    element.style.top = layout.y + 'px';
    element.style.width = '200px';
    element.style.height = '120px';
    
    // Get current value from state or use placeholder
    let currentValue = '-';
    if (state.metricsData && state.metricsData[metricType] !== undefined) {
        currentValue = formatMetricValue(state.metricsData[metricType], metricInfo.unit);
    }
    
    // Add content
    element.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
                <div class="w-6 h-6 ${metricInfo.bg} rounded flex items-center justify-center mr-2">
                    <i class="${metricInfo.icon} ${metricInfo.color} text-sm"></i>
                </div>
                <h4 class="font-medium text-sm text-gray-900 dark:text-gray-100">${metricInfo.title}</h4>
            </div>
            <button class="remove-metric text-red-500 hover:text-red-700 p-1" title="Удалить">
                <i class="ri-close-line text-sm"></i>
            </button>
        </div>
        <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
                <div class="text-3xl font-bold ${metricInfo.color}">${currentValue}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${metricInfo.unit}</div>
            </div>
        </div>
    `;
    
    canvas.appendChild(element);
    
    // Hide empty state
    const canvasEmpty = document.getElementById('canvasEmpty');
    if (canvasEmpty) canvasEmpty.style.display = 'none';
    
    // Add remove listener
    element.querySelector('.remove-metric').addEventListener('click', () => {
        element.remove();
        updateTemplateMetrics();
    });
    
    // Make draggable
    makeElementDraggable(element);
    
    // Update template
    updateTemplateMetrics();
    
    // Load metrics if not already loaded
    if (!state.metricsData) {
        loadMetricsData();
    }
}

// Get chart type information
function getChartTypeInfo(chartType) {
    const types = {
        'line': {
            title: 'Линейный график',
            icon: 'ri-line-chart-line',
            color: 'text-blue-600 dark:text-blue-300',
            bg: 'bg-blue-100 dark:bg-blue-900'
        },
        'bar': {
            title: 'Столбчатая диаграмма',
            icon: 'ri-bar-chart-line',
            color: 'text-green-600 dark:text-green-300',
            bg: 'bg-green-100 dark:bg-green-900'
        },
        'pie': {
            title: 'Круговая диаграмма',
            icon: 'ri-pie-chart-line',
            color: 'text-purple-600 dark:text-purple-300',
            bg: 'bg-purple-100 dark:bg-purple-900'
        },
        'area': {
            title: 'График с областями',
            icon: 'ri-line-chart-fill',
            color: 'text-indigo-600 dark:text-indigo-300',
            bg: 'bg-indigo-100 dark:bg-indigo-900'
        },
        'scatter': {
            title: 'Точечная диаграмма',
            icon: 'ri-bubble-chart-line',
            color: 'text-teal-600 dark:text-teal-300',
            bg: 'bg-teal-100 dark:bg-teal-900'
        }
    };
    
    return types[chartType] || types.line;
}

// Open chart configuration modal
function openChartConfigModal(elementId) {
    const modal = document.getElementById('chartConfigModal');
    const elementIdInput = document.getElementById('configChartElementId');
    const chartElement = document.querySelector(`[data-element-id="${elementId}"]`);
    
    if (!modal || !chartElement) return;
    
    // Store element ID
    elementIdInput.value = elementId;
    
    // Load existing configuration if any
    const existingConfig = chartElement.dataset.chartConfig ? JSON.parse(chartElement.dataset.chartConfig) : {};
    
    // Reset form
    const form = document.getElementById('chartConfigForm');
    form.reset();
    
    // Load existing values
    if (existingConfig.title) {
        document.getElementById('chartTitle').value = existingConfig.title;
    }
    
    if (existingConfig.xAxis) {
        document.getElementById('xAxisType').value = existingConfig.xAxis.type || '';
        handleXAxisTypeChange(existingConfig.xAxis.type);
        
        if (existingConfig.xAxis.metric) {
            document.getElementById('xAxisMetric').value = existingConfig.xAxis.metric;
        }
        if (existingConfig.xAxis.timeGroup) {
            document.getElementById('xAxisTimeGroup').value = existingConfig.xAxis.timeGroup;
        }
    }
    
    if (existingConfig.yAxis && existingConfig.yAxis.metrics) {
        // Clear existing Y axis metrics
        const yAxisContainer = document.getElementById('yAxisMetrics');
        yAxisContainer.innerHTML = '';
        
        // Add configured metrics
        existingConfig.yAxis.metrics.forEach(metric => {
            addYAxisMetricField(metric);
        });
    } else {
        // Ensure at least one Y axis metric field
        const yAxisContainer = document.getElementById('yAxisMetrics');
        if (yAxisContainer.children.length === 0) {
            addYAxisMetricField();
        }
    }
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Load metrics data from API
async function loadMetricsData() {
    try {
        const params = {
            project_id: state.selectedProject || state.filters.project,
            date_from: state.dateRange.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            date_to: state.dateRange.to || new Date().toISOString().split('T')[0]
        };
        
        console.log('[Reports] Loading metrics with params:', params);
        
        const metricsData = await reportsAPI.getMetrics(params);
        state.metricsData = metricsData;
        
        console.log('[Reports] Metrics loaded:', metricsData);
        
        // Update all metric elements on canvas
        updateCanvasMetrics();
        
        return metricsData;
    } catch (error) {
        console.error('[Reports] Error loading metrics:', error);
        // Return mock data if API fails
        return getMockMetricsData();
    }
}

// Get mock metrics data for testing
function getMockMetricsData() {
    return {
        tests_passed: 245,
        tests_failed: 12,
        tests_skipped: 8,
        tests_total: 265,
        test_success_rate: 92.45,
        avg_test_duration: 2.34,
        min_test_duration: 0.12,
        max_test_duration: 45.67,
        total_execution_time: 10.23,
        code_coverage: 78.5,
        feature_coverage: 85.2,
        requirement_coverage: 90.1,
        defect_count: 23,
        defect_density: 1.2,
        quality_score: 87
    };
}

// Update metrics on canvas with real data
function updateCanvasMetrics() {
    if (!state.metricsData) return;
    
    const canvas = document.getElementById('reportCanvas');
    if (!canvas) return;
    
    // Update all metric value elements
    canvas.querySelectorAll('[data-element-type="metric-value"]').forEach(element => {
        const metricType = element.dataset.metricType;
        if (metricType && state.metricsData[metricType] !== undefined) {
            const metricInfo = getMetricInfo(metricType);
            const valueElement = element.querySelector('.text-3xl');
            if (valueElement) {
                const value = state.metricsData[metricType];
                valueElement.textContent = formatMetricValue(value, metricInfo.unit);
            }
        }
    });
    
    // Update charts with data
    canvas.querySelectorAll('[data-chart-type]').forEach(element => {
        updateChartElement(element);
    });
}

// Format metric value based on unit
function formatMetricValue(value, unit) {
    if (unit === '%') {
        return value.toFixed(1) + '%';
    } else if (unit === 'сек') {
        return value.toFixed(2);
    } else if (unit === 'мин') {
        return value.toFixed(1);
    } else if (unit === 'деф/KLOC') {
        return value.toFixed(2);
    } else {
        return Math.round(value).toString();
    }
}

// Update chart element with data
async function updateChartElement(element) {
    const chartType = element.dataset.chartType;
    const chartConfig = element.dataset.chartConfig;
    
    if (!chartConfig) return;
    
    try {
        const config = JSON.parse(chartConfig);
        if (!config.xAxis || !config.yAxis || config.xAxis === 'Не выбрано' || config.yAxis === 'Не выбрано') {
            return;
        }
        
        // Load chart data from API
        const chartData = await reportsAPI.getChartData({
            metric_type: config.yAxis,
            project_id: state.selectedProject,
            date_from: state.dateRange.from,
            date_to: state.dateRange.to,
            group_by: 'day'
        });
        
        // Render chart in element
        renderChartInElement(element, chartType, chartData);
    } catch (error) {
        console.error('[Reports] Error updating chart:', error);
    }
}

// Render chart using Chart.js
function renderChartInElement(element, chartType, data) {
    const chartContainer = element.querySelector('.bg-gray-50');
    if (!chartContainer) return;
    
    // Clear existing content
    chartContainer.innerHTML = `<canvas width="${element.style.width}" height="${element.style.height - 100}"></canvas>`;
    
    const canvas = chartContainer.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    
    // Simple chart rendering (you would use Chart.js here)
    // For now, just show that we have data
    chartContainer.innerHTML = `
        <div class="text-center p-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">
                График будет отображен здесь
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Точек данных: ${data.labels ? data.labels.length : 0}
            </div>
        </div>
    `;
}

// Handle X axis type change
function handleXAxisTypeChange(type) {
    const xAxisMetric = document.getElementById('xAxisMetric');
    const xAxisTimeGroup = document.getElementById('xAxisTimeGroup');
    
    if (type === 'time') {
        xAxisMetric.classList.add('hidden');
        xAxisTimeGroup.classList.remove('hidden');
    } else if (type === 'metric') {
        xAxisMetric.classList.remove('hidden');
        xAxisTimeGroup.classList.add('hidden');
    } else {
        xAxisMetric.classList.add('hidden');
        xAxisTimeGroup.classList.add('hidden');
    }
}

// Add Y axis metric field
function addYAxisMetricField(value = '') {
    const container = document.getElementById('yAxisMetrics');
    const div = document.createElement('div');
    div.className = 'y-axis-metric-item flex items-center space-x-2';
    
    div.innerHTML = `
        <select name="yAxisMetric[]" required
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-coral-500 focus:border-coral-500">
            <option value="">Выберите метрику</option>
            <optgroup label="Тесты">
                <option value="tests_passed" ${value === 'tests_passed' ? 'selected' : ''}>Пройденные тесты</option>
                <option value="tests_failed" ${value === 'tests_failed' ? 'selected' : ''}>Проваленные тесты</option>
                <option value="tests_skipped" ${value === 'tests_skipped' ? 'selected' : ''}>Пропущенные тесты</option>
                <option value="tests_total" ${value === 'tests_total' ? 'selected' : ''}>Всего тестов</option>
                <option value="test_success_rate" ${value === 'test_success_rate' ? 'selected' : ''}>Процент успеха</option>
            </optgroup>
            <optgroup label="Время">
                <option value="avg_test_duration" ${value === 'avg_test_duration' ? 'selected' : ''}>Средняя длительность</option>
                <option value="min_test_duration" ${value === 'min_test_duration' ? 'selected' : ''}>Мин. длительность</option>
                <option value="max_test_duration" ${value === 'max_test_duration' ? 'selected' : ''}>Макс. длительность</option>
                <option value="total_execution_time" ${value === 'total_execution_time' ? 'selected' : ''}>Общее время</option>
            </optgroup>
            <optgroup label="Покрытие">
                <option value="code_coverage" ${value === 'code_coverage' ? 'selected' : ''}>Покрытие кода</option>
                <option value="feature_coverage" ${value === 'feature_coverage' ? 'selected' : ''}>Покрытие функций</option>
                <option value="requirement_coverage" ${value === 'requirement_coverage' ? 'selected' : ''}>Покрытие требований</option>
            </optgroup>
            <optgroup label="Качество">
                <option value="defect_count" ${value === 'defect_count' ? 'selected' : ''}>Количество дефектов</option>
                <option value="defect_density" ${value === 'defect_density' ? 'selected' : ''}>Плотность дефектов</option>
                <option value="quality_score" ${value === 'quality_score' ? 'selected' : ''}>Оценка качества</option>
            </optgroup>
        </select>
        ${container.children.length > 0 ? `
        <button type="button" class="remove-y-metric text-red-500 hover:text-red-700 p-1">
            <i class="ri-close-line"></i>
        </button>
        ` : ''}
    `;
    
    container.appendChild(div);
    
    // Add remove listener
    const removeBtn = div.querySelector('.remove-y-metric');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => div.remove());
    }
}

// Apply chart configuration
async function applyChartConfiguration(elementId, config) {
    const chartElement = document.querySelector(`[data-element-id="${elementId}"]`);
    if (!chartElement) return;
    
    // Store configuration
    chartElement.dataset.chartConfig = JSON.stringify(config);
    
    // Update display
    const xAxisDisplay = chartElement.querySelector('.x-axis-metric');
    const yAxisDisplay = chartElement.querySelector('.y-axis-metric');
    
    if (xAxisDisplay) {
        if (config.xAxis.type === 'time') {
            xAxisDisplay.textContent = `Время (${config.xAxis.timeGroup === 'day' ? 'дни' : config.xAxis.timeGroup === 'week' ? 'недели' : 'месяцы'})`;
        } else if (config.xAxis.type === 'metric' && config.xAxis.metric) {
            const metricInfo = getMetricInfo(config.xAxis.metric);
            xAxisDisplay.textContent = metricInfo ? metricInfo.title : config.xAxis.metric;
        } else if (config.xAxis.type === 'category') {
            xAxisDisplay.textContent = 'Категории';
        }
    }
    
    if (yAxisDisplay && config.yAxis.metrics.length > 0) {
        const metricNames = config.yAxis.metrics.map(metric => {
            const metricInfo = getMetricInfo(metric);
            return metricInfo ? metricInfo.title : metric;
        });
        yAxisDisplay.textContent = metricNames.join(', ');
    }
    
    // Update chart title if provided
    const titleElement = chartElement.querySelector('h3');
    if (titleElement && config.title) {
        titleElement.textContent = config.title;
    }
    
    // Render chart with configuration
    await renderChartWithConfig(chartElement, config);
    
    // Update template
    updateTemplateMetrics();
}

// Render chart with configuration
async function renderChartWithConfig(chartElement, config) {
    const chartContainer = chartElement.querySelector('.bg-gray-50');
    if (!chartContainer) return;
    
    // Create canvas if not exists
    let canvas = chartContainer.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        chartContainer.innerHTML = '';
        chartContainer.appendChild(canvas);
    }
    
    // Get chart data based on configuration
    const chartData = await getChartDataForConfig(config);
    
    // Destroy existing chart if any
    if (chartElement.chartInstance) {
        chartElement.chartInstance.destroy();
    }
    
    // Create new chart
    const ctx = canvas.getContext('2d');
    const chartType = chartElement.dataset.chartType || 'line';
    
    chartElement.chartInstance = new Chart(ctx, {
        type: chartType === 'area' ? 'line' : chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title
                },
                legend: {
                    display: config.yAxis.metrics.length > 1
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: config.xAxis.label || 'X Axis'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: config.yAxis.label || 'Y Axis'
                    }
                }
            },
            ...(chartType === 'area' ? {
                elements: {
                    line: {
                        fill: true
                    }
                }
            } : {})
        }
    });
}

// Get chart data based on configuration
async function getChartDataForConfig(config) {
    // Get metrics data
    if (!state.metricsData) {
        await loadMetricsData();
    }
    
    const chartData = {
        labels: [],
        datasets: []
    };
    
    // Generate X axis labels
    if (config.xAxis.type === 'time') {
        // Generate time-based labels
        const days = 7; // Default to last 7 days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            chartData.labels.push(date.toLocaleDateString('ru-RU', { 
                month: 'short', 
                day: 'numeric' 
            }));
        }
    } else if (config.xAxis.type === 'category') {
        // Use predefined categories
        chartData.labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    } else if (config.xAxis.type === 'metric') {
        // Use metric values as labels
        chartData.labels = ['Текущее значение'];
    }
    
    // Generate datasets for Y axis metrics
    const colors = [
        { border: '#FF7F50', background: 'rgba(255, 127, 80, 0.1)' },
        { border: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' },
        { border: '#10B981', background: 'rgba(16, 185, 129, 0.1)' },
        { border: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' },
        { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }
    ];
    
    config.yAxis.metrics.forEach((metric, index) => {
        const metricInfo = getMetricInfo(metric);
        const color = colors[index % colors.length];
        
        const dataset = {
            label: metricInfo ? metricInfo.title : metric,
            data: [],
            borderColor: color.border,
            backgroundColor: color.background,
            tension: 0.1
        };
        
        // Generate data points
        if (config.xAxis.type === 'time' || config.xAxis.type === 'category') {
            // Generate random data for each label
            chartData.labels.forEach(() => {
                const baseValue = state.metricsData[metric] || 0;
                const variation = baseValue * 0.2; // 20% variation
                const value = baseValue + (Math.random() - 0.5) * variation;
                dataset.data.push(Math.max(0, value));
            });
        } else {
            // Single value for metric
            dataset.data.push(state.metricsData[metric] || 0);
        }
        
        chartData.datasets.push(dataset);
    });
    
    return chartData;
}

// Get chart type display name
function getChartTypeName(chartType) {
    const chartTypeNames = {
        'line': 'Line Chart',
        'bar': 'Bar Chart',
        'pie': 'Pie Chart',
        'area': 'Area Chart',
        'scatter': 'Scatter Plot'
    };
    return chartTypeNames[chartType] || chartType;
}

// Draw sample chart data for PDF when no real chart exists
function drawSampleChartInPDF(pdf, chartType, x, y, width, height, metrics = []) {
    // Draw chart background
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(230, 230, 230);
    pdf.rect(x, y, width, height, 'FD');
    
    // Set drawing properties
    pdf.setLineWidth(0.5);
    
    if (chartType === 'bar') {
        // Draw axes
        pdf.setDrawColor(200, 200, 200);
        pdf.line(x, y + height, x + width, y + height); // X axis
        pdf.line(x, y, x, y + height); // Y axis
        
        // Draw sample bars
        const barCount = 5;
        const barWidth = width / (barCount * 2);
        const maxBarHeight = height * 0.8;
        
        pdf.setFillColor(255, 127, 80); // Coral
        for (let i = 0; i < barCount; i++) {
            const barHeight = Math.random() * maxBarHeight + height * 0.1;
            const barX = x + (i * 2 + 1) * barWidth;
            pdf.rect(barX, y + height - barHeight, barWidth, barHeight, 'F');
        }
    } else if (chartType === 'line' || chartType === 'area') {
        // Draw axes
        pdf.setDrawColor(200, 200, 200);
        pdf.line(x, y + height, x + width, y + height); // X axis
        pdf.line(x, y, x, y + height); // Y axis
        
        // Generate random points
        const pointCount = 8;
        const points = [];
        for (let i = 0; i < pointCount; i++) {
            points.push({
                x: x + (i / (pointCount - 1)) * width,
                y: y + height - (Math.random() * height * 0.7 + height * 0.15)
            });
        }
        
        // Draw area fill if area chart
        if (chartType === 'area') {
            pdf.setFillColor(255, 127, 80, 0.3);
            pdf.setDrawColor(255, 127, 80);
            
            // Create path for area
            let pathStr = `${points[0].x} ${points[0].y}`;
            points.forEach((point, i) => {
                if (i > 0) pathStr += ` ${point.x} ${point.y}`;
            });
            pathStr += ` ${x + width} ${y + height} ${x} ${y + height}`;
            
            // Draw filled area (simplified)
            pdf.setFillColor(255, 127, 80, 0.2);
            points.forEach((point, i) => {
                if (i < points.length - 1) {
                    const nextPoint = points[i + 1];
                    pdf.setFillColor(255, 127, 80, 0.1);
                    pdf.rect(point.x, point.y, nextPoint.x - point.x, y + height - point.y, 'F');
                }
            });
        }
        
        // Draw line
        pdf.setDrawColor(255, 127, 80);
        pdf.setLineWidth(1.5);
        for (let i = 0; i < points.length - 1; i++) {
            pdf.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
        }
        
        // Draw points
        pdf.setFillColor(255, 127, 80);
        points.forEach(point => {
            pdf.circle(point.x, point.y, 1, 'F');
        });
    } else if (chartType === 'pie') {
        // Draw pie chart - simplified version
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) * 0.35;
        
        // Draw pie background circle
        pdf.setFillColor(240, 240, 240);
        pdf.circle(centerX, centerY, radius, 'F');
        
        // Sample data with different sizes
        const data = [
            { value: 45, color: [255, 127, 80], label: 'Passed' },
            { value: 25, color: [59, 130, 246], label: 'Failed' },
            { value: 20, color: [16, 185, 129], label: 'Skipped' },
            { value: 10, color: [245, 158, 11], label: 'Pending' }
        ];
        
        // Draw colored rectangles as legend
        let legendY = y + 5;
        data.forEach((item, idx) => {
            pdf.setFillColor(...item.color);
            pdf.rect(x + width - 40, legendY, 5, 3, 'F');
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${item.value}%`, x + width - 32, legendY + 2.5);
            legendY += 5;
        });
        
        // Draw pie segments as colored arcs (simplified)
        let startAngle = -90;
        data.forEach((segment, index) => {
            const sweepAngle = (segment.value / 100) * 360;
            const endAngle = startAngle + sweepAngle;
            
            // Draw wedge using multiple thin rectangles (approximation)
            pdf.setFillColor(...segment.color);
            const steps = Math.max(Math.floor(sweepAngle / 5), 5);
            
            for (let i = 0; i < steps; i++) {
                const angle1 = (startAngle + i * sweepAngle / steps) * Math.PI / 180;
                const angle2 = (startAngle + (i + 1) * sweepAngle / steps) * Math.PI / 180;
                
                // Draw a thin wedge
                const r1 = radius * 0.1;
                const r2 = radius;
                
                for (let r = r1; r < r2; r += 2) {
                    const x1 = centerX + Math.cos(angle1) * r;
                    const y1 = centerY + Math.sin(angle1) * r;
                    const x2 = centerX + Math.cos(angle2) * r;
                    const y2 = centerY + Math.sin(angle2) * r;
                    
                    pdf.line(x1, y1, x2, y2);
                }
            }
            
            startAngle = endAngle;
        });
    } else if (chartType === 'scatter') {
        // Draw axes
        pdf.setDrawColor(200, 200, 200);
        pdf.line(x, y + height, x + width, y + height); // X axis
        pdf.line(x, y, x, y + height); // Y axis
        
        // Draw random scatter points
        pdf.setFillColor(255, 127, 80);
        for (let i = 0; i < 30; i++) {
            const px = x + Math.random() * width;
            const py = y + Math.random() * height;
            pdf.circle(px, py, 1.5, 'F');
        }
    }
}

// Initialize chart configuration modal listeners
function initChartConfigModal() {
    const modal = document.getElementById('chartConfigModal');
    const form = document.getElementById('chartConfigForm');
    const xAxisType = document.getElementById('xAxisType');
    const addYAxisBtn = document.getElementById('addYAxisMetric');
    const closeBtn = document.getElementById('closeChartConfigModal');
    const cancelBtn = document.getElementById('cancelChartConfig');
    
    if (!modal || !form) return;
    
    // X axis type change
    xAxisType.addEventListener('change', (e) => {
        handleXAxisTypeChange(e.target.value);
    });
    
    // Add Y axis metric
    addYAxisBtn.addEventListener('click', () => {
        addYAxisMetricField();
    });
    
    // Close modal
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Submit form
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const elementId = formData.get('elementId');
        
        // Build configuration
        const config = {
            title: formData.get('title'),
            xAxis: {
                type: formData.get('xAxisType'),
                metric: formData.get('xAxisMetric'),
                timeGroup: formData.get('xAxisTimeGroup')
            },
            yAxis: {
                metrics: formData.getAll('yAxisMetric[]').filter(m => m)
            }
        };
        
        // Validate configuration
        if (!config.xAxis.type) {
            ToastManager.error('Выберите тип данных для оси X');
            return;
        }
        
        if (config.yAxis.metrics.length === 0) {
            ToastManager.error('Выберите хотя бы одну метрику для оси Y');
            return;
        }
        
        // Apply configuration
        await applyChartConfiguration(elementId, config);
        
        // Close modal
        closeModal();
        
        ToastManager.success('Настройки графика применены');
    });
}

// Export report to PDF
async function exportReportToPDF() {
    try {
        // Show loading
        ToastManager.info('Generating PDF with charts and visualizations...');
        
        // Get report content
        const reportContent = document.getElementById('reportContent') || document.getElementById('reportCanvas');
        
        // Get jsPDF from window
        const { jsPDF } = window.jspdf;
        
        // Create new PDF document
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Set fonts and colors
        pdf.setFont('helvetica');
        
        // Add header
        pdf.setFontSize(20);
        pdf.setTextColor(255, 127, 80); // Coral color
        pdf.text('FlowTest Report', 20, 20);
        
        // Add metadata
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        const reportTitle = document.getElementById('reportTitle')?.textContent || 'Test Report';
        const reportDate = new Date().toLocaleDateString('en-US');
        
        pdf.text(reportTitle || 'Test Report', 20, 35);
        pdf.text(`Date: ${reportDate}`, 20, 42);
        
        // Add project info if available
        const projectName = document.getElementById('reportProject')?.textContent || 
                           (state.selectedProject && state.projects.find(p => p.id === state.selectedProject)?.name) || 
                           'All Projects';
        pdf.text(`Project: ${projectName}`, 20, 49);
        
        // Draw separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, 55, 190, 55);
        
        // Add charts and visual elements
        let yPos = 65;
        const pageHeight = pdf.internal.pageSize.height;
        const maxY = pageHeight - 20;
        const chartsToRender = [];
        
        // Check for chart elements on canvas
        const chartElements = reportContent ? reportContent.querySelectorAll('[data-chart-type]') : [];
        
        // First, add metric cards
        const metricElements = reportContent ? reportContent.querySelectorAll('[data-element-type="metric-value"]') : [];
        if (metricElements.length > 0) {
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Key Metrics', 20, yPos);
            yPos += 10;
            
            // Create metrics grid (3 columns)
            const metricsPerRow = 3;
            const cardWidth = 55;
            const cardHeight = 25;
            const startX = 20;
            let currentX = startX;
            let rowCount = 0;
            
            metricElements.forEach((element, index) => {
                // Check if we need a new page
                if (yPos > maxY - cardHeight) {
                    pdf.addPage();
                    yPos = 20;
                    currentX = startX;
                    rowCount = 0;
                }
                
                const metricType = element.dataset.metricType;
                const metricInfo = getMetricInfo(metricType);
                const value = element.querySelector('.text-3xl')?.textContent || '0';
                
                if (metricInfo) {
                    // Draw metric card
                    pdf.setDrawColor(230, 230, 230);
                    pdf.setFillColor(250, 250, 250);
                    pdf.roundedRect(currentX, yPos, cardWidth, cardHeight, 3, 3, 'FD');
                    
                    // Add metric title
                    pdf.setFontSize(9);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(metricInfo.title, currentX + 3, yPos + 6);
                    
                    // Add metric value
                    pdf.setFontSize(16);
                    pdf.setTextColor(0, 0, 0);
                    const unit = metricInfo.unit ? ` ${metricInfo.unit}` : '';
                    pdf.text(`${value}${unit}`, currentX + 3, yPos + 16);
                    
                    // Move to next position
                    currentX += cardWidth + 5;
                    rowCount++;
                    
                    if (rowCount >= metricsPerRow) {
                        yPos += cardHeight + 5;
                        currentX = startX;
                        rowCount = 0;
                    }
                }
            });
            
            // Adjust yPos if we have incomplete row
            if (rowCount > 0) {
                yPos += cardHeight + 10;
            } else {
                yPos += 5;
            }
        }
        
        // Now render charts
        console.log('[PDF Export] Found chart elements:', chartElements.length);
        
        if (chartElements.length > 0) {
            // Check if we need a new page for charts
            if (yPos > maxY - 80) {
                pdf.addPage();
                yPos = 20;
            }
            
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Charts & Visualizations', 20, yPos);
            yPos += 10;
            
            // Process each chart
            for (const element of chartElements) {
                const chartInstance = element.chartInstance;
                const chartTitle = element.querySelector('h3')?.textContent || 'Chart';
                const chartType = element.dataset.chartType;
                
                console.log('[PDF Export] Processing chart:', {
                    title: chartTitle,
                    type: chartType,
                    hasInstance: !!chartInstance,
                    hasCanvas: chartInstance && !!chartInstance.canvas
                });
                
                // Check if we need a new page
                if (yPos > maxY - 100) {
                    pdf.addPage();
                    yPos = 20;
                }
                
                // Add chart title
                pdf.setFontSize(11);
                pdf.setTextColor(60, 60, 60);
                pdf.text(chartTitle, 20, yPos);
                yPos += 5;
                
                // Try to find canvas in the element
                let chartCanvas = null;
                if (chartInstance && chartInstance.canvas) {
                    chartCanvas = chartInstance.canvas;
                } else {
                    // Try to find canvas element directly
                    chartCanvas = element.querySelector('canvas');
                }
                
                if (chartCanvas) {
                    try {
                        console.log('[PDF Export] Found canvas, attempting to export...');
                        const chartImage = chartCanvas.toDataURL('image/png');
                        
                        // Verify image data
                        if (chartImage && chartImage.length > 22) {
                            // Add chart image to PDF
                            const chartWidth = 170;
                            const chartHeight = 80;
                            pdf.addImage(chartImage, 'PNG', 20, yPos, chartWidth, chartHeight);
                            yPos += chartHeight + 10;
                            console.log('[PDF Export] Chart exported successfully');
                        } else {
                            throw new Error('Invalid image data');
                        }
                    } catch (chartError) {
                        console.warn('[PDF Export] Failed to render chart:', chartError);
                        // Draw fallback chart
                        const chartConfig = element.dataset.chartConfig ? JSON.parse(element.dataset.chartConfig) : null;
                        drawSampleChartInPDF(pdf, chartType || 'bar', 20, yPos, 170, 80, 
                            chartConfig && chartConfig.yAxis ? chartConfig.yAxis.metrics : []);
                        yPos += 90;
                    }
                } else {
                    console.log('[PDF Export] No canvas found, drawing chart manually');
                    // No chart instance, create a visualization
                    const chartConfig = element.dataset.chartConfig ? JSON.parse(element.dataset.chartConfig) : null;
                    
                    // Always draw the chart visualization
                    drawSampleChartInPDF(pdf, chartType || 'bar', 20, yPos, 170, 80, 
                        chartConfig && chartConfig.yAxis ? chartConfig.yAxis.metrics : []);
                    
                    yPos += 90;
                }
            }
        } else {
            // No charts found, add sample charts for demonstration
            console.log('[PDF Export] No charts found, adding demo charts');
            
            if (yPos > maxY - 100) {
                pdf.addPage();
                yPos = 20;
            }
            
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Sample Charts', 20, yPos);
            yPos += 10;
            
            // Add a bar chart
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            pdf.text('Test Results Distribution', 20, yPos);
            yPos += 5;
            drawSampleChartInPDF(pdf, 'bar', 20, yPos, 170, 60, ['tests_passed', 'tests_failed']);
            yPos += 70;
            
            // Check for new page
            if (yPos > maxY - 80) {
                pdf.addPage();
                yPos = 20;
            }
            
            // Add a line chart
            pdf.text('Test Execution Trend', 20, yPos);
            yPos += 5;
            drawSampleChartInPDF(pdf, 'line', 20, yPos, 170, 60, ['test_success_rate']);
            yPos += 70;
            
            // Check for new page
            if (yPos > maxY - 80) {
                pdf.addPage();
                yPos = 20;
            }
            
            // Add a pie chart
            pdf.text('Coverage Breakdown', 20, yPos);
            yPos += 5;
            drawSampleChartInPDF(pdf, 'pie', 20, yPos, 170, 60, ['code_coverage']);
            yPos += 70;
        }
        
        // Add metrics summary if in report view
        if (state.metricsData) {
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Metrics Summary', 20, 20);
            
            pdf.setFontSize(11);
            let y = 35;
            const lineHeight = 7;
            
            // Test metrics
            pdf.setTextColor(0, 0, 0);
            pdf.text('Testing:', 20, y);
            y += lineHeight;
            
            pdf.setTextColor(100, 100, 100);
            pdf.text(`• Total tests: ${state.metricsData.tests_total || 0}`, 25, y);
            y += lineHeight;
            pdf.text(`• Passed: ${state.metricsData.tests_passed || 0}`, 25, y);
            y += lineHeight;
            pdf.text(`• Failed: ${state.metricsData.tests_failed || 0}`, 25, y);
            y += lineHeight;
            pdf.text(`• Skipped: ${state.metricsData.tests_skipped || 0}`, 25, y);
            y += lineHeight;
            pdf.text(`• Success rate: ${state.metricsData.test_success_rate || 0}%`, 25, y);
            y += lineHeight * 2;
            
            // Coverage metrics
            pdf.setTextColor(0, 0, 0);
            pdf.text('Coverage:', 20, y);
            y += lineHeight;
            
            pdf.setTextColor(100, 100, 100);
            pdf.text(`• Code coverage: ${state.metricsData.code_coverage || 0}%`, 25, y);
            y += lineHeight;
            pdf.text(`• Feature coverage: ${state.metricsData.feature_coverage || 0}%`, 25, y);
            y += lineHeight;
            pdf.text(`• Requirement coverage: ${state.metricsData.requirement_coverage || 0}%`, 25, y);
            y += lineHeight * 2;
            
            // Quality metrics
            pdf.setTextColor(0, 0, 0);
            pdf.text('Quality:', 20, y);
            y += lineHeight;
            
            pdf.setTextColor(100, 100, 100);
            pdf.text(`• Defect count: ${state.metricsData.defect_count || 0}`, 25, y);
            y += lineHeight;
            pdf.text(`• Defect density: ${state.metricsData.defect_density || 0}`, 25, y);
            y += lineHeight;
            pdf.text(`• Quality score: ${state.metricsData.quality_score || 0}/100`, 25, y);
        }
        
        // Save PDF
        const filename = `flowtest-report-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
        
        ToastManager.success('PDF saved successfully');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        ToastManager.error('Error exporting to PDF');
    }
}

// Export report to Excel
async function exportReportToExcel() {
    try {
        // Show loading
        ToastManager.info('Генерация Excel...');
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Create summary sheet
        const summaryData = [
            ['FlowTest Report'],
            [''],
            ['Дата создания', new Date().toLocaleDateString('ru-RU')],
            ['Проект', state.selectedProject && state.projects.find(p => p.id === state.selectedProject)?.name || 'Все проекты'],
            [''],
            ['Сводка по тестам'],
            ['Метрика', 'Значение'],
            ['Всего тестов', state.metricsData?.tests_total || 0],
            ['Успешных тестов', state.metricsData?.tests_passed || 0],
            ['Проваленных тестов', state.metricsData?.tests_failed || 0],
            ['Пропущенных тестов', state.metricsData?.tests_skipped || 0],
            ['Процент успеха (%)', state.metricsData?.test_success_rate || 0],
            [''],
            ['Время выполнения'],
            ['Метрика', 'Значение'],
            ['Средняя длительность (сек)', state.metricsData?.avg_test_duration || 0],
            ['Минимальная длительность (сек)', state.metricsData?.min_test_duration || 0],
            ['Максимальная длительность (сек)', state.metricsData?.max_test_duration || 0],
            ['Общее время (мин)', state.metricsData?.total_execution_time || 0],
            [''],
            ['Покрытие'],
            ['Метрика', 'Значение (%)'],
            ['Покрытие кода', state.metricsData?.code_coverage || 0],
            ['Покрытие функций', state.metricsData?.feature_coverage || 0],
            ['Покрытие требований', state.metricsData?.requirement_coverage || 0],
            [''],
            ['Качество'],
            ['Метрика', 'Значение'],
            ['Количество дефектов', state.metricsData?.defect_count || 0],
            ['Плотность дефектов', state.metricsData?.defect_density || 0],
            ['Оценка качества', state.metricsData?.quality_score || 0]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 30 }, // Column A
            { wch: 20 }  // Column B
        ];
        
        // Add summary sheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Сводка');
        
        // If we have chart data, add charts data sheet
        if (state.currentTemplate && state.currentTemplate.elements) {
            const chartsData = [];
            chartsData.push(['Данные графиков']);
            chartsData.push(['']);
            
            // Process each chart element
            state.currentTemplate.elements.forEach((element, index) => {
                if (element.type === 'chart' && element.chartConfig) {
                    chartsData.push([`График ${index + 1}: ${element.chartConfig.title || 'Без названия'}`]);
                    chartsData.push(['']);
                    
                    // Add chart configuration info
                    if (element.chartConfig.xAxis) {
                        chartsData.push(['Ось X:', element.chartConfig.xAxis.type]);
                    }
                    if (element.chartConfig.yAxis && element.chartConfig.yAxis.metrics) {
                        chartsData.push(['Метрики оси Y:', element.chartConfig.yAxis.metrics.join(', ')]);
                    }
                    
                    chartsData.push(['']);
                    
                    // Add mock data for charts (in real implementation, get actual chart data)
                    chartsData.push(['Дата', ...element.chartConfig.yAxis.metrics]);
                    
                    // Generate sample data rows
                    for (let i = 0; i < 7; i++) {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        const row = [date.toLocaleDateString('ru-RU')];
                        
                        // Add data for each metric
                        element.chartConfig.yAxis.metrics.forEach(metric => {
                            const value = state.metricsData?.[metric] || Math.random() * 100;
                            row.push(Math.round(value * 100) / 100);
                        });
                        
                        chartsData.push(row);
                    }
                    
                    chartsData.push(['']);
                    chartsData.push(['']);
                }
            });
            
            if (chartsData.length > 2) {
                const chartsSheet = XLSX.utils.aoa_to_sheet(chartsData);
                XLSX.utils.book_append_sheet(wb, chartsSheet, 'Графики');
            }
        }
        
        // Generate detailed test data sheet (mock data for demonstration)
        const testData = [
            ['Детальные данные тестов'],
            [''],
            ['ID', 'Название теста', 'Статус', 'Длительность (сек)', 'Дата выполнения', 'Исполнитель']
        ];
        
        // Add mock test data
        for (let i = 1; i <= 20; i++) {
            testData.push([
                i,
                `Тест ${i}`,
                Math.random() > 0.8 ? 'Failed' : 'Passed',
                (Math.random() * 10).toFixed(2),
                new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
                'Автоматизация'
            ]);
        }
        
        const testSheet = XLSX.utils.aoa_to_sheet(testData);
        testSheet['!cols'] = [
            { wch: 10 }, // ID
            { wch: 30 }, // Test name
            { wch: 15 }, // Status
            { wch: 20 }, // Duration
            { wch: 20 }, // Date
            { wch: 20 }  // Executor
        ];
        
        XLSX.utils.book_append_sheet(wb, testSheet, 'Детали тестов');
        
        // Save Excel file
        const filename = `flowtest-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        ToastManager.success('Excel файл успешно сохранен');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        ToastManager.error('Ошибка при экспорте в Excel');
    }
}

// Initialize export buttons
function initExportButtons() {
    // Report view export buttons
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportReportToPDF);
    }
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportReportToExcel);
    }
    
    // Editor export buttons
    const exportEditorBtn = document.getElementById('exportEditorBtn');
    const exportEditorMenu = document.getElementById('exportEditorMenu');
    const exportEditorPdfBtn = document.getElementById('exportEditorPdfBtn');
    const exportEditorExcelBtn = document.getElementById('exportEditorExcelBtn');
    
    if (exportEditorBtn && exportEditorMenu) {
        // Toggle export menu
        exportEditorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportEditorMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!exportEditorBtn.contains(e.target) && !exportEditorMenu.contains(e.target)) {
                exportEditorMenu.classList.add('hidden');
            }
        });
    }
    
    if (exportEditorPdfBtn) {
        exportEditorPdfBtn.addEventListener('click', () => {
            exportEditorMenu.classList.add('hidden');
            exportReportToPDF();
        });
    }
    
    if (exportEditorExcelBtn) {
        exportEditorExcelBtn.addEventListener('click', () => {
            exportEditorMenu.classList.add('hidden');
            exportReportToExcel();
        });
    }
}

// Make functions globally available
window.configureChart = configureChart;
window.fullscreenChart = fullscreenChart;
window.loadMetricsData = loadMetricsData;
window.openChartConfigModal = openChartConfigModal;
window.exportReportToPDF = exportReportToPDF;
window.exportReportToExcel = exportReportToExcel;