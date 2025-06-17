/**
 * Login page functionality
 * Handles user authentication and login
 */
import auth from '../api/auth.js';
import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    // Add logging for initialization
    console.log('[Login] Page loaded, checking auth status...');
    
    // Initialize auth first to check if already logged in
    auth.initialize().then(async (initialized) => {
        try {
            const isAuth = await auth.isAuthenticated();
            console.log('[Login] Authentication status:', isAuth);
            
            if (isAuth) {
                console.log('[Login] User is authenticated, checking profile...');
                const user = await auth.getUserProfile();
                console.log('[Login] User profile:', user);
                
                // Redirect if we have valid user and are on login page
                if (user && window.location.pathname.endsWith('login.html')) {
                    console.log('[Login] Redirecting authenticated user to dashboard...');
                    
                    // Check for saved redirect URL first
                    const savedRedirectUrl = sessionStorage.getItem('redirectUrl');
                    let redirectUrl;
                    
                    if (savedRedirectUrl) {
                        console.log('[Login] Found saved redirect URL:', savedRedirectUrl);
                        redirectUrl = savedRedirectUrl;
                        sessionStorage.removeItem('redirectUrl');
                    } else {
                        // Build default redirect URL
                        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                        redirectUrl = new URL('/index.html', window.location.origin + basePath).href;
                    }
                    
                    console.log('[Login] Redirect URL:', redirectUrl);
                    
                    // Use replace for proper redirect
                    window.location.replace(redirectUrl);
                }
            } else {
                console.log('[Login] Not authenticated');
            }
        } catch (error) {
            console.error('[Login] Error during initialization:', error);
            auth.logout();
        }
    });
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('[Login] Form submitted');
        
        // Clear previous error
        loginError.classList.add('hidden');
        loginError.textContent = '';
        
        // Get form data
        const username = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Add loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span><span>Signing in...</span>';
        
        try {
            console.log('[Login] Attempting login for user:', username);
            const user = await auth.login(username, password);
            
            if (!user) throw new Error('No user data received');
            
            console.log('[Login] Login successful:', user);
            
            // Small delay to ensure token is stored
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify token is stored
            const token = localStorage.getItem('flowtest_access_token');
            if (!token) {
                throw new Error('Token not stored after login');
            }
            
            // Show success message
            ToastManager.success(i18n.t('login-success') || 'Login successful');
            
            // Update button state
            submitButton.innerHTML = '<span class="loading-spinner"></span><span>Redirecting...</span>';
            
            // Check if there's a saved redirect URL
            const savedRedirectUrl = sessionStorage.getItem('redirectUrl');
            let redirectUrl;
            
            if (savedRedirectUrl) {
                console.log('[Login] Found saved redirect URL:', savedRedirectUrl);
                redirectUrl = savedRedirectUrl;
                sessionStorage.removeItem('redirectUrl'); // Clean up
            } else {
                // Build default redirect URL relative to current path
                const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                redirectUrl = new URL('/index.html', window.location.origin + basePath).href;
                console.log('[Login] Built default redirect URL:', redirectUrl);
            }
            
            console.log('[Login] Redirecting to:', redirectUrl);
            
            // Small delay then redirect
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                window.location.replace(redirectUrl);
            } catch (e) {
                console.error('[Login] Redirect failed:', e);
                window.location.href = redirectUrl;
            }
            
        } catch (error) {
            console.error('[Login] Login failed:', error);
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            
            // Get error message
            let errorMessage = 'Failed to sign in. Please try again.';
            if (error.message.includes('429')) {
                errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
            } else if (error.message.includes('401') || error.message.includes('credentials')) {
                errorMessage = 'Invalid username or password';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error message
            ToastManager.error(errorMessage);
        }
    });
});