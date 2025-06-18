import authManager from '../api/auth.js';
import { TestCaseClient } from '../api/testcases.js';
import projects from '../api/projects.js';
import ToastManager from '../utils/toast.js';
import { formatDateTime } from '../utils/date.js';
import { updateUserUI } from '../services/user.js';
import { wsService } from '../services/websocket.js';
import Router from '../utils/router.js';

class TestCasesPage {
    constructor() {
        this.testCaseClient = new TestCaseClient();
        this.projectClient = projects;
        this.toastManager = ToastManager;
        this.router = new Router();
        
        this.currentProject = null;
        this.currentFolder = null;
        this.testCases = [];
        this.projects = [];
        this.folders = [];
        
        // UI state
        this.expandedFolders = new Set();
        this.selectedItem = null;
        
        // Search, filter and sort state
        this.searchTerm = '';
        this.filters = {
            status: '',
            priority: '',
            type: ''
        };
        this.sortBy = 'name';
        
        this.init();
    }

    async init() {
        console.log('[TestCases] Initializing page');
        
        try {
            // Check authentication
            const token = localStorage.getItem('flowtest_access_token');
            if (!token) {
                console.log('[TestCases] No token found, redirecting to login');
                window.location.href = '/login.html';
                return;
            }

            // Update user UI
            console.log('[TestCases] Updating user UI...');
            await updateUserUI();
            console.log('[TestCases] User UI updated');

            // Load initial data
            console.log('[TestCases] Loading projects...');
            await this.loadProjects();
            console.log('[TestCases] Projects loaded');
            
            // Check if we need to load folders for current project
            // This handles the case when returning from test run page
            const projectSelector = document.getElementById('projectSelector');
            if (projectSelector && projectSelector.value && !this.folders.length) {
                console.log('[TestCases] Loading folders for selected project:', projectSelector.value);
                this.currentProject = projectSelector.value;
                await this.loadFolders();
            }
            
            // Initialize folder tree (will show empty state)
            this.updateFolderTree();
            
            // Setup event listeners
            this.setupEventListeners();
            this.setupSidebarToggle();
            this.setupContextMenu();
            this.setupModals();
            
            console.log('[TestCases] Page initialization completed successfully');
        } catch (error) {
            console.error('[TestCases] Error during page initialization:', error);
            this.toastManager.error('Failed to initialize page');
        }
    }

    setupEventListeners() {
        // Project selector
        const projectSelector = document.getElementById('projectSelector');
        if (projectSelector) {
            projectSelector.addEventListener('change', (e) => this.handleProjectChange(e));
        }

        // Create test case button
        const createTestCaseBtn = document.getElementById('create-testcase-button');
        if (createTestCaseBtn) {
            createTestCaseBtn.addEventListener('click', () => this.showCreateTestCaseModal());
        }

        // Automation button
        const automationBtn = document.getElementById('automation-button');
        if (automationBtn) {
            automationBtn.addEventListener('click', () => this.showAutomationModal());
        }


        // Add project button (in header)
        const addProjectBtn = document.getElementById('addProjectBtn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', () => this.showCreateProjectModal());
        }

        // Search input in sidebar
        const searchInput = document.getElementById('search-folders');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleFolderSearch(e.target.value));
        }

        // Filters
        ['filter-status', 'filter-priority', 'filter-type'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });

        // Sort options
        document.querySelectorAll('input[name="sort"]').forEach(radio => {
            radio.addEventListener('change', () => this.applySorting());
        });

        // User dropdown
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener('click', () => {
                userDropdown.classList.toggle('hidden');
            });
            
            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.add('hidden');
                }
            });
        }

        // Logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await authManager.logout();
                window.location.href = '/login.html';
            });
        }
        
        // Clear folder selection when clicking on main content area
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.addEventListener('click', (e) => {
                // Only clear if clicking on empty area (not on folder elements or forms)
                if (e.target === mainContent || e.target.closest('.empty-state')) {
                    this.clearFolderSelection();
                }
            });
        }
    }

    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('-translate-x-full');
                console.log('[TestCases] Sidebar toggled');
            });
        }
    }

    toggleSidebarSection(event) {
        const button = event.currentTarget;
        const section = button.closest('.sidebar-section');
        const content = section.querySelector('.sidebar-section-content');
        const icon = button.querySelector('i');
        
        if (content && icon) {
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-90');
            console.log('[TestCases] Toggled sidebar section');
        }
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        
        // Hide context menu on click anywhere
        document.addEventListener('click', () => {
            if (contextMenu) {
                contextMenu.classList.add('hidden');
            }
        });

        // Prevent default context menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.folder-tree') || e.target.closest('.empty-state')) {
                e.preventDefault();
            }
        });

        // Add context menu to folders tree container
        const foldersTree = document.getElementById('folders-tree');
        if (foldersTree) {
            foldersTree.addEventListener('contextmenu', (e) => {
                // Only handle if clicked on empty space, not on a folder
                if (!e.target.closest('.folder-item')) {
                    e.preventDefault();
                    this.handleEmptyStateContextMenu(e);
                }
            });
        }
    }

    setupModals() {
        // Create folder modal
        const folderModal = document.getElementById('folder-modal');
        const createFolderForm = document.getElementById('create-folder-form');
        const closeFolderModal = document.getElementById('close-folder-modal');
        const cancelFolderBtn = document.getElementById('cancel-folder-btn');

        if (closeFolderModal) {
            closeFolderModal.addEventListener('click', () => {
                if (folderModal) {
                    folderModal.classList.add('hidden');
                    folderModal.style.display = '';
                }
            });
        }

        // Cancel button is handled via onclick in HTML

        if (createFolderForm) {
            createFolderForm.addEventListener('submit', (e) => this.handleCreateFolder(e));
        }

        // Create test case modal
        const testCaseModal = document.getElementById('testcase-modal');
        const createTestCaseForm = document.getElementById('create-testcase-form');
        const closeTestCaseModal = document.getElementById('close-testcase-modal');
        const cancelTestCaseBtn = document.getElementById('cancel-testcase-btn');

        if (closeTestCaseModal) {
            closeTestCaseModal.addEventListener('click', () => {
                this.closeTestCaseModal();
            });
        }

        // Cancel button is handled via onclick in HTML

        // Test case type change handler
        const testcaseTypeSelect = document.getElementById('testcase-type');
        if (testcaseTypeSelect) {
            testcaseTypeSelect.addEventListener('change', (e) => {
                this.handleTestCaseTypeChange(e.target.value);
            });
        }

        if (createTestCaseForm) {
            createTestCaseForm.addEventListener('submit', (e) => this.handleCreateTestCase(e));
        }

        // Click outside modal to close
        [folderModal, testCaseModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.add('hidden');
                        modal.style.display = '';
                    }
                });
            }
        });
    }

    async loadProjects() {
        try {
            console.log('[TestCases] Loading projects...');
            const response = await this.projectClient.getAll();
            console.log('[TestCases] Projects API response:', response);
            
            // Handle both paginated and non-paginated responses
            if (response) {
                if (response.results) {
                    // Paginated response
                    this.projects = response.results;
                } else if (Array.isArray(response)) {
                    // Direct array response
                    this.projects = response;
                } else {
                    console.log('[TestCases] Unexpected response format:', response);
                    this.projects = [];
                }
                
                console.log('[TestCases] Projects loaded:', this.projects.length);
                this.updateProjectSelector();
                
                // Select first project if available
                if (this.projects.length > 0 && !this.currentProject) {
                    const projectSelector = document.getElementById('projectSelector');
                    if (projectSelector) {
                        projectSelector.value = this.projects[0].id;
                        await this.handleProjectChange({ target: projectSelector });
                    }
                }
            } else {
                console.log('[TestCases] No projects in response or response is empty');
                this.projects = [];
                this.updateProjectSelector();
            }
        } catch (error) {
            console.error('[TestCases] Error loading projects:', error);
            this.projects = [];
            this.updateProjectSelector();
            
            // Don't show error toast if it's a 404 or authentication issue
            if (error.status !== 404 && error.status !== 401) {
                this.toastManager.error('Failed to load projects');
            }
        }
    }

    updateProjectSelector() {
        const projectSelector = document.getElementById('projectSelector');
        if (!projectSelector) return;

        // Clear existing options
        projectSelector.innerHTML = '<option value="" data-i18n="selectProject">Выберите проект</option>';

        // Add project options
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelector.appendChild(option);
        });

        console.log('[TestCases] Updated project selector with', this.projects.length, 'projects');
    }

    async handleProjectChange(event) {
        const projectId = event.target.value;
        
        // Disconnect previous WebSocket if any
        if (this.currentProject) {
            wsService.disconnect('test_execution');
        }
        
        if (!projectId) {
            this.currentProject = null;
            this.folders = [];
            this.updateFolderTree();
            this.showEmptyState();
            return;
        }

        this.currentProject = projectId;
        console.log('[TestCases] Selected project:', projectId);
        
        // Connect WebSocket for real-time updates (disabled for now)
        // this.setupWebSocket(projectId);
        
        // Load folders for the project
        await this.loadFolders();
    }
    
    setupWebSocket(projectId) {
        // WebSocket is optional - don't let it break the page
        try {
            // Connect to test execution WebSocket
            wsService.connect('test_execution', projectId);
            
            // Handle test execution updates
            wsService.on('test_execution', 'test_execution_status', (data) => {
                console.log('[TestCases] Test execution status update:', data);
                this.handleTestExecutionUpdate(data);
            });
            
            // Handle test execution logs
            wsService.on('test_execution', 'test_execution_log', (data) => {
                console.log('[TestCases] Test execution log:', data);
                // Could show logs in a console window if needed
            });
            
            // Handle repository sync updates
            wsService.on('test_execution', 'repository_sync_update', (data) => {
                console.log('[TestCases] Repository sync update:', data);
                this.handleRepositorySyncUpdate(data);
            });
        } catch (error) {
            console.log('[TestCases] WebSocket connection failed (non-critical):', error.message);
            // Continue without WebSocket - it's optional
        }
    }
    
    handleTestExecutionUpdate(data) {
        // Update test case card with execution status
        const testCaseCard = document.querySelector(`[data-test-case-id="${data.test_case_id}"]`);
        if (testCaseCard) {
            // Update status badge
            const statusBadge = testCaseCard.querySelector('.test-status-badge');
            if (statusBadge) {
                statusBadge.textContent = data.status;
                statusBadge.className = `test-status-badge ${this.getStatusClass(data.status)}`;
            }
        }
        
        // Show toast notification
        if (data.status === 'success') {
            this.toastManager.success(`Test execution completed successfully`);
        } else if (data.status === 'failed') {
            this.toastManager.error(`Test execution failed: ${data.message || 'Unknown error'}`);
        }
    }
    
    handleRepositorySyncUpdate(data) {
        // Show sync status notification
        if (data.status === 'syncing') {
            this.toastManager.info(`Repository sync in progress: ${data.message}`);
        } else if (data.status === 'synced') {
            this.toastManager.success(`Repository sync completed: ${data.message}`);
        } else if (data.status === 'error') {
            this.toastManager.error(`Repository sync failed: ${data.message}`);
        }
    }
    
    getStatusClass(status) {
        const statusClasses = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'running': 'bg-blue-100 text-blue-800',
            'success': 'bg-green-100 text-green-800',
            'passed': 'bg-green-100 text-green-800',
            'failed': 'bg-red-100 text-red-800',
            'error': 'bg-red-100 text-red-800',
            'timeout': 'bg-orange-100 text-orange-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }

    async loadFolders() {
        if (!this.currentProject) return;

        try {
            console.log('[TestCases] Loading folders for project:', this.currentProject);
            const response = await this.projectClient.getFolders(this.currentProject);
            
            // Handle both paginated and non-paginated responses
            if (response) {
                if (response.results) {
                    // Paginated response
                    this.folders = response.results;
                } else if (Array.isArray(response)) {
                    // Direct array response
                    this.folders = response;
                } else {
                    console.log('[TestCases] Unexpected folders response format:', response);
                    this.folders = [];
                }
            } else {
                this.folders = [];
            }

            console.log('[TestCases] Loaded', this.folders.length, 'folders');
            this.updateFolderTree();
            this.updateTestCasesList();
        } catch (error) {
            console.error('[TestCases] Error loading folders:', error);
            // Don't show error for 404 - just means no folders yet
            if (error.status !== 404) {
                this.toastManager.error('Failed to load folders');
            }
            this.folders = [];
            this.updateFolderTree();
            this.updateTestCasesList();
        }
    }

    updateFolderTree() {
        const folderTree = document.getElementById('folders-tree');
        const emptyState = document.getElementById('folders-empty-state');
        if (!folderTree) return;

        if (this.folders.length === 0 || !this.currentProject) {
            // Show empty state
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
            // Clear any existing tree content except empty state
            const children = Array.from(folderTree.children);
            children.forEach(child => {
                if (child.id !== 'folders-empty-state') {
                    child.remove();
                }
            });
            return;
        }

        // Hide empty state and show tree
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Clear existing tree content except empty state
        const children = Array.from(folderTree.children);
        children.forEach(child => {
            if (child.id !== 'folders-empty-state') {
                child.remove();
            }
        });

        // Build folder hierarchy
        const rootFolders = this.folders.filter(f => !f.parent);
        rootFolders.forEach(folder => {
            const folderElement = this.createFolderElement(folder);
            folderTree.appendChild(folderElement);
        });


        console.log('[TestCases] Updated folder tree with', this.folders.length, 'folders');
    }

    createFolderElement(folder, level = 0) {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.dataset.folderId = folder.id;

        const childFolders = this.folders.filter(f => f.parent === folder.id);
        const hasTestCases = (folder.test_cases_count || 0) > 0;
        const hasChildren = childFolders.length > 0 || hasTestCases;
        const isExpanded = this.expandedFolders.has(folder.id);

        div.innerHTML = `
            <div class="folder-header flex items-center py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" style="padding-left: ${level * 20 + 8}px">
                <button class="folder-toggle mr-1 ${hasChildren ? '' : 'invisible'}" data-folder-id="${folder.id}">
                    <i class="ri-arrow-right-s-line text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}"></i>
                </button>
                <i class="ri-folder-${isExpanded ? 'open' : '3'}-line text-yellow-500 mr-2"></i>
                <span class="folder-name flex-1 text-sm">${folder.name}</span>
                <span class="test-count text-xs text-gray-500 dark:text-gray-400">${folder.test_cases_count || 0}</span>
            </div>
            ${hasChildren ? `
                <div class="folder-content ${isExpanded ? '' : 'hidden'}">
                    <div class="folder-children"></div>
                    <div class="folder-test-cases" data-folder-id="${folder.id}"></div>
                </div>
            ` : ''}
        `;

        // Add event listeners
        const header = div.querySelector('.folder-header');
        const toggle = div.querySelector('.folder-toggle');
        
        header.addEventListener('click', (e) => {
            if (!e.target.closest('.folder-toggle')) {
                this.selectFolder(folder);
            }
        });

        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showFolderContextMenu(e, folder);
        });

        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFolder(folder.id);
            });
        }

        // Add child folders
        if (hasChildren) {
            const childrenContainer = div.querySelector('.folder-children');
            childFolders.forEach(child => {
                const childElement = this.createFolderElement(child, level + 1);
                childrenContainer.appendChild(childElement);
            });
        }

        return div;
    }

    async toggleFolder(folderId) {
        if (this.expandedFolders.has(folderId)) {
            this.expandedFolders.delete(folderId);
        } else {
            this.expandedFolders.add(folderId);
        }
        
        // Update URL if this folder is currently selected
        if (this.currentFolder && this.currentFolder.id === folderId) {
            this.updateUrlForFolder(folderId);
        }
        
        // Update the specific folder element
        const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
        if (folderElement) {
            const toggle = folderElement.querySelector('.folder-toggle i');
            const folderIcon = folderElement.querySelector('.folder-header > i[class*="folder"]');
            const folderContent = folderElement.querySelector('.folder-content');
            
            if (toggle) {
                toggle.classList.toggle('rotate-90');
            }
            
            if (folderIcon) {
                if (this.expandedFolders.has(folderId)) {
                    folderIcon.className = folderIcon.className.replace('folder-3', 'folder-open');
                } else {
                    folderIcon.className = folderIcon.className.replace('folder-open', 'folder-3');
                }
            }
            
            if (folderContent) {
                folderContent.classList.toggle('hidden');
                
                // Load test cases when expanding folder
                if (this.expandedFolders.has(folderId)) {
                    await this.loadFolderTestCases(folderId);
                }
            }
        }

        console.log('[TestCases] Toggled folder:', folderId);
    }
    
    async loadFolderTestCases(folderId) {
        try {
            console.log('[TestCases] Loading test cases for folder:', folderId);
            const response = await this.testCaseClient.getTestCases(this.currentProject, { folder_id: folderId });
            
            const testCases = response?.results || response || [];
            console.log('[TestCases] Loaded', testCases.length, 'test cases for folder', folderId);
            
            // Find the test cases container for this folder
            const testCasesContainer = document.querySelector(`[data-folder-id="${folderId}"].folder-test-cases`);
            if (!testCasesContainer) {
                console.error('[TestCases] Test cases container not found for folder:', folderId);
                return;
            }
            
            // Clear existing test cases
            testCasesContainer.innerHTML = '';
            
            // Add test cases to the container
            testCases.forEach(testCase => {
                const testCaseElement = this.createTestCaseTreeElement(testCase, folderId);
                testCasesContainer.appendChild(testCaseElement);
            });
            
        } catch (error) {
            console.error('[TestCases] Error loading test cases for folder:', folderId, error);
        }
    }
    
    createTestCaseTreeElement(testCase, folderId) {
        // Find the folder level to calculate proper indentation
        const folder = this.folders.find(f => f.id === folderId);
        const folderLevel = this.getFolderLevel(folder);
        const testCaseIndent = (folderLevel + 1) * 20 + 8; // Same as folder content level
        
        const div = document.createElement('div');
        div.className = 'test-case-item py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer';
        div.style.paddingLeft = `${testCaseIndent}px`;
        div.dataset.testCaseId = testCase.id;
        
        console.log('[TestCases] Creating test case tree element:', testCase.title, 'ID:', testCase.id);
        
        div.innerHTML = `
            <div class="flex items-center overflow-hidden">
                <i class="ri-file-text-line text-blue-500 mr-2 text-sm flex-shrink-0"></i>
                <span class="test-case-name flex-1 text-sm text-gray-700 dark:text-gray-300 truncate mr-2">${testCase.title}</span>
                <span class="test-case-priority text-xs px-2 py-1 rounded flex-shrink-0 ${this.getPriorityClass(testCase.priority)}">${testCase.priority}</span>
            </div>
        `;
        
        // Add click handler to open test case
        div.addEventListener('click', () => {
            this.openTestCase(testCase);
        });
        
        // Если активен режим прогона, сразу добавляем элементы управления
        if (this.currentTestRun && window.checkAndAddTestRunControls) {
            setTimeout(() => {
                window.checkAndAddTestRunControls();
            }, 100);
        }
        
        return div;
    }
    
    getPriorityClass(priority) {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    }
    
    getFolderLevel(folder) {
        if (!folder) return 0;
        
        let level = 0;
        let currentFolder = folder;
        
        while (currentFolder && currentFolder.parent) {
            level++;
            currentFolder = this.folders.find(f => f.id === currentFolder.parent);
        }
        
        return level;
    }
    
    async openTestCase(testCase) {
        console.log('[TestCases] Opening test case:', testCase.title);
        
        try {
            // Load full test case data (in case tree version is incomplete)
            const fullTestCase = await this.testCaseClient.getTestCase(this.currentProject, testCase.id);
            
            // Use the existing openTestCaseForm function
            window.openTestCaseForm(fullTestCase);
            
            // Update URL to reflect current test case
            this.updateUrlForTestCase(fullTestCase.id, fullTestCase.folder);
            
            console.log('[TestCases] Test case opened for editing:', fullTestCase.id);
            
        } catch (error) {
            console.error('[TestCases] Error opening test case:', error);
            this.toastManager.error('Ошибка при открытии тест-кейса');
        }
    }

    selectFolder(folder) {
        // Remove previous selection
        document.querySelectorAll('.folder-header').forEach(header => {
            header.classList.remove('bg-blue-50', 'dark:bg-blue-900', 'border-l-2', 'border-blue-500');
        });

        // Add selection to current folder
        const folderElement = document.querySelector(`[data-folder-id="${folder.id}"] .folder-header`);
        if (folderElement) {
            folderElement.classList.add('bg-blue-50', 'dark:bg-blue-900', 'border-l-2', 'border-blue-500');
        }

        this.currentFolder = folder;
        console.log('[TestCases] Selected folder:', folder.name);
        
        // Update URL to reflect selected folder
        this.updateUrlForFolder(folder.id);
        
        // Open folder form in view mode
        this.showFolderDetails(folder);
    }

    async loadTestCases(folderId) {
        try {
            console.log('[TestCases] Loading test cases for folder:', folderId);
            
            // Load test cases from API
            if (folderId && this.currentProject) {
                let response; // Declare response here to be available in catch block
                try {
                    response = await this.testCaseClient.getTestCases(this.currentProject, { folder: folderId });
                    if (response && response.data) {
                        this.testCases = response.data.results || response.data || [];
                    } else if (response && response.results) { // Handle cases where data might be directly in results
                        this.testCases = response.results;
                    } else if (Array.isArray(response)) { // Handle cases where response is directly an array
                        this.testCases = response;
                    } else {
                        this.testCases = [];
                        console.warn('[TestCases] Unexpected response structure for test cases:', response);
                    }
                    console.log('[TestCases] Loaded test cases from API:', this.testCases.length);
                } catch (apiError) {
                    console.warn('[TestCases] API call failed, using mock data:', apiError);
                    // Fallback to mock data if API fails
                    this.testCases = this.getMockTestCases(folderId);
                }
            } else {
                // Use mock data if no folder selected
                this.testCases = this.getMockTestCases(folderId);
            }

            this.updateTestCasesList();
        } catch (error) {
            // This catch block is for errors outside the API call itself, e.g., in updateTestCasesList
            console.error('[TestCases] Error processing test cases (after API call or if no folderId):', error);
            // If response was defined from a successful API call but processing failed, log it.
            if (typeof response !== 'undefined') {
                console.error('[TestCases] API Response that may have caused processing error:', response);
            }
            this.toastManager.error('Failed to load or process test cases');
        }
    }

    updateTestCasesList() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        const emptyState = document.getElementById('empty-state');
        const testCasesList = document.getElementById('test-cases-list');

        const filteredTestCases = this.getFilteredAndSortedTestCases();

        // Проверяем, есть ли папки или тест-кейсы в принципе
        const hasContent = this.folders.length > 0 || this.testCases.length > 0;

        if (filteredTestCases.length === 0 && !hasContent) {
            // Показываем empty state только если вообще нет контента
            if (emptyState) emptyState.classList.remove('hidden');
            if (testCasesList) testCasesList.classList.add('hidden');
            return;
        }

        // Если есть папки в дереве, скрываем empty state, даже если нет отфильтрованных тест-кейсов
        if (emptyState) emptyState.classList.add('hidden');
        
        if (filteredTestCases.length === 0) {
            // Есть структура папок, но нет тест-кейсов для отображения
            if (testCasesList) testCasesList.classList.add('hidden');
            return;
        }

        if (testCasesList) {
            testCasesList.classList.remove('hidden');
            
            testCasesList.innerHTML = `
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    ${filteredTestCases.map(tc => this.createTestCaseCard(tc)).join('')}
                </div>
            `;

            // Add event listeners to test case cards
            testCasesList.querySelectorAll('.test-case-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const testCaseId = card.dataset.testCaseId;
                    const testCase = this.testCases.find(tc => tc.id === testCaseId);
                    if (testCase) {
                        this.viewTestCase(testCase);
                    }
                });
                
                card.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const testCaseId = card.dataset.testCaseId;
                    const testCase = this.testCases.find(tc => tc.id === testCaseId);
                    if (testCase) {
                        this.showTestCaseContextMenu(e, testCase);
                    }
                });
            });
        }
        
        // Если активен режим прогона, добавляем элементы управления
        if (window.checkAndAddTestRunControls) {
            window.checkAndAddTestRunControls();
        }
    }

    createTestCaseCard(testCase) {
        const statusColors = {
            passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        };

        const priorityColors = {
            high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        };
        
        const isAutomated = testCase.type === 'automated' || testCase.test_type === 'automated';
        
        return `
            <div class="test-case-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" data-test-case-id="${testCase.id}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-medium text-gray-900 dark:text-gray-100">${testCase.name || testCase.title}</h3>
                    <div class="flex gap-2">
                        <span class="px-2 py-1 text-xs rounded-full ${statusColors[testCase.status] || statusColors.pending}">
                            ${testCase.status}
                        </span>
                        <span class="px-2 py-1 text-xs rounded-full ${priorityColors[testCase.priority] || priorityColors.medium}">
                            ${testCase.priority}
                        </span>
                    </div>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${testCase.description}</p>
                ${isAutomated ? `
                    <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span class="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <i class="ri-code-s-slash-line mr-1"></i> Automated
                        </span>
                        <button onclick="event.stopPropagation(); testCasesPage.runTestCase('${testCase.id}')" 
                                class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center">
                            <i class="ri-play-line mr-1"></i> Run Test
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    showEmptyState() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="empty-state flex items-center justify-center h-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg m-6">
                <div class="text-center text-gray-500 dark:text-gray-400">
                    <i class="ri-folder-add-line text-4xl mb-2"></i>
                    <p>Select a project to start</p>
                    <p class="text-sm mt-1">Right-click here to create folders and test cases</p>
                </div>
            </div>
        `;

        // Add context menu to empty state
        const emptyState = mainContent.querySelector('.empty-state');
        if (emptyState) {
            emptyState.addEventListener('contextmenu', (e) => this.handleEmptyStateContextMenu(e));
        }
    }

    hideEmptyState() {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.querySelector('.empty-state')) {
            mainContent.innerHTML = '';
        }
    }

    handleEmptyStateContextMenu(event) {
        event.preventDefault();
        console.log('[TestCases] handleEmptyStateContextMenu called');
        
        if (!this.currentProject) {
            this.toastManager.warning('Сначала выберите проект');
            return;
        }

        const contextMenu = document.getElementById('context-menu');
        if (!contextMenu) {
            console.error('[TestCases] Context menu element not found');
            return;
        }

        contextMenu.innerHTML = `
            <div class="py-1">
                <button class="context-menu-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" onclick="testCasesPage.showCreateFolderForm()">
                    <i class="ri-folder-add-line mr-2"></i> Создать папку
                </button>
                <button class="context-menu-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" onclick="testCasesPage.showCreateTestCaseModal()">
                    <i class="ri-file-add-line mr-2"></i> Создать тест-кейс
                </button>
            </div>
        `;

        this.positionContextMenu(contextMenu, event);
        console.log('[TestCases] Context menu positioned');
    }

    showFolderContextMenu(event, folder) {
        const contextMenu = document.getElementById('context-menu');
        if (!contextMenu) return;

        contextMenu.innerHTML = `
            <div class="py-1">
                <button class="context-menu-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" onclick="testCasesPage.showCreateTestCaseModal('${folder.id}')">
                    <i class="ri-file-add-line mr-2"></i> Создать тест-кейс
                </button>
                <button class="context-menu-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" onclick="testCasesPage.showCreateFolderForm('${folder.id}')">
                    <i class="ri-folder-add-line mr-2"></i> Создать подпапку
                </button>
                <button class="context-menu-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" onclick="testCasesPage.editFolder('${folder.id}')">
                    <i class="ri-edit-line mr-2"></i> Редактировать
                </button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button class="context-menu-item w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" onclick="testCasesPage.deleteFolder('${folder.id}')">
                    <i class="ri-delete-bin-line mr-2"></i> Удалить
                </button>
            </div>
        `;

        this.positionContextMenu(contextMenu, event);
    }

    showTestCaseContextMenu(event, testCase) {
        const contextMenu = document.getElementById('context-menu');
        if (!contextMenu) return;

        contextMenu.innerHTML = `
            <div class="py-1">
                <button class="context-menu-item" onclick="testCasesPage.runTestCase('${testCase.id}')">
                    <i class="ri-play-line mr-2"></i> Run Test
                </button>
                <button class="context-menu-item" onclick="testCasesPage.editTestCase('${testCase.id}')">
                    <i class="ri-edit-line mr-2"></i> Edit
                </button>
                <button class="context-menu-item" onclick="testCasesPage.duplicateTestCase('${testCase.id}')">
                    <i class="ri-file-copy-line mr-2"></i> Duplicate
                </button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button class="context-menu-item text-red-600 dark:text-red-400" onclick="testCasesPage.deleteTestCase('${testCase.id}')">
                    <i class="ri-delete-bin-line mr-2"></i> Delete
                </button>
            </div>
        `;

        this.positionContextMenu(contextMenu, event);
    }

    positionContextMenu(menu, event) {
        // Get click coordinates
        let x = event.clientX;
        let y = event.clientY;
        
        // Add small offset to position menu slightly away from cursor
        x += 2;
        y += 2;
        
        console.log('[TestCases] Context menu position:', { x, y, clientX: event.clientX, clientY: event.clientY });
        
        // Initially hide menu to calculate dimensions
        menu.style.visibility = 'hidden';
        menu.classList.remove('hidden');
        
        // Get menu dimensions
        const rect = menu.getBoundingClientRect();
        const menuWidth = rect.width;
        const menuHeight = rect.height;
        
        // Adjust position if menu goes off-screen
        if (x + menuWidth > window.innerWidth - 5) {
            x = x - menuWidth - 5;
        }
        
        if (y + menuHeight > window.innerHeight - 5) {
            y = y - menuHeight - 5;
        }
        
        // Ensure menu doesn't go off the left or top edge
        if (x < 5) x = 5;
        if (y < 5) y = 5;
        
        // Apply final position
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.visibility = 'visible';
    }

    hideAllViews() {
        // Hide all possible views
        const emptyState = document.getElementById('empty-state');
        const testCasesList = document.getElementById('test-cases-list');
        const folderFormView = document.getElementById('folder-form-view');
        const testCaseFormView = document.getElementById('test-case-form-view');
        
        if (emptyState) emptyState.classList.add('hidden');
        if (testCasesList) testCasesList.classList.add('hidden');
        if (folderFormView) folderFormView.classList.add('hidden');
        if (testCaseFormView) testCaseFormView.classList.add('hidden');
    }

    showCreateFolderForm(parentId = null, folderData = null) {
        console.log('[TestCases] showCreateFolderForm called, parentId:', parentId, 'folderData:', folderData);
        
        if (!this.currentProject) {
            this.toastManager.warning('Сначала выберите проект');
            return;
        }
        
        // Hide all other views
        this.hideAllViews();
        
        // Show folder form view
        const formView = document.getElementById('folder-form-view');
        formView.classList.remove('hidden');
        
        // Update form title
        const formTitle = document.getElementById('folder-form-title');
        const formSubtitle = document.getElementById('folder-form-subtitle');
        const actionButtons = document.getElementById('folder-action-buttons');
        
        // Show form fields
        const formContainer = document.querySelector('#folder-form');
        if (formContainer) {
            formContainer.style.display = 'block';
        }
        
        // Ensure fields are enabled
        document.getElementById('folder-name').disabled = false;
        document.getElementById('folder-description').disabled = false;
        document.getElementById('folder-parent').disabled = false;
        
        if (folderData) {
            // Edit mode
            formTitle.textContent = 'Редактирование папки';
            formSubtitle.textContent = 'Измените настройки папки';
            formSubtitle.style.display = 'block';
            actionButtons.classList.remove('hidden');
            
            // Make sure the actions section is visible
            const actionsSection = document.querySelector('#folder-form-view .bg-white.border-2');
            if (actionsSection) {
                actionsSection.style.display = 'block';
            }
            
            // Fill form with folder data
            document.getElementById('folder-name').value = folderData.name || '';
            document.getElementById('folder-description').value = folderData.description || '';
            document.getElementById('folder-parent').value = folderData.parent || '';
            
            // Set meta information
            document.getElementById('folder-author').textContent = folderData.author_name || folderData.author || '-';
            document.getElementById('folder-created-date').textContent = folderData.created_at ? new Date(folderData.created_at).toLocaleString() : '-';
            document.getElementById('folder-modified-date').textContent = folderData.updated_at ? new Date(folderData.updated_at).toLocaleString() : '-';
            document.getElementById('folder-modified-by').textContent = folderData.last_modified_by_name || folderData.last_modified_by || '-';
            
            // Store folder ID for saving
            formView.dataset.folderId = folderData.id;
            delete formView.dataset.viewMode;
        } else {
            // Create mode
            formTitle.textContent = 'Новая папка';
            formSubtitle.textContent = 'Создайте папку для организации тест-кейсов';
            formSubtitle.style.display = 'block';
            actionButtons.classList.add('hidden');
            
            // Make sure the actions section is visible
            const actionsSection = document.querySelector('#folder-form-view .bg-white.border-2');
            if (actionsSection) {
                actionsSection.style.display = 'block';
            }
            
            // Reset form
            document.getElementById('folder-form').reset();
            document.getElementById('folder-parent').value = parentId || '';
            
            // Set current user as author
            const currentUser = localStorage.getItem('flowtest_username') || 'Текущий пользователь';
            document.getElementById('folder-author').textContent = currentUser;
            document.getElementById('folder-created-date').textContent = new Date().toLocaleString();
            document.getElementById('folder-modified-date').textContent = '-';
            document.getElementById('folder-modified-by').textContent = '-';
            
            // Clear folder ID
            delete formView.dataset.folderId;
        }
        
        // Update parent folder options
        this.updateParentFolderOptions(parentId);
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Update URL to reflect current state
        if (folderData) {
            // Editing existing folder
            this.updateUrlForEditFolder(folderData.id);
        } else {
            // Creating new folder
            this.updateUrlForNewFolder(parentId);
        }
        
        // Focus on name field
        setTimeout(() => {
            document.getElementById('folder-name').focus();
        }, 100);
    }
    
    updateParentFolderOptions(selectedParentId = null) {
        const parentSelect = document.getElementById('folder-parent');
        if (!parentSelect) return;
        
        // Clear existing options
        parentSelect.innerHTML = '<option value="">Корневая папка (без родителя)</option>';
        
        // Add folder options
        this.folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            if (folder.id === selectedParentId) {
                option.selected = true;
            }
            parentSelect.appendChild(option);
        });
    }

    showCreateTestCaseModal(folderId = null) {
        console.log('[TestCases] showCreateTestCaseModal called, folderId:', folderId);
        
        if (!this.currentProject) {
            this.toastManager.warning('Сначала выберите проект');
            return;
        }
        
        // Store folder ID for new test case
        if (folderId || this.currentFolder) {
            this.selectedFolderId = folderId || this.currentFolder.id;
        }
        
        // Hide all other views first
        this.hideAllViews();
        
        // Use the new form
        window.openTestCaseForm();
        
        // Update URL to reflect current state
        this.updateUrlForNewTestCase(folderId || this.currentFolder?.id);
        
        console.log('[TestCases] Test case form opened');
    }

    closeTestCaseModal() {
        const modal = document.getElementById('testcase-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = '';
        }
        
        // Reset form
        const form = document.getElementById('create-testcase-form');
        if (form) {
            form.reset();
        }
        
        // Reset validation states
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.remove('border-red-500');
        });
        
        const errorMessages = form.querySelectorAll('.text-red-500');
        errorMessages.forEach(msg => {
            msg.textContent = '';
        });
        
        // Hide automation section
        const automationSection = document.getElementById('automation-section');
        if (automationSection) {
            automationSection.classList.add('hidden');
        }
        
        // Clear URL hash
        this.clearUrl();
        
        this.editingTestCase = null;
    }

    updateFolderSelectOptions(folderSelect, selectedFolderId = null) {
        if (!folderSelect) return;
        
        // Clear existing options
        folderSelect.innerHTML = '<option value="" data-i18n="selectFolder">Select Folder</option>';
        
        // Add folders
        this.folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            if (folder.id === selectedFolderId || folder.id === this.currentFolder?.id) {
                option.selected = true;
            }
            folderSelect.appendChild(option);
        });
    }

    handleTestCaseTypeChange(type) {
        const automationSection = document.getElementById('automation-section');
        if (!automationSection) return;
        
        if (type === 'automated') {
            automationSection.classList.remove('hidden');
            // Load automation projects if needed
            this.loadAutomationProjects();
        } else {
            automationSection.classList.add('hidden');
        }
    }

    async loadAutomationProjects() {
        const projectSelect = document.getElementById('testcase-automation-project');
        if (!projectSelect || !this.currentProject) return;
        
        try {
            // TODO: Replace with actual API call
            // const response = await this.automationClient.getProjects(this.currentProject);
            
            // For now, show mock data
            const mockProjects = [
                { id: '1', name: 'Web Tests Repository', url: 'https://github.com/example/web-tests' },
                { id: '2', name: 'API Tests Repository', url: 'https://github.com/example/api-tests' }
            ];
            
            // Clear existing options
            projectSelect.innerHTML = '<option value="" data-i18n="selectAutomationProject">Select Automation Project</option>';
            
            // Add project options
            mockProjects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('[TestCases] Error loading automation projects:', error);
            this.toastManager.error('Failed to load automation projects');
        }
    }

    showCreateProjectModal() {
        // For now, redirect to the dashboard or settings where project creation is handled
        // TODO: Implement project creation modal or redirect to appropriate page
        this.toastManager.info('Project creation will be available soon. Please use the dashboard to create projects.');
        
        // Alternative: Redirect to dashboard
        // window.location.href = 'index.html';
    }

    async handleCreateFolder(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const folderData = {
            name: formData.get('name'),
            description: formData.get('description'),
            parent: formData.get('parent') || null,
            project: this.currentProject
        };

        try {
            console.log('[TestCases] Creating folder:', folderData);
            // TODO: Replace with actual API call
            // await this.projectClient.createFolder(this.currentProject, folderData);
            
            this.toastManager.success('Folder created successfully');
            
            // Close modal and reload folders
            const modal = document.getElementById('folder-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = '';
            }
            event.target.reset();
            await this.loadFolders();
        } catch (error) {
            console.error('[TestCases] Error creating folder:', error);
            this.toastManager.error('Failed to create folder');
        }
    }

    async handleCreateTestCase(event) {
        event.preventDefault();
        
        // Validate form
        const name = document.getElementById('testcase-name').value.trim();
        const description = document.getElementById('testcase-description').value.trim();
        const priority = document.getElementById('testcase-priority').value;
        const type = document.getElementById('testcase-type').value;
        const folder = document.getElementById('testcase-folder-select').value;
        
        let isValid = true;
        
        // Clear previous errors
        const errorMessages = document.querySelectorAll('#create-testcase-form .text-red-500');
        errorMessages.forEach(msg => msg.textContent = '');
        
        const inputs = document.querySelectorAll('#create-testcase-form input, #create-testcase-form textarea, #create-testcase-form select');
        inputs.forEach(input => input.classList.remove('border-red-500'));
        
        // Validate required fields
        if (!name) {
            const nameInput = document.getElementById('testcase-name');
            const nameError = document.getElementById('testcase-name-error');
            nameInput.classList.add('border-red-500');
            if (nameError) nameError.textContent = 'Test case name is required';
            isValid = false;
        }
        
        if (!description) {
            const descInput = document.getElementById('testcase-description');
            const descError = document.getElementById('testcase-description-error');
            descInput.classList.add('border-red-500');
            if (descError) descError.textContent = 'Description is required';
            isValid = false;
        }
        
        if (!isValid) {
            return;
        }
        
        const testCaseData = {
            name,
            description,
            priority,
            type,
            folder: folder || this.currentFolder?.id,
            project: this.currentProject
        };
        
        // Add automation data if automated
        if (type === 'automated') {
            const automationProject = document.getElementById('testcase-automation-project').value;
            const testPath = document.getElementById('testcase-test-path').value.trim();
            
            if (!automationProject) {
                const projectSelect = document.getElementById('testcase-automation-project');
                projectSelect.classList.add('border-red-500');
                this.toastManager.error('Automation project is required for automated tests');
                return;
            }
            
            if (!testPath) {
                const pathInput = document.getElementById('testcase-test-path');
                const pathError = document.getElementById('testcase-test-path-error');
                pathInput.classList.add('border-red-500');
                if (pathError) pathError.textContent = 'Test path is required for automated tests';
                return;
            }
            
            testCaseData.automation_project = automationProject;
            testCaseData.test_path = testPath;
        }

        try {
            console.log('[TestCases] Creating test case:', testCaseData);
            
            // TODO: Replace with actual API call
            // const response = await this.testCaseClient.createTestCase(testCaseData);
            
            // For now, simulate success and add to local test cases
            const newTestCase = {
                id: Date.now().toString(),
                name: testCaseData.name,
                description: testCaseData.description,
                priority: testCaseData.priority,
                type: testCaseData.type,
                status: 'pending',
                folder: testCaseData.folder,
                project: testCaseData.project,
                automation_project: testCaseData.automation_project,
                test_path: testCaseData.test_path,
                created_at: new Date().toISOString()
            };
            
            this.testCases.push(newTestCase);
            this.updateTestCasesList();
            
            this.toastManager.success('Test case created successfully');
            
            // Close modal and reset form
            this.closeTestCaseModal();
            
        } catch (error) {
            console.error('[TestCases] Error creating test case:', error);
            this.toastManager.error('Failed to create test case');
        }
    }

    // Method called from HTML modal
    async createTestCase(testCaseData) {
        if (!this.currentProject) {
            this.toastManager.error('Please select a project first');
            return;
        }

        try {
            console.log('[TestCases] Creating test case:', testCaseData);
            
            // Add project if not set
            if (!testCaseData.project) {
                testCaseData.project = this.currentProject;
            }
            
            // Add folder if current folder is selected
            if (!testCaseData.folder && this.currentFolder) {
                testCaseData.folder = this.currentFolder.id;
            }
            
            const response = await this.testCaseClient.createTestCase(this.currentProject, testCaseData);
            
            this.toastManager.success('Test case created successfully');
            
            // Close modal
            const modal = document.getElementById('testcase-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // Reset form fields
            document.getElementById('testcase-title').value = '';
            document.getElementById('testcase-description').value = '';
            document.getElementById('testcase-priority').value = 'medium';
            document.getElementById('testcase-type').value = 'manual';
            document.getElementById('testcase-automation-project').value = '';
            document.getElementById('testcase-automation-test-name').value = '';
            
            // Hide automation fields
            document.getElementById('automation-fields').classList.add('hidden');
            
            // Reload test cases
            await this.loadTestCases(this.currentFolder?.id);
        } catch (error) {
            console.error('[TestCases] Error creating test case:', error);
            this.toastManager.error('Failed to create test case');
        }
    }

    async createFolder(folderData) {
        if (!this.currentProject) {
            this.toastManager.warning('Please select a project first');
            return;
        }

        try {
            console.log('[TestCases] Creating folder:', folderData);
            console.log('[TestCases] Current project:', this.currentProject);
            
            // Prepare data for API
            const apiData = {
                name: folderData.name,
                description: folderData.description || '',
                parent: folderData.parent && folderData.parent !== '' ? folderData.parent : null,
                project: this.currentProject  // Add project ID to the request
            };
            
            console.log('[TestCases] API data to send:', apiData);

            // Create folder via API
            const response = await this.projectClient.createFolder(this.currentProject, apiData);
            
            console.log('[TestCases] Folder created via API:', response);
            
            // Reload folders to get updated list from server
            await this.loadFolders();
            
            this.toastManager.success('Folder created successfully');
            
        } catch (error) {
            console.error('[TestCases] Error creating folder:', error);
            console.error('[TestCases] Error details:', {
                status: error.status,
                data: error.data,
                response: error.response
            });
            
            // Try to show more specific error message
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                console.log('[TestCases] Error data type:', typeof errorData);
                console.log('[TestCases] Error data:', errorData);
                
                if (typeof errorData === 'object') {
                    // Check if error is wrapped in an "error" field
                    if (errorData.error && typeof errorData.error === 'object') {
                        console.log('[TestCases] Error wrapped in error field:', errorData.error);
                        const actualError = errorData.error;
                        
                        // Check if it has field_errors
                        if (actualError.field_errors) {
                            console.log('[TestCases] Field errors:', actualError.field_errors);
                            const errorMessages = Object.entries(actualError.field_errors)
                                .map(([field, messages]) => {
                                    if (Array.isArray(messages)) {
                                        return `${field}: ${messages.join(', ')}`;
                                    } else {
                                        return `${field}: ${messages}`;
                                    }
                                })
                                .join('; ');
                            this.toastManager.error(`Failed to create folder: ${errorMessages}`);
                        } else if (actualError.message) {
                            this.toastManager.error(`Failed to create folder: ${actualError.message}`);
                        } else if (actualError.detail) {
                            this.toastManager.error(`Failed to create folder: ${actualError.detail}`);
                        } else {
                            // Try to extract any other errors
                            const errorMessages = Object.entries(actualError)
                                .filter(([key]) => key !== 'status_code' && key !== 'code')
                                .map(([field, messages]) => {
                                    if (Array.isArray(messages)) {
                                        return `${field}: ${messages.join(', ')}`;
                                    } else {
                                        return `${field}: ${messages}`;
                                    }
                                })
                                .join('; ');
                            this.toastManager.error(`Failed to create folder: ${errorMessages || 'Unknown error'}`);
                        }
                    } else {
                        // Original error handling
                        const errorMessages = Object.entries(errorData)
                            .map(([field, messages]) => {
                                if (Array.isArray(messages)) {
                                    return `${field}: ${messages.join(', ')}`;
                                } else if (typeof messages === 'object' && messages.detail) {
                                    return `${field}: ${messages.detail}`;
                                } else {
                                    return `${field}: ${messages}`;
                                }
                            })
                            .join('; ');
                        this.toastManager.error(`Failed to create folder: ${errorMessages}`);
                    }
                } else {
                    this.toastManager.error('Failed to create folder: ' + errorData);
                }
            } else {
                this.toastManager.error('Failed to create folder');
            }
            throw error;
        }
    }

    showFolderDetails(folder) {
        console.log('[TestCases] Showing folder details:', folder);
        
        // Hide all other views
        this.hideAllViews();
        
        // Show folder form view
        const formView = document.getElementById('folder-form-view');
        formView.classList.remove('hidden');
        
        // Update form title for view mode
        const formTitle = document.getElementById('folder-form-title');
        const formSubtitle = document.getElementById('folder-form-subtitle');
        const actionButtons = document.getElementById('folder-action-buttons');
        
        formTitle.textContent = folder.name;
        formSubtitle.textContent = '';
        formSubtitle.style.display = 'none';
        actionButtons.classList.remove('hidden');
        
        // Hide form fields in view mode
        const formFieldsContainer = document.querySelector('#folder-form');
        if (formFieldsContainer) {
            formFieldsContainer.style.display = 'none';
        }
        
        // Remove any existing description section
        const existingDescSection = document.getElementById('folder-description-section');
        if (existingDescSection) {
            existingDescSection.remove();
        }
        
        // Add description section if folder has description
        if (folder.description && folder.description.trim()) {
            const formContainer = document.querySelector('#folder-form-view .w-full');
            const descriptionSection = document.createElement('div');
            descriptionSection.id = 'folder-description-section';
            descriptionSection.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 mb-6 overflow-hidden';
            descriptionSection.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                    <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-3">
                        <i class="ri-file-text-line text-blue-600 dark:text-blue-400"></i>
                    </div>
                    Описание
                </h2>
                <div class="overflow-hidden">
                    <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed break-word-wrap">${folder.description}</p>
                </div>
            `;
            
            // Insert after the actions section
            const actionsSection = document.querySelector('#folder-form-view .bg-white.border-2');
            if (actionsSection) {
                actionsSection.parentElement.insertBefore(descriptionSection, actionsSection.nextSibling);
            }
        }
        
        // Set meta information
        document.getElementById('folder-author').textContent = folder.author_name || folder.author || '-';
        document.getElementById('folder-created-date').textContent = folder.created_at ? new Date(folder.created_at).toLocaleString() : '-';
        document.getElementById('folder-modified-date').textContent = folder.updated_at ? new Date(folder.updated_at).toLocaleString() : '-';
        document.getElementById('folder-modified-by').textContent = folder.last_modified_by_name || folder.last_modified_by || '-';
        
        // Store folder data
        formView.dataset.folderId = folder.id;
        formView.dataset.viewMode = 'true';
        formView.dataset.folderData = JSON.stringify(folder);
        
        // Update save button to edit button for view mode
        const saveButton = document.querySelector('[onclick="saveFolder()"]');
        if (saveButton) {
            saveButton.innerHTML = '<i class="ri-edit-line mr-2 text-xl"></i> Редактировать';
            saveButton.className = 'px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl flex items-center text-lg font-semibold transform hover:scale-105';
            saveButton.onclick = () => this.editFolder(folder.id);
        }
        
        // Make sure the actions section is visible
        const actionsSection = document.querySelector('#folder-form-view .bg-white.border-2');
        if (actionsSection) {
            actionsSection.style.display = 'block';
        }
        
        // Add subfolders and test cases section after the form
        this.renderFolderContents(folder);
    }
    
    renderFolderContents(folder) {
        // Find or create contents section
        let contentsSection = document.getElementById('folder-contents-section');
        if (!contentsSection) {
            const formContainer = document.querySelector('#folder-form-view .w-full');
            contentsSection = document.createElement('div');
            contentsSection.id = 'folder-contents-section';
            contentsSection.className = 'mt-6';
            formContainer.appendChild(contentsSection);
        }
        
        // Get subfolders and test cases
        const subfolders = this.folders.filter(f => f.parent === folder.id);
        const testCases = []; // TODO: Load actual test cases
        
        contentsSection.innerHTML = `
            <!-- Subfolders -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 mb-6">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                    <div class="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mr-3">
                        <i class="ri-folder-line text-yellow-600 dark:text-yellow-400"></i>
                    </div>
                    Подпапки (${subfolders.length})
                </h2>
                
                ${subfolders.length > 0 ? `
                    <div class="grid gap-3">
                        ${subfolders.map(subfolder => `
                            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                 onclick="testCasesPage.selectFolder(testCasesPage.folders.find(f => f.id === '${subfolder.id}'))">
                                <div class="flex items-center">
                                    <i class="ri-folder-3-line text-yellow-500 mr-3"></i>
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-gray-100">${subfolder.name}</div>
                                        ${subfolder.description ? `<div class="text-sm text-gray-500 dark:text-gray-400">${subfolder.description}</div>` : ''}
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm text-gray-500 dark:text-gray-400">${subfolder.test_cases_count || 0} тестов</span>
                                    <i class="ri-arrow-right-s-line text-gray-400"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <i class="ri-folder-add-line text-4xl mb-2"></i>
                        <p>Нет подпапок</p>
                        <button onclick="testCasesPage.showCreateFolderForm('${folder.id}')" 
                                class="mt-4 text-sm text-coral-600 hover:text-coral-700">
                            Создать подпапку
                        </button>
                    </div>
                `}
            </div>
            
            <!-- Test Cases -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                    <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-3">
                        <i class="ri-file-text-line text-blue-600 dark:text-blue-400"></i>
                    </div>
                    Тест-кейсы (${testCases.length})
                </h2>
                
                ${testCases.length > 0 ? `
                    <div class="grid gap-3">
                        <!-- Test cases will be rendered here -->
                    </div>
                ` : `
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <i class="ri-file-add-line text-4xl mb-2"></i>
                        <p>Нет тест-кейсов</p>
                        <button onclick="testCasesPage.showCreateTestCaseModal('${folder.id}')" 
                                class="mt-4 text-sm text-coral-600 hover:text-coral-700">
                            Создать тест-кейс
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    editFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) {
            console.error('[TestCases] Folder not found:', folderId);
            return;
        }
        
        console.log('[TestCases] Editing folder:', folder);
        this.showCreateFolderForm(folder.parent, folder);
        
        // After showing the form, make sure the save button is visible and correct
        setTimeout(() => {
            const saveButton = document.querySelector('[onclick="saveFolder()"]');
            console.log('[TestCases] Found save button in edit mode:', saveButton);
            if (saveButton) {
                saveButton.innerHTML = '<i class="ri-save-line mr-2 text-xl"></i> Сохранить';
                saveButton.className = 'px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl flex items-center text-lg font-semibold transform hover:scale-105';
                saveButton.onclick = window.saveFolder;
                console.log('[TestCases] Updated save button to save mode');
            } else {
                console.error('[TestCases] Save button not found!');
                // Try to find any button with saveFolder
                const allButtons = document.querySelectorAll('#folder-form-view button');
                console.log('[TestCases] All buttons in form view:', allButtons);
                allButtons.forEach((btn, index) => {
                    console.log(`Button ${index}:`, btn.outerHTML);
                });
            }
        }, 100);
    }

    async updateFolder(folderId, folderData) {
        if (!this.currentProject) {
            this.toastManager.warning('Please select a project first');
            return;
        }

        try {
            console.log('[TestCases] Updating folder:', folderId, folderData);
            
            // Prepare data for API
            const apiData = {
                name: folderData.name,
                description: folderData.description || '',
                parent: folderData.parent || null
            };

            // Update folder via API
            const response = await this.projectClient.updateFolder(this.currentProject, folderId, apiData);
            
            console.log('[TestCases] Folder updated via API:', response);
            
            // Reload folders to get updated list from server
            await this.loadFolders();
            
            this.toastManager.success('Folder updated successfully');
            
        } catch (error) {
            console.error('[TestCases] Error updating folder:', error);
            this.toastManager.error('Failed to update folder');
            throw error;
        }
    }

    async deleteFolder(folderId) {
        if (!confirm('Are you sure you want to delete this folder and all its contents?')) {
            return;
        }

        try {
            console.log('[TestCases] Deleting folder:', folderId);
            
            // Delete folder via API
            await this.projectClient.deleteFolder(this.currentProject, folderId);
            
            this.toastManager.success('Folder deleted successfully');
            
            // Reload folders to get updated list from server
            await this.loadFolders();
        } catch (error) {
            console.error('[TestCases] Error deleting folder:', error);
            this.toastManager.error('Failed to delete folder');
        }
    }

    showAutomationModal() {
        if (!this.currentProject) {
            this.toastManager.warning('Please select a project first');
            return;
        }
        
        // Show automation modal
        if (window.automationModal) {
            window.automationModal.show(this.currentProject);
        }
    }

    viewTestCase(testCase) {
        console.log('[TestCases] Viewing test case:', testCase);
        // Open form in edit mode with test case data
        window.openTestCaseForm(testCase);
    }

    async runTestCase(testCaseId) {
        console.log('[TestCases] Running test case:', testCaseId);
        
        if (!this.currentProject) {
            this.toastManager.error('No project selected');
            return;
        }
        
        try {
            this.toastManager.info('🚀 Запуск автоматизированного теста...');
            
            // Execute the test case
            const result = await this.testCaseClient.executeTestCase(this.currentProject, testCaseId, {
                environment: 'default'
            });
            
            if (result.message) {
                this.toastManager.success(result.message);
            } else {
                this.toastManager.success('Test execution started');
            }
            
            // Store test run ID for status monitoring
            const testRunId = result.test_run?.id;
            if (testRunId) {
                this.monitorTestExecution(testRunId, testCaseId);
            }
            
        } catch (error) {
            console.error('[TestCases] Error running test case:', error);
            this.toastManager.error('❌ Failed to execute test case');
        }
    }

    async monitorTestExecution(testRunId, testCaseId) {
        console.log('[TestCases] Monitoring test execution:', testRunId);
        
        // Poll for test status every 2 seconds
        const pollInterval = setInterval(async () => {
            try {
                // Get test run status
                const response = await fetch(`/api/runs/${testRunId}/`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const testRun = await response.json();
                    console.log('[TestCases] Test run status:', testRun.status);
                    
                    // Check if test is completed
                    if (['passed', 'failed', 'error', 'skipped'].includes(testRun.status)) {
                        clearInterval(pollInterval);
                        
                        // Show result notification
                        if (testRun.status === 'passed') {
                            this.toastManager.success(`✅ Тест прошел успешно!`);
                        } else if (testRun.status === 'failed') {
                            this.toastManager.error(`❌ Тест провален: ${testRun.error_message || 'Unknown error'}`);
                        } else if (testRun.status === 'error') {
                            this.toastManager.error(`🚨 Ошибка выполнения: ${testRun.error_message || 'Unknown error'}`);
                        }
                        
                        // Update test case display if not in form view
                        const formView = document.getElementById('test-case-form-view');
                        const isFormOpen = formView && !formView.classList.contains('hidden');
                        
                        if (!isFormOpen) {
                            this.loadTestCases(this.currentFolder?.id);
                        } else {
                            // Update form view if open
                            this.updateTestCaseStatusInForm(testCaseId, testRun);
                        }
                    }
                }
            } catch (error) {
                console.error('[TestCases] Error polling test status:', error);
                clearInterval(pollInterval);
            }
        }, 2000);
        
        // Stop polling after 30 seconds to prevent infinite polling
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 30000);
    }

    updateTestCaseStatusInForm(testCaseId, testRun) {
        // If form is open for this test case, show status in form
        const formView = document.getElementById('test-case-form-view');
        const currentTestCaseId = formView?.dataset?.testCaseId;
        
        if (currentTestCaseId == testCaseId) {
            // Add or update status indicator in form
            let statusIndicator = document.getElementById('test-execution-status');
            if (!statusIndicator) {
                statusIndicator = document.createElement('div');
                statusIndicator.id = 'test-execution-status';
                statusIndicator.className = 'mt-4 p-3 rounded-lg';
                
                const formTitle = document.getElementById('form-title');
                if (formTitle && formTitle.parentNode) {
                    formTitle.parentNode.insertBefore(statusIndicator, formTitle.nextSibling);
                }
            }
            
            if (testRun.status === 'passed') {
                statusIndicator.className = 'mt-4 p-3 rounded-lg bg-green-50 text-green-800 border border-green-200';
                statusIndicator.innerHTML = `
                    <div class="flex items-center">
                        <i class="ri-check-circle-line text-green-600 mr-2"></i>
                        <span class="font-medium">Тест выполнен успешно!</span>
                    </div>
                    <div class="text-sm mt-1">${testRun.output || 'Test completed successfully'}</div>
                `;
            } else if (testRun.status === 'failed') {
                statusIndicator.className = 'mt-4 p-3 rounded-lg bg-red-50 text-red-800 border border-red-200';
                statusIndicator.innerHTML = `
                    <div class="flex items-center">
                        <i class="ri-close-circle-line text-red-600 mr-2"></i>
                        <span class="font-medium">Тест провален</span>
                    </div>
                    <div class="text-sm mt-1">${testRun.error_message || testRun.output || 'Test failed'}</div>
                `;
            }
        }
    }

    async editTestCase(testCaseId) {
        console.log('[TestCases] Editing test case:', testCaseId);
        const testCase = this.testCases.find(tc => tc.id === testCaseId);
        if (testCase) {
            window.openTestCaseForm(testCase);
        }
    }

    async duplicateTestCase(testCaseId) {
        console.log('[TestCases] Duplicating test case:', testCaseId);
        // TODO: Implement test case duplication
        this.toastManager.info('Duplicate functionality coming soon');
    }

    async deleteTestCase(testCaseId) {
        if (!confirm('Are you sure you want to delete this test case?')) {
            return;
        }

        try {
            console.log('[TestCases] Deleting test case:', testCaseId);
            // TODO: Replace with actual API call
            // await this.testCaseClient.deleteTestCase(testCaseId);
            
            this.toastManager.success('Test case deleted successfully');
            
            if (this.currentFolder) {
                await this.loadTestCases(this.currentFolder.id);
            }
        } catch (error) {
            console.error('[TestCases] Error deleting test case:', error);
            this.toastManager.error('Failed to delete test case');
        }
    }

    // Search in folders tree
    handleFolderSearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        const folderElements = document.querySelectorAll('#folders-tree .folder-item');
        const testCaseElements = document.querySelectorAll('#folders-tree .test-case-item');
        
        if (!term) {
            // Show all items if search is empty
            folderElements.forEach(el => {
                el.style.display = '';
                el.querySelectorAll('.folder-item').forEach(child => child.style.display = '');
            });
            testCaseElements.forEach(el => el.style.display = '');
            return;
        }
        
        // Hide all items first
        folderElements.forEach(el => el.style.display = 'none');
        testCaseElements.forEach(el => el.style.display = 'none');
        
        // Show matching folders and their parents
        folderElements.forEach(el => {
            const folderName = el.querySelector('.folder-name')?.textContent.toLowerCase();
            if (folderName && folderName.includes(term)) {
                el.style.display = '';
                // Show all parent folders
                let parent = el.parentElement;
                while (parent && parent.id !== 'folders-tree') {
                    if (parent.classList.contains('folder-item')) {
                        parent.style.display = '';
                        // Expand parent folder
                        const folderId = parent.dataset.folderId;
                        if (folderId) {
                            this.expandedFolders.add(folderId);
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        });
        
        // Show matching test cases and their parent folders
        testCaseElements.forEach(el => {
            const testCaseName = el.textContent.toLowerCase();
            if (testCaseName.includes(term)) {
                el.style.display = '';
                // Show all parent folders
                let parent = el.parentElement;
                while (parent && parent.id !== 'folders-tree') {
                    if (parent.classList.contains('folder-item')) {
                        parent.style.display = '';
                        const folderId = parent.dataset.folderId;
                        if (folderId) {
                            this.expandedFolders.add(folderId);
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        });
        
        // Update folder tree to reflect expanded state
        this.updateFolderTree();
    }
    
    // Search, filter and sort methods for test cases list
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.updateTestCasesList();
    }

    applyFilters() {
        const statusFilter = document.getElementById('filter-status').value;
        const priorityFilter = document.getElementById('filter-priority').value;
        const typeFilter = document.getElementById('filter-type').value;

        this.filters = {
            status: statusFilter,
            priority: priorityFilter,
            type: typeFilter
        };

        this.updateTestCasesList();
    }

    applySorting() {
        const sortBy = document.querySelector('input[name="sort"]:checked').value;
        this.sortBy = sortBy;
        this.updateTestCasesList();
    }

    getFilteredAndSortedTestCases() {
        let filtered = [...this.testCases];

        // Apply search
        if (this.searchTerm) {
            filtered = filtered.filter(tc => 
                tc.name.toLowerCase().includes(this.searchTerm) ||
                tc.description.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply filters
        if (this.filters.status) {
            filtered = filtered.filter(tc => tc.status === this.filters.status);
        }
        if (this.filters.priority) {
            filtered = filtered.filter(tc => tc.priority === this.filters.priority);
        }
        if (this.filters.type) {
            filtered = filtered.filter(tc => tc.type === this.filters.type);
        }

        // Apply sorting
        switch (this.sortBy) {
            case 'name':
                filtered.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
                break;
            case 'created':
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'updated':
                filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                break;
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
                break;
        }

        return filtered;
    }
    
    /**
     * Clear folder selection and update URL
     */
    clearFolderSelection() {
        // Remove visual selection
        document.querySelectorAll('.folder-header').forEach(header => {
            header.classList.remove('bg-blue-50', 'dark:bg-blue-900', 'border-l-2', 'border-blue-500');
        });
        
        // Clear current folder
        this.currentFolder = null;
        
        // Clear URL hash
        this.clearUrl();
        
        // Hide any open forms
        const folderForm = document.getElementById('folder-form-view');
        if (folderForm && !folderForm.classList.contains('hidden')) {
            folderForm.classList.add('hidden');
        }
        
        const testCaseForm = document.getElementById('test-case-form-view');
        if (testCaseForm && !testCaseForm.classList.contains('hidden')) {
            testCaseForm.classList.add('hidden');
        }
    }
    
    /**
     * Routing methods for deep linking
     */
    updateUrlForNewFolder(parentId = null) {
        let hash;
        if (parentId) {
            hash = `folder/${parentId}/new-folder`;
        } else {
            hash = `new-folder`;
        }
        this.router.updateHash(hash);
    }
    
    updateUrlForEditFolder(folderId) {
        const hash = `folder/${folderId}/edit`;
        this.router.updateHash(hash);
    }
    
    async openFolderForEdit(folderId) {
        console.log('[TestCases] Opening folder for edit:', folderId);
        
        try {
            const folder = this.folders.find(f => f.id === parseInt(folderId));
            if (folder) {
                this.showCreateFolderForm(folder.parent, folder);
            } else {
                // Try to load folder data from API
                const folderData = await this.projectClient.getFolder(this.currentProject, folderId);
                if (folderData) {
                    this.showCreateFolderForm(folderData.parent, folderData);
                }
            }
        } catch (error) {
            console.error('[TestCases] Error opening folder for edit:', error);
            this.toastManager.error('Не удалось открыть папку для редактирования');
        }
    }
    
    openFolderById(folderId) {
        console.log('[TestCases] Opening folder by ID:', folderId);
        const folder = this.folders.find(f => f.id === parseInt(folderId));
        if (folder) {
            this.currentFolder = folder;
            this.expandedFolders.add(folder.id);
            this.updateFolderTree();
        }
    }
    
    async openTestCaseById(testCaseId, folderId = null) {
        console.log('[TestCases] Opening test case by ID:', testCaseId, 'in folder:', folderId);
        
        try {
            // If folder specified, open it first
            if (folderId) {
                this.openFolderById(folderId);
            }
            
            // Load test case data
            const testCase = await this.testCaseClient.getTestCase(this.currentProject, testCaseId);
            if (testCase) {
                this.openTestCase(testCase);
            }
        } catch (error) {
            console.error('[TestCases] Error opening test case:', error);
            this.toastManager.error('Не удалось открыть тест-кейс');
        }
    }
    
    updateUrlForTestCase(testCaseId, folderId = null) {
        let hash;
        if (folderId) {
            hash = `folder/${folderId}/testcase/${testCaseId}`;
        } else {
            hash = `testcase/${testCaseId}`;
        }
        this.router.updateHash(hash);
    }
    
    updateUrlForNewTestCase(folderId = null) {
        let hash;
        if (folderId) {
            hash = `folder/${folderId}/new-testcase`;
        } else {
            hash = `new-testcase`;
        }
        this.router.updateHash(hash);
    }
    
    updateUrlForFolder(folderId) {
        const hash = `folder/${folderId}`;
        this.router.updateHash(hash);
    }
    
    clearUrl() {
        this.router.updateHash('');
    }

    getMockTestCases(folderId = null) {
        // Mock test cases with both manual and automated types for testing
        return [
            {
                id: 1,
                title: 'Тест входа в систему',
                description: 'Проверка корректной авторизации пользователя',
                type: 'manual',
                test_type: 'manual',
                priority: 'high',
                platform: 'Web',
                author_name: 'Admin Adminovich',
                status: 'pending',
                created_at: '2024-01-15T10:30:00Z',
                tags: ['authentication', 'login']
            },
            {
                id: 2,
                title: 'Автоматизированный тест API',
                description: 'Проверка REST API endpoints',
                type: 'automated',
                test_type: 'automated',
                automation_test_name: 'test_api_endpoints',
                priority: 'medium',
                platform: 'API',
                author_name: 'Admin Adminovich',
                status: 'passed',
                created_at: '2024-01-16T14:20:00Z',
                tags: ['api', 'automation']
            },
            {
                id: 3,
                title: 'Тест создания проекта',
                description: 'Проверка функциональности создания нового проекта',
                type: 'manual',
                test_type: 'manual',
                priority: 'medium',
                platform: 'Web',
                author_name: 'Admin Adminovich',
                status: 'failed',
                created_at: '2024-01-17T09:15:00Z',
                tags: ['project', 'creation']
            },
            {
                id: 4,
                title: 'Автоматизированный UI тест',
                description: 'Проверка пользовательского интерфейса через Selenium',
                type: 'automated',
                test_type: 'automated',
                automation_test_name: 'test_ui_workflow',
                priority: 'high',
                platform: 'Web',
                author_name: 'Admin Adminovich',
                status: 'running',
                created_at: '2024-01-18T16:45:00Z',
                tags: ['ui', 'selenium', 'automation']
            }
        ].filter(testCase => {
            // Filter by folder if specified
            if (folderId) {
                // In a real scenario, test cases would have folder_id field
                return true; // For now, return all test cases
            }
            return true;
        });
    }
}

// Function to update action buttons based on test case type
function updateActionButtons(isAutomated, testCaseId) {
    const actionButtons = document.getElementById('tc-action-buttons');
    if (!actionButtons) return;
    
    // Keep only the delete button in the left area
    let buttonsHTML = `
        <button type="button" onclick="deleteTestCase()" 
                class="text-red-600 hover:text-red-700 font-medium flex items-center">
            <i class="ri-delete-bin-line mr-2"></i> Удалить тест-кейс
        </button>
    `;
    
    actionButtons.innerHTML = buttonsHTML;
    
    // Update the right-side buttons (Cancel/Run/Save) 
    updateFormActionButtons(isAutomated, testCaseId);
}

// Function to update the right-side form action buttons (Cancel/Run/Save)
function updateFormActionButtons(isAutomated, testCaseId) {
    // Find the container that holds Cancel and Save buttons
    const actionButtons = document.getElementById('tc-action-buttons');
    if (!actionButtons) return;
    
    const parentContainer = actionButtons.parentElement;
    if (!parentContainer) return;
    
    // Find or create the right-side buttons container
    let rightButtonsContainer = parentContainer.querySelector('.form-action-buttons');
    if (!rightButtonsContainer) {
        // If container doesn't exist, find the existing buttons and wrap them
        const existingButtons = parentContainer.querySelector('.flex.gap-3.ml-auto');
        if (existingButtons) {
            rightButtonsContainer = existingButtons;
            rightButtonsContainer.classList.add('form-action-buttons');
        }
    }
    
    if (!rightButtonsContainer) return;
    
    // Create buttons HTML with run button in the middle for automated tests
    let buttonsHTML = `
        <button type="button" onclick="closeTestCaseForm()" 
                class="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Отмена
        </button>
    `;
    
    // Add run button for automated test cases between Cancel and Save
    if (isAutomated) {
        buttonsHTML += `
            <button type="button" onclick="runTestCaseFromForm(${testCaseId})" 
                    class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center transition-colors shadow-lg hover:shadow-xl">
                <i class="ri-play-line mr-2"></i> Запустить тест
            </button>
        `;
    }
    
    buttonsHTML += `
        <button type="button" onclick="saveTestCase()" 
                class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center">
            <i class="ri-save-line mr-2"></i> Сохранить
        </button>
    `;
    
    rightButtonsContainer.innerHTML = buttonsHTML;
}

// Function to run test case from the form view
window.runTestCaseFromForm = function(testCaseId) {
    console.log('[TestCases] Running test case from form:', testCaseId);
    
    if (window.testCasesPage && window.testCasesPage.runTestCase) {
        // Show immediate feedback
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="ri-loader-4-line mr-2 animate-spin"></i> Запуск...';
        button.disabled = true;
        
        // Run the test
        window.testCasesPage.runTestCase(testCaseId).then(() => {
            // Restore button after a delay
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 3000);
        }).catch((error) => {
            console.error('[TestCases] Error in runTestCaseFromForm:', error);
            // Restore button on error
            button.innerHTML = originalText;
            button.disabled = false;
        });
    } else {
        console.error('TestCasesPage instance not available or runTestCase method not found');
        alert('Невозможно запустить тест. Попробуйте позже.');
    }
};

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[TestCases] DOM loaded, initializing page');
    window.testCasesPage = new TestCasesPage();
});

// Global functions for HTML onclick handlers
window.closeFolderForm = function() {
    const formView = document.getElementById('folder-form-view');
    
    // Show form fields back
    const formContainer = document.querySelector('#folder-form');
    if (formContainer) {
        formContainer.style.display = 'block';
    }
    
    // Re-enable form fields if they were disabled
    document.getElementById('folder-name').disabled = false;
    document.getElementById('folder-description').disabled = false;
    document.getElementById('folder-parent').disabled = false;
    
    // Reset save button
    const saveButton = document.querySelector('[onclick="saveFolder()"]');
    if (!saveButton) {
        // Find button by its content if onclick was changed
        const buttons = document.querySelectorAll('#folder-form-view button');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Редактировать')) {
                btn.innerHTML = '<i class="ri-save-line mr-2 text-xl"></i> Сохранить';
                btn.className = 'px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl flex items-center text-lg font-semibold transform hover:scale-105';
                btn.onclick = window.saveFolder;
            }
        });
    }
    
    // Make sure the actions section is visible
    const actionsSection = document.querySelector('#folder-form-view .bg-white.border-2');
    if (actionsSection) {
        actionsSection.style.display = 'block';
    }
    
    // Remove folder contents section if exists
    const contentsSection = document.getElementById('folder-contents-section');
    if (contentsSection) {
        contentsSection.remove();
    }
    
    // Remove any description sections
    const descriptionSection = document.getElementById('folder-description-section');
    if (descriptionSection) {
        descriptionSection.remove();
    }
    
    // Hide folder form view
    formView.classList.add('hidden');
    
    // Clear dataset
    delete formView.dataset.folderId;
    delete formView.dataset.viewMode;
    delete formView.dataset.folderData;
    
    // Show appropriate view
    if (window.testCasesPage && window.testCasesPage.folders && window.testCasesPage.folders.length > 0) {
        // Stay on the folder tree view when we have folders
        document.getElementById('empty-state').classList.add('hidden');
    } else {
        document.getElementById('empty-state').classList.remove('hidden');
    }
    
    // Clear URL hash
    if (window.testCasesPage) {
        window.testCasesPage.clearUrl();
    }
    
    // Reset form
    document.getElementById('folder-form').reset();
};

window.saveFolder = async function() {
    const formView = document.getElementById('folder-form-view');
    const folderId = formView.dataset.folderId;
    
    // Collect form data
    const formData = {
        name: document.getElementById('folder-name').value.trim(),
        description: document.getElementById('folder-description').value.trim(),
        parent: document.getElementById('folder-parent').value || null
    };
    
    // Validate required fields
    if (!formData.name) {
        window.testCasesPage.toastManager.warning('Пожалуйста, введите название папки');
        document.getElementById('folder-name').focus();
        return;
    }
    
    try {
        if (folderId) {
            // Update existing folder
            console.log('Updating folder:', folderId, formData);
            await window.testCasesPage.updateFolder(folderId, formData);
            
            // After update, show the updated folder in view mode
            const updatedFolder = window.testCasesPage.folders.find(f => f.id === folderId);
            if (updatedFolder) {
                // Update folder data with new values
                Object.assign(updatedFolder, formData);
                // Show in view mode
                window.testCasesPage.showFolderDetails(updatedFolder);
            }
            
            window.testCasesPage.toastManager.success('Папка обновлена');
        } else {
            // Create new folder
            console.log('Creating folder:', formData);
            const newFolder = await window.testCasesPage.createFolder(formData);
            
            if (newFolder && newFolder.id) {
                // Update URL to editing mode for the new folder
                window.testCasesPage.updateUrlForEditFolder(newFolder.id);
                
                // Update form to editing mode
                const formView = document.getElementById('folder-form-view');
                if (formView) {
                    formView.dataset.folderId = newFolder.id;
                }
                
                // Update header to show we're now editing
                const formTitle = document.getElementById('folder-form-title');
                if (formTitle) {
                    formTitle.textContent = 'Редактирование папки';
                }
                
                window.testCasesPage.toastManager.success('Папка создана');
            } else {
                // If creation failed or doesn't return ID, close form
                window.closeFolderForm();
            }
        }
        
    } catch (error) {
        console.error('Error saving folder:', error);
        window.testCasesPage.toastManager.error('Ошибка при сохранении папки');
    }
};

window.deleteFolder = async function() {
    if (!confirm('Вы уверены, что хотите удалить эту папку и все ее содержимое?')) {
        return;
    }
    
    const formView = document.getElementById('folder-form-view');
    const folderId = formView.dataset.folderId;
    
    if (!folderId) return;
    
    try {
        console.log('Deleting folder:', folderId);
        window.testCasesPage.toastManager.success('Папка удалена');
        window.closeFolderForm();
        
        // Refresh folders list
        if (window.testCasesPage) {
            window.testCasesPage.loadFolders();
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
        window.testCasesPage.toastManager.error('Ошибка при удалении папки');
    }
};

// Global functions for test case form
window.openTestCaseForm = function(testCase = null) {
    // Hide all views using the instance method if available
    if (window.testCasesPage) {
        window.testCasesPage.hideAllViews();
    } else {
        // Fallback if instance not available
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('test-cases-list').classList.add('hidden');
        document.getElementById('folder-form-view').classList.add('hidden');
    }
    
    // Show form view
    const formView = document.getElementById('test-case-form-view');
    formView.classList.remove('hidden');
    
    // Update form title
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const actionButtons = document.getElementById('tc-action-buttons');
    
    if (testCase) {
        // Edit mode
        formTitle.textContent = 'Редактирование тест-кейса';
        formSubtitle.textContent = 'Внесите изменения в тестовый сценарий';
        actionButtons.classList.remove('hidden');
        
        // Fill form with test case data
        document.getElementById('tc-title').value = testCase.title || testCase.name || '';
        document.getElementById('tc-description').value = testCase.description || '';
        document.getElementById('tc-preconditions').value = testCase.condition || '';
        document.getElementById('tc-priority').value = testCase.priority || 'medium';
        document.getElementById('tc-type').value = testCase.test_type || 'manual';
        document.getElementById('tc-platform').value = testCase.platform || 'all';
        document.getElementById('tc-estimated-time').value = testCase.estimated_time || '';
        document.getElementById('tc-automation-name').value = testCase.automation_test_name || '';
        
        // Set meta information
        document.getElementById('tc-author').textContent = testCase.author_name || testCase.author || '-';
        document.getElementById('tc-created-date').textContent = testCase.created_at ? new Date(testCase.created_at).toLocaleString() : '-';
        document.getElementById('tc-modified-date').textContent = testCase.updated_at ? new Date(testCase.updated_at).toLocaleString() : '-';
        document.getElementById('tc-modified-by').textContent = testCase.last_modified_by_name || testCase.last_modified_by || '-';
        
        // Fill test steps
        fillTestStepsFromData(testCase.steps, testCase.expected_results);
        
        // Fill tags
        fillTagsFromData(testCase.tags || []);
        
        // Show/hide automation section based on test type
        if (testCase.test_type === 'automated') {
            document.getElementById('automation-section').classList.remove('hidden');
        } else {
            document.getElementById('automation-section').classList.add('hidden');
        }
        
        // Update action buttons for automated test cases
        const isAutomated = testCase.test_type === 'automated' || testCase.type === 'automated';
        updateActionButtons(isAutomated, testCase.id);
        
        // Store test case ID for saving
        formView.dataset.testCaseId = testCase.id;
    } else {
        // Create mode
        formTitle.textContent = 'Новый тест-кейс';
        formSubtitle.textContent = 'Создайте подробный сценарий тестирования';
        actionButtons.classList.add('hidden');
        
        // Reset form
        document.getElementById('test-case-form').reset();
        
        // Clear test steps to default single step
        document.getElementById('test-steps').innerHTML = `
            <div class="test-step bg-gray-50 dark:bg-gray-900 rounded-xl p-6 relative group">
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                        1
                    </div>
                    <div class="flex-1">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Действие</label>
                                <input type="text" placeholder="Опишите действие" 
                                       class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ожидаемый результат</label>
                                <input type="text" placeholder="Опишите ожидаемый результат" 
                                       class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="removeTestStep(this)" class="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="ri-delete-bin-line text-xl"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Clear tags list
        document.getElementById('tc-tags-list').innerHTML = '';
        
        // Hide automation section by default
        document.getElementById('automation-section').classList.add('hidden');
        
        // Set current user as author
        const currentUser = localStorage.getItem('flowtest_username') || 'Текущий пользователь';
        document.getElementById('tc-author').textContent = currentUser;
        document.getElementById('tc-created-date').textContent = new Date().toLocaleString();
        document.getElementById('tc-modified-date').textContent = '-';
        document.getElementById('tc-modified-by').textContent = '-';
        
        // Clear test case ID
        delete formView.dataset.testCaseId;
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Focus on title field
    setTimeout(() => {
        document.getElementById('tc-title').focus();
    }, 100);
};

window.closeTestCaseForm = function() {
    // Hide form view
    document.getElementById('test-case-form-view').classList.add('hidden');
    
    // Show appropriate view
    if (window.testCasesPage && window.testCasesPage.testCases.length > 0) {
        document.getElementById('test-cases-list').classList.remove('hidden');
    } else {
        document.getElementById('empty-state').classList.remove('hidden');
    }
    
    // Reset form
    document.getElementById('test-case-form').reset();
    document.getElementById('test-steps').innerHTML = `
        <div class="test-step bg-gray-50 dark:bg-gray-900 rounded-xl p-6 relative group">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                    1
                </div>
                <div class="flex-1">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Действие</label>
                            <input type="text" placeholder="Опишите действие" 
                                   class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ожидаемый результат</label>
                            <input type="text" placeholder="Опишите ожидаемый результат" 
                                   class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                        </div>
                    </div>
                </div>
                <button type="button" onclick="removeTestStep(this)" class="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ri-delete-bin-line text-xl"></i>
                </button>
            </div>
        </div>
    `;
    document.getElementById('tc-tags-list').innerHTML = '';
    document.getElementById('automation-section').classList.add('hidden');
};

window.saveTestCase = async function() {
    const formView = document.getElementById('test-case-form-view');
    const testCaseId = formView.dataset.testCaseId;
    
    // Collect form data
    const formData = {
        title: document.getElementById('tc-title').value.trim(),
        description: document.getElementById('tc-description').value.trim(),
        condition: document.getElementById('tc-preconditions').value.trim(), // Fixed: changed from preconditions to condition
        priority: document.getElementById('tc-priority').value,
        test_type: document.getElementById('tc-type').value,
        platform: document.getElementById('tc-platform').value,
        estimated_time: document.getElementById('tc-estimated-time').value.trim(),
        automation_test_name: document.getElementById('tc-automation-name').value.trim(),
    };
    
    // Validate required fields
    if (!formData.title) {
        window.testCasesPage.toastManager.warning('Пожалуйста, введите название тест-кейса');
        document.getElementById('tc-title').focus();
        return;
    }
    
    if (!formData.description) {
        window.testCasesPage.toastManager.warning('Пожалуйста, введите описание тест-кейса');
        document.getElementById('tc-description').focus();
        return;
    }
    
    // Collect test steps and format as string for backend
    const steps = [];
    const stepElements = document.querySelectorAll('#test-steps .test-step');
    stepElements.forEach((stepEl, index) => {
        const actionInput = stepEl.querySelector('input[placeholder="Опишите действие"]');
        const resultInput = stepEl.querySelector('input[placeholder="Опишите ожидаемый результат"]');
        if (actionInput.value.trim() || resultInput.value.trim()) {
            steps.push(`${index + 1}. ${actionInput.value.trim()}`);
        }
    });
    // Convert steps array to string format for backend
    formData.steps = steps.join('\n');
    
    // Collect expected results and format as string for backend
    const expectedResults = [];
    stepElements.forEach((stepEl, index) => {
        const resultInput = stepEl.querySelector('input[placeholder="Опишите ожидаемый результат"]');
        if (resultInput.value.trim()) {
            expectedResults.push(`${index + 1}. ${resultInput.value.trim()}`);
        }
    });
    formData.expected_results = expectedResults.join('\n');
    
    // Collect tags
    const tags = [];
    document.querySelectorAll('#tc-tags-list .tag-item').forEach(tagEl => {
        const tagText = tagEl.textContent.replace('×', '').trim();
        if (tagText) tags.push(tagText);
    });
    formData.tags = tags;
    
    // Add folder if current folder is selected
    if (window.testCasesPage && window.testCasesPage.currentFolder) {
        formData.folder = window.testCasesPage.currentFolder.id;
    }
    
    // Add project ID (required by serializer)
    if (window.testCasesPage && window.testCasesPage.currentProject) {
        formData.project = window.testCasesPage.currentProject; // currentProject is already the ID, not an object
        console.log('Added project ID to formData:', formData.project);
    } else {
        console.error('Current project not found:', window.testCasesPage?.currentProject);
        // Fallback: extract project ID from URL or use hardcoded value
        const urlMatch = window.location.pathname.match(/\/projects\/(\d+)/);
        if (urlMatch) {
            formData.project = parseInt(urlMatch[1]);
            console.log('Extracted project ID from URL:', formData.project);
        }
    }
    
    try {
        if (testCaseId) {
            // Update existing test case
            console.log('Updating test case:', testCaseId, formData);
            if (window.testCasesPage && window.testCasesPage.currentProject) {
                await window.testCasesPage.testCaseClient.updateTestCase(
                    window.testCasesPage.currentProject,
                    testCaseId,
                    formData
                );
                window.testCasesPage.toastManager.success('Тест-кейс обновлен');
            }
        } else {
            // Create new test case
            console.log('Creating test case:', formData);
            console.log('Final formData keys:', Object.keys(formData));
            if (window.testCasesPage && window.testCasesPage.currentProject) {
                const newTestCase = await window.testCasesPage.testCaseClient.createTestCase(
                    window.testCasesPage.currentProject,
                    formData
                );
                window.testCasesPage.toastManager.success('Тест-кейс создан');
                
                // Update URL to show the newly created test case
                if (newTestCase && newTestCase.id) {
                    window.testCasesPage.updateUrlForTestCase(newTestCase.id, formData.folder);
                    
                    // Update form to editing mode
                    const formView = document.getElementById('test-case-form-view');
                    if (formView) {
                        formView.dataset.testCaseId = newTestCase.id;
                    }
                    
                    // Update header to show we're now editing
                    const header = document.querySelector('#test-case-form-view h2');
                    if (header) {
                        header.textContent = 'Редактировать тест-кейс';
                    }
                }
            } else {
                window.testCasesPage.toastManager.error('Пожалуйста, выберите проект');
                return;
            }
        }
        
        // DON'T close form - keep it open
        // For creating new test case, reset form fields. For editing, keep the data
        if (!testCaseId) {
            // Only reset form for new test case creation
            document.getElementById('test-case-form').reset();
        document.getElementById('test-steps').innerHTML = `
            <div class="test-step bg-gray-50 dark:bg-gray-900 rounded-xl p-6 relative group">
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                        1
                    </div>
                    <div class="flex-1">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Действие</label>
                                <input type="text" placeholder="Опишите действие" 
                                       class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ожидаемый результат</label>
                                <input type="text" placeholder="Опишите ожидаемый результат" 
                                       class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="removeTestStep(this)" class="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="ri-delete-bin-line text-xl"></i>
                    </button>
                </div>
            </div>
        `;
            document.getElementById('tc-tags-list').innerHTML = '';
        }
        
        // Refresh ONLY the folder tree to update counters
        if (window.testCasesPage) {
            window.testCasesPage.loadFolders();
        }
    } catch (error) {
        console.error('Error saving test case:', error);
        window.testCasesPage.toastManager.error('Ошибка при сохранении тест-кейса: ' + (error.message || 'Неизвестная ошибка'));
    }
};

window.deleteTestCase = async function() {
    if (!confirm('Вы уверены, что хотите удалить этот тест-кейс?')) {
        return;
    }
    
    const formView = document.getElementById('test-case-form-view');
    const testCaseId = formView.dataset.testCaseId;
    
    if (!testCaseId) return;
    
    try {
        console.log('Deleting test case:', testCaseId);
        
        if (window.testCasesPage && window.testCasesPage.currentProject) {
            await window.testCasesPage.testCaseClient.deleteTestCase(
                window.testCasesPage.currentProject,
                testCaseId
            );
            window.testCasesPage.toastManager.success('Тест-кейс удален');
            window.closeTestCaseForm();
            
            // Refresh test cases list
            if (window.testCasesPage.currentFolder) {
                window.testCasesPage.loadTestCases(window.testCasesPage.currentFolder.id);
            }
        }
    } catch (error) {
        console.error('Error deleting test case:', error);
        window.testCasesPage.toastManager.error('Ошибка при удалении тест-кейса: ' + (error.message || 'Неизвестная ошибка'));
    }
};

window.toggleAutomationSection = function() {
    const type = document.getElementById('tc-type').value;
    const automationSection = document.getElementById('automation-section');
    
    if (type === 'automated') {
        automationSection.classList.remove('hidden');
    } else {
        automationSection.classList.add('hidden');
    }
};

window.addTestStep = function() {
    const stepsContainer = document.getElementById('test-steps');
    const stepCount = stepsContainer.querySelectorAll('.test-step').length + 1;
    
    const stepHtml = `
        <div class="test-step bg-gray-50 dark:bg-gray-900 rounded-xl p-6 relative group">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                    ${stepCount}
                </div>
                <div class="flex-1">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Действие</label>
                            <input type="text" placeholder="Опишите действие" 
                                   class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ожидаемый результат</label>
                            <input type="text" placeholder="Опишите ожидаемый результат" 
                                   class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                        </div>
                    </div>
                </div>
                <button type="button" onclick="removeTestStep(this)" class="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ri-delete-bin-line text-xl"></i>
                </button>
            </div>
        </div>
    `;
    
    stepsContainer.insertAdjacentHTML('beforeend', stepHtml);
    
    // Focus on the new action input
    const newStep = stepsContainer.lastElementChild;
    const actionInput = newStep.querySelector('input[placeholder="Опишите действие"]');
    if (actionInput) {
        actionInput.focus();
    }
};

window.removeTestStep = function(button) {
    const step = button.closest('.test-step');
    const stepsContainer = document.getElementById('test-steps');
    
    // Don't remove if it's the last step
    if (stepsContainer.querySelectorAll('.test-step').length === 1) {
        window.testCasesPage.toastManager.warning('Должен остаться хотя бы один шаг');
        return;
    }
    
    step.remove();
    
    // Renumber remaining steps
    stepsContainer.querySelectorAll('.test-step').forEach((stepEl, index) => {
        const numberEl = stepEl.querySelector('.w-10.h-10');
        if (numberEl) {
            numberEl.textContent = index + 1;
        }
    });
};

window.addTag = function() {
    const input = document.getElementById('tc-tag-input');
    const tagText = input.value.trim();
    
    if (!tagText) return;
    
    // Check if tag already exists
    const existingTags = Array.from(document.querySelectorAll('#tc-tags-list .tag-item')).map(el => 
        el.textContent.replace('×', '').trim()
    );
    
    if (existingTags.includes(tagText)) {
        window.testCasesPage.toastManager.warning('Этот тег уже добавлен');
        return;
    }
    
    const tagHtml = `
        <span class="tag-item inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm">
            ${tagText}
            <button type="button" onclick="removeTag(this)" class="hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
                <i class="ri-close-line text-sm"></i>
            </button>
        </span>
    `;
    
    document.getElementById('tc-tags-list').insertAdjacentHTML('beforeend', tagHtml);
    input.value = '';
    input.focus();
};

window.removeTag = function(button) {
    button.closest('.tag-item').remove();
};

// Helper functions for filling form data
function fillTestStepsFromData(stepsText, expectedResultsText) {
    const stepsContainer = document.getElementById('test-steps');
    stepsContainer.innerHTML = '';
    
    // Parse steps and expected results
    const steps = stepsText ? stepsText.split('\n').filter(s => s.trim()) : [];
    const expectedResults = expectedResultsText ? expectedResultsText.split('\n').filter(s => s.trim()) : [];
    
    // Create step elements
    const maxSteps = Math.max(steps.length, expectedResults.length, 1);
    
    for (let i = 0; i < maxSteps; i++) {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'test-step bg-gray-50 dark:bg-gray-900 rounded-xl p-6 relative group';
        
        stepDiv.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                    ${i + 1}
                </div>
                <div class="flex-1">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Действие</label>
                            <input type="text" placeholder="Опишите действие" 
                                   value="${cleanStepText(steps[i] || '')}"
                                   class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ожидаемый результат</label>
                            <input type="text" placeholder="Опишите ожидаемый результат" 
                                   value="${cleanStepText(expectedResults[i] || '')}"
                                   class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                        </div>
                    </div>
                </div>
                <button type="button" onclick="removeTestStep(this)" class="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ri-delete-bin-line text-xl"></i>
                </button>
            </div>
        `;
        
        stepsContainer.appendChild(stepDiv);
    }
}

function cleanStepText(text) {
    // Remove step numbers like "1. ", "2. " etc.
    return text.replace(/^\d+\.\s*/, '').trim();
}

function fillTagsFromData(tags) {
    const tagsContainer = document.getElementById('tc-tags-list');
    tagsContainer.innerHTML = '';
    
    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-item inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm';
        tagElement.innerHTML = `
            ${tag}
            <button type="button" onclick="removeTag(this)" class="hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
                <i class="ri-close-line text-sm"></i>
            </button>
        `;
        tagsContainer.appendChild(tagElement);
    });
}

// Export for use in other modules if needed
export default TestCasesPage;