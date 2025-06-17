/**
 * Authentication Guard Module
 * Handles authentication checks and redirects for protected pages
 */
const AuthGuard = (() => {
    // Pages that don't require authentication
    const PUBLIC_PAGES = [
        '/login.html',
        '/register.html',
        '/forgot-password.html',
        '/reset-password.html'
    ];

    /**
     * Check if the current page requires authentication
     * @returns {boolean} True if page requires auth, false otherwise
     */
    const requiresAuth = () => {
        const currentPath = window.location.pathname;
        return !PUBLIC_PAGES.some(page => currentPath.endsWith(page));
    };

    /**
     * Check authentication and redirect if necessary
     * @returns {Promise<boolean>} True if user is authenticated or on public page
     */
    const checkAuth = async () => {
        // Skip check for public pages
        if (!requiresAuth()) {
            console.log('[AuthGuard] Public page, skipping auth check');
            return true;
        }

        console.log('[AuthGuard] Checking authentication...');
        
        try {
            // Import auth module dynamically to avoid circular dependencies
            const authModule = await import('./api/auth.js');
            const auth = authModule.default;
            
            // Check if user is authenticated
            const isAuthenticated = await auth.isAuthenticated();
            console.log('[AuthGuard] Is authenticated:', isAuthenticated);
            
            if (!isAuthenticated) {
                console.log('[AuthGuard] User not authenticated, redirecting to login...');
                
                // Store the intended destination
                const currentUrl = window.location.pathname + window.location.search;
                sessionStorage.setItem('redirectUrl', currentUrl);
                
                // Redirect to login page
                window.location.href = '/login.html';
                return false;
            }
            
            // Try to initialize auth and get user profile
            const initialized = await auth.initialize();
            if (!initialized) {
                console.log('[AuthGuard] Failed to initialize auth, redirecting to login...');
                window.location.href = '/login.html';
                return false;
            }
            
            console.log('[AuthGuard] User authenticated and initialized');
            return true;
            
        } catch (error) {
            console.error('[AuthGuard] Error checking authentication:', error);
            // On error, redirect to login for safety
            window.location.href = '/login.html';
            return false;
        }
    };

    /**
     * Initialize the auth guard
     * Should be called on DOMContentLoaded before any other initialization
     */
    const initialize = async () => {
        console.log('[AuthGuard] Initializing...');
        
        // Show loading indicator while checking auth
        document.body.style.opacity = '0.7';
        
        const isAuthenticated = await checkAuth();
        
        // Remove loading indicator
        document.body.style.opacity = '1';
        
        if (isAuthenticated && requiresAuth()) {
            console.log('[AuthGuard] Authentication verified, page can load');
        }
        
        return isAuthenticated;
    };

    // Public API
    return {
        initialize,
        checkAuth,
        requiresAuth
    };
})();

// Export for use in other modules
export default AuthGuard;