/**
 * Test Cases page functionality
 */
import i18n from '../i18n/i18n.js';
import ApiClient from '../api/client.js';
import ToastManager from '../utils/toast.js';

// Store for application state
const AppState = {
    projects: [],
    folders: [],
    testCases: [],
    selectedProject: null,
    selectedFolder: null,
    filters: {
        status: '',
        priority: '',
        type: '',
        tags: '',
        search: ''
    },
    sortBy: 'name'
};

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize components
    initUserMenu();
    initLanguageMenu();
    initProjectSelector();
    initFolderModal();
    initTestCaseModal();
    initFilterModal();
    initContextMenu();
    
    // Initialize event listeners
    document.getElementById('search-testcases').addEventListener('input', handleSearch);
    document.getElementById('sort-selector').addEventListener('change', handleSort);
    document.getElementById('create-folder-button').addEventListener('click', showFolderModal);
    document.getElementById('create-testcase-button').addEventListener('click', showTestCaseModal);
    document.getElementById('filter-button').addEventListener('click', showFilterModal);
    
    // Load user profile
    loadUserProfile();
    
    // Load projects
    loadProjects();
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
    logoutButton.addEventListener('click', function(event) {
        event.preventDefault();
        
        // Call logout API
        ApiClient.logout()
            .then(() => {
                // Display success message
                ToastManager.success(i18n.t('logout-success') || 'Successfully logged out');
                
                // Redirect to login page
                window.location.href = 'login.html';
            })
            .catch(error => {
                // Display error
                ToastManager.error(i18n.t('logout-error') || 'Failed to logout. Please try again.');
                console.error('Logout error:', error);
            });
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

/**
 * Load user profile
 */
function loadUserProfile() {
    ApiClient.getCurrentUser()
        .then(user => {
            // Update user name and initials
            const userNameElement = document.getElementById('user-name');
            const userInitialsElement = document.getElementById('user-initials');
            
            if (userNameElement && user.name) {
                userNameElement.textContent = user.name;
            } else if (userNameElement && user.email) {
                userNameElement.textContent = user.email.split('@')[0];
            }
            
            if (userInitialsElement) {
                if (user.name) {
                    // Get initials from name
                    const nameParts = user.name.split(' ');
                    userInitialsElement.textContent = nameParts.map(part => part.charAt(0).toUpperCase()).join('');
                } else if (user.email) {
                    // Use first letter of email
                    userInitialsElement.textContent = user.email.charAt(0).toUpperCase();
                }
            }
        })
        .catch(error => {
            console.error('Get user profile error:', error);
            
            // If unauthorized, redirect to login
            if (error.status === 401) {
                window.location.href = 'login.html';
            }
        });
}

/**
 * Initialize project selector
 */
function initProjectSelector() {
    const projectSelector = document.getElementById('project-selector');
    
    if (projectSelector) {
        projectSelector.addEventListener('change', function() {
            const projectId = this.value;
            AppState.selectedProject = projectId;
            AppState.selectedFolder = null;
            
            // Load folders for the selected project
            loadFolders(projectId);
            
            // Clear test cases
            clearTestCases();
        });
    }
}

/**
 * Load projects
 */
function loadProjects() {
    const projectSelector = document.getElementById('project-selector');
    
    ApiClient.get('/projects/')
        .then(response => {
            if (response.results && response.results.length > 0) {
                AppState.projects = response.results;
                
                // Populate project selector
                if (projectSelector) {
                    // Clear existing options
                    const defaultOption = projectSelector.querySelector('option[disabled]');
                    projectSelector.innerHTML = '';
                    
                    if (defaultOption) {
                        projectSelector.appendChild(defaultOption);
                    }
                    
                    // Add project options
                    response.results.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.id;
                        option.textContent = project.name;
                        projectSelector.appendChild(option);
                    });
                    
                    // Enable project selector
                    projectSelector.disabled = false;
                }
            } else {
                // No projects found
                ToastManager.info(i18n.t('no-projects-info') || 'No projects found. Create a project first.');
                
                // Disable project selector
                if (projectSelector) {
                    projectSelector.disabled = true;
                }
            }
        })
        .catch(error => {
            console.error('Load projects error:', error);
            ToastManager.error(i18n.t('load-projects-error') || 'Failed to load projects. Please try again.');
        });
}

/**
 * Load folders for a project
 * @param {string} projectId - Project ID
 */
function loadFolders(projectId) {
    const folderTree = document.getElementById('folder-tree');
    
    // Show loading indicator
    if (folderTree) {
        folderTree.innerHTML = `
            <div class="py-20 text-center text-gray-500 dark:text-gray-400">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p>${i18n.t('loadingFolders') || 'Loading folders...'}</p>
            </div>
        `;
    }
    
    ApiClient.get(`/projects/${projectId}/folders/`)
        .then(response => {
            AppState.folders = response.results || [];
            
            // Build folder tree
            if (folderTree) {
                // If no folders, show empty state
                if (!AppState.folders.length) {
                    folderTree.innerHTML = `
                        <div class="py-10 text-center text-gray-500 dark:text-gray-400">
                            <i class="ri-folder-line text-4xl mb-2"></i>
                            <p>${i18n.t('noFolders') || 'No folders found'}</p>
                            <button id="create-root-folder-button" class="mt-3 px-3 py-1 text-xs bg-coral-500 hover:bg-coral-600 text-white rounded-md">
                                <i class="ri-add-line mr-1"></i> ${i18n.t('createFolder') || 'Create Folder'}
                            </button>
                        </div>
                    `;
                    
                    // Add event listener to create root folder button
                    const createRootFolderButton = document.getElementById('create-root-folder-button');
                    if (createRootFolderButton) {
                        createRootFolderButton.addEventListener('click', showFolderModal);
                    }
                    return;
                }
                
                // Clear folder tree
                folderTree.innerHTML = '';
                
                // Build a hierarchical folder structure
                const folderMap = new Map();
                const rootFolders = [];
                
                // Create folder nodes
                AppState.folders.forEach(folder => {
                    folder.children = [];
                    folderMap.set(folder.id, folder);
                    
                    if (!folder.parent_folder) {
                        rootFolders.push(folder);
                    }
                });
                
                // Build hierarchy
                AppState.folders.forEach(folder => {
                    if (folder.parent_folder) {
                        const parentFolder = folderMap.get(folder.parent_folder);
                        if (parentFolder) {
                            parentFolder.children.push(folder);
                        }
                    }
                });
                
                // Render the folder tree
                rootFolders.forEach(folder => {
                    const folderElement = createFolderElement(folder);
                    folderTree.appendChild(folderElement);
                });
            }
        })
        .catch(error => {
            console.error('Load folders error:', error);
            
            if (folderTree) {
                folderTree.innerHTML = `
                    <div class="py-10 text-center text-gray-500 dark:text-gray-400">
                        <p class="text-red-500">${i18n.t('loadFoldersError') || 'Failed to load folders'}</p>
                        <button id="retry-load-folders" class="mt-3 px-3 py-1 text-xs bg-coral-500 hover:bg-coral-600 text-white rounded-md">
                            ${i18n.t('retry') || 'Retry'}
                        </button>
                    </div>
                `;
                
                // Add event listener to retry button
                const retryButton = document.getElementById('retry-load-folders');
                if (retryButton) {
                    retryButton.addEventListener('click', () => loadFolders(projectId));
                }
            }
            
            ToastManager.error(i18n.t('load-folders-error') || 'Failed to load folders. Please try again.');
        });
}

/**
 * Create a folder element
 * @param {Object} folder - Folder data
 * @returns {HTMLElement} Folder element
 */
function createFolderElement(folder) {
    const folderElement = document.createElement('div');
    folderElement.className = 'folder-item';
    folderElement.setAttribute('data-folder-id', folder.id);
    
    // Determine if the folder has children
    const hasChildren = folder.children && folder.children.length > 0;
    
    const folderContent = `
        <div class="flex items-center py-2 px-2 rounded-md tree-item" data-folder-id="${folder.id}">
            <button class="folder-toggle mr-1 text-gray-500 dark:text-gray-400 ${hasChildren ? '' : 'invisible'}" data-folder-id="${folder.id}">
                <i class="ri-arrow-right-s-line"></i>
            </button>
            <div class="flex items-center flex-grow">
                <i class="ri-folder-line text-coral-500 dark:text-coral-400 mr-2"></i>
                <span class="text-sm">${folder.name}</span>
            </div>
            <div class="folder-actions hidden">
                <button class="p-1 text-gray-500 dark:text-gray-400 hover:text-coral-500 dark:hover:text-coral-400" title="${i18n.t('addTestCase') || 'Add Test Case'}" data-action="add-testcase" data-folder-id="${folder.id}">
                    <i class="ri-add-line"></i>
                </button>
                <button class="p-1 text-gray-500 dark:text-gray-400 hover:text-coral-500 dark:hover:text-coral-400" title="${i18n.t('addSubfolder') || 'Add Subfolder'}" data-action="add-subfolder" data-folder-id="${folder.id}">
                    <i class="ri-folder-add-line"></i>
                </button>
            </div>
        </div>
    `;
    
    folderElement.innerHTML = folderContent;
    
    // Add children container if the folder has children
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'folder-children ml-4 hidden';
        childrenContainer.setAttribute('data-parent-id', folder.id);
        
        // Add children folders
        folder.children.forEach(childFolder => {
            const childElement = createFolderElement(childFolder);
            childrenContainer.appendChild(childElement);
        });
        
        folderElement.appendChild(childrenContainer);
    }
    
    // Add event listeners
    const folderItem = folderElement.querySelector('.tree-item');
    const folderToggle = folderElement.querySelector('.folder-toggle');
    const folderActions = folderElement.querySelector('.folder-actions');
    
    // Folder click
    folderItem.addEventListener('click', (event) => {
        if (event.target.closest('[data-action]')) {
            return; // Don't select folder if action button was clicked
        }
        
        // Remove active class from all folder items
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to this folder item
        folderItem.classList.add('active');
        
        // Store selected folder
        AppState.selectedFolder = folder.id;
        
        // Load test cases for this folder
        loadTestCases(AppState.selectedProject, folder.id);
    });
    
    // Show folder actions on hover
    folderItem.addEventListener('mouseenter', () => {
        folderActions.classList.remove('hidden');
    });
    
    folderItem.addEventListener('mouseleave', () => {
        folderActions.classList.add('hidden');
    });
    
    // Toggle folder
    if (hasChildren) {
        folderToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            
            const childrenContainer = folderElement.querySelector(`.folder-children[data-parent-id="${folder.id}"]`);
            const isOpen = childrenContainer.classList.contains('hidden');
            
            // Toggle children visibility
            if (isOpen) {
                childrenContainer.classList.remove('hidden');
                folderToggle.classList.add('open');
            } else {
                childrenContainer.classList.add('hidden');
                folderToggle.classList.remove('open');
            }
        });
    }
    
    // Add test case button
    const addTestCaseButton = folderElement.querySelector('[data-action="add-testcase"]');
    if (addTestCaseButton) {
        addTestCaseButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showTestCaseModal(folder.id);
        });
    }
    
    // Add subfolder button
    const addSubfolderButton = folderElement.querySelector('[data-action="add-subfolder"]');
    if (addSubfolderButton) {
        addSubfolderButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showFolderModal(folder.id);
        });
    }
    
    return folderElement;
}

/**
 * Load test cases for a folder
 * @param {string} projectId - Project ID
 * @param {string} folderId - Folder ID
 */
function loadTestCases(projectId, folderId) {
    const testCasesList = document.getElementById('test-cases-list');
    const testCount = document.getElementById('test-count');
    
    // Show loading indicator
    if (testCasesList) {
        testCasesList.innerHTML = `
            <div class="py-20 text-center text-gray-500 dark:text-gray-400">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p>${i18n.t('loadingTestCases') || 'Loading test cases...'}</p>
            </div>
        `;
    }
    
    ApiClient.get(`/projects/${projectId}/folders/${folderId}/testcases/`)
        .then(response => {
            AppState.testCases = response.results || [];
            
            // Update test count
            if (testCount) {
                testCount.textContent = AppState.testCases.length;
            }
            
            // Render test cases
            renderTestCases();
        })
        .catch(error => {
            console.error('Load test cases error:', error);
            
            if (testCasesList) {
                testCasesList.innerHTML = `
                    <div class="py-10 text-center text-gray-500 dark:text-gray-400">
                        <p class="text-red-500">${i18n.t('loadTestCasesError') || 'Failed to load test cases'}</p>
                        <button id="retry-load-testcases" class="mt-3 px-3 py-1 text-xs bg-coral-500 hover:bg-coral-600 text-white rounded-md">
                            ${i18n.t('retry') || 'Retry'}
                        </button>
                    </div>
                `;
                
                // Add event listener to retry button
                const retryButton = document.getElementById('retry-load-testcases');
                if (retryButton) {
                    retryButton.addEventListener('click', () => loadTestCases(projectId, folderId));
                }
            }
            
            ToastManager.error(i18n.t('load-testcases-error') || 'Failed to load test cases. Please try again.');
        });
}

/**
 * Render test cases based on current filters and sorting
 */
function renderTestCases() {
    const testCasesList = document.getElementById('test-cases-list');
    
    if (!testCasesList) return;
    
    // Clear list
    testCasesList.innerHTML = '';
    
    // Filter test cases
    let filteredTestCases = AppState.testCases;
    
    // Apply status filter
    if (AppState.filters.status) {
        filteredTestCases = filteredTestCases.filter(tc => tc.status === AppState.filters.status);
    }
    
    // Apply priority filter
    if (AppState.filters.priority) {
        filteredTestCases = filteredTestCases.filter(tc => tc.priority === AppState.filters.priority);
    }
    
    // Apply type filter
    if (AppState.filters.type) {
        filteredTestCases = filteredTestCases.filter(tc => tc.type === AppState.filters.type);
    }
    
    // Apply tags filter
    if (AppState.filters.tags) {
        const tagList = AppState.filters.tags.split(',').map(tag => tag.trim().toLowerCase());
        filteredTestCases = filteredTestCases.filter(tc => {
            const testCaseTags = tc.tags ? tc.tags.split(',').map(tag => tag.trim().toLowerCase()) : [];
            return tagList.some(tag => testCaseTags.includes(tag));
        });
    }
    
    // Apply search filter
    if (AppState.filters.search) {
        const searchTerm = AppState.filters.search.toLowerCase();
        filteredTestCases = filteredTestCases.filter(tc => 
            tc.name.toLowerCase().includes(searchTerm) || 
            (tc.description && tc.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sort test cases
    switch (AppState.sortBy) {
        case 'name':
            filteredTestCases.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'updated':
            filteredTestCases.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            break;
        case 'status':
            filteredTestCases.sort((a, b) => a.status.localeCompare(b.status));
            break;
        default:
            filteredTestCases.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Update test count
    const testCount = document.getElementById('test-count');
    if (testCount) {
        testCount.textContent = filteredTestCases.length;
    }
    
    // If no test cases after filtering, show empty state
    if (filteredTestCases.length === 0) {
        testCasesList.innerHTML = `
            <div class="py-10 text-center text-gray-500 dark:text-gray-400">
                <i class="ri-file-list-line text-4xl mb-2"></i>
                <p>${i18n.t('noTestCases') || 'No test cases found'}</p>
                <button id="create-testcase-button-empty" class="mt-3 px-3 py-1 text-xs bg-coral-500 hover:bg-coral-600 text-white rounded-md">
                    <i class="ri-add-line mr-1"></i> ${i18n.t('createTestCase') || 'Create Test Case'}
                </button>
            </div>
        `;
        
        // Add event listener to create test case button
        const createTestCaseButton = document.getElementById('create-testcase-button-empty');
        if (createTestCaseButton) {
            createTestCaseButton.addEventListener('click', () => showTestCaseModal(AppState.selectedFolder));
        }
        
        return;
    }
    
    // Create test case items
    filteredTestCases.forEach(testCase => {
        const testCaseItem = createTestCaseItem(testCase);
        testCasesList.appendChild(testCaseItem);
    });
}

/**
 * Create a test case item
 * @param {Object} testCase - Test case data
 * @returns {HTMLElement} Test case item element
 */
function createTestCaseItem(testCase) {
    const testCaseItem = document.createElement('div');
    testCaseItem.className = 'p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer border-l-2 border-transparent hover:border-coral-500';
    testCaseItem.setAttribute('data-testcase-id', testCase.id);
    
    // Format date
    const updatedDate = new Date(testCase.updated_at);
    const formattedDate = updatedDate.toLocaleDateString();
    
    // Get status class
    let statusClass = 'status-pending';
    let statusText = i18n.t('pending') || 'Pending';
    
    switch (testCase.status) {
        case 'passed':
            statusClass = 'status-passed';
            statusText = i18n.t('passed') || 'Passed';
            break;
        case 'failed':
            statusClass = 'status-failed';
            statusText = i18n.t('failed') || 'Failed';
            break;
    }
    
    // Get priority class
    let priorityClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    let priorityText = i18n.t('medium') || 'Medium';
    
    switch (testCase.priority) {
        case 'high':
            priorityClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            priorityText = i18n.t('high') || 'High';
            break;
        case 'low':
            priorityClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            priorityText = i18n.t('low') || 'Low';
            break;
    }
    
    // Create tags HTML
    let tagsHtml = '';
    if (testCase.tags) {
        const tags = testCase.tags.split(',').map(tag => tag.trim());
        tagsHtml = tags.map(tag => `
            <span class="tag bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">${tag}</span>
        `).join('');
    }
    
    testCaseItem.innerHTML = `
        <div class="flex items-start">
            <div class="flex-grow">
                <div class="flex items-center mb-1">
                    <h3 class="font-medium">${testCase.name}</h3>
                    <div class="ml-2 flex">
                        <span class="status-indicator ${statusClass}"></span>
                    </div>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">${testCase.description || ''}</p>
                <div class="flex flex-wrap gap-1 mb-2">
                    ${tagsHtml}
                </div>
                <div class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="mx-2">•</span>
                    <span class="status-badge ${priorityClass}">${priorityText}</span>
                    <span class="mx-2">•</span>
                    <span><i class="ri-time-line mr-1"></i>${formattedDate}</span>
                </div>
            </div>
            <div class="ml-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-1 text-gray-500 dark:text-gray-400 hover:text-coral-500 dark:hover:text-coral-400" title="${i18n.t('run') || 'Run'}" data-action="run-testcase" data-testcase-id="${testCase.id}">
                    <i class="ri-play-circle-line"></i>
                </button>
                <button class="p-1 text-gray-500 dark:text-gray-400 hover:text-coral-500 dark:hover:text-coral-400" title="${i18n.t('edit') || 'Edit'}" data-action="edit-testcase" data-testcase-id="${testCase.id}">
                    <i class="ri-edit-line"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    testCaseItem.addEventListener('click', () => {
        showTestCaseDetails(testCase.id);
    });
    
    // Prevent propagation for action buttons
    const actionButtons = testCaseItem.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            
            const action = button.getAttribute('data-action');
            const testCaseId = button.getAttribute('data-testcase-id');
            
            if (action === 'run-testcase') {
                runTestCase(testCaseId);
            } else if (action === 'edit-testcase') {
                editTestCase(testCaseId);
            }
        });
    });
    
    return testCaseItem;
}

/**
 * Clear test cases
 */
function clearTestCases() {
    const testCasesList = document.getElementById('test-cases-list');
    const testCount = document.getElementById('test-count');
    
    AppState.testCases = [];
    
    if (testCount) {
        testCount.textContent = '0';
    }
    
    if (testCasesList) {
        testCasesList.innerHTML = `
            <div class="py-20 text-center text-gray-500 dark:text-gray-400">
                <p data-i18n="selectFolderOrProject">Please select a project and folder to view test cases</p>
            </div>
        `;
    }
}

/**
 * Handle search input
 * @param {Event} event - Input event
 */
function handleSearch(event) {
    AppState.filters.search = event.target.value;
    renderTestCases();
}

/**
 * Handle sort selection
 * @param {Event} event - Change event
 */
function handleSort(event) {
    AppState.sortBy = event.target.value;
    renderTestCases();
}

/**
 * Initialize folder modal
 */
function initFolderModal() {
    const modal = document.getElementById('new-folder-modal');
    const closeButton = document.getElementById('close-folder-modal');
    const cancelButton = document.getElementById('cancel-folder-button');
    const form = document.getElementById('new-folder-form');
    
    // Close modal
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
    };
    
    // Close button
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Cancel button
    if (cancelButton) {
        cancelButton.addEventListener('click', closeModal);
    }
    
    // Close when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const folderName = document.getElementById('folder-name').value;
            const folderDescription = document.getElementById('folder-description').value;
            const parentFolder = document.getElementById('parent-folder').value;
            
            if (!AppState.selectedProject) {
                ToastManager.error(i18n.t('select-project-first') || 'Please select a project first');
                return;
            }
            
            // Create folder data
            const folderData = {
                name: folderName,
                description: folderDescription,
                parent_folder: parentFolder || null,
                project: AppState.selectedProject
            };
            
            // Call API to create folder
            ApiClient.post(`/projects/${AppState.selectedProject}/folders/`, folderData)
                .then(response => {
                    ToastManager.success(i18n.t('folder-created') || 'Folder created successfully');
                    
                    // Reload folders
                    loadFolders(AppState.selectedProject);
                    
                    // Close modal
                    closeModal();
                })
                .catch(error => {
                    console.error('Create folder error:', error);
                    ToastManager.error(i18n.t('create-folder-error') || 'Failed to create folder. Please try again.');
                });
        });
    }
}

/**
 * Show folder modal
 * @param {string} [parentFolderId] - Parent folder ID (optional)
 */
function showFolderModal(parentFolderId) {
    const modal = document.getElementById('new-folder-modal');
    const parentFolderSelect = document.getElementById('parent-folder');
    
    if (!AppState.selectedProject) {
        ToastManager.error(i18n.t('select-project-first') || 'Please select a project first');
        return;
    }
    
    // Reset form
    document.getElementById('new-folder-form').reset();
    
    // Populate parent folder select
    if (parentFolderSelect) {
        // Clear existing options
        parentFolderSelect.innerHTML = `<option value="" data-i18n="rootFolder">${i18n.t('rootFolder') || 'Root Folder'}</option>`;
        
        // Add folder options
        AppState.folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            parentFolderSelect.appendChild(option);
        });
        
        // Set parent folder if provided
        if (parentFolderId) {
            parentFolderSelect.value = parentFolderId;
        }
    }
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Initialize test case modal
 */
function initTestCaseModal() {
    const modal = document.getElementById('new-testcase-modal');
    const closeButton = document.getElementById('close-testcase-modal');
    const cancelButton = document.getElementById('cancel-testcase-button');
    const form = document.getElementById('new-testcase-form');
    const addStepButton = document.getElementById('add-step-button');
    
    // Close modal
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
        
        // Clear steps
        const stepsContainer = document.getElementById('steps-container');
        if (stepsContainer) {
            stepsContainer.innerHTML = '';
        }
    };
    
    // Close button
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Cancel button
    if (cancelButton) {
        cancelButton.addEventListener('click', closeModal);
    }
    
    // Close when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
    
    // Add step button
    if (addStepButton) {
        addStepButton.addEventListener('click', addTestCaseStep);
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const testCaseName = document.getElementById('testcase-name').value;
            const testCaseFolder = document.getElementById('testcase-folder').value;
            const testCaseDescription = document.getElementById('testcase-description').value;
            const testCasePriority = document.getElementById('testcase-priority').value;
            const testCaseType = document.getElementById('testcase-type').value;
            const testCaseTags = document.getElementById('testcase-tags').value;
            
            // Get steps
            const steps = [];
            const stepElements = document.querySelectorAll('.test-step');
            stepElements.forEach((stepElement, index) => {
                const actionInput = stepElement.querySelector('input[name="step-action"]');
                const expectedInput = stepElement.querySelector('input[name="step-expected"]');
                
                if (actionInput && expectedInput) {
                    steps.push({
                        order: index + 1,
                        action: actionInput.value,
                        expected_result: expectedInput.value
                    });
                }
            });
            
            if (!AppState.selectedProject) {
                ToastManager.error(i18n.t('select-project-first') || 'Please select a project first');
                return;
            }
            
            if (!testCaseFolder) {
                ToastManager.error(i18n.t('select-folder-first') || 'Please select a folder first');
                return;
            }
            
            // Create test case data
            const testCaseData = {
                name: testCaseName,
                description: testCaseDescription,
                folder: testCaseFolder,
                priority: testCasePriority,
                type: testCaseType,
                tags: testCaseTags,
                steps: steps
            };
            
            // Call API to create test case
            ApiClient.post(`/projects/${AppState.selectedProject}/folders/${testCaseFolder}/testcases/`, testCaseData)
                .then(response => {
                    ToastManager.success(i18n.t('testcase-created') || 'Test case created successfully');
                    
                    // Reload test cases
                    loadTestCases(AppState.selectedProject, testCaseFolder);
                    
                    // Close modal
                    closeModal();
                })
                .catch(error => {
                    console.error('Create test case error:', error);
                    ToastManager.error(i18n.t('create-testcase-error') || 'Failed to create test case. Please try again.');
                });
        });
    }
}

/**
 * Add a test case step
 */
function addTestCaseStep() {
    const stepsContainer = document.getElementById('steps-container');
    
    if (!stepsContainer) return;
    
    const stepCount = stepsContainer.children.length + 1;
    
    const stepElement = document.createElement('div');
    stepElement.className = 'test-step bg-gray-50 dark:bg-gray-750 p-3 rounded border border-gray-200 dark:border-gray-700';
    
    stepElement.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h4 class="text-sm font-medium">${i18n.t('step') || 'Step'} ${stepCount}</h4>
            <button type="button" class="remove-step-button p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" data-i18n="action">Action</label>
                <input type="text" name="step-action" required 
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 bg-white dark:bg-gray-700"
                    placeholder="${i18n.t('actionPlaceholder') || 'What to do'}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" data-i18n="expectedResult">Expected Result</label>
                <input type="text" name="step-expected" required 
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 bg-white dark:bg-gray-700"
                    placeholder="${i18n.t('expectedResultPlaceholder') || 'What should happen'}">
            </div>
        </div>
    `;
    
    stepsContainer.appendChild(stepElement);
    
    // Add event listener to remove button
    const removeButton = stepElement.querySelector('.remove-step-button');
    if (removeButton) {
        removeButton.addEventListener('click', () => {
            stepElement.remove();
            
            // Renumber steps
            const stepElements = stepsContainer.querySelectorAll('.test-step');
            stepElements.forEach((element, index) => {
                const stepNumber = element.querySelector('h4');
                if (stepNumber) {
                    stepNumber.textContent = `${i18n.t('step') || 'Step'} ${index + 1}`;
                }
            });
        });
    }
}

/**
 * Show test case modal
 * @param {string} [folderId] - Folder ID (optional)
 */
function showTestCaseModal(folderId) {
    const modal = document.getElementById('new-testcase-modal');
    const folderSelect = document.getElementById('testcase-folder');
    
    if (!AppState.selectedProject) {
        ToastManager.error(i18n.t('select-project-first') || 'Please select a project first');
        return;
    }
    
    // Reset form
    document.getElementById('new-testcase-form').reset();
    
    // Clear steps
    const stepsContainer = document.getElementById('steps-container');
    if (stepsContainer) {
        stepsContainer.innerHTML = '';
    }
    
    // Add first step
    addTestCaseStep();
    
    // Populate folder select
    if (folderSelect) {
        // Clear existing options
        folderSelect.innerHTML = '';
        
        // Add folder options
        AppState.folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            folderSelect.appendChild(option);
        });
        
        // Set folder if provided
        if (folderId) {
            folderSelect.value = folderId;
        } else if (AppState.selectedFolder) {
            folderSelect.value = AppState.selectedFolder;
        }
    }
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Show test case details
 * @param {string} testCaseId - Test case ID
 */
function showTestCaseDetails(testCaseId) {
    const modal = document.getElementById('testcase-details-modal');
    const closeButton = document.getElementById('close-details-modal');
    const deleteButton = document.getElementById('delete-testcase-button');
    const runButton = document.getElementById('run-testcase-button');
    const editButton = document.getElementById('edit-testcase-button');
    
    // Find test case
    const testCase = AppState.testCases.find(tc => tc.id === testCaseId);
    
    if (!testCase) {
        ToastManager.error(i18n.t('testcase-not-found') || 'Test case not found');
        return;
    }
    
    // Populate modal
    document.getElementById('testcase-details-title').textContent = testCase.name;
    
    // Get folder path
    const folder = AppState.folders.find(f => f.id === testCase.folder);
    document.getElementById('testcase-details-path').textContent = folder ? folder.name : '';
    
    // Set status
    const statusElement = document.getElementById('testcase-details-status');
    statusElement.innerHTML = '';
    
    let statusClass = 'status-pending';
    let statusText = i18n.t('pending') || 'Pending';
    
    switch (testCase.status) {
        case 'passed':
            statusClass = 'status-passed';
            statusText = i18n.t('passed') || 'Passed';
            break;
        case 'failed':
            statusClass = 'status-failed';
            statusText = i18n.t('failed') || 'Failed';
            break;
    }
    
    statusElement.innerHTML = `
        <span class="status-indicator ${statusClass} mr-1"></span>
        <span>${statusText}</span>
    `;
    
    // Set priority
    const priorityElement = document.getElementById('testcase-details-priority');
    let priorityText = i18n.t('medium') || 'Medium';
    
    switch (testCase.priority) {
        case 'high':
            priorityText = i18n.t('high') || 'High';
            break;
        case 'low':
            priorityText = i18n.t('low') || 'Low';
            break;
    }
    
    priorityElement.textContent = priorityText;
    
    // Set type
    const typeElement = document.getElementById('testcase-details-type');
    let typeText = i18n.t('functional') || 'Functional';
    
    switch (testCase.type) {
        case 'performance':
            typeText = i18n.t('performance') || 'Performance';
            break;
        case 'security':
            typeText = i18n.t('security') || 'Security';
            break;
        case 'usability':
            typeText = i18n.t('usability') || 'Usability';
            break;
        case 'compatibility':
            typeText = i18n.t('compatibility') || 'Compatibility';
            break;
        case 'api':
            typeText = i18n.t('api') || 'API';
            break;
    }
    
    typeElement.textContent = typeText;
    
    // Set updated date
    const updatedElement = document.getElementById('testcase-details-updated');
    const updatedDate = new Date(testCase.updated_at);
    updatedElement.textContent = updatedDate.toLocaleDateString();
    
    // Set tags
    const tagsElement = document.getElementById('testcase-details-tags');
    tagsElement.innerHTML = '';
    
    if (testCase.tags) {
        const tags = testCase.tags.split(',').map(tag => tag.trim());
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            tagElement.textContent = tag;
            tagsElement.appendChild(tagElement);
        });
    }
    
    // Set description
    document.getElementById('testcase-details-description').textContent = testCase.description || '';
    
    // Set steps
    const stepsContainer = document.getElementById('testcase-details-steps');
    stepsContainer.innerHTML = '';
    
    if (testCase.steps && testCase.steps.length > 0) {
        testCase.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-700';
            
            stepElement.innerHTML = `
                <div>
                    <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${i18n.t('step') || 'Step'} ${index + 1}: ${i18n.t('action') || 'Action'}</h5>
                    <p>${step.action}</p>
                </div>
                <div>
                    <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${i18n.t('expectedResult') || 'Expected Result'}</h5>
                    <p>${step.expected_result}</p>
                </div>
            `;
            
            stepsContainer.appendChild(stepElement);
        });
    } else {
        stepsContainer.innerHTML = `
            <p class="text-gray-500 dark:text-gray-400">${i18n.t('noSteps') || 'No steps defined for this test case.'}</p>
        `;
    }
    
    // Set button event listeners
    if (deleteButton) {
        deleteButton.onclick = () => {
            if (confirm(i18n.t('delete-confirm') || 'Are you sure you want to delete this test case?')) {
                deleteTestCase(testCaseId);
            }
        };
    }
    
    if (runButton) {
        runButton.onclick = () => {
            runTestCase(testCaseId);
        };
    }
    
    if (editButton) {
        editButton.onclick = () => {
            editTestCase(testCaseId);
        };
    }
    
    // Close button
    if (closeButton) {
        closeButton.onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
    }
    
    // Close when clicking outside modal content
    modal.onclick = (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Run a test case
 * @param {string} testCaseId - Test case ID
 */
function runTestCase(testCaseId) {
    ToastManager.info(i18n.t('running-testcase') || 'Running test case...');
    
    // Example implementation (in a real app, this would call the API to run the test case)
    setTimeout(() => {
        const testCase = AppState.testCases.find(tc => tc.id === testCaseId);
        if (testCase) {
            // Update test case status randomly for demonstration
            const statuses = ['passed', 'failed'];
            testCase.status = statuses[Math.floor(Math.random() * statuses.length)];
            
            // Refresh test case list
            renderTestCases();
            
            // Show notification
            if (testCase.status === 'passed') {
                ToastManager.success(i18n.t('testcase-passed') || 'Test case passed successfully');
            } else {
                ToastManager.error(i18n.t('testcase-failed') || 'Test case failed');
            }
            
            // Close details modal if open
            const detailsModal = document.getElementById('testcase-details-modal');
            if (detailsModal && !detailsModal.classList.contains('hidden')) {
                detailsModal.classList.add('hidden');
                detailsModal.classList.remove('flex');
            }
        }
    }, 2000);
}

/**
 * Edit a test case
 * @param {string} testCaseId - Test case ID
 */
function editTestCase(testCaseId) {
    // For demonstration purposes, simply show a message
    ToastManager.info(i18n.t('edit-testcase-not-implemented') || 'Edit test case functionality is not implemented in this demo');
}

/**
 * Delete a test case
 * @param {string} testCaseId - Test case ID
 */
function deleteTestCase(testCaseId) {
    // For demonstration purposes, remove the test case from the array and refresh the list
    AppState.testCases = AppState.testCases.filter(tc => tc.id !== testCaseId);
    renderTestCases();
    
    // Close details modal
    const detailsModal = document.getElementById('testcase-details-modal');
    if (detailsModal) {
        detailsModal.classList.add('hidden');
        detailsModal.classList.remove('flex');
    }
    
    ToastManager.success(i18n.t('testcase-deleted') || 'Test case deleted successfully');
}

/**
 * Initialize filter modal
 */
function initFilterModal() {
    const modal = document.getElementById('filter-modal');
    const closeButton = document.getElementById('close-filter-modal');
    const clearButton = document.getElementById('clear-filters-button');
    const form = document.getElementById('filter-form');
    
    // Close modal
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
    
    // Close button
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Clear filters button
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            form.reset();
            
            // Clear filters
            AppState.filters = {
                status: '',
                priority: '',
                type: '',
                tags: '',
                search: document.getElementById('search-testcases').value
            };
            
            // Render test cases with cleared filters
            renderTestCases();
            
            // Close modal
            closeModal();
        });
    }
    
    // Close when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            
            // Get filter values
            const statusFilter = document.getElementById('filter-status').value;
            const priorityFilter = document.getElementById('filter-priority').value;
            const typeFilter = document.getElementById('filter-type').value;
            const tagsFilter = document.getElementById('filter-tags').value;
            
            // Update filters
            AppState.filters.status = statusFilter;
            AppState.filters.priority = priorityFilter;
            AppState.filters.type = typeFilter;
            AppState.filters.tags = tagsFilter;
            
            // Render test cases with new filters
            renderTestCases();
            
            // Close modal
            closeModal();
        });
    }
}

/**
 * Show filter modal
 */
function showFilterModal() {
    const modal = document.getElementById('filter-modal');
    
    // Set current filter values
    document.getElementById('filter-status').value = AppState.filters.status;
    document.getElementById('filter-priority').value = AppState.filters.priority;
    document.getElementById('filter-type').value = AppState.filters.type;
    document.getElementById('filter-tags').value = AppState.filters.tags;
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Initialize context menu
 */
function initContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    
    // Hide context menu on document click
    document.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });
    
    // Add folder item context menu
    document.addEventListener('contextmenu', (event) => {
        const folderItem = event.target.closest('.tree-item');
        
        if (folderItem) {
            event.preventDefault();
            
            // Get folder ID
            const folderId = folderItem.getAttribute('data-folder-id');
            
            // Position context menu
            contextMenu.style.top = `${event.clientY}px`;
            contextMenu.style.left = `${event.clientX}px`;
            
            // Set context menu content
            contextMenu.innerHTML = `
                <div class="py-1">
                    <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="add-testcase" data-folder-id="${folderId}">
                        <i class="ri-add-line mr-2"></i> ${i18n.t('createTestCase') || 'Create Test Case'}
                    </button>
                    <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="add-subfolder" data-folder-id="${folderId}">
                        <i class="ri-folder-add-line mr-2"></i> ${i18n.t('createSubfolder') || 'Create Subfolder'}
                    </button>
                    <div class="border-t border-gray-200 dark:border-gray-700"></div>
                    <button class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="delete-folder" data-folder-id="${folderId}">
                        <i class="ri-delete-bin-line mr-2"></i> ${i18n.t('deleteFolder') || 'Delete Folder'}
                    </button>
                </div>
            `;
            
            // Show context menu
            contextMenu.classList.remove('hidden');
            
            // Add event listeners to context menu items
            const addTestCaseButton = contextMenu.querySelector('[data-action="add-testcase"]');
            const addSubfolderButton = contextMenu.querySelector('[data-action="add-subfolder"]');
            const deleteFolderButton = contextMenu.querySelector('[data-action="delete-folder"]');
            
            if (addTestCaseButton) {
                addTestCaseButton.addEventListener('click', () => {
                    showTestCaseModal(folderId);
                });
            }
            
            if (addSubfolderButton) {
                addSubfolderButton.addEventListener('click', () => {
                    showFolderModal(folderId);
                });
            }
            
            if (deleteFolderButton) {
                deleteFolderButton.addEventListener('click', () => {
                    // For demonstration purposes, show a confirmation message
                    if (confirm(i18n.t('delete-folder-confirm') || 'Are you sure you want to delete this folder?')) {
                        ToastManager.info(i18n.t('delete-folder-not-implemented') || 'Delete folder functionality is not implemented in this demo');
                    }
                });
            }
        } else {
            contextMenu.classList.add('hidden');
        }
    });
    
    // Add test case item context menu
    document.addEventListener('contextmenu', (event) => {
        const testCaseItem = event.target.closest('[data-testcase-id]');
        
        if (testCaseItem && !event.target.closest('.tree-item')) {
            event.preventDefault();
            
            // Get test case ID
            const testCaseId = testCaseItem.getAttribute('data-testcase-id');
            
            // Position context menu
            contextMenu.style.top = `${event.clientY}px`;
            contextMenu.style.left = `${event.clientX}px`;
            
            // Set context menu content
            contextMenu.innerHTML = `
                <div class="py-1">
                    <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="run-testcase" data-testcase-id="${testCaseId}">
                        <i class="ri-play-circle-line mr-2"></i> ${i18n.t('run') || 'Run'}
                    </button>
                    <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="edit-testcase" data-testcase-id="${testCaseId}">
                        <i class="ri-edit-line mr-2"></i> ${i18n.t('edit') || 'Edit'}
                    </button>
                    <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="view-testcase" data-testcase-id="${testCaseId}">
                        <i class="ri-eye-line mr-2"></i> ${i18n.t('view') || 'View Details'}
                    </button>
                    <div class="border-t border-gray-200 dark:border-gray-700"></div>
                    <button class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="delete-testcase" data-testcase-id="${testCaseId}">
                        <i class="ri-delete-bin-line mr-2"></i> ${i18n.t('delete') || 'Delete'}
                    </button>
                </div>
            `;
            
            // Show context menu
            contextMenu.classList.remove('hidden');
            
            // Add event listeners to context menu items
            const runButton = contextMenu.querySelector('[data-action="run-testcase"]');
            const editButton = contextMenu.querySelector('[data-action="edit-testcase"]');
            const viewButton = contextMenu.querySelector('[data-action="view-testcase"]');
            const deleteButton = contextMenu.querySelector('[data-action="delete-testcase"]');
            
            if (runButton) {
                runButton.addEventListener('click', () => {
                    runTestCase(testCaseId);
                });
            }
            
            if (editButton) {
                editButton.addEventListener('click', () => {
                    editTestCase(testCaseId);
                });
            }
            
            if (viewButton) {
                viewButton.addEventListener('click', () => {
                    showTestCaseDetails(testCaseId);
                });
            }
            
            if (deleteButton) {
                deleteButton.addEventListener('click', () => {
                    if (confirm(i18n.t('delete-confirm') || 'Are you sure you want to delete this test case?')) {
                        deleteTestCase(testCaseId);
                    }
                });
            }
        }
    });
}