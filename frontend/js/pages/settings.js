/**
 * Settings page functionality
 * Handles system settings, repository connections, and various system configurations
 */

console.log('🔄 Loading settings.js file...');

import i18n from '../i18n/i18n.js';
import ToastManager from '../utils/toast.js';
import ApiClient from '../api/client.js';
import ThemeManager from '../utils/theme.js';
import settingsManager from '../utils/settings-manager.js';

// API Base URL
const API_BASE_URL = '/api';

// DOM Elements - will be initialized in initPage
let elements = {};

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

// Initialize DOM elements
function initElements() {
    console.log('Initializing DOM elements...');
    elements = {
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
        userAvatar: document.getElementById('user-avatar'),
        userInitials: document.getElementById('user-initials'),
        userName: document.getElementById('user-name'),
        userMenuButton: document.getElementById('user-menu-button'),
        userDropdown: document.getElementById('user-dropdown'),
        logoutButton: document.getElementById('logout-button')
    };
    
    console.log('Elements initialized:', elements);
}

// Initialize the page
async function initPage() {
    try {
        console.log('Initializing settings page...');

        // Initialize DOM elements first
        initElements();

        // Get the user's preferred theme from settings manager
        const savedTheme = settingsManager.getTheme();
        console.log('User saved theme:', savedTheme);
        
        // Apply the saved theme
        ThemeManager.applyTheme(savedTheme);
        
        // Проверяем аутентификацию
        if (!ApiClient.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
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
        // Get current user profile
        state.user = await ApiClient.getCurrentUser();
        
        if (!state.user) {
            console.error('No user data available');
            window.location.href = 'login.html';
            return;
        }
        
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
    console.log('Setting up repository event listeners');
    console.log('addRepositoryButton:', elements.addRepositoryButton);
    
    // Use event delegation for add repository buttons
    document.addEventListener('click', (e) => {
        if (e.target.id === 'add-repository-button' || e.target.closest('#add-repository-button')) {
            console.log('Add repository button clicked via delegation');
            e.preventDefault();
            openAddRepositoryModal();
        }
        if (e.target.id === 'no-repos-add-button' || e.target.closest('#no-repos-add-button')) {
            console.log('No repos add button clicked via delegation');
            e.preventDefault();
            openAddRepositoryModal();
        }
    });
    
    if (elements.addRepositoryButton) {
        elements.addRepositoryButton.addEventListener('click', openAddRepositoryModal);
        console.log('Event listener added to addRepositoryButton');
    } else {
        console.error('addRepositoryButton not found!');
    }
    
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
    document.addEventListener('change', (e) => {
        if (e.target.name === 'git_auth_type') {
            handleAuthTypeChange(e);
        }
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
    
    // Settings navigation - load repositories when repositories section is shown
    elements.settingsNavLinks?.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetSection = e.target.getAttribute('data-section');
            if (targetSection === 'repositories') {
                console.log('🔄 Repositories section activated - loading repositories...');
                setTimeout(() => {
                    loadRepositories();
                }, 100); // Small delay to ensure section is visible
            }
        });
    });
}

// Load settings data
async function loadSettingsData() {
    try {
        // В демо-режиме используем мок-данные настроек
        // Для реальной системы раскомментируйте код ниже
        
        // Load settings from localStorage or use defaults
        const savedGeneralSettings = localStorage.getItem('flowtest-general-settings');
        const generalSettings = savedGeneralSettings ? JSON.parse(savedGeneralSettings) : {
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
        
        // Load repository settings from localStorage or use defaults
        const savedRepoSettings = localStorage.getItem('flowtest-repository-settings');
        const repoSettings = savedRepoSettings ? JSON.parse(savedRepoSettings) : {
            default_repo_path: '/var/repositories',
            auto_sync: true,
            sync_interval: 60,
            enable_webhooks: true
        };
        
        state.settings.repositories = repoSettings;
        updateRepositorySettingsForm(repoSettings);
        
        // Load backup settings from localStorage or use defaults
        const savedBackupSettings = localStorage.getItem('flowtest-backup-settings');
        const backupSettings = savedBackupSettings ? JSON.parse(savedBackupSettings) : {
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
        
        // Load repositories data
        await loadRepositories();
        
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
            // Get current language from settings manager
            const currentLanguage = settingsManager.getLanguage();
            defaultLanguageSelect.value = generalSettings.default_language || currentLanguage || 'en';
            
            // Add event listener to change language when selection changes and save it
            defaultLanguageSelect.addEventListener('change', (e) => {
                const newLanguage = e.target.value;
                settingsManager.setLanguage(newLanguage);
                i18n.setLanguage(newLanguage);
            });
        }
        
        // Set default theme
        const defaultThemeSelect = elements.generalSettingsForm.querySelector('[name="default_theme"]');
        if (defaultThemeSelect) {
            // Get current theme from settings manager
            const currentTheme = settingsManager.getTheme();
            defaultThemeSelect.value = generalSettings.default_theme || currentTheme || 'light';
            
            // Add event listener to change theme when selection changes and save it
            defaultThemeSelect.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                settingsManager.setTheme(newTheme);
                ThemeManager.applyTheme(newTheme);
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
    console.log('🔄 Loading repositories...');
    
    const repositoriesContainer = document.getElementById('repositories-list');
    if (!repositoriesContainer) {
        console.error('❌ repositories-list container not found!');
        return;
    }

    // Show loading state
    repositoriesContainer.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-coral-500"></div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">Loading repositories...</p>
        </div>
    `;

    try {
        const response = await ApiClient.get('/automation/projects/');
        console.log('✅ API Response received:', response);
        
        // Extract projects from response
        const projects = Array.isArray(response) ? response : (response.results || []);
        console.log(`📊 Found ${projects.length} repositories`);
        
        if (projects.length === 0) {
            // Show empty state
            repositoriesContainer.innerHTML = `
                <div class="text-center py-12">
                    <div class="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <i class="ri-git-repository-line text-2xl text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No repositories connected</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">Connect your first automation repository to get started</p>
                    <button id="empty-state-add-btn" class="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors">
                        <i class="ri-add-line mr-2"></i>Add Repository
                    </button>
                </div>
            `;
            
            // Add event listener for empty state button
            document.getElementById('empty-state-add-btn')?.addEventListener('click', openAddRepositoryModal);
            
            // Update stats with empty data
            updateRepositoryStats([]);
            return;
        }

        // Render repositories list
        let html = '<div class="space-y-4">';
        
        projects.forEach(repo => {
            const statusColor = getStatusColor(repo.sync_status);
            const statusText = getStatusText(repo.sync_status);
            
            html += `
                <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <i class="ri-git-repository-line text-xl text-coral-500"></i>
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${repo.name}</h3>
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">
                                    ${statusText}
                                </span>
                            </div>
                            
                            <div class="space-y-2">
                                <p class="text-sm text-gray-600 dark:text-gray-400">
                                    <i class="ri-link-m mr-2"></i>
                                    <span class="font-mono">${repo.repository_url}</span>
                                </p>
                                <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span><i class="ri-git-branch-line mr-1"></i>${repo.branch}</span>
                                    <span><i class="ri-flask-line mr-1"></i>${repo.framework}</span>
                                    ${repo.project_name ? `<span><i class="ri-folder-line mr-1"></i>${repo.project_name}</span>` : ''}
                                </div>
                                ${repo.last_sync ? `
                                    <p class="text-xs text-gray-400">
                                        ${i18n.t('lastSyncColon')} ${new Date(repo.last_sync).toLocaleDateString()}
                                    </p>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            <button onclick="syncRepository(${repo.id})" class="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                <i class="ri-refresh-line mr-1"></i>${i18n.t('sync')}
                            </button>
                            <button onclick="disconnectRepository(${repo.id})" class="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                <i class="ri-link-unlink mr-1"></i>${i18n.t('remove')}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        repositoriesContainer.innerHTML = html;
        
        // Update stats cards
        updateRepositoryStats(projects);
        
        console.log('✅ Repositories rendered successfully');
        
    } catch (error) {
        console.error('❌ Error loading repositories:', error);
        
        // Show error state
        repositoriesContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                    <i class="ri-error-warning-line text-2xl text-red-500"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to load repositories</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6">${error.message || 'An error occurred while loading repositories'}</p>
                <button onclick="loadRepositories()" class="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors">
                    <i class="ri-refresh-line mr-2"></i>Try Again
                </button>
            </div>
        `;
        
        // Update stats with empty data in case of error
        updateRepositoryStats([]);
    }
}

// Helper functions for status display
function getStatusColor(status) {
    switch (status) {
        case 'synced': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'syncing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'synced': return i18n.t('synced');
        case 'syncing': return i18n.t('syncing');
        case 'error': return i18n.t('error');
        case 'not_synced': return i18n.t('notSynced');
        default: return i18n.t('unknown');
    }
}

// Update repository statistics cards
function updateRepositoryStats(repositories) {
    console.log('📊 Updating repository stats...');
    
    // Calculate stats
    const totalRepos = repositories.length;
    const activeRepos = repositories.filter(repo => repo.sync_status === 'synced').length;
    
    // Get last sync time
    const lastSyncTimes = repositories
        .filter(repo => repo.last_sync)
        .map(repo => new Date(repo.last_sync))
        .sort((a, b) => b - a);
    
    const lastSyncTime = lastSyncTimes.length > 0 ? lastSyncTimes[0] : null;
    
    // Update total repositories count
    const totalReposElement = document.getElementById('total-repos-count');
    if (totalReposElement) {
        totalReposElement.textContent = totalRepos;
    }
    
    // Update active repositories count
    const activeReposElement = document.getElementById('active-repos-count');
    if (activeReposElement) {
        activeReposElement.textContent = activeRepos;
    }
    
    // Update last sync time
    const lastSyncElement = document.getElementById('last-sync-time');
    if (lastSyncElement) {
        if (lastSyncTime) {
            const timeAgo = getTimeAgo(lastSyncTime);
            lastSyncElement.textContent = timeAgo;
        } else {
            lastSyncElement.textContent = i18n.t('never');
        }
    }
    
    // Update auto-sync status (placeholder for now)
    const autoSyncElement = document.getElementById('auto-sync-status');
    if (autoSyncElement) {
        // TODO: Get actual status from settings
        const isAutoSyncEnabled = false; // This should come from actual settings
        autoSyncElement.textContent = isAutoSyncEnabled ? i18n.t('enabled') : i18n.t('disabled');
    }
    
    console.log(`📊 Stats updated: ${totalRepos} total, ${activeRepos} active`);
}

// Helper function to get time ago text
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return i18n.t('justNow');
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        const key = minutes === 1 ? 'minutesAgo' : 'minutesAgo_plural';
        return i18n.t(key).replace('{0}', minutes);
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        const key = hours === 1 ? 'hoursAgo' : 'hoursAgo_plural';
        return i18n.t(key).replace('{0}', hours);
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        const key = days === 1 ? 'daysAgo' : 'daysAgo_plural';
        return i18n.t(key).replace('{0}', days);
    }
}

// Legacy function - kept for compatibility
function renderRepositories() {
    // This function is now handled by loadRepositories()
    console.log('renderRepositories called - delegating to loadRepositories');
    
    if (!elements.repositoriesList) {
        console.error('repositoriesList element not found!');
        return;
    }
    
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
        const noReposAddButton = document.getElementById('no-repos-add-button');
        if (noReposAddButton) {
            noReposAddButton.addEventListener('click', openAddRepositoryModal);
            console.log('Event listener added to no-repos-add-button');
        }
        
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
        
        // In demo mode, just save to local storage
        try {
            // Save settings locally
            localStorage.setItem('flowtest-general-settings', JSON.stringify(settings));
            ToastManager.success('General settings updated successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            ToastManager.error('Failed to save settings');
        }
        
        /* For production, uncomment this:
        const response = await ApiClient.put('/settings/general', settings);
        
        if (response) {
            ToastManager.success('General settings updated successfully');
        }
        */
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
        
        // In demo mode, just save to local storage
        try {
            localStorage.setItem('flowtest-repository-settings', JSON.stringify(settings));
            ToastManager.success('Repository settings updated successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            ToastManager.error('Failed to save settings');
        }
        
        /* For production, uncomment this:
        const response = await ApiClient.put('/settings/repositories', settings);
        
        if (response) {
            ToastManager.success('Repository settings updated successfully');
        }
        */
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
        
        // In demo mode, just save to local storage
        try {
            localStorage.setItem('flowtest-backup-settings', JSON.stringify(settings));
            ToastManager.success('Backup settings updated successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            ToastManager.error('Failed to save settings');
        }
        
        /* For production, uncomment this:
        const response = await ApiClient.put('/settings/backups', settings);
        
        if (response) {
            ToastManager.success('Backup settings updated successfully');
        }
        */
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
    console.log('openAddRepositoryModal called');
    console.log('addRepositoryModal element:', elements.addRepositoryModal);
    
    if (!elements.addRepositoryModal) {
        console.error('addRepositoryModal element not found');
        return;
    }
    
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
    
    // Load projects for selection
    loadProjectsForSelection();
    
    document.getElementById('basic-auth')?.classList.add('hidden');
    document.getElementById('token-auth')?.classList.add('hidden');
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
    document.getElementById('basic-auth')?.classList.add('hidden');
    document.getElementById('token-auth')?.classList.add('hidden');
    
    // Show the selected auth section
    if (authType === 'basic') {
        document.getElementById('basic-auth')?.classList.remove('hidden');
    } else if (authType === 'token') {
        document.getElementById('token-auth')?.classList.remove('hidden');
    }
}

// Load projects for selection in repository modal
async function loadProjectsForSelection() {
    try {
        console.log('Loading projects for repository selection...');
        console.log('Auth token available:', !!localStorage.getItem('flowtest_access_token'));
        
        // ApiClient.get automatically handles authentication
        const data = await ApiClient.get('/projects/');
        console.log('Projects API response:', data);
        
        // Handle both paginated (data.results) and direct array responses
        const projects = Array.isArray(data) ? data : (data.results || []);
        console.log('Projects array:', projects);
        
        // Find the project select element
        const projectSelect = document.querySelector('[name="project_id"]');
        if (!projectSelect) {
            console.error('Project select element not found');
            return;
        }
        
        // Clear existing options except the default one
        const defaultOption = projectSelect.querySelector('option[value=""]');
        projectSelect.innerHTML = '';
        if (defaultOption) {
            projectSelect.appendChild(defaultOption);
        }
        
        // Add project options
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
            console.log(`Added project option: ${project.name} (ID: ${project.id})`);
        });
        
        console.log(`Loaded ${projects.length} projects for selection`);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        console.error('Error details:', error.message, error.status);
        ToastManager.show(i18n.t('errorLoadingProjects') || 'Error loading projects', 'error');
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
                repoData.access_token = formData.get('git_password'); // Use password as access token for now
            } else if (authType === 'token') {
                repoData.access_token = formData.get('git_access_token');
            }
        }
        
        // Add display name and project
        repoData.name = formData.get('repo_name');
        repoData.project_id = formData.get('project_id');
        
        addLogMessage(`Connecting to ${repoData.url}...`, 'info');
        
        // Make API request to test the connection
        const response = await ApiClient.post('/automation/projects/test/', repoData);
        
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
                addLogMessage(`Found ${response.test_files_count} test files in repository`, 'success');
                
                // Show some example test files
                if (response.test_files_found && response.test_files_found.length > 0) {
                    addLogMessage('Example test files found:', 'info');
                    response.test_files_found.slice(0, 5).forEach(file => {
                        addLogMessage(`  - ${file}`, 'info');
                    });
                    if (response.test_files_found.length > 5) {
                        addLogMessage(`  ... and ${response.test_files_found.length - 5} more`, 'info');
                    }
                }
                
                addLogMessage('Connection test completed successfully', 'success');
            } else {
                addLogMessage('No test files found in repository', 'warning');
                addLogMessage('The repository may not contain tests or tests may be in an unsupported format', 'info');
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
                repoData.access_token = formData.get('git_password'); // Use password as access token for now
            } else if (authType === 'token') {
                repoData.access_token = formData.get('git_access_token');
            }
        }
        
        // Add display name and project
        repoData.name = formData.get('repo_name') || extractRepoName(repoData.url);
        repoData.project_id = formData.get('project_id');
        
        // Add auto sync
        repoData.auto_sync = formData.get('auto_sync') === 'on';
        
        // Validate project selection
        if (!repoData.project_id) {
            ToastManager.error('Please select a project for this repository');
            return;
        }
        
        // Transform data for automation projects API
        const projectData = {
            name: repoData.name,
            repository_url: repoData.url,
            repository_type: repoData.type === 'git' ? 'github' : repoData.type,
            branch: repoData.branch || 'main',
            framework: repoData.framework || 'auto',
            project: repoData.project_id
        };
        
        // Add authentication fields if provided
        if (repoData.access_token) {
            projectData.access_token = repoData.access_token;
        }
        if (repoData.username) {
            projectData.username = repoData.username;
        }

        // Make API request to add the repository
        console.log('Sending project data:', projectData);
        const response = await ApiClient.post('/automation/projects/', projectData);
        
        if (response) {
            ToastManager.success('Repository connected successfully');
            closeAddRepositoryModal();
            await loadRepositories();
        }
    } catch (error) {
        console.error('Error adding repository:', error);
        console.error('Error status:', error.status);
        console.error('Error data:', error.data);
        
        let errorMessage = 'Failed to connect repository: ';
        
        // Check for specific error types
        if (error.data && error.data.error && error.data.error.message) {
            const message = error.data.error.message;
            if (message.includes('duplicate key value') && message.includes('already exists')) {
                errorMessage = 'Repository with this name already exists in the selected project. Please choose a different name.';
            } else {
                errorMessage += message;
            }
        } else if (error.data && typeof error.data === 'object') {
            // Try to extract specific field errors
            const errors = [];
            for (const [field, messages] of Object.entries(error.data)) {
                if (Array.isArray(messages)) {
                    errors.push(`${field}: ${messages.join(', ')}`);
                } else if (typeof messages === 'string') {
                    errors.push(`${field}: ${messages}`);
                }
            }
            errorMessage += errors.length > 0 ? errors.join('; ') : JSON.stringify(error.data);
        } else {
            errorMessage += error.message || 'Unknown error';
        }
        
        // Still reload repositories even if there was an error
        try {
            await loadRepositories();
        } catch (loadError) {
            console.error('Error reloading repositories after failed creation:', loadError);
        }
        
        ToastManager.error(errorMessage);
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
        
        const response = await ApiClient.post(`/automation/projects/${repoId}/sync/`);
        
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
        const response = await ApiClient.delete(`/automation/projects/${repoId}/`);
        
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
            console.log('Hash changed to repositories, loading repositories...');
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
        console.log('Loading repositories for section:', sectionId);
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
    console.log('[Settings] Setting up user menu with data:', state.user);
    if (!state.user) {
        console.error('[Settings] No user data available');
        return;
    }
    
    // Format the user's name - always use username
    const displayName = state.user.username || state.user.email?.split('@')[0] || 'User';
    
    console.log('[Settings] Display name:', displayName);
    
    // Set user avatar or initials
    const userAvatarImg = document.getElementById('user-avatar-img');
    const userInitialsSpan = document.getElementById('user-initials');
    
    if (state.user.avatar && userAvatarImg) {
        // Show avatar image
        userAvatarImg.src = state.user.avatar;
        userAvatarImg.classList.remove('hidden');
        if (userInitialsSpan) {
            userInitialsSpan.style.display = 'none';
        }
    } else if (userInitialsSpan) {
        // Show initials
        const initials = getInitials(displayName);
        userInitialsSpan.textContent = initials;
        if (userAvatarImg) {
            userAvatarImg.classList.add('hidden');
        }
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

// Export functions for use in HTML
// Make functions globally accessible
window.syncRepository = syncRepository;
window.disconnectRepository = disconnectRepository;
window.loadRepositories = loadRepositories;

window.SettingsPageFunctions = {
    initPage,
    openAddRepositoryModal,
    closeAddRepositoryModal,
    loadRepositories,
    showSection
};

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Settings] DOM loaded, initializing page...');
    initPage();
});