/**
 * Profile service for handling profile-related API calls
 */

const API_BASE = 'http://localhost/api';
const MEDIA_BASE = 'http://localhost'; // Using nginx proxy for all endpoints

export default class ProfileService {
    constructor() {
        this.token = localStorage.getItem('flowtest_access_token');
    }
    
    async getProfile() {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        try {
            // Get core profile data
            const profileResponse = await fetch(`${API_BASE}/core/users/me/`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!profileResponse.ok) {
                throw new Error(`Profile request failed: ${profileResponse.status}`);
            }
            
            const profile = await profileResponse.json();
            
            // Fix avatar URL if needed
            if (profile.avatar && !profile.avatar.startsWith('http')) {
                // Если путь начинается с /media, подставляем MEDIA_BASE
                if (profile.avatar.startsWith('/media')) {
                    profile.avatar = MEDIA_BASE + profile.avatar;
                } else {
                    profile.avatar = new URL(profile.avatar, window.location.origin).href;
                }
                console.log('[Profile] Итоговый URL аватара:', profile.avatar);
            }
            
            // Get additional data in parallel
            const [activityData, statsData] = await Promise.allSettled([
                this.getActivity(),
                this.getStatistics()
            ]);
            
            // Add activity data if available
            if (activityData.status === 'fulfilled') {
                profile.activity = activityData.value;
            }
            
            // Add stats data if available  
            if (statsData.status === 'fulfilled') {
                profile.statistics = statsData.value;
            }
            
            return profile;
            
        } catch (error) {
            console.error('Error loading profile:', error);
            throw error;
        }
    }
    
    async getActivity(limit = 5) {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        const response = await fetch(`${API_BASE}/core/activity/?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Activity request failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    async getStatistics() {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        const response = await fetch(`${API_BASE}/core/statistics/`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Statistics request failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    async updateProfile(data) {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        console.log('[Profile] Updating profile with data:', data);
        
        try {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value) formData.append(key, value);
            });

            const response = await fetch(`${API_BASE}/core/users/update_profile/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            const responseText = await response.text();
            console.log('[Profile] Response text:', responseText);
            
            if (!response.ok) {
                throw new Error(`Profile update failed: ${response.status} - ${responseText}`);
            }
            
            try {
                return responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('[Profile] Error parsing response:', e);
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('[Profile] Update error:', error);
            throw error;
        }
    }
    
    async changePassword(currentPassword, newPassword) {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        const response = await fetch(`${API_BASE}/core/users/change_password/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (!response.ok) {
            throw new Error(`Password change failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    async uploadAvatar(file) {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        const response = await fetch(`${API_BASE}/core/users/upload_avatar/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Avatar upload failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Fix avatar URL if needed
        if (result.avatar && !result.avatar.startsWith('http')) {
    // Формируем URL без порта (http://localhost/media/...)
    if (result.avatar.startsWith('/media')) {
        result.avatar = window.location.origin.replace(/:\d+$/, '') + result.avatar;
    } else {
        result.avatar = new URL(result.avatar, window.location.origin).href;
    }
    console.log('[Profile] Fixed avatar URL in upload response:', result.avatar);
}
        
        return result;
    }
}

// Create singleton instance
const profileService = new ProfileService();

// Export service
export { ProfileService, profileService };