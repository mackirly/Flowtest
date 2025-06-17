/**
 * Header component for FlowTest
 * Includes navigation, user menu, and theme toggle
 */
class Header extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        // Get current user if available
        const currentUser = this.getCurrentUser();
        
        this.shadowRoot.innerHTML = `
            <style>
                /* Scoped styles */
                :host {
                    display: block;
                    width: 100%;
                }
                
                /* Import global styles */
                @import url('/css/tailwind.css');
                @import url('/css/style.css');
                
                .user-menu {
                    display: none;
                    position: absolute;
                    right: 0;
                    top: 100%;
                    margin-top: 0.5rem;
                    z-index: 50;
                }
                
                .user-menu.active {
                    display: block;
                }
            </style>

            <header class="bg-white dark:bg-gray-800 shadow-sm">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <!-- Logo and navigation -->
                        <div class="flex">
                            <div class="flex-shrink-0 flex items-center">
                                <a href="index.html" class="flex items-center">
                                    <img class="h-8 w-auto" src="images/logo.svg" alt="FlowTest Logo">
                                    <span class="ml-2 text-xl font-bold text-gray-900 dark:text-white">FlowTest</span>
                                </a>
                            </div>
                            
                            <!-- Main navigation -->
                            <nav class="hidden md:ml-6 md:flex md:space-x-8" id="main-nav">
                                <a href="index.html" class="nav-link ${this.isCurrentPage('index.html') ? 'nav-link-active' : ''}">
                                    Dashboard
                                </a>
                                <a href="projects.html" class="nav-link ${this.isCurrentPage('projects.html') ? 'nav-link-active' : ''}">
                                    Projects
                                </a>
                                <a href="test-cases.html" class="nav-link ${this.isCurrentPage('test-cases.html') ? 'nav-link-active' : ''}">
                                    Test Cases
                                </a>
                                <a href="reports.html" class="nav-link ${this.isCurrentPage('reports.html') ? 'nav-link-active' : ''}">
                                    Reports
                                </a>
                                <a href="automation.html" class="nav-link ${this.isCurrentPage('automation.html') ? 'nav-link-active' : ''}">
                                    Automation
                                </a>
                            </nav>
                        </div>
                        
                        <!-- Right side controls -->
                        <div class="flex items-center">
                            <!-- Search button -->
                            <button type="button" id="search-button" class="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
                                <span class="sr-only">Search</span>
                                <i class="ri-search-line text-xl"></i>
                            </button>
                            
                            <!-- Theme toggle -->
                            <button type="button" id="theme-toggle" class="ml-3 p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200" data-theme-toggle>
                                <span class="sr-only">Toggle theme</span>
                                <i class="ri-sun-line text-xl sun-icon ${ThemeManager.isDarkMode() ? '' : 'hidden'}"></i>
                                <i class="ri-moon-line text-xl moon-icon ${ThemeManager.isDarkMode() ? 'hidden' : ''}"></i>
                            </button>
                            
                            <!-- Notifications -->
                            <button type="button" id="notifications-button" class="ml-3 p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 relative">
                                <span class="sr-only">View notifications</span>
                                <i class="ri-notification-3-line text-xl"></i>
                                <span class="notification-dot hidden"></span>
                            </button>
                            
                            <!-- User menu -->
                            <div class="ml-3 relative">
                                <div>
                                    <button type="button" id="user-menu-button" class="flex items-center bg-white dark:bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" aria-expanded="false" aria-haspopup="true">
                                        <span class="sr-only">Open user menu</span>
                                        <img class="h-8 w-8 rounded-full" src="${currentUser?.avatar || 'images/avatar-placeholder.svg'}" alt="">
                                        <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">${currentUser?.username || 'Guest'}</span>
                                        <i class="ri-arrow-down-s-line ml-1 text-gray-400"></i>
                                    </button>
                                </div>
                                
                                <!-- User dropdown menu -->
                                <div id="user-menu" class="user-menu bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 min-w-48">
                                    <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <p class="text-sm">Signed in as</p>
                                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${currentUser?.email || 'guest@example.com'}</p>
                                    </div>
                                    <a href="profilesettings.html" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        Your Profile
                                    </a>
                                    <a href="settingspage.html" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        Settings
                                    </a>
                                    ${currentUser?.isAdmin ? `
                                        <a href="admin-panel.html" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                            Admin Panel
                                        </a>
                                    ` : ''}
                                    <div class="border-t border-gray-100 dark:border-gray-700"></div>
                                    <button id="logout-button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        Sign out
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Mobile menu button -->
                            <button type="button" id="mobile-menu-button" class="ml-3 md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:outline-none">
                                <span class="sr-only">Open main menu</span>
                                <i class="ri-menu-line text-xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mobile menu -->
                <div id="mobile-menu" class="md:hidden hidden">
                    <div class="px-2 pt-2 pb-3 space-y-1">
                        <a href="index.html" class="block px-3 py-2 rounded-md text-base font-medium ${this.isCurrentPage('index.html') ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-gray-900' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'}">
                            Dashboard
                        </a>
                        <a href="projects.html" class="block px-3 py-2 rounded-md text-base font-medium ${this.isCurrentPage('projects.html') ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-gray-900' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'}">
                            Projects
                        </a>
                        <a href="test-cases.html" class="block px-3 py-2 rounded-md text-base font-medium ${this.isCurrentPage('test-cases.html') ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-gray-900' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'}">
                            Test Cases
                        </a>
                        <a href="reports.html" class="block px-3 py-2 rounded-md text-base font-medium ${this.isCurrentPage('reports.html') ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-gray-900' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'}">
                            Reports
                        </a>
                        <a href="automation.html" class="block px-3 py-2 rounded-md text-base font-medium ${this.isCurrentPage('automation.html') ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-gray-900' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'}">
                            Automation
                        </a>
                    </div>
                </div>
            </header>
        `;
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = this.shadowRoot.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                ThemeManager.toggleTheme();
                const isDark = ThemeManager.isDarkMode();
                
                const sunIcon = themeToggle.querySelector('.sun-icon');
                const moonIcon = themeToggle.querySelector('.moon-icon');
                
                if (isDark) {
                    sunIcon.classList.remove('hidden');
                    moonIcon.classList.add('hidden');
                } else {
                    sunIcon.classList.add('hidden');
                    moonIcon.classList.remove('hidden');
                }
            });
        }
        
        // User menu toggle
        const userMenuButton = this.shadowRoot.getElementById('user-menu-button');
        const userMenu = this.shadowRoot.getElementById('user-menu');
        
        if (userMenuButton && userMenu) {
            userMenuButton.addEventListener('click', () => {
                userMenu.classList.toggle('active');
                userMenuButton.setAttribute('aria-expanded', userMenu.classList.contains('active'));
            });
            
            // Close when clicking outside
            document.addEventListener('click', (event) => {
                if (!this.contains(event.target) && userMenu.classList.contains('active')) {
                    userMenu.classList.remove('active');
                    userMenuButton.setAttribute('aria-expanded', 'false');
                }
            });
        }
        
        // Mobile menu toggle
        const mobileMenuButton = this.shadowRoot.getElementById('mobile-menu-button');
        const mobileMenu = this.shadowRoot.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
        
        // Logout
        const logoutButton = this.shadowRoot.getElementById('logout-button');
        
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                // Clear auth tokens
                localStorage.removeItem('flowtest_access_token');
                localStorage.removeItem('flowtest_refresh_token');
                
                // Redirect to login
                window.location.href = 'login.html';
            });
        }
    }
    
    // Helper methods
    isCurrentPage(page) {
        const currentPath = window.location.pathname;
        const pageName = currentPath.split('/').pop() || 'index.html';
        return pageName === page;
    }
    
    getCurrentUser() {
        // Try to get user from localStorage
        const userJson = localStorage.getItem('flowtest_user');
        return userJson ? JSON.parse(userJson) : null;
    }
}

// Define the new element
customElements.define('app-header', Header);