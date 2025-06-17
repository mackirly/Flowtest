/**
 * Authentication initialization script
 * This script should be included on all protected pages
 */
import AuthGuard from './auth-guard.js';
import './app.js';

// Initialize authentication guard
(async () => {
    try {
        console.log('[InitAuth] Starting authentication check...');
        
        // Auth guard will automatically check authentication
        // and redirect to login if needed
        const isAuthenticated = await AuthGuard.initialize();
        
        if (isAuthenticated) {
            console.log('[InitAuth] User authenticated, page access granted');
        } else {
            console.log('[InitAuth] Authentication check completed');
        }
    } catch (error) {
        console.error('[InitAuth] Error during authentication check:', error);
    }
})();