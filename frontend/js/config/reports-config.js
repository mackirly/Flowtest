/**
 * Configuration and constants for FlowTest Reports
 */

export const REPORT_CONFIG = {
    // Canvas settings
    CANVAS: {
        GRID_SIZE: 20,
        MIN_ELEMENT_WIDTH: 200,
        MIN_ELEMENT_HEIGHT: 150,
        DEFAULT_ELEMENT_WIDTH: 300,
        DEFAULT_ELEMENT_HEIGHT: 200,
        SNAP_THRESHOLD: 10
    },

    // Chart settings
    CHARTS: {
        DEFAULT_ANIMATION_DURATION: 750,
        RESPONSIVE: true,
        MAINTAIN_ASPECT_RATIO: false,
        FONT_FAMILY: 'Inter, sans-serif',
        FONT_SIZE: 11
    },

    // Template types
    TEMPLATE_TYPES: {
        EXECUTION: 'execution',
        COVERAGE: 'coverage', 
        PERFORMANCE: 'performance',
        DEFECTS: 'defects',
        CUSTOM: 'custom'
    },

    // Metric categories
    METRIC_CATEGORIES: {
        EXECUTION: 'Test Execution',
        COVERAGE: 'Coverage Analysis',
        PERFORMANCE: 'Performance',
        QUALITY: 'Quality Metrics'
    },

    // Export formats
    EXPORT_FORMATS: {
        PDF: 'pdf',
        HTML: 'html', 
        EXCEL: 'excel',
        CSV: 'csv',
        PNG: 'png'
    },

    // Color scheme
    COLORS: {
        PRIMARY: '#FF7F50',
        SUCCESS: '#10B981',
        WARNING: '#F59E0B', 
        DANGER: '#EF4444',
        INFO: '#3B82F6',
        SECONDARY: '#6B7280',
        LIGHT_GRAY: '#F3F4F6',
        DARK_GRAY: '#1F2937'
    },

    // Animation settings
    ANIMATIONS: {
        SLIDE_IN_DURATION: 300,
        FADE_DURATION: 200,
        CHART_ANIMATION_DURATION: 750,
        TRANSITION_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },

    // Validation rules
    VALIDATION: {
        TEMPLATE_NAME_MIN_LENGTH: 3,
        TEMPLATE_NAME_MAX_LENGTH: 50,
        DESCRIPTION_MAX_LENGTH: 200,
        MAX_ELEMENTS_PER_TEMPLATE: 20
    },

    // Local storage keys
    STORAGE_KEYS: {
        TEMPLATES: 'flowtest_report_templates',
        USER_PREFERENCES: 'flowtest_report_preferences',
        RECENT_TEMPLATES: 'flowtest_recent_templates'
    },

    // API endpoints (relative to base URL)
    API_ENDPOINTS: {
        TEMPLATES: '/api/report-templates/',
        GENERATE_REPORT: '/api/reports/generate/',
        PROJECTS: '/api/projects/',
        METRICS_DATA: '/api/metrics/',
        EXPORT_REPORT: '/api/reports/export/'
    }
};

// Metric definitions with metadata
export const METRIC_DEFINITIONS = {
    'test-summary': {
        name: 'Test Summary',
        description: 'Overall test execution results with pass/fail rates',
        category: 'execution',
        icon: 'ri-pie-chart-line',
        chartType: 'doughnut',
        dataSource: 'test_results',
        tags: ['overview', 'results', 'summary']
    },
    'execution-trend': {
        name: 'Execution Trend',
        description: 'Test execution success rate over time',
        category: 'execution',
        icon: 'ri-line-chart-line',
        chartType: 'line',
        dataSource: 'execution_history',
        tags: ['trend', 'timeline', 'success-rate']
    },
    'test-duration': {
        name: 'Test Duration',
        description: 'Average execution time by test category',
        category: 'performance',
        icon: 'ri-bar-chart-line',
        chartType: 'bar',
        dataSource: 'execution_times',
        tags: ['performance', 'duration', 'timing']
    },
    'feature-coverage': {
        name: 'Feature Coverage',
        description: 'Test coverage across application features',
        category: 'coverage',
        icon: 'ri-stack-line',
        chartType: 'bar',
        dataSource: 'feature_coverage',
        tags: ['coverage', 'features', 'testing']
    },
    'requirement-coverage': {
        name: 'Requirement Coverage',
        description: 'Coverage of business requirements by tests',
        category: 'coverage',
        icon: 'ri-file-list-line',
        chartType: 'bar',
        dataSource: 'requirement_coverage',
        tags: ['coverage', 'requirements', 'business']
    },
    'performance-trend': {
        name: 'Performance Trend',
        description: 'Application performance metrics over time',
        category: 'performance',
        icon: 'ri-speed-line',
        chartType: 'line',
        dataSource: 'performance_metrics',
        tags: ['performance', 'trend', 'metrics']
    },
    'bottlenecks': {
        name: 'Performance Bottlenecks',
        description: 'Slowest tests and performance bottlenecks',
        category: 'performance',
        icon: 'ri-error-warning-line',
        chartType: 'horizontalBar',
        dataSource: 'slow_tests',
        tags: ['performance', 'bottlenecks', 'optimization']
    },
    'defect-density': {
        name: 'Defect Density',
        description: 'Number of defects per module or component',
        category: 'quality',
        icon: 'ri-bug-line',
        chartType: 'bar',
        dataSource: 'defect_stats',
        tags: ['quality', 'defects', 'bugs']
    },
    'quality-trend': {
        name: 'Quality Trend',
        description: 'Overall quality metrics across multiple dimensions',
        category: 'quality',
        icon: 'ri-award-line',
        chartType: 'radar',
        dataSource: 'quality_metrics',
        tags: ['quality', 'trend', 'overview']
    }
};

// UI Messages and labels
export const UI_MESSAGES = {
    SUCCESS: {
        TEMPLATE_CREATED: 'Template created successfully!',
        TEMPLATE_SAVED: 'Template saved successfully!',
        TEMPLATE_DELETED: 'Template deleted successfully!',
        REPORT_GENERATED: 'Report generated successfully!',
        TEMPLATE_DUPLICATED: 'Template duplicated successfully!'
    },
    ERROR: {
        TEMPLATE_LOAD_FAILED: 'Failed to load templates',
        TEMPLATE_SAVE_FAILED: 'Failed to save template', 
        REPORT_GENERATION_FAILED: 'Failed to generate report',
        INVALID_TEMPLATE_NAME: 'Template name must be between 3 and 50 characters',
        NO_TEMPLATE_SELECTED: 'Please select a template first',
        NETWORK_ERROR: 'Network error. Please check your connection.'
    },
    INFO: {
        GENERATING_REPORT: 'Generating report...',
        LOADING_TEMPLATES: 'Loading templates...',
        SAVING_TEMPLATE: 'Saving template...',
        PREVIEW_NOT_IMPLEMENTED: 'Preview functionality will be implemented'
    },
    WARNINGS: {
        UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
        DELETE_TEMPLATE_CONFIRM: 'Are you sure you want to delete this template?',
        MAX_ELEMENTS_REACHED: 'Maximum number of elements reached for this template'
    }
};

export default REPORT_CONFIG;