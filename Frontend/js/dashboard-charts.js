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
    console.log(`Destroying chart ${chartId}`);
    const existingChart = chartInstances.get(chartId);
    if (existingChart) {
        try {
            existingChart.destroy();
            chartInstances.delete(chartId);
            console.log(`Chart ${chartId} destroyed successfully`);
        } catch (error) {
            console.error(`Error destroying chart ${chartId}:`, error);
            // В случае ошибки все равно удаляем из Map
            chartInstances.delete(chartId);
        }
    }
    
    // Очищаем canvas
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

/**
 * Полностью скрывает график и показывает сообщение об отсутствии данных
 * @param {string} canvasId - ID элемента canvas
 * @param {boolean} show - Показывать (true) или скрывать (false) оверлей
 * @param {string} message - Текст сообщения для оверлея
 */
function handleNoDataOverlay(canvasId, show, message = t('noData')) {
    console.log(`handleNoDataOverlay for ${canvasId}, show=${show}, message=${message}`);
    
    // Пробуем найти контейнер разными способами
    let container = document.getElementById(`${canvasId}Container`);
    if (!container) {
        // Если контейнер не найден по ID, ищем canvas и берем его родителя
        const canvas = document.getElementById(canvasId);
        if (canvas && canvas.parentElement) {
            container = canvas.parentElement;
            // Добавляем ID контейнеру, если его нет
            if (!container.id) {
                container.id = `${canvasId}Container`;
            }
        }
    }

    if (!container) {
        console.error(`Container not found for canvas ${canvasId}`);
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with ID ${canvasId} not found`);
        return;
    }

    // Уничтожаем существующий график
    destroyChart(canvasId);

    let overlay = container.querySelector('.no-data-overlay');
    
    if (show) {
        // Показываем оверлей
        console.log(`Showing no-data overlay for ${canvasId}`);
        canvas.style.display = 'none';

        if (overlay) {
            // Обновляем существующий оверлей
            const messageEl = overlay.querySelector('.no-data-message');
            const subtitleEl = overlay.querySelector('.no-data-subtitle');
            if (messageEl) messageEl.textContent = message;
            if (subtitleEl) subtitleEl.textContent = 'Добавьте данные для отображения графика';
        } else {
            // Создаем новый оверлей
            overlay = document.createElement('div');
            overlay.className = 'no-data-overlay flex flex-col items-center justify-center h-full w-full py-10';
            overlay.innerHTML = `
                <div class="text-gray-400 dark:text-gray-500 mb-3">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <p class="text-lg font-semibold text-gray-700 dark:text-gray-200 no-data-message">${message}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 no-data-subtitle">Добавьте данные для отображения графика</p>
            `;
            container.appendChild(overlay);
        }
    } else {
        // Скрываем оверлей
        console.log(`Hiding no-data overlay for ${canvasId}`);
        if (overlay) {
            overlay.remove();
        }
        canvas.style.display = '';
    }
}

// Функция для проверки и создания недостающих элементов
function ensureChartElements() {
    const chartContainers = [
        { id: 'successRateChart', container: 'successRateChartContainer' },
        { id: 'resultsChart', container: 'resultsChartContainer' },
        { id: 'creationChart', container: 'creationChartContainer' },
        { id: 'priorityChart', container: 'priorityChartContainer' }
    ];
    
    chartContainers.forEach(item => {
        const canvasElement = document.getElementById(item.id);
        const containerElement = document.getElementById(item.container);
        
        // Если нет контейнера, получаем родительский элемент canvas
        if (!containerElement && canvasElement && canvasElement.parentElement) {
            // Добавляем ID контейнеру
            canvasElement.parentElement.id = item.container;
            console.log(`Added ID ${item.container} to parent of ${item.id}`);
        }
        
        // Если нет canvas или он не в контейнере, создаем его
        if (!canvasElement && containerElement) {
            const newCanvas = document.createElement('canvas');
            newCanvas.id = item.id;
            containerElement.innerHTML = '';
            containerElement.appendChild(newCanvas);
            console.log(`Created canvas ${item.id} in container ${item.container}`);
        }
        
        // Проверяем, что контейнер имеет класс chart-container
        if (containerElement && !containerElement.classList.contains('chart-container')) {
            containerElement.classList.add('chart-container');
            console.log(`Added chart-container class to ${item.container}`);
        }
    });
}

// Добавляем опциональный параметр defaultMessage
export async function initializeCharts(projectId, defaultMessage = t('noData')) {
    console.log(`Initializing charts for projectId=${projectId}, defaultMessage=${defaultMessage}`);
    
    // Сначала проверяем и подготавливаем DOM-элементы
    ensureChartElements();
    
    // Если проект имеет значение null или undefined, значит нет выбранного проекта
    const noProjectSelected = projectId === null || projectId === undefined;
    
    // Инициализируем конфигурацию графиков
    const chartsConfig = [
        { id: 'testsOverTimeChart', initFunction: initializeTestsOverTimeChart },
        { id: 'resultsDistributionChart', initFunction: initializeResultsDistributionChart },
        { id: 'priorityChart', initFunction: initializePriorityDistributionChart },
        { id: 'creationChart', initFunction: initializeTestCasesCreationChart }
    ];
    
    // Если проект не выбран или нет проектов, показываем заглушки
    if (noProjectSelected) {
        console.log(`Проект не выбран или сброс состояния. Показываем заглушки: "${defaultMessage}"`);
        
        chartsConfig.forEach(chart => {
            handleNoDataOverlay(chart.id, true, defaultMessage);
        });
        
        // Обрабатываем нестандартные контейнеры (flakiness, contributors)
        const flakinessContainer = document.getElementById('flakinessContainer');
        if (flakinessContainer) {
            // Проверяем, сохранено ли состояние скрытия
            if (localStorage.getItem('hiddenFlakinessPlaceholder') === 'true') {
                flakinessContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
            } else {
                flakinessContainer.innerHTML = createPlaceholderHTML(defaultMessage, 'Для просмотра нестабильных тестов', true);
                // Добавляем обработчик для кнопки закрытия
                const closeBtn = flakinessContainer.querySelector('.placeholder-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        flakinessContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
                        localStorage.setItem('hiddenFlakinessPlaceholder', 'true');
                    });
                }
            }
        }
        
        const authorStatsContainer = document.getElementById('authorStatsContainer');
        if (authorStatsContainer) {
            // Проверяем, сохранено ли состояние скрытия
            if (localStorage.getItem('hiddenContributorsPlaceholder') === 'true') {
                authorStatsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
            } else {
                authorStatsContainer.innerHTML = createPlaceholderHTML(defaultMessage, 'Для просмотра контрибьюторов', true);
                // Добавляем обработчик для кнопки закрытия
                const closeBtn = authorStatsContainer.querySelector('.placeholder-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        authorStatsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
                        localStorage.setItem('hiddenContributorsPlaceholder', 'true');
                    });
                }
            }
        }
        
        return;
    }

    // Если проект выбран, загружаем данные для каждого графика
    try {
        // Определяем функции инициализации для каждого графика
        const chartInitializers = {
            'successRateChart': initializeTestsOverTimeChart,
            'resultsChart': initializeResultsDistributionChart,
            'creationChart': initializeTestCasesCreationChart,
            'priorityChart': initializePriorityDistributionChart
        };

        // Запускаем инициализацию стандартных графиков параллельно
        const chartPromises = chartsConfig.map(chart => {
            const initializer = chartInitializers[chart.id];
            if (initializer) {
                return initializer(projectId, chart.noDataMessage);
            }
            return Promise.resolve();
        });

        // Запускаем инициализацию нестандартных блоков
        const otherPromises = [
            initializeFlakinessChart(projectId, 'Нет данных о нестабильных тестах'),
            initializeTopContributorsChart(projectId, 'Нет данных о контрибьюторах')
        ];

        // Ожидаем завершения всех инициализаций
        await Promise.all([...chartPromises, ...otherPromises]);

    } catch (error) {
        console.error('Charts initialization error:', error);
        showNotification('Ошибка при инициализации графиков', 'error');
        
        // В случае глобальной ошибки показываем заглушки "Ошибка загрузки"
        chartsConfig.forEach(chart => {
            handleNoDataOverlay(chart.id, true, 'Ошибка загрузки данных');
        });
        
        // Также сбрасываем нестандартные блоки
        initializeFlakinessChart(null, 'Ошибка загрузки данных');
        initializeTopContributorsChart(null, 'Ошибка загрузки данных');
    }
}

// Изменяем функции инициализации, чтобы они принимали noDataMessage
async function initializeTestsOverTimeChart(projectId, noDataMessage) {
    console.log(`Initializing tests over time chart with projectId=${projectId}`);
    const chartId = 'successRateChart';
    destroyChart(chartId); // Удаляем старый график
    
    let data;
    try {
        data = await analyticsApi.getTestsOverTime(projectId);
        console.log('Tests over time data:', data);
    } catch (e) {
        console.error('Error fetching tests over time:', e);
        handleNoDataOverlay(chartId, true, 'Ошибка загрузки данных');
        return;
    }
    
    const hasPassed = Array.isArray(data?.passed) && data.passed.some(v => v > 0);
    const hasFailed = Array.isArray(data?.failed) && data.failed.some(v => v > 0);
    const hasDates = Array.isArray(data?.dates) && data.dates.length > 0;
    const noData = !data || !hasDates || (!hasPassed && !hasFailed);
    
    handleNoDataOverlay(chartId, noData, noDataMessage); // Используем переданное сообщение
    if (noData) return;

    try {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`Canvas not found for ${chartId}`);
            return;
        }
        const ctx = canvas.getContext('2d');
        
        const chartData = {
            labels: data.dates, // Используем реальные даты
            datasets: [
                {
                    label: 'Успешные тесты',
                    data: data.passed,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Неуспешные тесты',
                    data: data.failed,
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
            options: { /* ... options ... */ } // Опции оставлены для краткости
        });
        chartInstances.set(chartId, chart);
    } catch (error) {
        console.error(`${chartId} chart error:`, error);
        handleNoDataOverlay(chartId, true, 'Ошибка при создании графика');
    }
}

async function initializeResultsDistributionChart(projectId, noDataMessage) {
    console.log(`Initializing results distribution chart with projectId=${projectId}`);
    const chartId = 'resultsChart';
    destroyChart(chartId);
    
    let data;
    try {
        data = await analyticsApi.getResultsDistribution(projectId);
        console.log('Results distribution data:', data);
    } catch (e) {
        console.error('Error fetching results distribution:', e);
        handleNoDataOverlay(chartId, true, 'Ошибка загрузки данных');
        return;
    }
    
    const passed = parseInt(data?.passed) || 0;
    const failed = parseInt(data?.failed) || 0;
    const skipped = parseInt(data?.skipped) || 0;
    const sum = passed + failed + skipped;
    const noData = !data || sum === 0;
    
    handleNoDataOverlay(chartId, noData, noDataMessage);
    if (noData) return;

    try {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`Canvas not found for ${chartId}`);
            return;
        }
        const ctx = canvas.getContext('2d');
        
        const chartData = {
            labels: ['Успешные', 'Неуспешные', 'Пропущенные'],
            datasets: [{
                data: [passed, failed, skipped],
                backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
                borderWidth: 2,
                borderColor: '#ffffff', // Цвет фона body
                hoverOffset: 4,
                borderRadius: 4
            }]
        };

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: { /* ... options ... */ } // Опции оставлены для краткости
        });
        chartInstances.set(chartId, chart);
    } catch (error) {
        console.error(`${chartId} chart error:`, error);
        handleNoDataOverlay(chartId, true, 'Ошибка при создании графика');
    }
}

async function initializePriorityDistributionChart(projectId, noDataMessage) {
    console.log(`Initializing priority distribution chart with projectId=${projectId}`);
    const chartId = 'priorityChart';
    destroyChart(chartId);
    
    let data;
    try {
        data = await analyticsApi.getPriorityDistribution(projectId);
        console.log('Priority distribution data:', data);
    } catch (e) {
        console.error('Error fetching priority distribution:', e);
        handleNoDataOverlay(chartId, true, 'Ошибка загрузки данных');
        return;
    }
    
    const critical = parseInt(data?.critical) || 0;
    const high = parseInt(data?.high) || 0;
    const medium = parseInt(data?.medium) || 0;
    const low = parseInt(data?.low) || 0;
    const sum = critical + high + medium + low;
    const noData = !data || sum === 0;
    
    handleNoDataOverlay(chartId, noData, noDataMessage);
    if (noData) return;
    
    try {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`Canvas not found for ${chartId}`);
            return;
        }
        const ctx = canvas.getContext('2d');
        
        const chartData = {
            labels: ['Критичный', 'Высокий', 'Средний', 'Низкий'],
            datasets: [{
                label: 'Количество тестов',
                data: [critical, high, medium, low],
                backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'],
                borderRadius: 8,
                maxBarThickness: 50
            }]
        };

        const chart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: { /* ... options ... */ } // Опции оставлены для краткости
        });
        chartInstances.set(chartId, chart);
    } catch (error) {
        console.error(`${chartId} chart error:`, error);
        handleNoDataOverlay(chartId, true, 'Ошибка при создании графика');
    }
}

// Изменяем нестандартные функции, чтобы они тоже принимали noDataMessage
async function initializeFlakinessChart(projectId, noDataMessage) {
    const container = document.getElementById('flakinessContainer');
    if (!container) {
        console.error('Container not found for flakiness data');
        return;
    }
    
    // Если projectId null (вызвано для сброса), показываем заглушку
    if (!projectId) {
        container.innerHTML = createPlaceholderHTML(noDataMessage, 'Для просмотра нестабильных тестов', true);
        // Добавляем обработчик для кнопки закрытия
        const closeBtn = container.querySelector('.placeholder-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Заменяем плейсхолдер на пустой контейнер
                container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
                // Сохраняем состояние в localStorage
                localStorage.setItem('hiddenFlakinessPlaceholder', 'true');
            });
        }
        return;
    }
    
    // Проверяем, скрыт ли плейсхолдер в localStorage
    if (localStorage.getItem('hiddenFlakinessPlaceholder') === 'true') {
        container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
        return;
    }

    let data;
    try {
        data = await analyticsApi.getTestFlakiness(projectId);
    } catch (e) {
        console.error('Error fetching test flakiness:', e);
        container.innerHTML = createPlaceholderHTML('Ошибка загрузки данных', 'Попробуйте обновить страницу', true);
        return;
    }
    
    const noData = !data || !Array.isArray(data) || data.length === 0;
    
    if (noData) {
        if (localStorage.getItem('hiddenFlakinessPlaceholder') === 'true') {
            container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
        } else {
            container.innerHTML = createPlaceholderHTML(noDataMessage, 'Запустите несколько тестов для получения статистики', true);
            // Добавляем обработчик для кнопки закрытия
            const closeBtn = container.querySelector('.placeholder-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    // Заменяем плейсхолдер на пустой контейнер
                    container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
                    // Сохраняем состояние в localStorage
                    localStorage.setItem('hiddenFlakinessPlaceholder', 'true');
                });
            }
        }
        return;
    }
    
    try {
        // Сбрасываем флаг скрытия, если у нас есть данные для отображения
        localStorage.removeItem('hiddenFlakinessPlaceholder');
        
        const processedData = data.map(test => {
            const testName = test.name || 'Unknown Test';
            const passCount = test.pass_count || 0;
            const failCount = test.fail_count || 0;
            const totalCount = passCount + failCount;
            const flakinessRate = totalCount > 0 ? (failCount / totalCount) * 100 : 0;
            
            return {
                testName,
                passCount,
                failCount,
                totalCount,
                flakinessRate: Number(flakinessRate.toFixed(2))
            };
        });
        
        // Сортируем по степени нестабильности (от наиболее к наименее нестабильным)
        processedData.sort((a, b) => b.flakinessRate - a.flakinessRate);
        
        // Генерируем HTML
        const flakinessHTML = processedData.map(test => {
            return `
                <div class="mb-4 p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium text-gray-700 dark:text-gray-300">${test.testName}</span>
                        <span class="text-sm font-bold ${test.flakinessRate > 50 ? 'text-red-500' : 'text-yellow-500'}">${test.flakinessRate}%</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div class="h-2 rounded-full ${test.flakinessRate > 50 ? 'bg-red-500' : 'bg-yellow-500'}" style="width: ${test.flakinessRate}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Успешно: ${test.passCount} / ${test.totalCount}</span>
                        <span>Не пройдено: ${test.failCount} / ${test.totalCount}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = flakinessHTML;
    } catch (error) {
        console.error('Flakiness chart error:', error);
        container.innerHTML = createPlaceholderHTML('Ошибка обработки данных', 'Попробуйте обновить страницу', true);
    }
}

async function initializeTopContributorsChart(projectId, noDataMessage) {
    const container = document.getElementById('authorStatsContainer');
    if (!container) {
        console.error('Container not found for top contributors');
        return;
    }

    if (!projectId) {
        container.innerHTML = createPlaceholderHTML(noDataMessage, 'Для просмотра контрибьюторов', true);
        // Добавляем обработчик для кнопки закрытия
        const closeBtn = container.querySelector('.placeholder-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Заменяем плейсхолдер на пустой контейнер
                container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
                // Сохраняем состояние в localStorage
                localStorage.setItem('hiddenContributorsPlaceholder', 'true');
            });
        }
        return;
    }
    
    // Проверяем, скрыт ли плейсхолдер в localStorage
    if (localStorage.getItem('hiddenContributorsPlaceholder') === 'true' && (!projectId || !Array.isArray(data) || data.length === 0)) {
        container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
        return;
    }
    
    let data;
    try {
        data = await analyticsApi.getTopContributors(projectId);
    } catch (e) {
        console.error('Error fetching top contributors:', e);
        container.innerHTML = createPlaceholderHTML('Ошибка загрузки данных', 'Попробуйте обновить страницу', true);
        return;
    }
    
    const noData = !data || !Array.isArray(data) || data.length === 0;
    
    if (noData) {
        if (localStorage.getItem('hiddenContributorsPlaceholder') === 'true') {
            container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
        } else {
            container.innerHTML = createPlaceholderHTML(noDataMessage, 'Добавьте тесты в проект для отображения статистики', true);
            // Добавляем обработчик для кнопки закрытия
            const closeBtn = container.querySelector('.placeholder-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    // Заменяем плейсхолдер на пустой контейнер
                    container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Информация скрыта</div>';
                    // Сохраняем состояние в localStorage
                    localStorage.setItem('hiddenContributorsPlaceholder', 'true');
                });
            }
        }
        return;
    }
    
    try {
        // Сбрасываем флаг скрытия, если у нас есть данные для отображения
        localStorage.removeItem('hiddenContributorsPlaceholder');
        
        // Генерируем HTML с данными
        const contributorsHTML = data.map(contributor => {
            const authorName = contributor.author || 'Unknown';
            const testCount = contributor.count || 0;
            const testsWord = testCount === 1 ? 'тест' : 'тестов';
            
            return `
                <div class="flex justify-between items-center mb-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${authorName}</span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">${testCount} ${testsWord}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = contributorsHTML;
    } catch (error) {
        console.error('Top contributors error:', error);
        container.innerHTML = createPlaceholderHTML('Ошибка обработки данных', 'Попробуйте обновить страницу', true);
    }
}

async function initializeTestCasesCreationChart(projectId, noDataMessage) {
    console.log(`Initializing test cases creation chart with projectId=${projectId}`);
    const chartId = 'creationChart';
    destroyChart(chartId);
    
    let data;
    try {
        data = await analyticsApi.getTestCasesCreation(projectId);
        console.log('Test cases creation data:', data);
    } catch (e) {
        console.error('Error fetching test cases creation:', e);
        handleNoDataOverlay(chartId, true, 'Ошибка загрузки данных');
        return;
    }
    
    const hasDates = Array.isArray(data?.dates) && data.dates.length > 0;
    const hasCounts = Array.isArray(data?.counts) && data.counts.some(v => v > 0);
    const noData = !data || !hasDates || !hasCounts;
    
    handleNoDataOverlay(chartId, noData, noDataMessage);
    if (noData) return;
    
    try {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`Canvas not found for ${chartId}`);
            return;
        }
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
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }]
            },
            options: { /* ... options ... */ } // Опции оставлены для краткости
        });
        chartInstances.set(chartId, chart);
    } catch (error) {
        console.error(`${chartId} chart error:`, error);
        handleNoDataOverlay(chartId, true, 'Ошибка при создании графика');
    }
}

// Вспомогательная функция для создания HTML заглушки для нестандартных блоков
function createPlaceholderHTML(title, subtitle, addCloseButton = false) {
    return `
        <div class="flex flex-col items-center justify-center h-full w-full py-10 no-data-overlay relative">
            ${addCloseButton ? `
                <button class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 placeholder-close-btn" aria-label="Close">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            ` : ''}
            <div class="text-gray-400 dark:text-gray-500 mb-3">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <p class="text-lg font-semibold text-gray-700 dark:text-gray-200">${title}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${subtitle}</p>
        </div>
    `;
}
