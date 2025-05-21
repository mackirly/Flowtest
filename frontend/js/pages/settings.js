/**
 * Settings page functionality
 * Handles system settings, repository connections, and various system configurations
 */

import i18n from '../i18n/i18n.js';
import ToastManager from '../utils/toast.js';
import ApiClient from '../api/client.js';
import ThemeManager from '../utils/theme.js';

// API Base URL
const API_BASE_URL = '/api';

// DOM Elements
const elements = {
    // Navigation
    settingsNavLinks: document.querySelectorAll('.settings-nav-link'),
    settingsSections: document.querySelectorAll('.settings-section'),
    
    // Forms
    generalSettingsForm: document.getElementById('general-settings-form'),
    repositorySettingsForm: document.getElementById('repository-settings-form'),
    backupSettingsForm: document.getElementById('backup-settings-form'),
    
    // Repository management
    addRepositoryButton: document.getElementById('add-repository-button'),
    addRepositoryModal: document.getElementById('add-repository-modal'),
    closeRepositoryModal: document.getElementById('close-repository-modal'),
    addRepositoryForm: document.getElementById('add-repository-form'),
    cancelRepositoryButton: document.getElementById('cancel-repository-button'),
    repositoriesList: document.getElementById('repositories-list'),
    repoTypeButtons: document.querySelectorAll('.repo-type-btn'),
    
    // Authentication options
    gitAuthTypeRadios: document.querySelectorAll('[name="git_auth_type"]'),
    sshKeyAuth: document.getElementById('ssh-key-auth'),
    basicAuth: document.getElementById('basic-auth'),
    
    // Connection testing
    testConnectionButton: document.getElementById('test-connection-button'),
    connectionLog: document.querySelector('.connection-log'),
    logContainer: document.getElementById('log-container'),
    
    // Backup actions
    backupNowButton: document.getElementById('backup-now-button'),
    
    // User menu
    userInitials: document.getElementById('user-initials'),
    userName: document.getElementById('user-name'),
    userMenuButton: document.getElementById('user-menu-button'),
    userDropdown: document.getElementById('user-dropdown'),
    logoutButton: document.getElementById('logout-button')
};

// State
const state = {
    activeSection: 'general',
    repositories: [],
    currentRepoType: 'git',
    connectionTestInProgress: false,
    user: null,
    settings: {
        general: null,
        repositories: null,
        backups: null
    }
};

// Initialize the page
async function initPage() {
    try {
        console.log('Initializing settings page...');

        // Get the user's preferred theme and respect it
        const savedTheme = localStorage.getItem('flowtest-theme');
        console.log('User saved theme:', savedTheme);
        
        if (savedTheme) {
            ThemeManager.setTheme(savedTheme);
        } else {
            // Default to system preference
            ThemeManager.setTheme(ThemeManager.THEMES.SYSTEM);
        }
        
        // В демо-режиме пропускаем проверку аутентификации
        // Для реальной системы раскомментируйте проверку ниже
        /*
        if (!ApiClient.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        */
        
        // Initialize i18n
        i18n.translatePage();
        i18n.initLanguageSelector();
        
        // Note: Navigation is now handled by settings-fixed.js
        // Проверяем доступность элементов на странице
        console.log('Settings sections:', elements.settingsSections.length);
        console.log('Nav links:', elements.settingsNavLinks.length);
                
        // Setup event listeners
        setupEventListeners();
        
        // Load user data first
        await loadUserData();
        
        // Then load settings data
        await loadSettingsData();
        
        console.log('Settings page initialization completed');

    } catch (error) {
        console.error('Error initializing page:', error);
        ToastManager.error('Failed to initialize page');
    }
}

// Load user data
async function loadUserData() {
    try {
        // В демо-режиме используем мок-данные пользователя
        // Для реальной системы раскомментируйте код ниже
        
        // Демонстрационные данные пользователя
        state.user = {
            id: 1,
            username: 'demo_user',
            first_name: 'Иван',
            last_name: 'Иванов',
            email: 'demo@example.com',
            role: 'admin',
            last_login: new Date().toISOString()
        };
        
        /*
        // Get current user profile
        state.user = await ApiClient.getCurrentUser();
        
        if (!state.user) {
            console.error('No user data available');
            window.location.href = 'login.html';
            return;
        }
        */
        
        // Update UI with user data
        setupUserMenu();
    } catch (error) {
        console.error('Error loading user data:', error);
        ToastManager.error('Failed to load user data');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    /* Прежняя обработка навигации заменена на новую функцию setupNavigation */
    
    // Forms
    elements.generalSettingsForm?.addEventListener('submit', handleGeneralSettingsSubmit);
    elements.repositorySettingsForm?.addEventListener('submit', handleRepositorySettingsSubmit);
    elements.backupSettingsForm?.addEventListener('submit', handleBackupSettingsSubmit);
    
    // Repository management
    elements.addRepositoryButton?.addEventListener('click', openAddRepositoryModal);
    elements.closeRepositoryModal?.addEventListener('click', closeAddRepositoryModal);
    elements.cancelRepositoryButton?.addEventListener('click', closeAddRepositoryModal);
    elements.addRepositoryForm?.addEventListener('submit', handleAddRepository);
    
    // Repository type selection
    elements.repoTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update the active button
            elements.repoTypeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update the state
            state.currentRepoType = button.dataset.type;
            
            // Show/hide the appropriate settings
            showRepositorySettings(state.currentRepoType);
        });
    });
    
    // Authentication type change
    elements.gitAuthTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleAuthTypeChange);
    });
    
    // Test connection
    elements.testConnectionButton?.addEventListener('click', testRepositoryConnection);
    
    // Backup now
    elements.backupNowButton?.addEventListener('click', handleBackupNow);
    
    // Setup sync buttons
    setupRepositoryActionButtons();
    
    // User dropdown
    elements.userMenuButton?.addEventListener('click', () => {
        elements.userDropdown?.classList.toggle('hidden');
    });
    
    // Language dropdown
    const languageMenuButton = document.getElementById('language-menu-button');
    const languageDropdown = document.getElementById('language-dropdown');
    
    languageMenuButton?.addEventListener('click', () => {
        languageDropdown?.classList.toggle('hidden');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.userMenuButton && elements.userDropdown && 
            !elements.userMenuButton.contains(e.target) && 
            !elements.userDropdown.contains(e.target)) {
            elements.userDropdown.classList.add('hidden');
        }
        
        if (languageMenuButton && languageDropdown && 
            !languageMenuButton.contains(e.target) && 
            !languageDropdown.contains(e.target)) {
            languageDropdown.classList.add('hidden');
        }
    });
    
    // Logout button
    elements.logoutButton?.addEventListener('click', handleLogout);
}

// Load settings data
async function loadSettingsData() {
    try {
        // В демо-режиме используем мок-данные настроек
        // Для реальной системы раскомментируйте код ниже
        
        // Демонстрационные данные настроек
        const generalSettings = {
            system_name: 'FlowTest',
            default_language: 'ru',
            default_theme: 'light',
            date_format: 'DD/MM/YYYY',
            time_format: '24',
            default_timezone: 'UTC+03:00',
            enable_registration: true,
            require_email_verification: true,
            enable_multiple_failed_logins: true,
            auto_backups: true,
            enable_activity_logs: true
        };
        
        state.settings.general = generalSettings;
        updateGeneralSettingsForm(generalSettings);
        
        // Демонстрационные данные репозиториев
        const repoSettings = {
            default_repo_path: '/var/repositories',
            auto_sync: true,
            sync_interval: 60,
            enable_webhooks: true
        };
        
        state.settings.repositories = repoSettings;
        updateRepositorySettingsForm(repoSettings);
        
        // Демонстрационные данные резервного копирования
        const backupSettings = {
            backup_interval: 'daily',
            backup_time: '02:00',
            retention_days: 30,
            storage_path: '/var/backups',
            enable_cloud_backup: true,
            cloud_provider: 'aws'
        };
        
        state.settings.backups = backupSettings;
        updateBackupSettingsForm(backupSettings);
        
        /*
        // Get general settings
        const generalSettings = await ApiClient.get('/settings/general/');
        state.settings.general = generalSettings;
        updateGeneralSettingsForm(generalSettings);
        
        // Get repositories settings
        const repoSettings = await ApiClient.get('/settings/repositories/');
        state.settings.repositories = repoSettings;
        updateRepositorySettingsForm(repoSettings);
        
        // Get backup settings
        const backupSettings = await ApiClient.get('/settings/backups/');
        state.settings.backups = backupSettings;
        updateBackupSettingsForm(backupSettings);
        */
        
        // Section activation is now handled by settings-fixed.js
    } catch (error) {
        console.error('Error loading settings data:', error);
        ToastManager.error('Failed to load settings');
    }
}

// Update general settings form
function updateGeneralSettingsForm(generalSettings) {
    if (!generalSettings) return;
    
    // Set system name
    if (elements.generalSettingsForm) {
        const systemNameInput = elements.generalSettingsForm.querySelector('[name="system_name"]');
        if (systemNameInput) {
            systemNameInput.value = generalSettings.system_name || 'FlowTest';
        }
        
        // Set default language
        const defaultLanguageSelect = elements.generalSettingsForm.querySelector('[name="default_language"]');
        if (defaultLanguageSelect) {
            defaultLanguageSelect.value = generalSettings.default_language || 'en';
        }
        
        // Set default theme
        const defaultThemeSelect = elements.generalSettingsForm.querySelector('[name="default_theme"]');
        if (defaultThemeSelect) {
            defaultThemeSelect.value = generalSettings.default_theme || ThemeManager.getCurrentTheme() || 'light';
            
            // Don't force the theme here - let the user preview it via the change event
            
            // Add event listener to change theme when selection changes
            defaultThemeSelect.addEventListener('change', (e) => {
                ThemeManager.setTheme(e.target.value);
            });
        }
        
        // Set date and time formats
        const dateFormatSelect = elements.generalSettingsForm.querySelector('[name="date_format"]');
        if (dateFormatSelect) {
            dateFormatSelect.value = generalSettings.date_format || 'MM/DD/YYYY';
        }
        
        const timeFormatSelect = elements.generalSettingsForm.querySelector('[name="time_format"]');
        if (timeFormatSelect) {
            timeFormatSelect.value = generalSettings.time_format || '12';
        }
        
        // Set default timezone
        const defaultTimezoneSelect = elements.generalSettingsForm.querySelector('[name="default_timezone"]');
        if (defaultTimezoneSelect) {
            defaultTimezoneSelect.value = generalSettings.default_timezone || 'UTC+00:00';
        }
    }
    
    // Set toggles
    const enableRegistration = document.querySelector('[name="enable_registration"]');
    if (enableRegistration) enableRegistration.checked = generalSettings.enable_registration !== false;
    
    const requireEmailVerification = document.querySelector('[name="require_email_verification"]');
    if (requireEmailVerification) requireEmailVerification.checked = generalSettings.require_email_verification !== false;
    
    const enableMultipleFailedLogins = document.querySelector('[name="enable_multiple_failed_logins"]');
    if (enableMultipleFailedLogins) enableMultipleFailedLogins.checked = generalSettings.enable_multiple_failed_logins !== false;
    
    const autoBackups = document.querySelector('[name="auto_backups"]');
    if (autoBackups) autoBackups.checked = generalSettings.auto_backups !== false;
    
    const enableActivityLogs = document.querySelector('[name="enable_activity_logs"]');
    if (enableActivityLogs) enableActivityLogs.checked = generalSettings.enable_activity_logs !== false;
}

// Update repository settings form
function updateRepositorySettingsForm(repoSettings) {
    if (!repoSettings) return;
    
    // Set form values
    const autoSync = document.querySelector('[name="auto_sync"]');
    if (autoSync) autoSync.checked = repoSettings.auto_sync !== false;
    
    const syncFrequency = document.getElementById('sync-frequency');
    if (syncFrequency) syncFrequency.value = repoSettings.sync_frequency || '60';
    
    const webhookIntegration = document.querySelector('[name="webhook_integration"]');
    if (webhookIntegration) webhookIntegration.checked = repoSettings.webhook_integration !== false;
    
    const syncOnConnect = document.querySelector('[name="sync_on_connect"]');
    if (syncOnConnect) syncOnConnect.checked = repoSettings.sync_on_connect !== false;
}

// Update backup settings form
function updateBackupSettingsForm(backupSettings) {
    if (!backupSettings) return;
    
    // Set form values
    const automaticBackups = document.querySelector('[name="automatic_backups"]');
    if (automaticBackups) automaticBackups.checked = backupSettings.automatic_backups !== false;
    
    const backupFrequency = document.getElementById('backup-frequency');
    if (backupFrequency) backupFrequency.value = backupSettings.backup_frequency || 'daily';
    
    const backupTime = document.getElementById('backup-time');
    if (backupTime) backupTime.value = backupSettings.backup_time || '02:00';
    
    const backupRetention = document.getElementById('backup-retention');
    if (backupRetention) backupRetention.value = backupSettings.backup_retention || '30';
    
    const backupLocation = document.getElementById('backup-location');
    if (backupLocation) backupLocation.value = backupSettings.backup_location || 'local';
}

// Load repositories
async function loadRepositories() {
    try {
        const response = await ApiClient.get('/repositories');
        
        if (response) {
            state.repositories = response;
            renderRepositories();
        }
    } catch (error) {
        console.error('Error loading repositories:', error);
        ToastManager.error('Failed to load repositories');
    }
}

// Render repositories
function renderRepositories() {
    if (!elements.repositoriesList) return;
    
    if (state.repositories.length === 0) {
        elements.repositoriesList.innerHTML = `
            <div class="text-center py-6">
                <p class="text-gray-500 dark:text-gray-400" data-i18n="noRepositories">No repositories connected yet</p>
                <button id="no-repos-add-button" class="mt-4 px-3 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 focus:outline-none focus:ring-4 focus:ring-coral-300">
                    <i class="ri-add-line mr-1"></i>
                    <span data-i18n="addRepository">Add Repository</span>
                </button>
            </div>
        `;
        
        // Add event listener to the button
        document.getElementById('no-repos-add-button')?.addEventListener('click', openAddRepositoryModal);
        
        return;
    }
    
    let html = '';
    
    state.repositories.forEach(repo => {
        // Determine the icon based on the repository type
        let iconClass = 'ri-git-repository-line';
        let iconColor = 'text-gray-500 dark:text-gray-400';
        
        if (repo.type === 'github') {
            iconClass = 'ri-github-fill';
            iconColor = 'text-blue-500 dark:text-blue-400';
        } else if (repo.type === 'gitlab') {
            iconClass = 'ri-gitlab-fill';
            iconColor = 'text-indigo-500 dark:text-indigo-400';
        } else if (repo.type === 'bitbucket') {
            iconClass = 'ri-bit-coin-line';
            iconColor = 'text-blue-400 dark:text-blue-300';
        }
        
        // Format date
        const lastSync = new Date(repo.last_sync);
        const formattedDate = lastSync.toLocaleString();
        
        html += `
            <div class="repository-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                    <div class="flex items-center mb-2 sm:mb-0">
                        <div class="mr-3 ${iconColor}">
                            <i class="${iconClass} text-2xl"></i>
                        </div>
                        <div>
                            <p class="font-medium">${repo.name}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${repo.url}</p>
                        </div>
                    </div>
                    <div>
                        <span class="badge bg-${repo.status === 'connected' ? 'green' : 'red'}-100 text-${repo.status === 'connected' ? 'green' : 'red'}-800 dark:bg-${repo.status === 'connected' ? 'green' : 'red'}-900 dark:text-${repo.status === 'connected' ? 'green' : 'red'}-200">
                            <span data-i18n="${repo.status}">${repo.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400" data-i18n="branch">Branch</p>
                        <p class="text-sm">${repo.branch}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400" data-i18n="lastSync">Last Sync</p>
                        <p class="text-sm">${formattedDate}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400" data-i18n="testCount">Test Count</p>
                        <p class="text-sm">${repo.test_count} tests</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400" data-i18n="framework">Framework</p>
                        <p class="text-sm">${repo.framework}</p>
                    </div>
                </div>
                
                <div class="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end space-x-2">
                    <button class="sync-repo-button px-3 py-1.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" data-repo-id="${repo.id}">
                        <i class="ri-refresh-line mr-1"></i>
                        <span data-i18n="sync">Sync</span>
                    </button>
                    <button class="settings-repo-button px-3 py-1.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" data-repo-id="${repo.id}">
                        <i class="ri-settings-line mr-1"></i>
                        <span data-i18n="settings">Settings</span>
                    </button>
                    <button class="disconnect-repo-button px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800" data-repo-id="${repo.id}">
                        <i class="ri-delete-bin-line mr-1"></i>
                        <span data-i18n="disconnect">Disconnect</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    elements.repositoriesList.innerHTML = html;
    
    // Add event listeners to the new buttons
    setupRepositoryActionButtons();
}

// Setup repository action buttons
function setupRepositoryActionButtons() {
    // Sync buttons
    document.querySelectorAll('.sync-repo-button').forEach(button => {
        button.addEventListener('click', () => syncRepository(button.dataset.repoId));
    });
    
    // Settings buttons
    document.querySelectorAll('.settings-repo-button').forEach(button => {
        button.addEventListener('click', () => openRepositorySettings(button.dataset.repoId));
    });
    
    // Disconnect buttons
    document.querySelectorAll('.disconnect-repo-button').forEach(button => {
        button.addEventListener('click', () => disconnectRepository(button.dataset.repoId));
    });
}

// Handle general settings submit
async function handleGeneralSettingsSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            system_name: formData.get('system_name'),
            default_language: formData.get('default_language'),
            default_theme: formData.get('default_theme'),
            date_format: formData.get('date_format'),
            time_format: formData.get('time_format'),
            default_timezone: formData.get('default_timezone'),
            enable_registration: formData.get('enable_registration') === 'on',
            require_email_verification: formData.get('require_email_verification') === 'on',
            enable_multiple_failed_logins: formData.get('enable_multiple_failed_logins') === 'on',
            auto_backups: formData.get('auto_backups') === 'on',
            enable_activity_logs: formData.get('enable_activity_logs') === 'on'
        };
        
        // Update the state
        state.settings.general = settings;
        
        const response = await ApiClient.put('/settings/general', settings);
        
        if (response) {
            ToastManager.success('General settings updated successfully');
        }
    } catch (error) {
        console.error('Error updating general settings:', error);
        ToastManager.error('Failed to update general settings');
    }
}

// Handle repository settings submit
async function handleRepositorySettingsSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            auto_sync: formData.get('auto_sync') === 'on',
            sync_frequency: formData.get('sync_frequency'),
            webhook_integration: formData.get('webhook_integration') === 'on',
            sync_on_connect: formData.get('sync_on_connect') === 'on'
        };
        
        // Update the state
        state.settings.repositories = settings;
        
        const response = await ApiClient.put('/settings/repositories', settings);
        
        if (response) {
            ToastManager.success('Repository settings updated successfully');
        }
    } catch (error) {
        console.error('Error updating repository settings:', error);
        ToastManager.error('Failed to update repository settings');
    }
}

// Handle backup settings submit
async function handleBackupSettingsSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            automatic_backups: formData.get('automatic_backups') === 'on',
            backup_frequency: formData.get('backup_frequency'),
            backup_time: formData.get('backup_time'),
            backup_retention: formData.get('backup_retention'),
            backup_location: formData.get('backup_location')
        };
        
        // Update the state
        state.settings.backups = settings;
        
        const response = await ApiClient.put('/settings/backups', settings);
        
        if (response) {
            ToastManager.success('Backup settings updated successfully');
        }
    } catch (error) {
        console.error('Error updating backup settings:', error);
        ToastManager.error('Failed to update backup settings');
    }
}

// Handle backup now
async function handleBackupNow() {
    try {
        ToastManager.info('Starting backup...');
        
        const response = await ApiClient.post('/backups');
        
        if (response) {
            ToastManager.success('Backup created successfully');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        ToastManager.error('Failed to create backup');
    }
}

// Open add repository modal
function openAddRepositoryModal() {
    if (!elements.addRepositoryModal) return;
    
    elements.addRepositoryModal.classList.remove('hidden');
    elements.addRepositoryModal.classList.add('flex');
    elements.addRepositoryForm?.reset();
    
    // Reset the connection log
    elements.connectionLog?.classList.add('hidden');
    if (elements.logContainer) elements.logContainer.innerHTML = '';
    
    // Set default repo type
    state.currentRepoType = 'git';
    elements.repoTypeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'git');
    });
    
    // Show git repo settings
    showRepositorySettings('git');
    
    // Set default auth type
    const defaultAuthRadio = document.querySelector('[name="git_auth_type"][value="none"]');
    if (defaultAuthRadio) defaultAuthRadio.checked = true;
    
    elements.sshKeyAuth?.classList.add('hidden');
    elements.basicAuth?.classList.add('hidden');
}

// Close add repository modal
function closeAddRepositoryModal() {
    if (!elements.addRepositoryModal) return;
    
    elements.addRepositoryModal.classList.add('hidden');
    elements.addRepositoryModal.classList.remove('flex');
}

// Show repository settings based on type
function showRepositorySettings(type) {
    // Hide all repo settings
    document.getElementById('git-repo-settings')?.classList.add('hidden');
    
    // Show the selected repo settings
    if (type === 'git') {
        document.getElementById('git-repo-settings')?.classList.remove('hidden');
    }
    // Additional repository types would be handled here
}

// Handle auth type change
function handleAuthTypeChange(e) {
    const authType = e.target.value;
    
    // Hide all auth sections
    elements.sshKeyAuth?.classList.add('hidden');
    elements.basicAuth?.classList.add('hidden');
    
    // Show the selected auth section
    if (authType === 'ssh') {
        elements.sshKeyAuth?.classList.remove('hidden');
    } else if (authType === 'basic') {
        elements.basicAuth?.classList.remove('hidden');
    }
}

// Test repository connection
async function testRepositoryConnection() {
    if (state.connectionTestInProgress) return;
    
    try {
        state.connectionTestInProgress = true;
        
        // Show the connection log
        elements.connectionLog?.classList.remove('hidden');
        if (elements.logContainer) elements.logContainer.innerHTML = '';
        
        // Add initial log message
        addLogMessage('Testing connection...', 'info');
        
        // Get repository data from the form
        if (!elements.addRepositoryForm) {
            throw new Error('Repository form not found');
        }
        
        const formData = new FormData(elements.addRepositoryForm);
        const repoData = {};
        
        // Handle different repository types
        if (state.currentRepoType === 'git') {
            repoData.type = 'git';
            repoData.url = formData.get('git_repo_url');
            repoData.branch = formData.get('git_branch');
            repoData.test_path = formData.get('git_test_path');
            repoData.test_pattern = formData.get('git_test_pattern');
            repoData.framework = formData.get('git_framework');
            
            // Authentication
            const authType = formData.get('git_auth_type');
            repoData.auth_type = authType;
            
            if (authType === 'ssh') {
                repoData.ssh_key = formData.get('git_ssh_key');
                repoData.ssh_passphrase = formData.get('git_ssh_passphrase');
            } else if (authType === 'basic') {
                repoData.username = formData.get('git_username');
                repoData.password = formData.get('git_password');
            }
        }
        
        // Add display name
        repoData.name = formData.get('repo_name');
        
        addLogMessage(`Connecting to ${repoData.url}...`, 'info');
        
        // Make API request to test the connection
        const response = await ApiClient.post('/repositories/test', repoData);
        
        if (response && response.success) {
            addLogMessage('Repository found', 'success');
            
            if (response.auth_success) {
                addLogMessage('Authentication successful', 'success');
            } else if (repoData.auth_type === 'none' || !repoData.auth_type) {
                addLogMessage('Authentication not required', 'info');
            } else {
                addLogMessage('Authentication failed', 'error');
            }
            
            if (response.test_files_count > 0) {
                addLogMessage(`Found ${response.test_files_count} test files matching pattern`, 'success');
                addLogMessage('Connection test completed successfully', 'success');
            } else {
                addLogMessage(`No test files found matching pattern ${repoData.test_pattern || '*'}`, 'warning');
            }
        } else {
            addLogMessage('Failed to connect to repository', 'error');
            if (response && response.error) {
                addLogMessage(response.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error testing repository connection:', error);
        addLogMessage('Error testing connection: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        state.connectionTestInProgress = false;
    }
}

// Add log message
function addLogMessage(message, type = 'info') {
    if (!elements.logContainer) return;
    
    const logElement = document.createElement('div');
    logElement.className = `log-message log-${type}`;
    logElement.textContent = message;
    elements.logContainer.appendChild(logElement);
    
    // Scroll to bottom
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

// Handle add repository form submit
async function handleAddRepository(e) {
    e.preventDefault();
    
    try {
        // Get repository data from the form
        if (!elements.addRepositoryForm) {
            throw new Error('Repository form not found');
        }
        
        const formData = new FormData(e.target);
        const repoData = {};
        
        // Handle different repository types
        if (state.currentRepoType === 'git') {
            repoData.type = 'git';
            repoData.url = formData.get('git_repo_url');
            repoData.branch = formData.get('git_branch');
            repoData.test_path = formData.get('git_test_path');
            repoData.test_pattern = formData.get('git_test_pattern');
            repoData.framework = formData.get('git_framework');
            
            // Authentication
            const authType = formData.get('git_auth_type');
            repoData.auth_type = authType;
            
            if (authType === 'ssh') {
                repoData.ssh_key = formData.get('git_ssh_key');
                repoData.ssh_passphrase = formData.get('git_ssh_passphrase');
            } else if (authType === 'basic') {
                repoData.username = formData.get('git_username');
                repoData.password = formData.get('git_password');
            }
        }
        
        // Add display name
        repoData.name = formData.get('repo_name') || extractRepoName(repoData.url);
        
        // Add auto sync
        repoData.auto_sync = formData.get('auto_sync') === 'on';
        
        // Make API request to add the repository
        const response = await ApiClient.post('/repositories', repoData);
        
        if (response) {
            ToastManager.success('Repository connected successfully');
            closeAddRepositoryModal();
            await loadRepositories();
        }
    } catch (error) {
        console.error('Error adding repository:', error);
        ToastManager.error('Failed to connect repository: ' + (error.message || 'Unknown error'));
    }
}

// Extract repository name from URL
function extractRepoName(url) {
    if (!url) return 'Repository';
    
    // Remove trailing .git if present
    url = url.replace(/\.git$/, '');
    
    // Extract the last part of the URL
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    
    return lastPart || 'Repository';
}

// Sync repository
async function syncRepository(repoId) {
    try {
        ToastManager.info('Syncing repository...');
        
        const response = await ApiClient.post(`/repositories/${repoId}/sync`);
        
        if (response) {
            ToastManager.success('Repository synced successfully');
            
            // Reload repositories to get updated data
            await loadRepositories();
        }
    } catch (error) {
        console.error('Error syncing repository:', error);
        ToastManager.error('Failed to sync repository');
    }
}

// Open repository settings
function openRepositorySettings(repoId) {
    // Find the repository
    const repo = state.repositories.find(repo => repo.id === repoId);
    if (!repo) {
        ToastManager.error('Repository not found');
        return;
    }
    
    // This would open a modal with repository-specific settings
    ToastManager.info(`Repository settings for ${repo.name} - Coming soon`);
}

// Disconnect repository
async function disconnectRepository(repoId) {
    if (!confirm('Are you sure you want to disconnect this repository? This will not delete the repository, but you will need to reconnect it to use it again.')) {
        return;
    }
    
    try {
        const response = await ApiClient.delete(`/repositories/${repoId}`);
        
        if (response) {
            ToastManager.success('Repository disconnected successfully');
            
            // Reload repositories
            await loadRepositories();
        }
    } catch (error) {
        console.error('Error disconnecting repository:', error);
        ToastManager.error('Failed to disconnect repository');
    }
}

/**
 * Полностью заменяем систему навигации, чтобы избежать проблем с классом active
 */
function setupNavigation() {
    console.log('Navigation setup moved to settings-fixed.js');
    
    // Add event listener for hash changes to handle repository loading
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1);
        
        // Only load repositories if that section is active
        if (hash === 'repositories') {
            loadRepositories();
        }
    });
}

/**
 * Показывает выбранный раздел и подсвечивает соответствующую ссылку навигации
 * @param {string} sectionId - ID раздела для отображения
 */
function showSection(sectionId) {
    // Update state for compatibility with other functions
    state.activeSection = sectionId;
    
    // Section visibility is now handled by settings-fixed.js
    
    // If repositories section is shown, load the repositories
    if (sectionId === 'repositories') {
        loadRepositories();
    }
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'U';
    
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Setup user menu with user data
function setupUserMenu() {
    if (!state.user) return;
    
    // Format the user's name and initials
    const firstName = state.user.first_name || '';
    const lastName = state.user.last_name || '';
    const displayName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : state.user.name || state.user.username || 'User';
    
    // Set user initials
    if (elements.userInitials) {
        elements.userInitials.textContent = getInitials(displayName);
    }
    
    // Set user name
    if (elements.userName) {
        elements.userName.textContent = displayName;
    }
}

// Handle logout
async function handleLogout() {
    try {
        await ApiClient.logout();
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error during logout:', error);
        ToastManager.error('Failed to logout');
    }
}

/**
 * Function to fix any remaining dark hover states
 */
function fixDarkHoverStates() {
    // Получаем активный раздел из хэша URL или устанавливаем "general" по умолчанию
    const hash = window.location.hash.substring(1);
    const activeSection = hash || 'general';
    
    // Обработка ссылок навигации в боковой панели
    const sidebarLinks = document.querySelectorAll('aside a');
    sidebarLinks.forEach(link => {
        // Сбрасываем стили для всех ссылок
        link.style.backgroundColor = '';
        link.style.color = '';
        
        // Настраиваем поведение при наведении для боковой навигации
        link.addEventListener('mouseenter', () => {
            if (link.classList.contains('bg-coral-50') || link.classList.contains('text-coral-600')) {
                // Активная ссылка - сохраняем коралловый цвет
                link.style.backgroundColor = '#fff5f2';
                link.style.color = '#ff6347';
            } else {
                // Обычное подсвечивание при наведении
                link.style.backgroundColor = '#fff5f2';
            }
        });
        
        link.addEventListener('mouseleave', () => {
            if (link.classList.contains('bg-coral-50') || link.classList.contains('text-coral-600')) {
                // Активная ссылка - сохраняем коралловый цвет
                link.style.backgroundColor = '#fff5f2';
                link.style.color = '#ff6347';
            } else {
                // Обычное состояние - убираем цвет фона
                link.style.backgroundColor = '';
            }
        });
    });
    
    // Обработка ссылок навигации в настройках (слева)
    const settingsNavLinks = document.querySelectorAll('.settings-nav-link');
    settingsNavLinks.forEach(link => {
        // Проверяем, является ли ссылка активной
        const section = link.getAttribute('href')?.substring(1);
        const isActive = section === activeSection;
        
        // Сбрасываем все классы и стили
        link.classList.remove('active');
        link.classList.remove('nav-active-custom');
        link.style.backgroundColor = '';
        link.style.color = '';
        delete link.dataset.activeNav;
        
        // Устанавливаем стиль для активной ссылки
        if (isActive) {
            // Используем собственный класс вместо 'active'
            link.classList.add('nav-active-custom');
            link.style.backgroundColor = '#fff5f2';
            link.style.color = '#ff6347';
            link.dataset.activeNav = "true";
            
            // Принудительно игнорируем класс active
            setTimeout(() => {
                link.classList.remove('active');
            }, 50);
        }
        
        // Удаляем существующие обработчики событий
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Настраиваем поведение при наведении
        newLink.addEventListener('mouseenter', () => {
            if (!newLink.dataset.activeNav) {
                newLink.style.backgroundColor = '#f3f4f6';
            }
        });
        
        newLink.addEventListener('mouseleave', () => {
            if (!newLink.dataset.activeNav) {
                newLink.style.backgroundColor = '';
            }
        });
        
        // Обработчик клика
        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const clickedSection = newLink.getAttribute('href')?.substring(1);
            if (clickedSection) {
                window.location.hash = clickedSection;
            }
        });
    });
    
    // Восстанавливаем нормальный стиль для форм
    const formElements = document.querySelectorAll('input, select, textarea');
    formElements.forEach(el => {
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#111827';
        el.style.borderColor = '#d1d5db';
        
        // Убираем оранжевую обводку при фокусе и устанавливаем синюю
        el.addEventListener('focus', () => {
            el.style.borderColor = '#3b82f6';
            el.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
            el.style.outline = 'none';
        });
        
        el.addEventListener('blur', () => {
            el.style.borderColor = '#d1d5db';
            el.style.boxShadow = 'none';
        });
    });
    
    // Исправляем кнопки
    const buttons = document.querySelectorAll('button:not(.bg-coral-500)');
    buttons.forEach(btn => {
        // При фокусе убираем оранжевую обводку
        btn.addEventListener('focus', () => {
            btn.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
            btn.style.outline = 'none';
        });
        
        btn.addEventListener('blur', () => {
            btn.style.boxShadow = 'none';
        });
    });
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);