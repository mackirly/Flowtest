/**
 * Simple frontend router for handling page navigation and deep linking
 */

export default class Router {
    constructor() {
        // Cache previous page to handle back button
        this.previousPage = null;
        
        // Handle initial route
        this.handleRoute();
        
        // Listen for history changes
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Listen for hash changes for deep linking
        window.addEventListener('hashchange', () => this.handleHashRoute());
        
        // Handle initial hash route
        this.handleHashRoute();
    }
    
    handleRoute() {
        const path = window.location.pathname;
        
        // Save current page before changing
        this.previousPage = window.location.pathname;
        
        // Handle profile page
        if (path === '/profile.html' || path === '/profile') {
            // Check if token exists
            const token = localStorage.getItem('flowtest_access_token');
            if (!token) {
                this.navigateTo('/login.html');
                return;
            }
            
            // Load profile page
            import('../pages/profile.js')
                .then(module => module.default.init())
                .catch(error => {
                    console.error('Error loading profile:', error);
                    this.showError('Failed to load profile page');
                });
            return;
        }
        
        // Add other route handlers here
    }
    
    navigateTo(path) {
        // Save current page
        this.previousPage = window.location.pathname;
        
        // Update URL
        window.history.pushState(null, '', path);
        
        // Handle new route
        this.handleRoute();
    }
    
    showError(message) {
        // Simple error display - enhance as needed
        console.error(message);
        alert(message);
    }
    
    goBack() {
        if (this.previousPage) {
            this.navigateTo(this.previousPage);
        } else {
            window.history.back();
        }
    }
    
    /**
     * Handle hash-based routing for deep linking within pages
     */
    handleHashRoute() {
        const hash = window.location.hash.slice(1); // Remove #
        if (!hash) return;
        
        // Only handle test-cases page hashes
        const path = window.location.pathname;
        if (path !== '/test-cases.html' && path !== '/test-cases') return;
        
        // Parse hash routes for test cases page
        this.parseTestCasesRoute(hash);
    }
    
    /**
     * Parse test cases specific routes
     * Examples:
     * #folder/123 - Open folder
     * #folder/123/edit - Edit folder
     * #new-folder - Create new folder
     * #folder/123/new-folder - Create new subfolder
     * #testcase/456 - Open test case
     * #folder/123/testcase/456 - Open test case in folder
     * #new-testcase - Create new test case
     * #folder/123/new-testcase - Create new test case in folder
     */
    parseTestCasesRoute(hash) {
        console.log('[Router] Parsing test cases route:', hash);
        
        const parts = hash.split('/');
        
        // Wait for test cases page to be initialized and projects to be loaded
        if (!window.testCasesPage || !window.testCasesPage.projects || window.testCasesPage.projects.length === 0) {
            setTimeout(() => this.parseTestCasesRoute(hash), 200);
            return;
        }
        
        if (parts[0] === 'folder' && parts[1]) {
            const folderId = parts[1];
            
            if (parts[2] === 'testcase' && parts[3]) {
                // Open test case in specific folder
                const testCaseId = parts[3];
                window.testCasesPage.openTestCaseById(testCaseId, folderId);
            } else if (parts[2] === 'edit') {
                // Edit folder
                window.testCasesPage.openFolderForEdit(folderId);
            } else if (parts[2] === 'new-folder') {
                // Create new subfolder
                window.testCasesPage.showCreateFolderForm(folderId);
            } else if (parts[2] === 'new-testcase') {
                // Create new test case in folder
                window.testCasesPage.showCreateTestCaseModal(folderId);
            } else {
                // Open folder
                window.testCasesPage.openFolderById(folderId);
            }
        } else if (parts[0] === 'testcase' && parts[1]) {
            // Open test case
            const testCaseId = parts[1];
            window.testCasesPage.openTestCaseById(testCaseId);
        } else if (parts[0] === 'new-testcase') {
            // Create new test case
            window.testCasesPage.showCreateTestCaseModal();
        } else if (parts[0] === 'new-folder') {
            // Create new folder
            window.testCasesPage.showCreateFolderForm();
        }
    }
    
    /**
     * Update URL hash without triggering navigation
     */
    updateHash(hash) {
        const newUrl = `${window.location.pathname}#${hash}`;
        window.history.replaceState(null, '', newUrl);
    }
    
    /**
     * Navigate to hash route
     */
    navigateToHash(hash) {
        const newUrl = `${window.location.pathname}#${hash}`;
        window.history.pushState(null, '', newUrl);
        this.handleHashRoute();
    }
}