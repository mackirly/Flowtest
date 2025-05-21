const API_BASE = '/api/core';

// Generic API request handler with error handling
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('flowtest_access_token');
    if (!token && !options.public) {
        window.location.href = '/login.html';
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': token ? `Bearer ${token}` : undefined
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('flowtest_access_token');
                localStorage.removeItem('accessToken');       // Токен из client.js
                localStorage.removeItem('refreshToken');    // Токен обновления из client.js
                localStorage.removeItem('userData');        // Данные пользователя из client.js
                window.location.href = '/login.html';
                return null;
            }
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API request error for ${endpoint}:`, error);
        throw error;
    }
}

// Profile endpoints
export async function getProfile() {
    return apiRequest('/profile/');
}

export async function updateProfile(data) {
    return apiRequest('/profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

export async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiRequest('/upload-avatar/', {
        method: 'POST',
        body: formData
    });
}

// Activity endpoints
export async function getActivity(limit = 5) {
    return apiRequest(`/activity/?limit=${limit}`);
}

// Statistics endpoints
export async function getStatistics() {
    return apiRequest('/statistics/');
}

// Security endpoints
export async function changePassword(currentPassword, newPassword) {
    return apiRequest('/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
}

export default {
    apiRequest,
    getProfile,
    updateProfile,
    uploadAvatar,
    getActivity,
    getStatistics,
    changePassword
};