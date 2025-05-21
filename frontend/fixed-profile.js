/**
 * DIRECT REPLACEMENT for profile.js
 * This completely bypasses the problematic code
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔴 FIXED PROFILE.JS LOADED');
    const API_BASE_URL = '/api';
    
    // ONLY handle the personal info form - this is all we need to fix
    const personalInfoForm = document.getElementById('personal-info-form');
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', handleProfileUpdate);
        console.log('🔴 Form handler attached');
    }
    
    async function handleProfileUpdate(e) {
        e.preventDefault();
        console.log('🔴 Form submitted');
        
        // Get the form data
        const formData = new FormData(e.target);
        const userData = {
            first_name: formData.get('first-name'),
            last_name: formData.get('last-name'),
            email: formData.get('email'),
            bio: formData.get('bio')
        };
        
        console.log('🔴 Updating with data:', userData);
        
        try {
            // Get token
            const accessToken = localStorage.getItem('flowtest_access_token');
            if (!accessToken) {
                showToast('error', 'You are not authenticated. Please log in again.');
                return;
            }

            // Send request
            const response = await fetch(`${API_BASE_URL}/core/users/update_profile/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: userData.first_name || '',
                    last_name: userData.last_name || '',
                    email: userData.email || '',
                    bio: userData.bio || ''
                })
            });
            
            console.log('🔴 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('🔴 Success:', data);
                
                // Update localStorage
                const savedUserData = JSON.parse(localStorage.getItem('flowtest_user_data') || '{}');
                const updatedUserData = {
                    ...savedUserData,
                    first_name: data.first_name || savedUserData.first_name,
                    last_name: data.last_name || savedUserData.last_name,
                    email: data.email || savedUserData.email,
                    bio: data.bio || savedUserData.bio
                };
                
                localStorage.setItem('flowtest_user_data', JSON.stringify(updatedUserData));
                
                // Update UI
                updateUI(updatedUserData);
                
                // Show success
                showToast('success', 'Profile updated successfully');
            } else {
                try {
                    const errorData = await response.json();
                    console.error('🔴 Error:', errorData);
                    showToast('error', errorData.error || 'Failed to update profile');
                } catch (e) {
                    showToast('error', `Error: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('🔴 Request error:', error);
            showToast('error', `Error: ${error.message}`);
        }
    }
    
    // Helper to update UI with new data
    function updateUI(userData) {
        // Update name in header
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        }
        
        // Update full name in sidebar
        const userFullNameElement = document.getElementById('user-full-name');
        if (userFullNameElement) {
            userFullNameElement.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        }
        
        // Update email in sidebar
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = userData.email || '';
        }
        
        // Update avatar text with initials if needed
        if (!userData.avatar) {
            const initials = getInitials(`${userData.first_name || ''} ${userData.last_name || ''}`);
            const userAvatarTextElement = document.getElementById('user-avatar-text');
            if (userAvatarTextElement) {
                userAvatarTextElement.textContent = initials;
            }
            
            const userInitialsElement = document.getElementById('user-initials');
            if (userInitialsElement) {
                userInitialsElement.textContent = initials;
            }
        }
    }
    
    // Helper to get initials from name
    function getInitials(name) {
        if (!name || name.trim() === '') return 'U';
        
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    
    // Helper to show toast notifications
    function showToast(type, message) {
        // Try to use the existing ToastManager
        if (window.ToastManager && typeof window.ToastManager[type] === 'function') {
            window.ToastManager[type](message);
        } else {
            // Fallback
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
});