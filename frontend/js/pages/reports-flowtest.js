/**
 * FlowTest Reports Module - FlowTest Style Report Builder
 * Manages report template creation, metric visualization, and report generation
 */

import { APIClient } from '../api/client.js';
import { showToast } from '../utils/toast.js';
import ChartUtils from '../utils/chart-utils.js';
import { REPORT_CONFIG, METRIC_DEFINITIONS, UI_MESSAGES } from '../config/reports-config.js';

class FlowTestReports {
    constructor() {
        this.apiClient = new APIClient();
        this.chartUtils = new ChartUtils();
        this.currentTemplate = null;
        this.canvasElements = [];
        this.draggedElement = null;
        this.isDragging = false;
        this.charts = new Map();
        
        this.init();
    }

    async init() {
        this.initializeEventListeners();
        this.setupDragAndDrop();
        await this.loadTemplates();
        await this.loadProjects();
        this.setupDateDefaults();
        this.initializeUser();
    }

    initializeUser() {
        // Mock user data - replace with real authentication
        const userData = {
            name: 'John Doe',
            email: 'john.doe@company.com',
            avatar: null,
            initials: 'JD'
        };

        // Update user info in header
        this.getElementById('user-name').textContent = userData.name;
        this.getElementById('user-initials').textContent = userData.initials;
        
        if (userData.avatar) {
            this.getElementById('user-avatar-img').src = userData.avatar;
            this.getElementById('user-avatar-img').classList.remove('hidden');
            this.getElementById('user-initials').style.display = 'none';
        }
    }

    initializeEventListeners() {
        // Template selection
        this.delegateEvent('click', '.template-card', (e) => {
            if (!e.target.closest('.duplicate-template, .delete-template')) {
                this.selectTemplate(e.target.closest('.template-card'));
            }
        });

        // Template actions
        this.delegateEvent('click', '.duplicate-template', (e) => {
            e.stopPropagation();
            this.duplicateTemplate(e.target.closest('.template-card'));
        });

        this.delegateEvent('click', '.delete-template', (e) => {
            e.stopPropagation();
            this.deleteTemplate(e.target.closest('.template-card'));
        });

        // Modal controls
        this.getElementById('newTemplateBtn').addEventListener('click', () => {
            this.showModal('newTemplateModal');
        });

        // Modal close buttons
        ['closeTemplateModal', 'cancelTemplateModal'].forEach(id => {
            this.getElementById(id).addEventListener('click', () => {
                this.hideModal('newTemplateModal');
            });
        });

        ['closeGenerateModal', 'cancelGenerateModal'].forEach(id => {
            this.getElementById(id).addEventListener('click', () => {
                this.hideModal('generateReportModal');
            });
        });

        // Preview modal controls
        ['closePreviewModal'].forEach(id => {
            this.getElementById(id).addEventListener('click', () => {
                this.hideModal('previewReportModal');
            });
        });

        this.getElementById('fullscreenPreviewBtn').addEventListener('click', () => {
            this.toggleFullscreenPreview();
        });

        this.getElementById('printPreviewBtn').addEventListener('click', () => {
            this.printPreview();
        });

        // Header controls from index.html
        this.getElementById('addProjectBtn').addEventListener('click', () => {
            this.showModal('createProjectModal');
        });

        // Project modal controls
        ['closeProjectModalButton', 'cancelProjectModalButton'].forEach(id => {
            this.getElementById(id).addEventListener('click', () => {
                this.hideModal('createProjectModal');
            });
        });

        this.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject();
        });

        // User menu controls
        this.getElementById('user-menu-button').addEventListener('click', () => {
            this.toggleUserMenu();
        });

        this.getElementById('logout-button').addEventListener('click', () => {
            this.logout();
        });

        // Notifications
        this.getElementById('notifications-button').addEventListener('click', () => {
            this.toggleNotifications();
        });

        // Project selector
        this.getElementById('projectSelector').addEventListener('change', (e) => {
            this.handleProjectChange(e.target.value);
        });

        // Toolbar buttons
        this.getElementById('generateReportBtn').addEventListener('click', () => {
            if (this.currentTemplate) {
                this.showModal('generateReportModal');
            } else {
                showToast('Please select a template first', 'warning');
            }
        });

        this.getElementById('saveTemplateBtn').addEventListener('click', () => {
            this.saveCurrentTemplate();
        });

        this.getElementById('previewBtn').addEventListener('click', () => {
            this.previewReport();
        });

        // Form submissions
        this.getElementById('newTemplateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewTemplate();
        });

        this.getElementById('generateReportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });

        // Template search
        this.getElementById('templateSearch').addEventListener('input', (e) => {
            this.filterTemplates(e.target.value);
        });

        // Canvas click to deselect elements
        this.getElementById('reportCanvas').addEventListener('click', (e) => {
            if (e.target.id === 'reportCanvas' || e.target.classList.contains('canvas-grid')) {
                this.deselectAllElements();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    setupDragAndDrop() {
        const canvas = this.getElementById('reportCanvas');

        // Setup drag for metric cards
        this.delegateEvent('dragstart', '.metric-card', (e) => {
            this.draggedElement = e.target.closest('.metric-card');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', this.draggedElement.dataset.metric);
        });

        // Make metric cards draggable
        document.querySelectorAll('.metric-card').forEach(card => {
            card.setAttribute('draggable', 'true');
        });

        // Canvas drop handlers
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.showDropIndicator(e);
        });

        canvas.addEventListener('dragleave', () => {
            this.hideDropIndicator();
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.hideDropIndicator();
            
            if (this.draggedElement) {
                const rect = canvas.getBoundingClientRect();
                const x = Math.max(0, e.clientX - rect.left - 125);
                const y = Math.max(0, e.clientY - rect.top - 100);
                
                this.addMetricToCanvas(this.draggedElement.dataset.metric, x, y);
                this.draggedElement = null;
            }
        });
    }

    showDropIndicator(e) {
        const canvas = this.getElementById('reportCanvas');
        canvas.style.backgroundColor = 'rgba(255, 127, 80, 0.05)';
    }

    hideDropIndicator() {
        const canvas = this.getElementById('reportCanvas');
        canvas.style.backgroundColor = '';
    }

    async loadTemplates() {
        try {
            const templates = await this.mockLoadTemplates();
            this.renderTemplates(templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
            showToast('Failed to load templates', 'error');
        }
    }

    async mockLoadTemplates() {
        return [
            {
                id: 1,
                name: 'Test Execution Summary',
                description: 'Comprehensive overview of test execution results with pass/fail rates and trends',
                type: 'execution',
                lastUsed: '2 days ago',
                author: 'John Doe',
                created: '2025-01-15',
                elements: [
                    { metric: 'test-summary', position: { x: 50, y: 50 } },
                    { metric: 'execution-trend', position: { x: 350, y: 50 } }
                ]
            },
            {
                id: 2,
                name: 'Performance Dashboard',
                description: 'Performance metrics, bottlenecks analysis and execution time trends',
                type: 'performance',
                lastUsed: '1 week ago',
                author: 'Jane Smith',
                created: '2025-01-10',
                elements: [
                    { metric: 'performance-trend', position: { x: 50, y: 50 } },
                    { metric: 'bottlenecks', position: { x: 350, y: 50 } },
                    { metric: 'test-duration', position: { x: 50, y: 300 } }
                ]
            },
            {
                id: 3,
                name: 'Coverage Analysis Report',
                description: 'Comprehensive test coverage across features, requirements and code',
                type: 'coverage',
                lastUsed: '3 days ago',
                author: 'Mike Johnson',
                created: '2025-01-20',
                elements: [
                    { metric: 'feature-coverage', position: { x: 50, y: 50 } },
                    { metric: 'requirement-coverage', position: { x: 350, y: 50 } }
                ]
            },
            {
                id: 4,
                name: 'Quality Metrics Dashboard',
                description: 'Quality trends, defect analysis and overall system health metrics',
                type: 'defects',
                lastUsed: '5 days ago',
                author: 'Sarah Wilson',
                created: '2025-01-08',
                elements: [
                    { metric: 'defect-density', position: { x: 50, y: 50 } },
                    { metric: 'quality-trend', position: { x: 350, y: 50 } }
                ]
            },
            {
                id: 5,
                name: 'Executive Summary',
                description: 'High-level overview combining key metrics for stakeholder reporting',
                type: 'custom',
                lastUsed: '1 day ago',
                author: 'David Brown',
                created: '2025-01-25',
                elements: [
                    { metric: 'test-summary', position: { x: 50, y: 50 } },
                    { metric: 'execution-trend', position: { x: 350, y: 50 } },
                    { metric: 'defect-density', position: { x: 50, y: 300 } },
                    { metric: 'quality-trend', position: { x: 350, y: 300 } }
                ]
            },
            {
                id: 6,
                name: 'Mobile App Testing Report',
                description: 'Specialized metrics for mobile application testing scenarios',
                type: 'execution',
                lastUsed: '1 week ago',
                author: 'Lisa Garcia',
                created: '2025-01-12',
                elements: [
                    { metric: 'test-summary', position: { x: 50, y: 50 } },
                    { metric: 'performance-trend', position: { x: 350, y: 50 } }
                ]
            },
            {
                id: 7,
                name: 'API Testing Dashboard',
                description: 'API endpoint testing results with response times and reliability metrics',
                type: 'performance',
                lastUsed: '4 days ago',
                author: 'Tom Anderson',
                created: '2025-01-18',
                elements: [
                    { metric: 'execution-trend', position: { x: 50, y: 50 } },
                    { metric: 'performance-trend', position: { x: 350, y: 50 } },
                    { metric: 'bottlenecks', position: { x: 200, y: 300 } }
                ]
            },
            {
                id: 8,
                name: 'Security Testing Report',
                description: 'Security-focused testing results and vulnerability analysis',
                type: 'custom',
                lastUsed: '2 weeks ago',
                author: 'Emma Davis',
                created: '2025-01-05',
                elements: [
                    { metric: 'test-summary', position: { x: 50, y: 50 } },
                    { metric: 'defect-density', position: { x: 350, y: 50 } }
                ]
            }
        ];
    }

    renderTemplates(templates) {
        const container = this.getElementById('templatesList');
        container.innerHTML = '';

        templates.forEach(template => {
            const card = this.createTemplateCard(template);
            container.appendChild(card);
        });
    }

    createTemplateCard(template) {
        const typeColors = {
            execution: 'blue',
            performance: 'purple',
            coverage: 'green',
            defects: 'red',
            custom: 'gray'
        };

        const typeIcons = {
            execution: 'ri-play-circle-line',
            performance: 'ri-speed-line',
            coverage: 'ri-shield-check-line',
            defects: 'ri-bug-line',
            custom: 'ri-settings-line'
        };

        const color = typeColors[template.type] || 'gray';
        const icon = typeIcons[template.type] || 'ri-file-line';
        
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.templateId = template.id;
        card.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg flex items-center justify-center">
                        <i class="${icon} text-${color}-600 dark:text-${color}-400"></i>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-gray-100">${template.name}</h4>
                        <span class="text-xs text-gray-500 bg-${color}-100 dark:bg-${color}-900 px-2 py-1 rounded capitalize">${template.type}</span>
                    </div>
                </div>
                <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="text-gray-400 hover:text-coral-500 duplicate-template" title="Duplicate">
                        <i class="ri-file-copy-line text-sm"></i>
                    </button>
                    <button class="text-gray-400 hover:text-red-500 delete-template" title="Delete">
                        <i class="ri-delete-bin-line text-sm"></i>
                    </button>
                </div>
            </div>
            
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${template.description}</p>
            
            <div class="flex items-center justify-between text-xs text-gray-500">
                <div class="flex items-center space-x-3">
                    <div class="flex items-center">
                        <i class="ri-user-line mr-1"></i>
                        ${template.author || 'Unknown'}
                    </div>
                    <div class="flex items-center">
                        <i class="ri-calendar-line mr-1"></i>
                        ${template.created || 'Unknown'}
                    </div>
                </div>
                <div class="flex items-center">
                    <i class="ri-time-line mr-1"></i>
                    ${template.lastUsed}
                </div>
            </div>
            
            ${template.elements && template.elements.length > 0 ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center text-xs text-gray-500">
                        <i class="ri-pie-chart-line mr-1"></i>
                        ${template.elements.length} metric${template.elements.length !== 1 ? 's' : ''}
                    </div>
                </div>
            ` : ''}
        `;

        // Add hover effect for action buttons
        card.addEventListener('mouseenter', () => {
            const actions = card.querySelector('.opacity-0');
            if (actions) actions.classList.remove('opacity-0');
        });

        card.addEventListener('mouseleave', () => {
            const actions = card.querySelector('.group-hover\\:opacity-100');
            if (actions) actions.classList.add('opacity-0');
        });

        return card;
    }

    selectTemplate(templateCard) {
        // Remove active class from all templates
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('active');
        });

        // Add active class to selected template
        templateCard.classList.add('active');

        const templateName = templateCard.querySelector('h4').textContent;
        const templateId = templateCard.dataset.templateId;
        
        this.currentTemplate = {
            id: templateId,
            name: templateName,
            type: templateCard.querySelector('span').textContent.toLowerCase()
        };

        // Update toolbar
        this.getElementById('templateTitle').textContent = `Editing: ${templateName}`;
        this.getElementById('previewBtn').disabled = false;
        this.getElementById('saveTemplateBtn').disabled = false;
        this.getElementById('generateReportBtn').disabled = false;

        // Hide empty state
        this.getElementById('canvasEmpty').style.display = 'none';

        // Load template layout
        this.loadTemplateLayout();
    }

    async loadTemplateLayout() {
        // Clear existing elements
        this.clearCanvas();

        // Load template data and add elements
        try {
            const templateData = await this.getTemplateData(this.currentTemplate.id);
            
            if (templateData.elements && templateData.elements.length > 0) {
                templateData.elements.forEach(element => {
                    this.addMetricToCanvas(element.metric, element.position.x, element.position.y);
                });
            } else {
                // Add default layout based on template type
                this.addDefaultLayoutForType(this.currentTemplate.type);
            }
        } catch (error) {
            console.error('Failed to load template layout:', error);
            this.addDefaultLayoutForType(this.currentTemplate.type);
        }
    }

    addDefaultLayoutForType(type) {
        switch (type) {
            case 'execution':
                this.addMetricToCanvas('test-summary', 50, 50);
                this.addMetricToCanvas('execution-trend', 350, 50);
                this.addMetricToCanvas('test-duration', 50, 300);
                break;
            case 'performance':
                this.addMetricToCanvas('performance-trend', 50, 50);
                this.addMetricToCanvas('bottlenecks', 350, 50);
                break;
            case 'coverage':
                this.addMetricToCanvas('feature-coverage', 50, 50);
                this.addMetricToCanvas('requirement-coverage', 350, 50);
                break;
            case 'defects':
                this.addMetricToCanvas('defect-density', 50, 50);
                this.addMetricToCanvas('quality-trend', 350, 50);
                break;
        }
    }

    addMetricToCanvas(metricType, x, y) {
        const canvas = this.getElementById('reportCanvas');
        const element = document.createElement('div');
        element.className = 'chart-element';
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.dataset.metric = metricType;

        // Add content based on metric type
        element.innerHTML = this.getMetricContent(metricType);

        // Make element interactive
        this.makeElementInteractive(element);

        canvas.appendChild(element);
        this.canvasElements.push(element);

        // Initialize chart if element has canvas
        setTimeout(() => {
            this.initializeChart(element);
        }, 100);
    }

    getMetricContent(metricType) {
        const metricConfigs = {
            'test-summary': {
                title: 'Test Summary',
                icon: 'ri-pie-chart-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'execution-trend': {
                title: 'Execution Trend',
                icon: 'ri-line-chart-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'test-duration': {
                title: 'Test Duration',
                icon: 'ri-bar-chart-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'feature-coverage': {
                title: 'Feature Coverage',
                icon: 'ri-stack-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'requirement-coverage': {
                title: 'Requirement Coverage',
                icon: 'ri-file-list-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'performance-trend': {
                title: 'Performance Trend',
                icon: 'ri-speed-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'bottlenecks': {
                title: 'Bottlenecks',
                icon: 'ri-error-warning-line',
                content: '<div class="text-center p-4"><div class="text-2xl font-bold text-red-500">3</div><div class="text-sm text-gray-500">Slow Tests</div></div>'
            },
            'defect-density': {
                title: 'Defect Density',
                icon: 'ri-bug-line',
                content: '<canvas width="200" height="150"></canvas>'
            },
            'quality-trend': {
                title: 'Quality Trend',
                icon: 'ri-award-line',
                content: '<canvas width="200" height="150"></canvas>'
            }
        };

        const config = metricConfigs[metricType] || { 
            title: 'Unknown Metric', 
            icon: 'ri-bar-chart-line', 
            content: '<div class="text-center p-4 text-gray-500">No data available</div>' 
        };

        return `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                    <i class="${config.icon} text-lg text-coral-500 mr-2"></i>
                    <h4 class="font-medium text-gray-900 dark:text-gray-100">${config.title}</h4>
                </div>
                <div class="flex space-x-1">
                    <button class="text-gray-400 hover:text-blue-500 edit-metric" title="Edit">
                        <i class="ri-settings-line"></i>
                    </button>
                    <button class="text-gray-400 hover:text-red-500 remove-metric" title="Remove">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            </div>
            <div class="metric-content">
                ${config.content}
            </div>
        `;
    }

    initializeChart(element) {
        const canvas = element.querySelector('canvas');
        if (!canvas) return;

        const metricType = element.dataset.metric;
        const ctx = canvas.getContext('2d');
        
        // Get chart configuration
        const config = this.chartUtils.getChartConfig(metricType);
        
        // Create chart using ChartUtils
        let chart;
        if (this.chartUtils[config.createFunction]) {
            chart = this.chartUtils[config.createFunction](ctx, null, config.options || {});
        }

        if (chart) {
            this.charts.set(element, chart);
            
            // Apply dark mode if needed
            if (document.documentElement.classList.contains('dark')) {
                this.chartUtils.applyDarkTheme(chart.options);
                chart.update();
            }
        }
    }

    createPieChart(ctx) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{
                    data: [65, 25, 10],
                    backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
    makeElementInteractive(element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        // Handle metric actions
        element.addEventListener('click', (e) => {
            if (e.target.closest('.remove-metric')) {
                this.removeElement(element);
                return;
            }
            if (e.target.closest('.edit-metric')) {
                this.editMetric(element);
                return;
            }
        });

        // Dragging functionality
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, canvas')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;

            // Select element
            this.selectElement(element);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            element.style.left = Math.max(0, startLeft + deltaX) + 'px';
            element.style.top = Math.max(0, startTop + deltaY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    selectElement(element) {
        this.deselectAllElements();
        element.classList.add('selected');
    }

    deselectAllElements() {
        document.querySelectorAll('.chart-element').forEach(el => {
            el.classList.remove('selected');
        });
    }

    removeElement(element) {
        const chart = this.charts.get(element);
        if (chart) {
            this.chartUtils.destroyChart(chart);
            this.charts.delete(element);
        }
        
        element.remove();
        this.canvasElements = this.canvasElements.filter(el => el !== element);
    }

    editMetric(element) {
        // Show metric configuration modal
        showToast('Metric configuration will be implemented', 'info');
    }

    clearCanvas() {
        const canvas = this.getElementById('reportCanvas');
        const elements = canvas.querySelectorAll('.chart-element');
        
        elements.forEach(element => {
            const chart = this.charts.get(element);
            if (chart) {
                this.chartUtils.destroyChart(chart);
                this.charts.delete(element);
            }
            element.remove();
        });
        
        this.canvasElements = [];
    }

    async createNewTemplate() {
        const formData = new FormData(this.getElementById('newTemplateForm'));
        const templateData = {
            name: formData.get('name'),
            description: formData.get('description'),
            type: formData.get('type'),
            elements: []
        };

        try {
            // In real app, save to API
            await this.mockSaveTemplate(templateData);
            
            // Add to sidebar
            this.addTemplateToSidebar(templateData);
            
            // Close modal and reset form
            this.hideModal('newTemplateModal');
            this.getElementById('newTemplateForm').reset();
            
            showToast('Template created successfully!', 'success');
        } catch (error) {
            console.error('Failed to create template:', error);
            showToast('Failed to create template', 'error');
        }
    }

    addTemplateToSidebar(template) {
        const templatesList = this.getElementById('templatesList');
        const card = this.createTemplateCard({
            ...template,
            id: Date.now(),
            lastUsed: 'Just created'
        });
        templatesList.appendChild(card);
    }

    async saveCurrentTemplate() {
        if (!this.currentTemplate) return;

        const templateData = {
            ...this.currentTemplate,
            elements: this.canvasElements.map(el => ({
                metric: el.dataset.metric,
                position: {
                    x: el.offsetLeft,
                    y: el.offsetTop
                },
                size: {
                    width: el.offsetWidth,
                    height: el.offsetHeight
                }
            }))
        };

        try {
            await this.mockSaveTemplate(templateData);
            showToast('Template saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save template:', error);
            showToast('Failed to save template', 'error');
        }
    }

    async generateReport() {
        const formData = new FormData(this.getElementById('generateReportForm'));
        const reportData = {
            name: formData.get('name'),
            project: formData.get('project'),
            format: formData.get('format'),
            dateFrom: formData.get('dateFrom'),
            dateTo: formData.get('dateTo'),
            template: this.currentTemplate,
            elements: this.canvasElements.map(el => ({
                metric: el.dataset.metric,
                position: { x: el.offsetLeft, y: el.offsetTop },
                size: { width: el.offsetWidth, height: el.offsetHeight }
            }))
        };

        try {
            showToast('Generating report...', 'info');
            
            // Simulate report generation
            await this.mockGenerateReport(reportData);
            
            this.hideModal('generateReportModal');
            this.getElementById('generateReportForm').reset();
            
            showToast('Report generated successfully!', 'success');
        } catch (error) {
            console.error('Failed to generate report:', error);
            showToast('Failed to generate report', 'error');
        }
    }

    previewReport() {
        if (!this.currentTemplate) {
            showToast('Please select a template first', 'warning');
            return;
        }

        // Show preview modal
        this.showModal('previewReportModal');
        
        // Update preview header
        this.getElementById('previewTitle').textContent = `${this.currentTemplate.name} - Preview`;
        this.getElementById('previewProject').textContent = `Project: ${this.getSelectedProject() || 'All Projects'}`;
        
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        this.getElementById('previewDateRange').textContent = 
            `Period: ${lastMonth.toLocaleDateString()} - ${today.toLocaleDateString()}`;
        this.getElementById('previewGenerated').textContent = 
            `Generated: ${new Date().toLocaleDateString()}`;

        // Generate preview content
        this.generatePreviewContent();
    }

    generatePreviewContent() {
        const previewCanvas = this.getElementById('previewCanvas');
        previewCanvas.innerHTML = '';

        // Create preview elements based on current canvas
        this.canvasElements.forEach((element, index) => {
            const previewElement = this.createPreviewElement(element, index);
            previewCanvas.appendChild(previewElement);
        });

        // If no elements, show sample layout
        if (this.canvasElements.length === 0) {
            this.createSamplePreview(previewCanvas);
        }
    }

    createPreviewElement(originalElement, index) {
        const previewElement = document.createElement('div');
        previewElement.className = 'preview-chart-element bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4';
        previewElement.style.position = 'relative';
        previewElement.style.width = '100%';
        previewElement.style.minHeight = '300px';

        const metricType = originalElement.dataset.metric;
        const config = this.chartUtils.getChartConfig(metricType);
        
        // Create header
        const header = document.createElement('div');
        header.className = 'flex items-center mb-4';
        header.innerHTML = `
            <div class="flex items-center">
                <i class="${this.getMetricIcon(metricType)} text-lg text-coral-500 mr-2"></i>
                <h4 class="font-medium text-gray-900 dark:text-gray-100">${this.getMetricTitle(metricType)}</h4>
            </div>
        `;
        previewElement.appendChild(header);

        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'relative';
        chartContainer.style.height = '250px';

        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        previewElement.appendChild(chartContainer);

        // Generate chart with real-looking data
        setTimeout(() => {
            this.createPreviewChart(canvas, metricType);
        }, 100 * (index + 1)); // Stagger chart creation

        return previewElement;
    }

    createPreviewChart(canvas, metricType) {
        const ctx = canvas.getContext('2d');
        
        // Generate realistic data for preview
        const previewData = this.generateRealisticData(metricType);
        
        // Create chart using ChartUtils with preview data
        const config = this.chartUtils.getChartConfig(metricType);
        let chart;

        if (this.chartUtils[config.createFunction]) {
            chart = this.chartUtils[config.createFunction](ctx, previewData, {
                ...config.options,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            });
        }

        return chart;
    }

    generateRealisticData(metricType) {
        const dataGenerators = {
            'test-summary': () => ({
                passed: Math.floor(Math.random() * 20) + 70,
                failed: Math.floor(Math.random() * 15) + 5,
                skipped: Math.floor(Math.random() * 10) + 2
            }),
            'execution-trend': () => {
                const points = 12;
                const labels = [];
                const values = [];
                const now = new Date();
                
                for (let i = points - 1; i >= 0; i--) {
                    const date = new Date(now);
                    date.setMonth(date.getMonth() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
                    
                    // Realistic trend with some volatility
                    const baseValue = 85;
                    const trend = i * 0.5; // Slight improvement over time
                    const volatility = (Math.random() - 0.5) * 8;
                    values.push(Math.max(60, Math.min(98, baseValue + trend + volatility)));
                }
                
                return { labels, values };
            },
            'test-duration': () => ({
                labels: ['Authentication', 'User Management', 'API Tests', 'UI Tests', 'Integration'],
                values: [1.2, 2.8, 0.9, 4.1, 3.2]
            }),
            'feature-coverage': () => ({
                labels: ['Login', 'Dashboard', 'Reports', 'Settings', 'Admin'],
                values: [95, 87, 92, 78, 85]
            }),
            'requirement-coverage': () => ({
                labels: ['Functional', 'Security', 'Performance', 'Usability', 'Compatibility'],
                values: [89, 92, 76, 83, 91]
            }),
            'performance-trend': () => {
                const points = 30;
                const labels = [];
                const values = [];
                
                for (let i = points - 1; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    labels.push(date.getDate().toString());
                    
                    // Simulate performance data (response times)
                    const baseTime = 250;
                    const variation = (Math.random() - 0.5) * 100;
                    values.push(Math.max(150, Math.min(500, baseTime + variation)));
                }
                
                return { labels, values };
            },
            'bottlenecks': () => ({
                labels: ['Database Query', 'File Upload', 'Report Generation', 'Data Export', 'API Call'],
                values: [3200, 8500, 12000, 6800, 2100]
            }),
            'defect-density': () => ({
                labels: ['Core', 'UI', 'API', 'Auth', 'Reports'],
                values: [12, 8, 15, 5, 9]
            }),
            'quality-trend': () => ({
                labels: ['Performance', 'Reliability', 'Security', 'Usability', 'Maintainability', 'Coverage'],
                values: [88, 92, 85, 79, 83, 91]
            })
        };

        const generator = dataGenerators[metricType];
        return generator ? generator() : null;
    }

    createSamplePreview(container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-gray-400 dark:text-gray-500 mb-4">
                    <i class="ri-file-chart-line text-6xl"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Metrics Added</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6">
                    Add some metrics to your template to see the preview
                </p>
                <button class="btn-primary" onclick="document.getElementById('closePreviewModal').click()">
                    <i class="ri-edit-line mr-1"></i>
                    Edit Template
                </button>
            </div>
        `;
    }

    getMetricIcon(metricType) {
        const icons = {
            'test-summary': 'ri-pie-chart-line',
            'execution-trend': 'ri-line-chart-line',
            'test-duration': 'ri-bar-chart-line',
            'feature-coverage': 'ri-stack-line',
            'requirement-coverage': 'ri-file-list-line',
            'performance-trend': 'ri-speed-line',
            'bottlenecks': 'ri-error-warning-line',
            'defect-density': 'ri-bug-line',
            'quality-trend': 'ri-award-line'
        };
        return icons[metricType] || 'ri-bar-chart-line';
    }

    getMetricTitle(metricType) {
        const titles = {
            'test-summary': 'Test Summary',
            'execution-trend': 'Execution Trend',
            'test-duration': 'Test Duration',
            'feature-coverage': 'Feature Coverage',
            'requirement-coverage': 'Requirement Coverage',
            'performance-trend': 'Performance Trend',
            'bottlenecks': 'Performance Bottlenecks',
            'defect-density': 'Defect Density',
            'quality-trend': 'Quality Trend'
        };
        return titles[metricType] || 'Unknown Metric';
    }

    getSelectedProject() {
        const select = this.getElementById('reportProject');
        return select ? select.options[select.selectedIndex]?.text : null;
    }

    toggleFullscreenPreview() {
        const modal = this.getElementById('previewReportModal');
        modal.classList.toggle('fullscreen-preview');
    }

    printPreview() {
        const printContent = this.getElementById('previewCanvas').innerHTML;
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>FlowTest Report Preview</title>
                <style>
                    body { font-family: Inter, sans-serif; margin: 20px; }
                    .preview-chart-element { 
                        margin-bottom: 30px; 
                        page-break-inside: avoid; 
                        border: 1px solid #e5e7eb;
                        padding: 20px;
                        border-radius: 8px;
                    }
                    @media print { 
                        body { margin: 0; }
                        .preview-chart-element { 
                            border: none; 
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>${this.currentTemplate?.name || 'Report'} - Preview</h1>
                <div>${printContent}</div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }

    filterTemplates(searchTerm) {
        const templates = document.querySelectorAll('.template-card');
        templates.forEach(template => {
            const name = template.querySelector('h4').textContent.toLowerCase();
            const description = template.querySelector('p').textContent.toLowerCase();
            const type = template.querySelector('span').textContent.toLowerCase();
            
            const matches = name.includes(searchTerm.toLowerCase()) || 
                          description.includes(searchTerm.toLowerCase()) || 
                          type.includes(searchTerm.toLowerCase());
            
            template.style.display = matches ? 'block' : 'none';
        });
    }

    duplicateTemplate(templateCard) {
        const name = templateCard.querySelector('h4').textContent;
        const description = templateCard.querySelector('p').textContent;
        const type = templateCard.querySelector('span').textContent;
        
        const duplicatedTemplate = {
            id: Date.now(),
            name: `${name} (Copy)`,
            description,
            type: type.toLowerCase(),
            lastUsed: 'Just created',
            elements: []
        };
        
        this.addTemplateToSidebar(duplicatedTemplate);
        showToast('Template duplicated successfully!', 'success');
    }

    deleteTemplate(templateCard) {
        if (confirm('Are you sure you want to delete this template?')) {
            templateCard.remove();
            showToast('Template deleted successfully!', 'success');
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveCurrentTemplate();
                    break;
                case 'n':
                    e.preventDefault();
                    this.showModal('newTemplateModal');
                    break;
            }
        }
        
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const selected = document.querySelector('.chart-element.selected');
            if (selected && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this.removeElement(selected);
            }
        }
    }

    async loadProjects() {
        try {
            // Mock project data - replace with real API call
            const projects = [
                { id: 1, name: 'Web Application', description: 'Main web application testing' },
                { id: 2, name: 'Mobile App', description: 'Mobile application testing' },
                { id: 3, name: 'API Service', description: 'Backend API testing' },
                { id: 4, name: 'E-commerce Platform', description: 'Online store testing' },
                { id: 5, name: 'Data Analytics', description: 'Analytics dashboard testing' }
            ];
            
            const selectors = ['reportProject', 'projectSelector'];
            selectors.forEach(selectorId => {
                const select = this.getElementById(selectorId);
                if (select) {
                    // Clear existing options except first
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    // Add projects
                    projects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.id;
                        option.textContent = project.name;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('Failed to load projects:', error);
            showToast('Failed to load projects', 'error');
        }
    }

    async createProject() {
        const formData = new FormData(this.getElementById('projectForm'));
        const projectData = {
            name: formData.get('projectName'),
            description: formData.get('description')
        };

        try {
            // Validate
            if (!projectData.name || projectData.name.trim().length < 3) {
                this.showFormError('projectNameError', 'Project name must be at least 3 characters');
                return;
            }

            // Show loading
            this.showSubmitSpinner(true);

            // Mock API call - replace with real API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Success
            this.hideModal('createProjectModal');
            this.getElementById('projectForm').reset();
            this.hideFormErrors();
            
            showToast('Project created successfully!', 'success');
            
            // Reload projects
            await this.loadProjects();

        } catch (error) {
            console.error('Failed to create project:', error);
            this.showFormError('formErrorMessage', 'Failed to create project. Please try again.');
        } finally {
            this.showSubmitSpinner(false);
        }
    }

    toggleUserMenu() {
        const dropdown = this.getElementById('user-dropdown');
        dropdown.classList.toggle('hidden');
        
        // Close on outside click
        if (!dropdown.classList.contains('hidden')) {
            setTimeout(() => {
                document.addEventListener('click', this.closeUserMenuOnOutsideClick.bind(this), { once: true });
            }, 0);
        }
    }

    closeUserMenuOnOutsideClick(event) {
        const dropdown = this.getElementById('user-dropdown');
        const button = this.getElementById('user-menu-button');
        
        if (!dropdown.contains(event.target) && !button.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    }

    toggleNotifications() {
        const notificationList = this.getElementById('notificationList');
        notificationList.classList.toggle('hidden');
        
        // Mock notifications
        if (!notificationList.classList.contains('hidden') && notificationList.children.length === 1) {
            this.loadNotifications();
        }
    }

    loadNotifications() {
        const container = this.getElementById('notificationList');
        
        // Mock notification data
        const notifications = [
            {
                id: 1,
                title: 'Report generated',
                message: 'Test Execution Summary report has been generated',
                time: '5 minutes ago',
                type: 'success'
            },
            {
                id: 2,
                title: 'New template created',
                message: 'Performance Metrics template was created',
                time: '1 hour ago',
                type: 'info'
            },
            {
                id: 3,
                title: 'Test execution completed',
                message: 'Automated test suite finished with 89% success rate',
                time: '2 hours ago',
                type: 'warning'
            }
        ];

        container.innerHTML = notifications.map(notification => `
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <div class="w-2 h-2 mt-2 rounded-full ${this.getNotificationColor(notification.type)}"></div>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">${notification.title}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${notification.message}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">${notification.time}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getNotificationColor(type) {
        const colors = {
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };
        return colors[type] || colors.info;
    }

    handleProjectChange(projectId) {
        console.log('Project changed:', projectId);
        // Update template data based on selected project
        // This would typically filter templates or update data sources
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear any stored data
            localStorage.removeItem('flowtest_auth_token');
            
            // Redirect to login
            window.location.href = 'login.html';
        }
    }

    showFormError(elementId, message) {
        const element = this.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
    }

    hideFormErrors() {
        const errorElements = document.querySelectorAll('[id$="Error"]');
        errorElements.forEach(element => {
            element.classList.add('hidden');
            element.textContent = '';
        });
    }

    showSubmitSpinner(show) {
        const spinner = this.getElementById('submitSpinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
    }

    setupDateDefaults() {
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        this.getElementById('reportDateFrom').value = oneMonthAgo.toISOString().split('T')[0];
        this.getElementById('reportDateTo').value = today.toISOString().split('T')[0];
    }

    // Utility methods
    getElementById(id) {
        return document.getElementById(id);
    }

    delegateEvent(event, selector, handler) {
        document.addEventListener(event, (e) => {
            if (e.target.closest(selector)) {
                handler(e);
            }
        });
    }

    showModal(modalId) {
        this.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        this.getElementById(modalId).classList.add('hidden');
    }

    // Mock API methods
    async mockSaveTemplate(templateData) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async mockGenerateReport(reportData) {
        return new Promise(resolve => setTimeout(resolve, 2000));
    }

    async getTemplateData(templateId) {
        const templates = await this.mockLoadTemplates();
        return templates.find(t => t.id == templateId) || { elements: [] };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlowTestReports();
});

export default FlowTestReports;