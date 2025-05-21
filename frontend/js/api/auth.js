/**
 * Authentication API module
 * Handles login, logout, token refresh, and authentication state
 */
const auth = (() => {
    // Constants
    const TOKEN_KEY = 'flowtest_access_token';
    const REFRESH_TOKEN_KEY = 'flowtest_refresh_token';
    // Настраиваем URL API для работы с Docker-окружением
    const API_BASE_URL = '/api';

    // State
    let currentUser = null;
    
    /**
     * Get stored tokens
     * @returns {Object} Access and refresh tokens
     */
    const getTokens = () => {
        return {
            accessToken: localStorage.getItem(TOKEN_KEY),
            refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY)
        };
    };
    
    /**
     * Store authentication tokens
     * @param {string} accessToken - JWT access token
     * @param {string} refreshToken - JWT refresh token
     */
    const storeTokens = (accessToken, refreshToken) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    };
    
    /**
     * Clear stored tokens
     */
    const clearTokens = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
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
            console.log('Requesting authentication tokens...');
            const tokenResponse = await fetch(`${API_BASE_URL}/core/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
                // Add cache control to prevent caching
                cache: 'no-store',
                // Add a timeout
                signal: AbortSignal.timeout(15000) // 15 seconds timeout
            });
            
            // Check for rate limiting
            if (tokenResponse.status === 429) {
                const error = new Error('Too many login attempts. Please wait a few minutes and try again.');
                error.retryAfter = parseInt(tokenResponse.headers.get('Retry-After') || '60', 10);
                throw error;
            }
            
            // Handle other errors
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}));
                const errorMessage = errorData.detail || 'Authentication failed. Please check your credentials.';
                throw new Error(errorMessage);
            }
            
            // Parse token data
            const tokenData = await tokenResponse.json();
            if (!tokenData.access) {
                throw new Error('Invalid server response: No access token received');
            }
            
            // Store tokens
            console.log('Storing authentication tokens...');
            storeTokens(tokenData.access, tokenData.refresh);
            
            // Wait a bit before requesting profile to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 2: Get user profile (only once, no retries)
            console.log('Fetching user profile...');
            currentUser = await getUserProfile();
            
            if (!currentUser) {
                throw new Error('Failed to load user profile');
            }
            
            // Dispatch login event
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { user: currentUser }
            }));
            
            console.log('Login successful');
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
        localStorage.removeItem('flowtest_user_data');
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Redirect to login page
        window.location.href = '/login.html';
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
            const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
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
            localStorage.setItem(TOKEN_KEY, data.access);
            
            // Store new refresh token if provided
            if (data.refresh) {
                localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
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
        const { accessToken } = getTokens();
        
        if (!accessToken) {
            throw new Error('No access token available');
        }
        
        console.log('Fetching user profile with token:', accessToken.substring(0, 10) + '...');
        
        try {
            // Вывод заголовков для отладки
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };
            
            console.log('Request headers:', headers);
            
            const response = await fetch(`${API_BASE_URL}/core/users/me/`, {
                method: 'GET',
                headers: headers,
                credentials: 'include',
                cache: 'no-store',
                signal: AbortSignal.timeout(10000) // 10 seconds timeout
            });

            console.log('Profile response status:', response.status);
            
            // Пробуем обновить токен, если получаем 401
            if (response.status === 401) {
                console.log('Unauthorized, trying to refresh token...');
                const refreshed = await refreshToken();
                if (refreshed) {
                    console.log('Token refreshed, retrying profile fetch...');
                    return getUserProfile(); // Рекурсивный вызов с новым токеном
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const user = await response.json();
            console.log('Raw user data from API:', user);
            
            if (!user) {
                throw new Error('Invalid user data received');
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
    const getCurrentUser = () => {
        // If we have a current user from API
        if (currentUser) {
            try {
                // Try to get additional data from localStorage
                const savedUserData = localStorage.getItem('flowtest_user_data');
                if (savedUserData) {
                    const parsedUserData = JSON.parse(savedUserData);
                    // Return merged data, giving preference to localStorage
                    return { ...currentUser, ...parsedUserData };
                }
            } catch (error) {
                console.error('Error getting user data from localStorage:', error);
                // Fall back to just returning currentUser
            }
        }
        return currentUser;
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
            const response = await fetch(`${API_BASE_URL}/users/register/`, {
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
            const response = await fetch(`${API_BASE_URL}/users/reset-password/`, {
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
            const response = await fetch(`${API_BASE_URL}/users/reset-password/${token}/`, {
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