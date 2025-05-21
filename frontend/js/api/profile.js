/**
 * Profile API service
 */
import ApiClient from './client.js';

class ProfileService {
    constructor() {
        this.client = ApiClient;
    }

    async getProfile() {
        return this.client.get('/core/users/me/');
    }

    async updateProfile(data) {
        return this.client.patch('/core/users/update_profile/', data);
    }

    async changePassword(currentPassword, newPassword) {
        return this.client.post('/core/users/change_password/', {
            current_password: currentPassword,
            new_password: newPassword
        });
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        return this.client.post('/core/users/upload_avatar/', formData, {
            headers: {
                // Remove Content-Type to let browser set it with boundary
                'Content-Type': undefined
            }
        });
    }
}

// Create and export singleton instance
const profileService = new ProfileService();
export { profileService, ProfileService };