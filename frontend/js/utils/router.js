/**
 * Simple frontend router for handling page navigation
 */

export default class Router {
    constructor() {
        // Cache previous page to handle back button
        this.previousPage = null;
        
        // Handle initial route
        this.handleRoute();
        
        // Listen for history changes
        window.addEventListener('popstate', () => this.handleRoute());
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
}