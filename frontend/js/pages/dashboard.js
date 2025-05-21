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
    
    // Initialize authentication
    const isAuthenticated = await auth.initialize();
    
    if (!isAuthenticated) {
        console.log('User is not authenticated, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('User is authenticated, loading dashboard');
    
    // Initialize components
    initUserMenu();
    initLanguageMenu();
    
    // Load dashboard data
    loadUserProfile();
    loadDashboardStats();
    loadRecentProjects();
    loadRecentActivity();
});

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
 * Load user profile
 */
async function loadUserProfile() {
    const userName = document.getElementById('user-name');
    const userInitials = document.getElementById('user-initials');
    const userAvatar = document.getElementById('user-avatar');
    
    try {
        // Get user data from auth module
        const authModule = await import('../api/auth.js');
        const auth = authModule.default;
        
        // Get current user from auth module
        const user = await auth.getCurrentUser();
        
        if (!user) {
            throw new Error('No user data available');
        }
        
        // Update user name
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
        if (userName) {
            userName.textContent = fullName;
        }
        
        // Set user initials
        if (userInitials) {
            if (user.first_name && user.last_name) {
                userInitials.textContent = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
            } else if (user.username) {
                userInitials.textContent = user.username[0].toUpperCase();
            } else {
                userInitials.textContent = 'U';
            }
        }
        
        // Check for saved avatar in localStorage
        const userData = JSON.parse(localStorage.getItem('flowtest_user_data') || '{}');
        
        if (userData.avatar && userAvatar) {
            // Set background image for the avatar container
            userAvatar.style.backgroundImage = `url(${userData.avatar})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.style.backgroundPosition = 'center';
            
            // Hide the initials as we're showing the avatar
            if (userInitials) {
                userInitials.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        
        // Default to 'User' if there's an error
        if (userName) {
            userName.textContent = 'User';
        }
        if (userInitials) {
            userInitials.textContent = 'U';
        }
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
    ApiClient.get('/core/statistics/')
        .then(stats => {
            // Update statistics
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
        })
        .catch(error => {
            console.error('Get statistics error:', error);
            
            // Display fallback values
            if (totalTestCasesElement) totalTestCasesElement.textContent = '0';
            if (passedTestCasesElement) passedTestCasesElement.textContent = '0';
            if (failedTestCasesElement) failedTestCasesElement.textContent = '0';
            if (pendingTestCasesElement) pendingTestCasesElement.textContent = '0';
        });
}

/**
 * Load recent projects
 */
function loadRecentProjects() {
    const projectsListElement = document.getElementById('projects-list');
    
    // Get recent projects from API
    ApiClient.get('/projects/', { limit: 5, ordering: '-updated_at' })
        .then(response => {
            if (projectsListElement) {
                // Clear loading placeholders
                projectsListElement.innerHTML = '';
                
                // Check if there are projects
                if (response.results && response.results.length > 0) {
                    // Render projects
                    const projectsList = document.createElement('div');
                    projectsList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                    
                    response.results.forEach(project => {
                        projectsList.appendChild(createProjectItem(project));
                    });
                    
                    projectsListElement.appendChild(projectsList);
                } else {
                    // No projects
                    const emptyState = document.createElement('div');
                    emptyState.className = 'text-center py-8';
                    emptyState.innerHTML = `
                        <div class="text-gray-400 dark:text-gray-500 mb-3">
                            <i class="ri-folder-line text-5xl"></i>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400">${i18n.t('no-projects') || 'No projects found. Create your first project to get started.'}</p>
                        <button id="create-project-btn" class="mt-4 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-md">
                            <i class="ri-add-line mr-1"></i> ${i18n.t('create-project') || 'Create Project'}
                        </button>
                    `;
                    projectsListElement.appendChild(emptyState);
                }
            }
        })
        .catch(error => {
            console.error('Get projects error:', error);
            
            // Display error message
            if (projectsListElement) {
                projectsListElement.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-red-500">${i18n.t('projects-load-error') || 'Failed to load projects. Please try again.'}</p>
                        <button id="retry-projects-btn" class="mt-3 px-3 py-1 bg-coral-500 hover:bg-coral-600 text-white text-sm rounded-md">
                            ${i18n.t('retry') || 'Retry'}
                        </button>
                    </div>
                `;
                
                // Add retry handler
                const retryBtn = document.getElementById('retry-projects-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', loadRecentProjects);
                }
            }
        });
}

/**
 * Create project item element
 * @param {Object} project - Project data
 * @returns {HTMLElement} Project item element
 */
function createProjectItem(project) {
    const item = document.createElement('div');
    item.className = 'py-4';
    
    // Format date
    const updatedDate = new Date(project.updated_at);
    const formattedDate = updatedDate.toLocaleDateString() + ' ' + updatedDate.toLocaleTimeString();
    
    // Get test case count
    const testCasesCount = project.test_cases_count || 0;
    
    item.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-coral-100 dark:bg-coral-900 flex items-center justify-center">
                <i class="ri-folder-line text-coral-600 dark:text-coral-400"></i>
            </div>
            <div class="ml-4 flex-1">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                            ${project.name}
                        </h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ${project.description || i18n.t('no-description') || 'No description'}
                        </p>
                    </div>
                    <a href="projects.html?id=${project.id}" class="text-xs px-2 py-1 rounded-full bg-coral-100 text-coral-800 dark:bg-coral-900 dark:text-coral-200 hover:bg-coral-200 dark:hover:bg-coral-800">
                        ${i18n.t('view-project') || 'View'}
                    </a>
                </div>
                <div class="flex mt-2 text-xs text-gray-500 dark:text-gray-400 justify-between">
                    <span>
                        <i class="ri-file-list-line mr-1"></i> ${testCasesCount} ${i18n.t('test-cases') || 'test cases'}
                    </span>
                    <span>
                        <i class="ri-time-line mr-1"></i> ${formattedDate}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    return item;
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
    const activityListElement = document.getElementById('activity-list');
    
    // Get recent activity from API
    ApiClient.get('/core/activity/', { limit: 5 })
        .then(response => {
            if (activityListElement) {
                // Clear loading placeholders
                activityListElement.innerHTML = '';
                
                // Check if there is activity
                if (response.results && response.results.length > 0) {
                    // Render activity
                    const activityList = document.createElement('div');
                    activityList.className = 'divide-y divide-gray-200 dark:divide-gray-700';
                    
                    response.results.forEach(activity => {
                        activityList.appendChild(createActivityItem(activity));
                    });
                    
                    activityListElement.appendChild(activityList);
                } else {
                    // No activity
                    const emptyState = document.createElement('div');
                    emptyState.className = 'text-center py-8';
                    emptyState.innerHTML = `
                        <div class="text-gray-400 dark:text-gray-500 mb-3">
                            <i class="ri-history-line text-5xl"></i>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400">${i18n.t('no-activity') || 'No recent activity.'}</p>
                    `;
                    activityListElement.appendChild(emptyState);
                }
            }
        })
        .catch(error => {
            console.error('Get activity error:', error);
            
            // Display error message
            if (activityListElement) {
                activityListElement.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-red-500">${i18n.t('activity-load-error') || 'Failed to load activity. Please try again.'}</p>
                        <button id="retry-activity-btn" class="mt-3 px-3 py-1 bg-coral-500 hover:bg-coral-600 text-white text-sm rounded-md">
                            ${i18n.t('retry') || 'Retry'}
                        </button>
                    </div>
                `;
                
                // Add retry handler
                const retryBtn = document.getElementById('retry-activity-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', loadRecentActivity);
                }
            }
        });
}

/**
 * Create activity item element
 * @param {Object} activity - Activity data
 * @returns {HTMLElement} Activity item element
 */
function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'py-4';
    
    // Format date
    const activityDate = new Date(activity.created_at);
    const formattedDate = activityDate.toLocaleDateString() + ' ' + activityDate.toLocaleTimeString();
    
    // Get icon based on activity type
    let icon = 'ri-information-line';
    switch (activity.activity_type) {
        case 'project_created':
            icon = 'ri-folder-add-line';
            break;
        case 'test_case_created':
            icon = 'ri-file-add-line';
            break;
        case 'test_executed':
            icon = 'ri-play-circle-line';
            break;
        case 'report_generated':
            icon = 'ri-file-chart-line';
            break;
        case 'user_added':
            icon = 'ri-user-add-line';
            break;
    }
    
    item.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-coral-100 dark:bg-coral-900 flex items-center justify-center">
                <i class="${icon} text-coral-600 dark:text-coral-400"></i>
            </div>
            <div class="ml-4 flex-1">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            ${activity.description}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ${activity.user ? activity.user.name || activity.user.email : 'System'} · ${formattedDate}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return item;
}