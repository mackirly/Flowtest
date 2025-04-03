import { AnalyticsApi } from './api/analytics-api.js';
import { showNotification } from './notifications.js';

const analyticsApi = new AnalyticsApi();
const chartInstances = new Map();

const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 20,
                font: {
                    size: 12
                }
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
                font: {
                    size: 12
                }
            },
            grid: {
                drawBorder: false
            }
        },
        x: {
            ticks: {
                font: {
                    size: 12
                }
            },
            grid: {
                display: false
            }
        }
    },
    layout: {
        padding: {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20
        }
    }
};

function destroyChart(chartId) {
    const existingChart = chartInstances.get(chartId);
    if (existingChart) {
        existingChart.destroy();
        chartInstances.delete(chartId);
    }
}

export async function initializeCharts(projectId) {
    if (!projectId) {
        showNotification('Не выбран проект', 'warning');
        return;
    }

    try {
        await Promise.all([
            initializeTestsOverTimeChart(projectId),
            initializeResultsDistributionChart(projectId),
            initializePriorityDistributionChart(projectId),
            initializeFlakinessChart(projectId),
            initializeTopContributorsChart(projectId),
            initializeTestCasesCreationChart(projectId)
        ]);
    } catch (error) {
        console.error('Charts initialization error:', error);
        showNotification('Ошибка при инициализации графиков', 'error');
    }
}

async function initializeTestsOverTimeChart(projectId) {
    try {
        const data = await analyticsApi.getTestsOverTime(projectId);
        const canvas = document.getElementById('successRateChart');
        if (!canvas) {
            console.error('Canvas not found for success rate chart');
            return;
        }

        destroyChart('successRateChart');
        const ctx = canvas.getContext('2d');
        
        // Если данных нет, создаем график с нулевыми значениями за последние 7 дней
        const today = new Date();
        const defaultDates = Array.from({length: 7}, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString('ru-RU');
        });

        const chartData = {
            labels: data?.dates?.length ? data.dates : defaultDates,
            datasets: [
                {
                    label: 'Успешные тесты',
                    data: data?.passed?.length ? data.passed : Array(7).fill(0),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Неуспешные тесты',
                    data: data?.failed?.length ? data.failed : Array(7).fill(0),
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                }
            ]
        };

        const chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                ...defaultChartOptions,
                aspectRatio: 2,
                plugins: {
                    ...defaultChartOptions.plugins,
                    title: {
                        display: true,
                        text: 'Динамика успешности тестов',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    }
                }
            }
        });
        chartInstances.set('successRateChart', chart);
    } catch (error) {
        console.error('Tests over time chart error:', error);
    }
}

async function initializeResultsDistributionChart(projectId) {
    try {
        const data = await analyticsApi.getResultsDistribution(projectId);
        console.log('Results distribution data:', data);
        
        const canvas = document.getElementById('resultsChart');
        if (!canvas) {
            console.error('Canvas not found for results chart');
            return;
        }

        destroyChart('resultsChart');
        const ctx = canvas.getContext('2d');
        
        // Если все значения нулевые, установим минимальные значения для отображения
        const hasData = (data?.passed || 0) + (data?.failed || 0) + (data?.skipped || 0) > 0;
        
        const chartData = {
            labels: ['Успешные', 'Неуспешные', 'Пропущенные'],
            datasets: [{
                data: [
                    data?.passed || 0,
                    data?.failed || 0,
                    data?.skipped || 0
                ],
                backgroundColor: [
                    '#10B981',
                    '#EF4444',
                    '#F59E0B'
                ],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4,
                borderRadius: 4
            }]
        };

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: hasData ? '60%' : '0%',
                radius: '90%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const backgroundColor = data.datasets[0].backgroundColor[i];
                                        return {
                                            text: `${label}: ${value}`,
                                            fillStyle: backgroundColor,
                                            strokeStyle: '#fff',
                                            lineWidth: 2,
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: hasData ? 'Распределение результатов' : 'Нет данных о результатах',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    }
                }
            }
        });
        chartInstances.set('resultsChart', chart);
    } catch (error) {
        console.error('Results distribution chart error:', error);
        const canvas = document.getElementById('resultsChart');
        if (canvas) {
            const container = canvas.parentElement;
            if (container) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full">
                        <p class="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Нет данных</p>
                        <p class="text-sm text-gray-400 dark:text-gray-500">Добавьте тесты в проект для отображения статистики</p>
                    </div>
                `;
            }
        }
    }
}

async function initializePriorityDistributionChart(projectId) {
    try {
        const data = await analyticsApi.getPriorityDistribution(projectId);
        const canvas = document.getElementById('priorityChart');
        if (!canvas) {
            console.error('Canvas not found for priority chart');
            return;
        }

        destroyChart('priorityChart');
        const ctx = canvas.getContext('2d');
        
        const chartData = {
            labels: ['Критичный', 'Высокий', 'Средний', 'Низкий'],
            datasets: [{
                label: 'Количество тестов',
                data: [
                    data?.critical || 0,
                    data?.high || 0,
                    data?.medium || 0,
                    data?.low || 0
                ],
                backgroundColor: [
                    '#EF4444',
                    '#F59E0B',
                    '#3B82F6',
                    '#10B981'
                ],
                borderRadius: 8,
                maxBarThickness: 50
            }]
        };

        const chart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                ...defaultChartOptions,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Распределение по приоритетам',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        chartInstances.set('priorityChart', chart);
    } catch (error) {
        console.error('Priority distribution chart error:', error);
    }
}

async function initializeFlakinessChart(projectId) {
    try {
        const rawData = await analyticsApi.getTestFlakiness(projectId);
        const flakinessContainer = document.getElementById('flakinessContainer');
        
        if (!flakinessContainer) {
            console.error('Container not found for flakiness data');
            return;
        }

        // Проверяем наличие данных
        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.error('Invalid flakiness data received:', rawData);
            flakinessContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Нет данных о нестабильных тестах</p>';
            return;
        }

        // Преобразуем данные в нужный формат
        const processedData = rawData.map(test => {
            const failedRuns = test.last_runs.filter(status => status !== 'completed').length;
            const flakinessRate = (failedRuns / test.last_runs.length) * 100;
            return {
                name: test.title,
                changes: test.changes,
                flakinessRate: Math.round(flakinessRate)
            };
        });

        // Сортируем по уровню нестабильности
        processedData.sort((a, b) => b.flakinessRate - a.flakinessRate);

        // Создаем HTML для отображения нестабильных тестов
        const flakinessHTML = processedData.map(test => `
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${test.name}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">(изменений: ${test.changes})</span>
                    </div>
                    <span class="text-sm font-medium text-coral-600">${test.flakinessRate}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div class="bg-coral-600 h-2.5 rounded-full" style="width: ${test.flakinessRate}%"></div>
                </div>
            </div>
        `).join('');

        flakinessContainer.innerHTML = flakinessHTML || '<p class="text-gray-500 dark:text-gray-400">Нет данных о нестабильных тестах</p>';
    } catch (error) {
        console.error('Flakiness chart error:', error);
        const container = document.getElementById('flakinessContainer');
        if (container) {
            container.innerHTML = '<p class="text-red-500">Ошибка при загрузке данных о нестабильных тестах</p>';
        }
    }
}

async function initializeTopContributorsChart(projectId) {
    try {
        const data = await analyticsApi.getTopContributors(projectId);
        console.log('Top contributors data:', data);
        
        const container = document.getElementById('authorStatsContainer');
        
        if (!container) {
            console.error('Container not found for top contributors');
            return;
        }

        // Проверяем наличие данных
        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-6 text-center">
                    <div class="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600">
                        <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                    <p class="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Нет данных о контрибьюторах</p>
                    <p class="text-sm text-gray-400 dark:text-gray-500">Добавьте тесты в проект для отображения статистики</p>
                </div>
            `;
            return;
        }

        // Создаем HTML для отображения топ контрибьюторов
        const contributorsHTML = data.map(contributor => `
            <div class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors duration-200">
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full bg-coral-100 dark:bg-coral-800 flex items-center justify-center">
                            <span class="text-sm font-medium text-coral-600 dark:text-coral-200">${contributor.username.charAt(0).toUpperCase()}</span>
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-200">${contributor.username}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${contributor.test_count} тестов</p>
                    </div>
                </div>
                <div class="text-sm font-medium text-coral-600 dark:text-coral-400">
                    ${contributor.contribution_percentage}%
                </div>
            </div>
        `).join('');

        container.innerHTML = contributorsHTML;
    } catch (error) {
        console.error('Top contributors error:', error);
        const container = document.getElementById('authorStatsContainer');
        if (container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-6 text-center">
                    <div class="w-16 h-16 mb-4 text-red-300 dark:text-red-600">
                        <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Ошибка загрузки данных</p>
                    <p class="text-sm text-gray-400 dark:text-gray-500">Попробуйте обновить страницу</p>
                </div>
            `;
        }
    }
}

async function initializeTestCasesCreationChart(projectId) {
    try {
        const data = await analyticsApi.getTestCasesCreation(projectId);
        const canvas = document.getElementById('creationChart');
        if (!canvas) {
            console.error('Canvas not found for creation chart');
            return;
        }

        destroyChart('creationChart');
        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'Новые тест-кейсы',
                    data: data.counts,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        chartInstances.set('creationChart', chart);
    } catch (error) {
        console.error('Test cases creation chart error:', error);
    }
} 