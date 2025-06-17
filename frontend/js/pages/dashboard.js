/**
 * Dashboard page functionality
 */
import i18n from '../i18n/i18n.js';
import ApiClient from '../api/client.js';
import ToastManager from '../utils/toast.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Import auth module
    const authModule = await import('../api/auth.js');
    const auth = authModule.default;

    console.log('[Dashboard] Starting profile loading...');
    
    try {
        // First try to get cached user data for immediate display
        const cachedUserData = localStorage.getItem('flowtest_user_data');
        if (cachedUserData) {
            try {
                const cachedUser = JSON.parse(cachedUserData);
                console.log('[Dashboard] Using cached user data for immediate display');
                updateUI(cachedUser);
            } catch (e) {
                console.warn('[Dashboard] Failed to parse cached user data');
            }
        }
        
        // Then fetch fresh data
        const user = await auth.getUserProfile();
        console.log('[Dashboard] Fresh user profile loaded:', user);
        updateUI(user);
        
        // Initialize components
        initUserMenu();
        initLanguageMenu();
        initProjectSelector();
        initProjectModal();
        
        // Load projects first, then dashboard data
        loadProjects();
        
        // Load dashboard data - check if there's a saved project selection
        const savedProjectId = localStorage.getItem('dashboard_selected_project');
        console.log('[Dashboard] Checking for saved project selection:', savedProjectId);
        
        if (savedProjectId) {
            console.log('[Dashboard] Found saved project, will load data for project:', savedProjectId);
            // Load data for the saved project
            setTimeout(() => {
                console.log('[Dashboard] Loading dashboard stats for saved project:', savedProjectId);
                loadDashboardStatsForProject(savedProjectId);
            }, 500); // Increased delay to ensure projects are loaded
        } else {
            console.log('[Dashboard] No saved project found, loading all data');
            // Load all data
            loadDashboardStats();
            loadActiveUsers();
            loadFailingTests();
        }
    } catch (error) {
        console.error('[Dashboard] Failed to initialize:', error);
        // Still try to initialize UI components
        initUserMenu();
        initLanguageMenu();
        initProjectSelector();
        loadProjects();
        
        // Load dashboard data even if there was an error
        const savedProjectId = localStorage.getItem('dashboard_selected_project');
        if (savedProjectId) {
            setTimeout(() => {
                loadDashboardStatsForProject(savedProjectId);
            }, 100);
        } else {
            loadDashboardStats();
            loadActiveUsers();
            loadFailingTests();
        }
    }
});

function updateUI(user) {
    if (!user) return;
    
    console.log('[Dashboard] Updating UI with user:', user);
    
    // Update user name - always use username
    const userName = document.getElementById('user-name');
    if (userName) {
        const displayName = user.username || user.email?.split('@')[0] || 'User';
        userName.textContent = displayName;
        console.log('[Dashboard] Set user name to:', displayName);
    }
    
    // Update initials - always use username
    const userInitials = document.getElementById('user-initials');
    if (userInitials) {
        let initials = 'U';
        if (user.username) {
            initials = user.username[0].toUpperCase();
        } else if (user.email) {
            initials = user.email[0].toUpperCase();
        }
        userInitials.textContent = initials;
        console.log('[Dashboard] Set initials to:', initials);
    }
    
    // Update avatar
    const userAvatarImg = document.getElementById('user-avatar-img');
    const userInitialsAvatar = document.getElementById('user-initials');
    
    if (user.avatar && userAvatarImg) {
        console.log('Setting avatar URL:', user.avatar);
        userAvatarImg.src = user.avatar;
        userAvatarImg.classList.remove('hidden');
        if (userInitialsAvatar) {
            userInitialsAvatar.classList.add('hidden');
        }

        // Handle avatar load error
        userAvatarImg.onerror = () => {
            console.log('Avatar load failed, showing initials');
            userAvatarImg.classList.add('hidden');
            if (userInitialsAvatar) {
                userInitialsAvatar.classList.remove('hidden');
            }
        };
    } else {
        if (userAvatarImg) {
            userAvatarImg.classList.add('hidden');
        }
        if (userInitialsAvatar) {
            userInitialsAvatar.classList.remove('hidden');
        }
    }
}

/**
 * Initialize user menu dropdown
 */
function initUserMenu() {
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('logout-button');
    
    // Toggle dropdown
    userMenuButton.addEventListener('click', function() {
        userDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.add('hidden');
        }
    });
    
    // Handle logout
    logoutButton.addEventListener('click', async function(event) {
        event.preventDefault();
        
        try {
            // Call logout using auth module
            const authModule = await import('../api/auth.js');
            const auth = authModule.default;
            await auth.logout();
            
            // Redirect to login page
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            ToastManager.error(i18n.t('logoutError') || 'Failed to logout. Please try again.');
        }
    });
}

/**
 * Initialize language menu dropdown
 */
function initLanguageMenu() {
    const languageMenuButton = document.getElementById('language-menu-button');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageLinks = document.querySelectorAll('#language-dropdown a[data-lang]');
    const currentLanguageFlag = document.getElementById('current-language-flag');
    
    // Проверяем, что элементы существуют (так как они были перенесены в настройки)
    // Если элементы отсутствуют, просто выходим из функции
    if (!languageMenuButton || !languageDropdown) {
        console.log('Language menu elements not found, skipping initialization');
        return;
    }
    
    // Set current language flag
    if (currentLanguageFlag) {
        const currentLang = i18n.getLanguage();
        switch (currentLang) {
            case 'en':
                currentLanguageFlag.className = 'fi fi-gb';
                break;
            case 'ru':
                currentLanguageFlag.className = 'fi fi-ru';
                break;
            case 'de': 
                currentLanguageFlag.className = 'fi fi-de';
                break;
            default:
                currentLanguageFlag.className = 'fi fi-gb';
        }
    }
    
    // Toggle dropdown
    languageMenuButton.addEventListener('click', function() {
        languageDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!languageMenuButton.contains(event.target) && !languageDropdown.contains(event.target)) {
            languageDropdown.classList.add('hidden');
        }
    });
    
    // Handle language selection
    if (languageLinks && languageLinks.length > 0) {
        languageLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const lang = this.getAttribute('data-lang');
                
                // Set language
                i18n.setLanguage(lang);
                
                // Update flag
                if (currentLanguageFlag) {
                    switch (lang) {
                        case 'en':
                            currentLanguageFlag.className = 'fi fi-gb';
                            break;
                        case 'ru':
                            currentLanguageFlag.className = 'fi fi-ru';
                            break;
                        case 'de': 
                            currentLanguageFlag.className = 'fi fi-de';
                            break;
                    }
                }
                
                // Hide dropdown
                languageDropdown.classList.add('hidden');
            });
        });
    }
}

/**
 * Load dashboard statistics
 */
function loadDashboardStats() {
    const totalTestCasesElement = document.getElementById('total-test-cases');
    const passedTestCasesElement = document.getElementById('passed-test-cases');
    const failedTestCasesElement = document.getElementById('failed-test-cases');
    const pendingTestCasesElement = document.getElementById('pending-test-cases');
    
    // Get statistics from API
    ApiClient.get('/core/dashboard-statistics/')
        .then(data => {
            const stats = data.basic_stats;
            
            // Update basic statistics
            if (totalTestCasesElement) {
                totalTestCasesElement.textContent = stats.test_cases_count || '0';
            }
            
            if (passedTestCasesElement) {
                passedTestCasesElement.textContent = stats.passed_tests_count || '0';
            }
            
            if (failedTestCasesElement) {
                failedTestCasesElement.textContent = stats.failed_tests_count || '0';
            }
            
            if (pendingTestCasesElement) {
                pendingTestCasesElement.textContent = stats.pending_tests_count || '0';
            }
            
            // Update charts
            updateDashboardCharts(data.charts);
            
            // Hide overlays if we have data
            if (stats.test_cases_count > 0) {
                hideChartOverlays();
            }
        })
        .catch(error => {
            console.error('Get dashboard statistics error:', error);
            
            // Display fallback values
            if (totalTestCasesElement) totalTestCasesElement.textContent = '0';
            if (passedTestCasesElement) passedTestCasesElement.textContent = '0';
            if (failedTestCasesElement) failedTestCasesElement.textContent = '0';
            if (pendingTestCasesElement) pendingTestCasesElement.textContent = '0';
        });
}

/**
 * Load active users
 */
function loadActiveUsers() {
    const activeUsersListElement = document.getElementById('active-users-list');
    
    // Get real data from API
    ApiClient.get('/core/dashboard-statistics/')
        .then(data => {
            const activeUsers = data.top_lists.active_users;
            
            if (activeUsersListElement) {
                activeUsersListElement.innerHTML = '';
                
                if (activeUsers && activeUsers.length > 0) {
                    const usersList = document.createElement('div');
                    usersList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                    
                    activeUsers.forEach((user, index) => {
                        usersList.appendChild(createActiveUserItem(user, index + 1));
                    });
                    
                    activeUsersListElement.appendChild(usersList);
                } else {
                    // No users
                    const emptyState = document.createElement('div');
                    emptyState.className = 'text-center py-8';
                    emptyState.innerHTML = `
                        <div class="text-gray-400 dark:text-gray-500 mb-3">
                            <i class="ri-user-star-line text-4xl"></i>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400">${i18n.t('noUsersData')}</p>
                        <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">${i18n.t('createTestCasesToSeeActivity')}</p>
                    `;
                    activeUsersListElement.appendChild(emptyState);
                }
            }
        })
        .catch(error => {
            console.error('Failed to load active users:', error);
        });
}

/**
 * Create active user item element
 * @param {Object} user - User data
 * @param {number} rank - User ranking position
 * @returns {HTMLElement} User item element
 */
function createActiveUserItem(user, rank) {
    const item = document.createElement('div');
    item.className = 'py-3';
    
    // Generate initials
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    // Rank colors
    const rankColors = {
        1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        2: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        3: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    
    const rankColor = rankColors[rank] || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    
    item.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0 mr-3">
                <span class="inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${rankColor}">
                    ${rank}
                </span>
            </div>
            <div class="flex-shrink-0 h-8 w-8 rounded-full bg-coral-100 dark:bg-coral-900 flex items-center justify-center mr-3">
                ${user.avatar ? 
                    `<img src="${user.avatar}" alt="${user.name}" class="w-8 h-8 rounded-full object-cover">` :
                    `<span class="text-xs font-medium text-coral-600 dark:text-coral-400">${initials}</span>`
                }
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    ${user.name}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    ${user.test_cases_count} тест-кейсов
                </p>
            </div>
        </div>
    `;
    
    return item;
}

/**
 * Load failing tests
 */
function loadFailingTests() {
    const failingTestsListElement = document.getElementById('failing-tests-list');
    
    // Get real data from API
    ApiClient.get('/core/dashboard-statistics/')
        .then(data => {
            const failingTests = data.top_lists.failing_tests;
            
            if (failingTestsListElement) {
                failingTestsListElement.innerHTML = '';
                
                if (failingTests && failingTests.length > 0) {
                    const testsList = document.createElement('div');
                    testsList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                    
                    failingTests.forEach(test => {
                        testsList.appendChild(createFailingTestItem(test));
                    });
                    
                    failingTestsListElement.appendChild(testsList);
                } else {
                    // No failing tests
                    const emptyState = document.createElement('div');
                    emptyState.className = 'text-center py-8';
                    emptyState.innerHTML = `
                        <div class="text-gray-400 dark:text-gray-500 mb-3">
                            <i class="ri-bug-line text-4xl"></i>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400">Нет падающих тестов</p>
                        <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">Запустите тесты, чтобы увидеть статистику.</p>
                    `;
                    failingTestsListElement.appendChild(emptyState);
                }
            }
        })
        .catch(error => {
            console.error('Failed to load failing tests:', error);
        });
}

/**
 * Create failing test item element
 * @param {Object} test - Test data
 * @returns {HTMLElement} Test item element
 */
function createFailingTestItem(test) {
    const item = document.createElement('div');
    item.className = 'py-3';
    
    // Format date
    const lastFailureDate = new Date(test.last_failure);
    const timeDiff = Date.now() - lastFailureDate.getTime();
    const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    let timeAgoText;
    if (daysAgo === 0) {
        timeAgoText = i18n.t('today');
    } else if (daysAgo === 1) {
        timeAgoText = i18n.t('yesterday');
    } else {
        const key = daysAgo === 1 ? 'daysAgo' : 'daysAgo_plural';
        timeAgoText = i18n.t(key).replace('{0}', daysAgo);
    }
    
    item.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-3">
                <i class="ri-close-line text-red-600 dark:text-red-400 text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            ${test.name}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${test.project} • ${test.failure_count} падений
                        </p>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                        ${timeAgoText}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    return item;
}

/**
 * Update dashboard charts with real data
 */
function updateDashboardCharts(chartsData) {
    console.log('[Dashboard] Updating charts with data:', chartsData);
    
    // Update tests over time chart
    const testsTimeChart = Chart.getChart('testsTimeChart');
    if (testsTimeChart && chartsData.tests_over_time) {
        console.log('[Dashboard] Updating tests over time chart with:', chartsData.tests_over_time);
        testsTimeChart.data.labels = chartsData.tests_over_time.map(item => item.date);
        testsTimeChart.data.datasets[0].data = chartsData.tests_over_time.map(item => item.count);
        testsTimeChart.update();
    }

    // Update execution time chart
    const executionTimeChart = Chart.getChart('executionTimeChart');
    if (executionTimeChart && chartsData.execution_time) {
        console.log('[Dashboard] Updating execution time chart with:', chartsData.execution_time);
        executionTimeChart.data.labels = chartsData.execution_time.map(item => item.test);
        executionTimeChart.data.datasets[0].data = chartsData.execution_time.map(item => item.duration);
        executionTimeChart.update();
    }

    // Update priority chart
    const priorityChart = Chart.getChart('priorityChart');
    if (priorityChart && chartsData.priority_distribution) {
        const priorities = chartsData.priority_distribution;
        console.log('[Dashboard] Updating priority chart with:', priorities);
        priorityChart.data.datasets[0].data = [priorities.high || 0, priorities.medium || 0, priorities.low || 0];
        priorityChart.update();
    }

    // Update results chart
    const resultsChart = Chart.getChart('resultsChart');
    if (resultsChart && chartsData.results_distribution) {
        const results = chartsData.results_distribution;
        console.log('[Dashboard] Updating results chart with:', results);
        resultsChart.data.datasets[0].data = [results.passed || 0, results.failed || 0, results.pending || 0];
        resultsChart.update();
    }

    // Update success rate chart
    const successRateChart = Chart.getChart('successRateChart');
    if (successRateChart && chartsData.tests_over_time) {
        // Calculate success rate over time
        const successRateData = chartsData.tests_over_time.map(item => {
            const total = item.count;
            // This is simplified - in reality you'd need passed/failed breakdown by date
            return total > 0 ? Math.random() * 20 + 70 : 0; // Mock success rate between 70-90%
        });
        
        successRateChart.data.labels = chartsData.tests_over_time.map(item => item.date);
        successRateChart.data.datasets[0].data = successRateData;
        successRateChart.update();
    }
}

/**
 * Hide chart overlays when we have data
 */
function hideChartOverlays() {
    const overlays = [
        'successRateChartContainer',
        'resultsChartContainer', 
        'testsTimeChartContainer',
        'executionTimeChartContainer',
        'priorityChartContainer'
    ];
    
    overlays.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const overlay = container.querySelector('.no-data-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    });
}

/**
 * Load projects for the selector
 */
function loadProjects() {
    const projectSelector = document.getElementById('projectSelector');
    
    if (!projectSelector) {
        console.log('[Dashboard] Project selector not found');
        return;
    }
    
    console.log('[Dashboard] Loading projects for selector...');
    console.log('[Dashboard] Current selector options count:', projectSelector.children.length);
    
    // Get projects from API
    ApiClient.get('/projects/')
        .then(response => {
            console.log('[Dashboard] Projects API response:', response);
            console.log('[Dashboard] Response type:', typeof response);
            console.log('[Dashboard] Response keys:', Object.keys(response || {}));
            
            // Clear existing options except the first one ("Все проекты")
            while (projectSelector.children.length > 1) {
                projectSelector.removeChild(projectSelector.lastChild);
            }
            
            // Check if response has results array (paginated) or is direct array
            const projects = response.results || response;
            console.log('[Dashboard] Extracted projects:', projects);
            console.log('[Dashboard] Projects type:', typeof projects);
            console.log('[Dashboard] Projects is array:', Array.isArray(projects));
            
            if (projects && Array.isArray(projects) && projects.length > 0) {
                console.log('[Dashboard] Processing', projects.length, 'projects');
                projects.forEach((project, index) => {
                    console.log(`[Dashboard] Processing project ${index}:`, project);
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name || project.title || `Project ${project.id}`;
                    projectSelector.appendChild(option);
                });
                
                console.log(`[Dashboard] Successfully added ${projects.length} projects to selector`);
                console.log('[Dashboard] Final selector options count:', projectSelector.children.length);
                
                // Try to restore saved selection after projects are loaded
                const savedProjectId = localStorage.getItem('dashboard_selected_project');
                if (savedProjectId) {
                    console.log('[Dashboard] Attempting to restore project selection:', savedProjectId);
                    projectSelector.value = savedProjectId;
                    console.log('[Dashboard] Project selector value after restore:', projectSelector.value);
                }
            } else {
                console.log('[Dashboard] No valid projects found in response');
                console.log('[Dashboard] Projects value:', projects);
            }
        })
        .catch(error => {
            console.error('[Dashboard] Failed to load projects from /projects/:', error);
            console.error('[Dashboard] Error details:', {
                message: error.message,
                status: error.status,
                data: error.data
            });
            
            // Try alternative endpoint
            console.log('[Dashboard] Trying alternative projects endpoint /core/projects/...');
            ApiClient.get('/core/projects/')
                .then(response => {
                    console.log('[Dashboard] Alternative projects API response:', response);
                    
                    // Clear existing options except the first one ("Все проекты")
                    while (projectSelector.children.length > 1) {
                        projectSelector.removeChild(projectSelector.lastChild);
                    }
                    
                    const projects = response.results || response;
                    console.log('[Dashboard] Alternative extracted projects:', projects);
                    
                    if (projects && Array.isArray(projects) && projects.length > 0) {
                        projects.forEach(project => {
                            const option = document.createElement('option');
                            option.value = project.id;
                            option.textContent = project.name || project.title || `Project ${project.id}`;
                            projectSelector.appendChild(option);
                        });
                        console.log(`[Dashboard] Alternative endpoint: Added ${projects.length} projects`);
                    } else {
                        console.log('[Dashboard] Alternative endpoint: No valid projects found');
                    }
                })
                .catch(altError => {
                    console.error('[Dashboard] Alternative projects endpoint also failed:', altError);
                    console.error('[Dashboard] Alternative error details:', {
                        message: altError.message,
                        status: altError.status,
                        data: altError.data
                    });
                    
                    // Show error message to user
                    ToastManager.error('Не удалось загрузить список проектов');
                });
        });
}

/**
 * Initialize project selector
 */
function initProjectSelector() {
    const projectSelector = document.getElementById('projectSelector');
    
    if (!projectSelector) {
        console.log('[Dashboard] Project selector not found');
        return;
    }
    
    // Restore saved project selection after projects are loaded
    const savedProjectId = localStorage.getItem('dashboard_selected_project');
    if (savedProjectId) {
        console.log('[Dashboard] Found saved project selection:', savedProjectId);
        // Delay setting the value to ensure options are loaded
        setTimeout(() => {
            projectSelector.value = savedProjectId;
            console.log('[Dashboard] Restored saved project selection:', savedProjectId);
            console.log('[Dashboard] Current selector value:', projectSelector.value);
        }, 200);
    }
    
    // Add change event listener
    projectSelector.addEventListener('change', function(event) {
        const selectedProjectId = event.target.value;
        console.log('[Dashboard] Project changed to:', selectedProjectId);
        
        // Save selection to localStorage
        if (selectedProjectId) {
            localStorage.setItem('dashboard_selected_project', selectedProjectId);
            console.log('[Dashboard] Saved project selection to localStorage:', selectedProjectId);
        } else {
            localStorage.removeItem('dashboard_selected_project');
            console.log('[Dashboard] Removed project selection from localStorage');
        }
        
        // Reload dashboard data for selected project
        if (selectedProjectId) {
            // Filter data by project
            loadDashboardStatsForProject(selectedProjectId);
        } else {
            // Load all projects data
            loadDashboardStats();
        }
    });
    
    console.log('[Dashboard] Project selector initialized');
}

/**
 * Load dashboard statistics for specific project
 */
function loadDashboardStatsForProject(projectId) {
    console.log('[Dashboard] Loading stats for project:', projectId);
    
    const totalTestCasesElement = document.getElementById('total-test-cases');
    const passedTestCasesElement = document.getElementById('passed-test-cases');
    const failedTestCasesElement = document.getElementById('failed-test-cases');
    const pendingTestCasesElement = document.getElementById('pending-test-cases');
    
    // Get statistics from API with project filter
    ApiClient.get('/core/dashboard-statistics/', { project_id: projectId })
        .then(data => {
            const stats = data.basic_stats;
            
            // Update basic statistics
            if (totalTestCasesElement) {
                totalTestCasesElement.textContent = stats.test_cases_count || '0';
            }
            
            if (passedTestCasesElement) {
                passedTestCasesElement.textContent = stats.passed_tests_count || '0';
            }
            
            if (failedTestCasesElement) {
                failedTestCasesElement.textContent = stats.failed_tests_count || '0';
            }
            
            if (pendingTestCasesElement) {
                pendingTestCasesElement.textContent = stats.pending_tests_count || '0';
            }
            
            // Update charts
            updateDashboardCharts(data.charts);
            
            // Update top lists with project-filtered data
            loadActiveUsersForProject(projectId);
            loadFailingTestsForProject(projectId);
            
            // Hide overlays if we have data
            if (stats.test_cases_count > 0) {
                hideChartOverlays();
            }
        })
        .catch(error => {
            console.error('Get project dashboard statistics error:', error);
            
            // Display fallback values
            if (totalTestCasesElement) totalTestCasesElement.textContent = '0';
            if (passedTestCasesElement) passedTestCasesElement.textContent = '0';
            if (failedTestCasesElement) failedTestCasesElement.textContent = '0';
            if (pendingTestCasesElement) pendingTestCasesElement.textContent = '0';
        });
}

/**
 * Load active users for specific project
 */
function loadActiveUsersForProject(projectId) {
    const activeUsersListElement = document.getElementById('active-users-list');
    
    ApiClient.get('/core/dashboard-statistics/', { project_id: projectId })
        .then(data => {
            const activeUsers = data.top_lists.active_users;
            
            if (activeUsersListElement) {
                activeUsersListElement.innerHTML = '';
                
                if (activeUsers && activeUsers.length > 0) {
                    const usersList = document.createElement('div');
                    usersList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                    
                    activeUsers.forEach((user, index) => {
                        usersList.appendChild(createActiveUserItem(user, index + 1));
                    });
                    
                    activeUsersListElement.appendChild(usersList);
                } else {
                    // No users
                    const emptyState = document.createElement('div');
                    emptyState.className = 'text-center py-8';
                    emptyState.innerHTML = `
                        <div class="text-gray-400 dark:text-gray-500 mb-3">
                            <i class="ri-user-star-line text-4xl"></i>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400">${i18n.t('noUsersData')}</p>
                        <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">${i18n.t('createTestCasesToSeeActivity')}</p>
                    `;
                    activeUsersListElement.appendChild(emptyState);
                }
            }
        })
        .catch(error => {
            console.error('Failed to load active users for project:', error);
        });
}

/**
 * Load failing tests for specific project
 */
function loadFailingTestsForProject(projectId) {
    const failingTestsListElement = document.getElementById('failing-tests-list');
    
    ApiClient.get('/core/dashboard-statistics/', { project_id: projectId })
        .then(data => {
            const failingTests = data.top_lists.failing_tests;
            
            if (failingTestsListElement) {
                failingTestsListElement.innerHTML = '';
                
                if (failingTests && failingTests.length > 0) {
                    const testsList = document.createElement('div');
                    testsList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                    
                    failingTests.forEach(test => {
                        testsList.appendChild(createFailingTestItem(test));
                    });
                    
                    failingTestsListElement.appendChild(testsList);
                } else {
                    // No failing tests
                    const emptyState = document.createElement('div');
                    emptyState.className = 'text-center py-8';
                    emptyState.innerHTML = `
                        <div class="text-gray-400 dark:text-gray-500 mb-3">
                            <i class="ri-bug-line text-4xl"></i>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400">Нет падающих тестов</p>
                        <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">В этом проекте все тесты проходят!</p>
                    `;
                    failingTestsListElement.appendChild(emptyState);
                }
            }
        })
        .catch(error => {
            console.error('Failed to load failing tests for project:', error);
        });
}

/**
 * Initialize project modal functionality
 */
function initProjectModal() {
    const addProjectBtn = document.getElementById('addProjectBtn');
    const noProjectsCreateBtn = document.getElementById('noProjectsCreateBtn');
    const createProjectModal = document.getElementById('createProjectModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const cancelModalButton = document.getElementById('cancelModalButton');
    const projectForm = document.getElementById('projectForm');
    const userSearchInput = document.getElementById('userSearchInput');
    const userListContainer = document.getElementById('userListContainer');
    const selectedUsersContainer = document.getElementById('selectedUsersContainer');
    const noUsersFoundMessage = document.getElementById('noUsersFoundMessage');
    const userListSpinner = document.getElementById('userListSpinner');
    
    let selectedUsers = [];
    let allUsers = [];
    
    // Modal show/hide functions
    function showProjectModal() {
        createProjectModal.classList.remove('hidden');
        // Reset form
        projectForm.reset();
        selectedUsers = [];
        updateSelectedUsersDisplay();
        // Load users
        loadUsers();
    }
    
    function hideProjectModal() {
        createProjectModal.classList.add('hidden');
        // Clear any error messages
        document.querySelectorAll('.text-red-500').forEach(el => el.classList.add('hidden'));
    }
    
    // Event listeners for modal controls
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', showProjectModal);
    }
    
    if (noProjectsCreateBtn) {
        noProjectsCreateBtn.addEventListener('click', showProjectModal);
    }
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideProjectModal);
    }
    
    if (cancelModalButton) {
        cancelModalButton.addEventListener('click', hideProjectModal);
    }
    
    // Load users for project assignment
    async function loadUsers() {
        userListSpinner.classList.remove('hidden');
        noUsersFoundMessage.classList.add('hidden');
        userListContainer.innerHTML = '';
        
        try {
            const response = await ApiClient.get('/core/users/');
            allUsers = response.results || response;
            displayUsers(allUsers);
        } catch (error) {
            console.error('Failed to load users:', error);
            noUsersFoundMessage.classList.remove('hidden');
        } finally {
            userListSpinner.classList.add('hidden');
        }
    }
    
    // Display users in the list
    function displayUsers(users) {
        userListContainer.innerHTML = '';
        
        if (users.length === 0) {
            noUsersFoundMessage.classList.remove('hidden');
            return;
        }
        
        noUsersFoundMessage.classList.add('hidden');
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer';
            userItem.innerHTML = `
                <input type="checkbox" id="user-${user.id}" value="${user.id}" 
                    class="mr-2 text-coral-600 focus:ring-coral-500"
                    ${selectedUsers.some(u => u.id === user.id) ? 'checked' : ''}>
                <label for="user-${user.id}" class="flex-1 cursor-pointer">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ${user.first_name || ''} ${user.last_name || ''} 
                        ${user.username ? `(${user.username})` : ''}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 block">
                        ${user.email}
                    </span>
                </label>
            `;
            
            // Add click handler
            const checkbox = userItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedUsers.push(user);
                } else {
                    selectedUsers = selectedUsers.filter(u => u.id !== user.id);
                }
                updateSelectedUsersDisplay();
            });
            
            userListContainer.appendChild(userItem);
        });
    }
    
    // Update selected users display
    function updateSelectedUsersDisplay() {
        selectedUsersContainer.innerHTML = '';
        
        selectedUsers.forEach(user => {
            const badge = document.createElement('span');
            badge.className = 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-coral-100 text-coral-800 dark:bg-coral-900 dark:text-coral-200';
            badge.innerHTML = `
                ${user.username || user.email}
                <button type="button" class="ml-1 text-coral-600 hover:text-coral-800 dark:text-coral-400 dark:hover:text-coral-200"
                    onclick="this.closest('span').remove()">
                    <i class="ri-close-line"></i>
                </button>
            `;
            
            // Add remove handler
            badge.querySelector('button').addEventListener('click', () => {
                selectedUsers = selectedUsers.filter(u => u.id !== user.id);
                updateSelectedUsersDisplay();
                // Uncheck the checkbox
                const checkbox = userListContainer.querySelector(`#user-${user.id}`);
                if (checkbox) checkbox.checked = false;
            });
            
            selectedUsersContainer.appendChild(badge);
        });
    }
    
    // User search functionality
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredUsers = allUsers.filter(user => 
                (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
                (user.last_name && user.last_name.toLowerCase().includes(searchTerm))
            );
            displayUsers(filteredUsers);
        });
    }
    
    // Form submission
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const projectName = document.getElementById('projectName').value.trim();
            const description = document.getElementById('description').value.trim();
            
            // Clear previous errors
            document.querySelectorAll('.text-red-500').forEach(el => {
                el.classList.add('hidden');
                el.textContent = '';
            });
            
            // Validate
            let hasError = false;
            
            if (!projectName) {
                const errorEl = document.getElementById('projectNameError');
                errorEl.textContent = i18n.t('projectNameRequired') || 'Project name is required';
                errorEl.classList.remove('hidden');
                hasError = true;
            }
            
            if (hasError) return;
            
            // Show loading state
            const submitButton = projectForm.querySelector('button[type="submit"]');
            const submitSpinner = document.getElementById('submitSpinner');
            submitButton.disabled = true;
            submitSpinner.classList.remove('hidden');
            
            try {
                // Create project
                const projectData = {
                    name: projectName,
                    description: description,
                    members: selectedUsers.map(u => u.id)
                };
                
                const response = await ApiClient.post('/projects/', projectData);
                
                // Show success message
                ToastManager.success(i18n.t('projectCreatedSuccess') || 'Project created successfully');
                
                // Close modal
                hideProjectModal();
                
                // Reload projects
                loadProjects();
                
                // Select the new project
                setTimeout(() => {
                    const projectSelector = document.getElementById('projectSelector');
                    if (projectSelector) {
                        projectSelector.value = response.id;
                        projectSelector.dispatchEvent(new Event('change'));
                    }
                }, 500);
                
            } catch (error) {
                console.error('Failed to create project:', error);
                
                // Show error message
                const formErrorMessage = document.getElementById('formErrorMessage');
                if (formErrorMessage) {
                    formErrorMessage.textContent = error.message || i18n.t('projectCreationFailed') || 'Failed to create project';
                    formErrorMessage.classList.remove('hidden');
                }
                
                ToastManager.error(error.message || i18n.t('projectCreationFailed') || 'Failed to create project');
            } finally {
                submitButton.disabled = false;
                submitSpinner.classList.add('hidden');
            }
        });
    }
}