/**
 * Chart Utilities for FlowTest Reports
 * Provides chart creation and data management utilities
 */

export class ChartUtils {
    constructor() {
        this.defaultColors = {
            primary: '#FF7F50',
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#EF4444',
            info: '#3B82F6',
            secondary: '#6B7280'
        };
        
        this.chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        boxWidth: 6
                    }
                }
            }
        };
    }

    /**
     * Create a pie/doughnut chart for test result distribution
     */
    createTestSummaryChart(ctx, data = null) {
        const chartData = data || {
            passed: 65,
            failed: 25,
            skipped: 10
        };

        const total = chartData.passed + chartData.failed + chartData.skipped;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{
                    data: [chartData.passed, chartData.failed, chartData.skipped],
                    backgroundColor: [
                        this.defaultColors.success,
                        this.defaultColors.danger,
                        this.defaultColors.warning
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 8,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                ...this.chartDefaults,
                cutout: '60%',
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        position: 'bottom',
                        labels: {
                            ...this.chartDefaults.plugins.legend.labels,
                            padding: 15,
                            fontSize: 12,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = Math.round((value / total) * 100);
                                    return {
                                        text: `${label}: ${value} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: (context) => {
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${context.label}: ${context.raw} tests (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    /**
     * Create a line chart for trends over time
     */
    createTrendChart(ctx, data = null, options = {}) {
        const chartData = data || this.generateMockTrendData();
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: options.label || 'Success Rate',
                    data: chartData.values,
                    borderColor: options.color || this.defaultColors.primary,
                    backgroundColor: `${options.color || this.defaultColors.primary}15`,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: options.color || this.defaultColors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: options.color || this.defaultColors.primary,
                    pointHoverBorderWidth: 3,
                    borderWidth: 3
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0,0,0,0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            fontSize: 11,
                            color: '#6B7280',
                            padding: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: options.max || 100,
                        ticks: {
                            fontSize: 11,
                            color: '#6B7280',
                            padding: 10,
                            callback: function(value) {
                                return value + (options.unit || '%');
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)',
                            drawBorder: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: options.color || this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (context) => {
                                return `${context[0].label}`;
                            },
                            label: (context) => {
                                return `${options.label || 'Value'}: ${context.raw}${options.unit || '%'}`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    /**
     * Create a bar chart for categorical data
     */
    createBarChart(ctx, data = null, options = {}) {
        const chartData = data || this.generateMockBarData();
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: options.label || 'Coverage',
                    data: chartData.values,
                    backgroundColor: options.color || this.defaultColors.primary,
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            fontSize: 11
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: options.max || 100,
                        ticks: {
                            fontSize: 11,
                            callback: function(value) {
                                return value + (options.unit || '%');
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: options.color || this.defaultColors.primary,
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Create a horizontal bar chart for performance metrics
     */
    createHorizontalBarChart(ctx, data = null, options = {}) {
        const chartData = data || this.generateMockPerformanceData();
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: options.label || 'Execution Time',
                    data: chartData.values,
                    backgroundColor: chartData.values.map(value => 
                        value > 5000 ? this.defaultColors.danger :
                        value > 2000 ? this.defaultColors.warning :
                        this.defaultColors.success
                    ),
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                ...this.chartDefaults,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            fontSize: 11,
                            callback: function(value) {
                                return value + 'ms';
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            fontSize: 11
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${context.raw}ms`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create a radar chart for multi-dimensional metrics
     */
    createRadarChart(ctx, data = null, options = {}) {
        const chartData = data || this.generateMockRadarData();
        
        return new Chart(ctx, {
            type: 'radar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: options.label || 'Quality Metrics',
                    data: chartData.values,
                    borderColor: options.color || this.defaultColors.primary,
                    backgroundColor: `${options.color || this.defaultColors.primary}20`,
                    pointBackgroundColor: options.color || this.defaultColors.primary,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: options.color || this.defaultColors.primary,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            display: false
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    /**
     * Generate mock data for trend charts
     */
    generateMockTrendData(points = 12) {
        const labels = [];
        const values = [];
        const now = new Date();
        
        for (let i = points - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            
            // Generate realistic trending data with seasonal patterns
            const baseValue = 82;
            const seasonalFactor = Math.sin((points - i) * 0.5) * 3;
            const trend = (points - i) * 0.3; // Gradual improvement
            const randomNoise = (Math.random() - 0.5) * 6;
            const value = baseValue + seasonalFactor + trend + randomNoise;
            
            values.push(Math.max(65, Math.min(98, Math.round(value * 10) / 10)));
        }
        
        return { labels, values };
    }

    /**
     * Generate mock data for bar charts
     */
    generateMockBarData() {
        const categories = [
            'Authentication', 'User Management', 'API Gateway', 
            'Database Layer', 'UI Components', 'Integration'
        ];
        
        // Generate realistic coverage percentages with some variation
        const values = categories.map((_, index) => {
            const baseValue = 75 + (index * 3); // Slight variation between categories
            const variation = (Math.random() - 0.5) * 15;
            return Math.max(60, Math.min(98, Math.round(baseValue + variation)));
        });
        
        return {
            labels: categories,
            values: values
        };
    }

    /**
     * Generate mock performance data
     */
    generateMockPerformanceData() {
        const tests = [
            'Login Workflow', 'Search Functionality', 'Checkout Process', 
            'Profile Management', 'Data Export', 'Report Generation'
        ];
        
        // Generate realistic execution times (in milliseconds)
        const values = tests.map((_, index) => {
            const baseTime = 800 + (index * 400); // Different base times
            const variation = (Math.random() - 0.5) * 600;
            return Math.max(200, Math.round(baseTime + variation));
        });
        
        return {
            labels: tests,
            values: values
        };
    }

    /**
     * Generate mock radar chart data
     */
    generateMockRadarData() {
        const dimensions = [
            'Performance', 'Reliability', 'Security', 
            'Usability', 'Maintainability', 'Scalability'
        ];
        
        // Generate realistic quality scores with some interdependencies
        const baseScores = [88, 92, 85, 79, 83, 87];
        const values = baseScores.map(base => {
            const variation = (Math.random() - 0.5) * 8;
            return Math.max(70, Math.min(95, Math.round(base + variation)));
        });
        
        return {
            labels: dimensions,
            values: values
        };
    }

    /**
     * Update chart data dynamically
     */
    updateChart(chart, newData) {
        if (!chart || !newData) return;
        
        chart.data.datasets[0].data = newData.values;
        if (newData.labels) {
            chart.data.labels = newData.labels;
        }
        chart.update('active');
    }

    /**
     * Destroy chart instance properly
     */
    destroyChart(chart) {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    }

    /**
     * Get chart configuration for metric type
     */
    getChartConfig(metricType) {
        const configs = {
            'test-summary': {
                type: 'doughnut',
                createFunction: 'createTestSummaryChart'
            },
            'execution-trend': {
                type: 'line',
                createFunction: 'createTrendChart',
                options: { label: 'Success Rate', unit: '%' }
            },
            'test-duration': {
                type: 'bar',
                createFunction: 'createBarChart',
                options: { label: 'Duration', unit: 's', max: 60 }
            },
            'feature-coverage': {
                type: 'bar',
                createFunction: 'createBarChart',
                options: { label: 'Coverage', unit: '%' }
            },
            'requirement-coverage': {
                type: 'bar',
                createFunction: 'createBarChart',
                options: { label: 'Coverage', unit: '%' }
            },
            'performance-trend': {
                type: 'line',
                createFunction: 'createTrendChart',
                options: { label: 'Response Time', unit: 'ms', max: 5000, color: '#8B5CF6' }
            },
            'bottlenecks': {
                type: 'horizontalBar',
                createFunction: 'createHorizontalBarChart',
                options: { label: 'Execution Time' }
            },
            'defect-density': {
                type: 'bar',
                createFunction: 'createBarChart',
                options: { label: 'Defects', unit: '', max: 50, color: '#EF4444' }
            },
            'quality-trend': {
                type: 'radar',
                createFunction: 'createRadarChart',
                options: { label: 'Quality Score' }
            }
        };

        return configs[metricType] || configs['test-summary'];
    }

    /**
     * Apply dark mode theme to chart
     */
    applyDarkTheme(chartOptions) {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (!isDark) return chartOptions;

        // Update colors for dark mode
        if (chartOptions.scales) {
            Object.keys(chartOptions.scales).forEach(scaleKey => {
                const scale = chartOptions.scales[scaleKey];
                if (scale.ticks) {
                    scale.ticks.color = '#9CA3AF';
                }
                if (scale.grid) {
                    scale.grid.color = 'rgba(255,255,255,0.1)';
                }
            });
        }

        if (chartOptions.plugins && chartOptions.plugins.legend) {
            chartOptions.plugins.legend.labels.color = '#E5E7EB';
        }

        return chartOptions;
    }
}

export default ChartUtils;