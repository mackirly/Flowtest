/**
 * API Client for FlowTest 2.0
 * Core module for making API requests and handling authentication
 */

// Constants
const API_BASE_URL = '/api';
const TOKEN_KEY = 'flowtest_access_token';
const REFRESH_TOKEN_KEY = 'flowtest_refresh_token';
const USER_DATA_KEY = 'flowtest_user_data';

/**
 * Make an API request with authentication and error handling
 */
const apiRequest = async (endpoint, options = {}) => {
    // Get access token
    const accessToken = localStorage.getItem(TOKEN_KEY);
    
    // Prepare request headers
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
    };
    
    // Add auth token if available
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Prepare URL with query params if provided
    let url = `${API_BASE_URL}${endpoint}`;
    
    // Handle query parameters
    if (options.params) {
        const queryParams = new URLSearchParams();
        
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                queryParams.append(key, value);
            }
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
    }
    
    // Make the request
    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Include cookies
        });
        
        // Handle 401 Unauthorized - Token expired or invalid
        if (response.status === 401) {
            console.log(`[API Client] Received 401 for ${url}, attempting token refresh`);
            
            // Try to refresh the token
            const refreshed = await refreshToken();
            
            if (refreshed) {
                console.log('[API Client] Token refreshed, retrying request');
                // Retry the request with new token
                const newToken = localStorage.getItem(TOKEN_KEY);
                headers['Authorization'] = `Bearer ${newToken}`;
                
                const retryResponse = await fetch(url, {
                    ...options,
                    headers,
                    credentials: 'include'
                });
                
                return handleResponse(retryResponse);
            } else {
                console.log('[API Client] Token refresh failed, redirecting to login');
                // Token refresh failed, clear storage and redirect
                logout();
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'login.html';
                }
                throw new Error('Token refresh failed');
            }
        }
        
        // Handle other responses
        return handleResponse(response);
    } catch (error) {
        console.error('[API Client] Request error:', error);
        throw error;
    }
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
    // Check if response is JSON
    const contentType = response.headers.get('Content-Type');
    const isJson = contentType && contentType.includes('application/json');
    
    // Parse response data
    const data = isJson ? await response.json() : await response.text();
    
    // Handle error responses
    if (!response.ok) {
        const error = new Error(isJson && data.detail ? data.detail : 'API request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }
    
    return data;
};

/**
 * Refresh the access token using refresh token
 */
const refreshToken = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/core/token/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh: refreshToken
            }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        
        const data = await response.json();
        
        // Store the new tokens
        localStorage.setItem(TOKEN_KEY, data.access);
        if (data.refresh) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
        }
        
        return true;
    } catch (error) {
        console.error('[API Client] Token refresh error:', error);
        logout();
        return false;
    }
};

/**
 * Log in user
 */
const login = async (username, password, remember = false) => {
    try {
        const response = await fetch(`${API_BASE_URL}/core/token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            }),
            credentials: 'include'
        });
        
        const data = await handleResponse(response);
        
        // Store tokens
        localStorage.setItem(TOKEN_KEY, data.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
        
        // Get and store user data
        const userResponse = await fetch(`${API_BASE_URL}/core/users/me/`, {
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const userData = await handleResponse(userResponse);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        
        return userData;
    } catch (error) {
        console.error('[API Client] Login error:', error);
        throw error;
    }
};

/**
 * Log out the current user
 */
const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    // Clear local storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    
    // If we have a refresh token, try to invalidate it on the server
    if (refreshToken) {
        try {
            await fetch(`${API_BASE_URL}/core/token/revoke/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh: refreshToken
                }),
                credentials: 'include'
            });
        } catch (error) {
            console.error('[API Client] Logout error:', error);
            // Continue with logout even if server request fails
        }
    }
};

/**
 * Check if user is authenticated
 */
const isAuthenticated = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    
    try {
        // Check if token is expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
    } catch (error) {
        console.error('[API Client] Token validation error:', error);
        return false;
    }
};

/**
 * Get current user data
 */
const getCurrentUser = async () => {
    // Try to get from local storage first
    const cachedUser = localStorage.getItem(USER_DATA_KEY);
    if (cachedUser) {
        return JSON.parse(cachedUser);
    }
    
    // Fetch from API if not in local storage
    try {
        const userData = await get('/core/users/me/');
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        return userData;
    } catch (error) {
        console.error('[API Client] Get current user error:', error);
        throw error;
    }
};

// Convenience methods for common HTTP methods
const get = (endpoint, params = {}, options = {}) => 
    apiRequest(endpoint, { ...options, method: 'GET', params });

const post = (endpoint, data, options = {}) => 
    apiRequest(endpoint, { 
        ...options, 
        method: 'POST', 
        body: JSON.stringify(data)
    });

const put = (endpoint, data, options = {}) => 
    apiRequest(endpoint, { 
        ...options, 
        method: 'PUT', 
        body: JSON.stringify(data)
    });

const patch = (endpoint, data, options = {}) => 
    apiRequest(endpoint, { 
        ...options, 
        method: 'PATCH', 
        body: JSON.stringify(data)
    });

const del = (endpoint, options = {}) => 
    apiRequest(endpoint, { ...options, method: 'DELETE' });

/**
 * API Client object with all methods
 */
const ApiClient = {
    apiRequest,
    refreshToken,
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    get,
    post,
    put,
    patch,
    delete: del
};

export default ApiClient;