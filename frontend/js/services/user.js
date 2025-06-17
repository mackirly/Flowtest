/**
 * User service for handling user-related API calls
 */

const API_BASE = '/api/core';
const MEDIA_BASE = '/media'; // Base URL for media files

export default class UserService {
    constructor() {
        this.token = localStorage.getItem('flowtest_access_token');
    }
    
    async getCurrentUser() {
        if (!this.token) {
            throw new Error('No auth token found');
        }
        
        try {
            const response = await fetch(`${API_BASE}/users/me/`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });
            
            const responseText = await response.text();
            console.log('Profile response text:', responseText);
            if (!response.ok) {
                throw new Error(`Profile request failed: ${response.status}`);
            }
            
            const userData = JSON.parse(responseText);
            
            console.log('[User] Raw user data:', userData);
            // Fix avatar URL if needed
            if (userData.avatar && !userData.avatar.startsWith('http')) {
                // If path starts with /media, add MEDIA_BASE
                if (userData.avatar.startsWith('/media')) {
                    userData.avatar = MEDIA_BASE + userData.avatar;
                } else {
                    userData.avatar = new URL(userData.avatar, window.location.origin).href;
                }
                console.log('[User] Final avatar URL:', userData.avatar);
            }
            
            return userData;
        } catch (error) {
            console.error('Error loading user data:', error);
            throw error;
        }
    }
}

// Create singleton instance
const userService = new UserService();

/**
 * Update user UI with current user information
 */
export async function updateUserUI() {
    try {
        console.log('[UserUI] Updating user interface...');
        const userData = await userService.getCurrentUser();
        console.log('[UserUI] User data received:', userData);
        
        // Update user name in header - always use username
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            const displayName = userData.username || userData.email?.split('@')[0] || 'User';
            userNameElement.textContent = displayName;
        }
        
        // Update user avatar
        const userAvatarImg = document.getElementById('user-avatar-img');
        const userInitials = document.getElementById('user-initials');
        if (userData.avatar && userAvatarImg) {
            console.log('[UserUI] Setting avatar URL:', userData.avatar);
            userAvatarImg.src = userData.avatar;
            userAvatarImg.classList.remove('hidden');
            if (userInitials) userInitials.style.display = 'none';
        } else if (userInitials) {
            // Show initials if no avatar - always use username
            let initials = 'U';
            if (userData.username) {
                initials = userData.username.charAt(0);
            } else if (userData.email) {
                initials = userData.email.charAt(0);
            }
            userInitials.textContent = initials.toUpperCase();
            if (userAvatarImg) userAvatarImg.classList.add('hidden');
        }
        
        // Update user email
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && userData.email) {
            userEmailElement.textContent = userData.email;
        }
        
        console.log('[UserUI] User interface updated successfully');
        return userData;
    } catch (error) {
        console.error('[UserUI] Failed to update user interface:', error);
        // Set default values or hide user elements
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = 'User';
        }
        throw error; // Re-throw to help debug
    }
}

// Export service
export { UserService, userService };