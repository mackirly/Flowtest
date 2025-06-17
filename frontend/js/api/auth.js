/**
 * Authentication API module
 * Handles login, logout, token refresh, and authentication state
 */
const auth = (() => {
    // API Configuration
    const API_CONFIG = {
        baseUrl: '',
        endpoints: {
            token: '/api/core/token/',
            tokenRefresh: '/api/core/token/refresh/',
            tokenRevoke: '/api/core/token/revoke/',
            userProfile: '/api/core/users/me/'
        }
    };

    // Storage keys
    const STORAGE_KEYS = {
        accessToken: 'flowtest_access_token',
        refreshToken: 'flowtest_refresh_token',
        userData: 'flowtest_user_data'
    };

    // State
    let currentUser = null;
    
    /**
     * Get stored tokens
     * @returns {Object} Access and refresh tokens
     */
    const getTokens = () => {
        return {
            accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
            refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken)
        };
    };
    
    /**
     * Store authentication tokens
     * @param {string} accessToken - JWT access token
     * @param {string} refreshToken - JWT refresh token
     */
    const storeTokens = (accessToken, refreshToken) => {
        localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
        localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    };
    
    /**
     * Clear stored tokens
     */
    const clearTokens = () => {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
    };
    
    /**
     * Login user with username and password
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise} Promise that resolves to the logged in user
     */
    const login = async (username, password) => {
        console.log('Starting login process...');
        
        // Clear any existing tokens first
        clearTokens();
        
        try {
            // Step 1: Get tokens
            const tokenEndpoint = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.token}`;
            console.log('Requesting tokens from:', tokenEndpoint);
            
            const tokenResponse = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
                cache: 'no-store',
                signal: AbortSignal.timeout(15000)
            });
            
            console.log('Token response status:', tokenResponse.status);
            let tokenData;
            try {
                tokenData = await tokenResponse.json();
                console.log('Token response data:', tokenData);
            } catch (e) {
                console.error('Failed to parse token response:', e);
                throw new Error('Failed to parse server response');
            }
            
            // Handle errors
            if (tokenResponse.status === 429) {
                const error = new Error('Too many login attempts. Please wait a few minutes and try again.');
                error.retryAfter = parseInt(tokenResponse.headers.get('Retry-After') || '60', 10);
                throw error;
            }
            
            if (!tokenResponse.ok) {
                const errorMessage = tokenData.detail || 'Authentication failed. Please check your credentials.';
                console.error('Login failed:', errorMessage);
                throw new Error(errorMessage);
            }
            
            if (!tokenData.access || !tokenData.refresh) {
                console.error('Invalid token data:', tokenData);
                throw new Error('Invalid server response: missing tokens');
            }
            
            // Store tokens
            console.log('Storing tokens...');
            localStorage.setItem(STORAGE_KEYS.accessToken, tokenData.access);
            localStorage.setItem(STORAGE_KEYS.refreshToken, tokenData.refresh);
            console.log('[Auth] Tokens stored:', {
                access: !!tokenData.access,
                refresh: !!tokenData.refresh
            });
            
            // Verify tokens were stored
            const storedAccess = localStorage.getItem(STORAGE_KEYS.accessToken);
            const storedRefresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
            
            if (!storedAccess || !storedRefresh) {
                throw new Error('Failed to store tokens');
            }
            
            // Small delay before profile request
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 2: Get user profile
            console.log('Fetching user profile...');
            currentUser = await getUserProfile();
            
            if (!currentUser) {
                throw new Error('Failed to load user profile');
            }
            
            // Store user data
            localStorage.setItem(STORAGE_KEYS.userData, JSON.stringify(currentUser));
            
            // Dispatch login event
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { user: currentUser }
            }));
            
            console.log('Login successful:', currentUser);
            return currentUser;
            
        } catch (error) {
            console.error('Login failed:', error);
            // Clear tokens on any error
            clearTokens();
            
            // Format error message for user
            let userMessage = error.message || 'Login failed. Please try again.';
            
            if (error.name === 'AbortError') {
                userMessage = 'Request timed out. Please check your connection and try again.';
            } else if (error.retryAfter) {
                userMessage = `Too many requests. Please wait ${error.retryAfter} seconds before trying again.`;
            }
            
            throw new Error(userMessage);
        }
    };
    
    /**
     * Logout current user
     */
    const logout = () => {
        clearTokens();
        currentUser = null;
        
        // Clear user data from localStorage
        localStorage.removeItem(STORAGE_KEYS.userData);
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Redirect to login page
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const loginUrl = new URL('/login.html', window.location.origin + basePath).href;
        window.location.href = loginUrl;
    };
    
    /**
     * Refresh the access token using refresh token
     * @returns {Promise<boolean>} Promise that resolves to whether refresh was successful
     */
    const refreshToken = async () => {
        const { refreshToken } = getTokens();
        
        if (!refreshToken) {
            return false;
        }
        
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.tokenRefresh}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh: refreshToken
                })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            // Store new access token
            localStorage.setItem(STORAGE_KEYS.accessToken, data.access);
            
            // Store new refresh token if provided
            if (data.refresh) {
                localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh);
            }
            
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    };
    
    /**
     * Get user profile with simplified logic
     * @returns {Promise<Object>} User profile data
     */
    const getUserProfile = async () => {
        const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
        
        if (!accessToken) {
            console.error('No access token available');
            throw new Error('No access token available');
        }
        
        console.log('Fetching user profile...');
        const profileEndpoint = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.userProfile}`;
        
        try {
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };
            
            const response = await fetch(profileEndpoint, {
                method: 'GET',
                headers: headers,
                credentials: 'include',
                cache: 'no-store',
                signal: AbortSignal.timeout(10000)
            });

            console.log('Profile response status:', response.status);
            
            if (response.status === 401) {
                console.log('Unauthorized, trying to refresh token...');
                const refreshed = await refreshToken();
                if (refreshed) {
                    console.log('Token refreshed, retrying profile fetch...');
                    return getUserProfile();
                } else {
                    console.error('Token refresh failed');
                    clearTokens();
                    throw new Error('Authentication failed');
                }
            }

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a few minutes and try again.');
                }
                throw new Error(`Failed to fetch profile: ${response.status}`);
            }

            const user = await response.json();
            console.log('Raw user data from API:', user);
            
            if (!user) {
                throw new Error('Invalid user data received');
            }

            // Handle avatar URL
            if (user.avatar) {
                // If avatar doesn't start with http/https, build full URL
                if (!user.avatar.startsWith('http')) {
                    user.avatar = new URL(user.avatar, window.location.origin).href;
                }
                console.log('Final avatar URL:', user.avatar);
            }
            
            // If the user is "root", ensure proper data is set
            if (user.id === 'root' || user.username === 'root') {
                user.username = 'root';
                user.name = 'root';
                if (!user.first_name) user.first_name = 'root';
                if (!user.last_name) user.last_name = ''; // Оставляем пустым, чтобы отображалось просто "root"
            }
            
            currentUser = user;
            console.log('User profile loaded successfully:', user);
            return user;
            
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    };
    
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} Whether user is authenticated
     */
    const isAuthenticated = async () => {
        return new Promise((resolve) => {
            const { accessToken } = getTokens();
            if (!accessToken) {
                console.log('No access token found');
                return resolve(false);
            }
            
            // Дополнительная проверка валидности токена
            try {
                console.log('Validating token...');
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
                const isExpired = payload.exp * 1000 < Date.now();
                console.log('Token expiration status:', isExpired ? 'expired' : 'valid');
                resolve(!isExpired);
            } catch (e) {
                console.error('Token validation error:', e);
                resolve(false);
            }
        });
    };
    
    /**
     * Get the current user
     * @returns {Object|null} Current user object or null if not authenticated
     */
    const getCurrentUser = async () => {
        try {
            // Check if we have a valid token first
            const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
            if (!accessToken) {
                console.log('[Auth] No access token, cannot get current user');
                return null;
            }

            // Always fetch fresh user data from API
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.userProfile}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            currentUser = await response.json();
            localStorage.setItem(STORAGE_KEYS.userData, JSON.stringify(currentUser));
            return currentUser;
        } catch (error) {
            console.error('Error getting current user:', error);
            // Try to use cached data if available
            if (currentUser) {
                return currentUser;
            }
            
            // Try localStorage as last resort
            try {
                const savedUserData = localStorage.getItem(STORAGE_KEYS.userData);
                if (savedUserData) {
                    const parsedUserData = JSON.parse(savedUserData);
                    currentUser = parsedUserData;
                    return currentUser;
                }
            } catch (storageError) {
                console.error('Error getting user data from localStorage:', storageError);
            }
            
            return null;
        }
    };
    
    /**
     * Initialize authentication module
     * @returns {Promise<boolean>} Promise that resolves to true if authenticated, false otherwise
     */
    const initialize = async () => {
        try {
            // Check if we have a valid token
            const isAuth = await isAuthenticated();
            console.log('Auth initialize - isAuthenticated:', isAuth);
            
            if (!isAuth) {
                console.log('Auth initialize - not authenticated, clearing tokens');
                clearTokens();
                localStorage.removeItem('flowtest_user_data'); // Also clear user data
                return false;
            }
            
            try {
                // Get user profile
                console.log('Auth initialize - fetching user profile...');
                currentUser = await getUserProfile();
                console.log('Auth initialize - user profile:', currentUser);
                
                // Merge with localStorage data if available
                try {
                    const savedUserData = localStorage.getItem('flowtest_user_data');
                    if (savedUserData) {
                        const parsedUserData = JSON.parse(savedUserData);
                        console.log('Auth initialize - found saved user data in localStorage:', parsedUserData);
                        
                        // Merge with API data, giving preference to localStorage data
                        currentUser = { ...currentUser, ...parsedUserData };
                        console.log('Auth initialize - merged user data:', currentUser);
                    }
                } catch (storageError) {
                    console.error('Auth initialize - error loading user data from localStorage:', storageError);
                    // Continue with API data if localStorage fails
                }
                
                // Set up token refresh interval (refresh 5 minutes before expiry)
                // JWT tokens typically have a 1 hour expiry, so refresh every 55 minutes
                setInterval(refreshToken, 55 * 60 * 1000);
                
                return true;
            } catch (error) {
                console.error('Auth initialize - profile fetch failed:', error);
                clearTokens();
                localStorage.removeItem('flowtest_user_data'); // Also clear user data
                return false;
            }
        } catch (error) {
            console.error('Auth initialize - error:', error);
            clearTokens();
            localStorage.removeItem('flowtest_user_data'); // Also clear user data
            return false;
        }
    };
    
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @param {string} userData.first_name - User's first name
     * @param {string} userData.last_name - User's last name
     * @param {string} userData.email - User's email address
     * @param {string} userData.username - User's username
     * @param {string} userData.password - User's password
     * @returns {Promise} Promise that resolves when registration is complete
     */
    const register = async (userData) => {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/users/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };
    
    /**
     * Request a password reset for a given email
     * @param {string} email - User's email address
     * @returns {Promise} Promise that resolves when reset email is sent
     */
    const requestPasswordReset = async (email) => {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/users/reset-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Password reset request failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Password reset request error:', error);
            throw error;
        }
    };
    
    /**
     * Reset a password using a token
     * @param {string} token - Password reset token
     * @param {string} password - New password
     * @returns {Promise} Promise that resolves when password is reset
     */
    const resetPassword = async (token, password) => {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/users/reset-password/${token}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Password reset failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };
    
    // Return public API
    return {
        login,
        logout,
        register,
        requestPasswordReset,
        resetPassword,
        refreshToken,
        getUserProfile,
        isAuthenticated,
        getCurrentUser,
        initialize
    };
})();

// Export for use in other modules
export default auth;
export { auth };