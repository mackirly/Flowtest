/**
 * Authentication module
 */

import { API_BASE_URL, API_PREFIX } from './api-config.js';
import { showNotification } from './notifications.js';
import { fetchWithAuth } from './api-utils.js';

const authApi = {
    async login(username, password) {
        try {
            console.log('Attempting to login with username:', username);
            const response = await fetch(`${API_BASE_URL}${API_PREFIX}/token/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Login response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Login failed:', errorData);
                showNotification(errorData.detail || 'Ошибка авторизации', 'error');
                return false;
            }

            const responseData = await response.json();
            console.log('Login response data:', responseData);

            if (!responseData.access || !responseData.refresh) {
                console.error('Invalid token data received:', responseData);
                showNotification('Получены некорректные данные авторизации', 'error');
                return false;
            }

            console.log('Login successful, storing tokens...');
            localStorage.setItem('authToken', responseData.access);
            localStorage.setItem('refreshToken', responseData.refresh);
            
            // Проверяем, что токены сохранились
            const savedAuthToken = localStorage.getItem('authToken');
            const savedRefreshToken = localStorage.getItem('refreshToken');
            
            if (!savedAuthToken || !savedRefreshToken) {
                console.error('Tokens were not saved properly');
                showNotification('Ошибка сохранения данных авторизации', 'error');
                return false;
            }

            console.log('Tokens stored successfully');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Ошибка при попытке входа', 'error');
            return false;
        }
    },

    async getCurrentUser() {
        try {
            const currentUserEndpoint = `${API_BASE_URL}${API_PREFIX}/users/get_current_user/`;
            console.log('Fetching current user from:', currentUserEndpoint);
            const response = await fetchWithAuth(currentUserEndpoint);
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.replace(LOGIN_PAGE);
                }
                throw new Error('Failed to get current user');
            }
            const userData = await response.json();
            console.log('Current user data:', userData);
            console.log('Is staff:', userData.is_staff);
            return userData;
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    }
};
const LOGIN_PAGE = '/login.html';
const HOME_PAGE = '/index.html';

async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.log('No refresh token found');
        return null;
    }

    try {
        console.log('Attempting to refresh token...');
        const response = await fetch(`${API_BASE_URL}${API_PREFIX}/token/refresh/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Token refresh successful');
            localStorage.setItem('authToken', data.access);
            return data.access;
        } else {
            console.error('Token refresh failed:', response.status);
            const errorData = await response.json();
            console.error('Error details:', errorData);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            return null;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        return null;
    }
}

async function login(username, password) {
    try {
        const success = await authApi.login(username, password);
        if (!success) {
            throw new Error('Login failed');
        }
        return true;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Get current user information
 */
async function getCurrentUser() {
    try {
        return await authApi.getCurrentUser();
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Функция для проверки авторизации
export async function checkAuth() {
    const token = localStorage.getItem('authToken');
    const refreshTokenValue = localStorage.getItem('refreshToken');

    // Если нет токенов - на логин
    if (!token && !refreshTokenValue) {
        window.location.replace(LOGIN_PAGE);
        return false;
    }

    // Если нет access токена, но есть refresh - пробуем обновить
    if (!token && refreshTokenValue) {
        const newToken = await refreshToken();
        if (!newToken) {
            window.location.replace(LOGIN_PAGE);
            return false;
        }
    }

    // Проверяем валидность токена
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Failed to get user info');
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.replace(LOGIN_PAGE);
        return false;
    }
}

// Функция для выхода
export async function logout() {
    try {
        await fetchWithAuth(`${API_BASE_URL}${API_PREFIX}/auth/logout/`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.replace(LOGIN_PAGE);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию только если мы не на странице логина
    const currentPage = window.location.pathname;
    if (!currentPage.includes('login.html')) {
        checkAuth();
    }
    
    // Добавляем обработчик для кнопки выхода
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

// Периодическое обновление токена каждые 4 минуты
setInterval(async () => {
    const currentPage = window.location.pathname;
    if (!currentPage.includes('login.html')) {
        const token = localStorage.getItem('authToken');
        if (token) {
            await refreshToken();
        }
    }
}, 4 * 60 * 1000);

export { login, refreshToken, getCurrentUser };
