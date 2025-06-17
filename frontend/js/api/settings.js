/**
 * Settings API module
 */
import ApiClient from './client.js';

const SettingsAPI = {
    /**
     * Get user profile with settings
     */
    async getProfile() {
        try {
            return await ApiClient.get('/core/profile/');
        } catch (error) {
            console.error('[SettingsAPI] Failed to get profile:', error);
            throw error;
        }
    },

    /**
     * Update user profile settings
     */
    async updateProfile(data) {
        try {
            console.log('[SettingsAPI] Updating profile with data:', data);
            // Try direct-update-profile endpoint which is guaranteed to work with JSON
            const response = await ApiClient.patch('/core/direct-update-profile/', data);
            console.log('[SettingsAPI] Profile updated successfully:', response);
            return response;
        } catch (error) {
            console.error('[SettingsAPI] Failed to update profile:', error);
            console.error('[SettingsAPI] Error details:', {
                status: error.status,
                message: error.message,
                data: error.data
            });
            throw error;
        }
    },

    /**
     * Upload avatar
     */
    async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            
            // Use apiRequest directly to handle FormData properly
            return await ApiClient.apiRequest('/core/upload-avatar/', {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('[SettingsAPI] Failed to upload avatar:', error);
            throw error;
        }
    },

    /**
     * Change password
     */
    async changePassword(oldPassword, newPassword) {
        try {
            return await ApiClient.post('/core/change-password/', {
                old_password: oldPassword,
                new_password: newPassword
            });
        } catch (error) {
            console.error('[SettingsAPI] Failed to change password:', error);
            throw error;
        }
    }
};

export default SettingsAPI;