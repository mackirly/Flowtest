/**
 * Emergency profile update fix
 * This script directly fixes the profile update functionality
 */

(function() {
    // Check if the page is the profile page
    if (!window.location.href.includes('profile.html')) {
        return;
    }
    
    console.log('[ProfileFix] Initializing profile update fix');
    
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Find the profile form
        const personalInfoForm = document.getElementById('personal-info-form');
        
        if (personalInfoForm) {
            console.log('[ProfileFix] Found personal info form, attaching override handler');
            
            // Override the submit handler
            personalInfoForm.addEventListener('submit', handleProfileUpdate, true);
            
            console.log('[ProfileFix] Profile update fix installed');
        } else {
            console.error('[ProfileFix] Could not find personal-info-form element');
        }
    });
    
    // Profile update handler
    async function handleProfileUpdate(e) {
        // Prevent the default handling and the original handler
        e.preventDefault();
        e.stopImmediatePropagation();
        
        console.log('[ProfileFix] Processing profile update');
        
        // Get form data
        const formData = new FormData(e.target);
        
        // Extract values from form data
        const userData = {
            first_name: formData.get('first-name'),
            last_name: formData.get('last-name'),
            email: formData.get('email'),
            bio: formData.get('bio')
        };
        
        console.log('[ProfileFix] Updating profile with data:', userData);
        
        try {
            // Get access token
            const accessToken = localStorage.getItem('flowtest_access_token');
            if (!accessToken) {
                showToast('error', 'You are not authenticated. Please log in again.');
                return;
            }
            
            // Create a FormData object for the request
            const requestFormData = new FormData();
            Object.keys(userData).forEach(key => {
                requestFormData.append(key, userData[key] || '');
            });
            
            // Send the request to our new direct endpoint
            const response = await fetch('/api/core/direct-update-profile/', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                    // No Content-Type - browser will set it for FormData
                },
                body: requestFormData
            });
            
            // Check response status
            if (!response.ok) {
                let errorMessage = 'Failed to update profile';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    // If we can't parse the error response, use the status text
                    errorMessage = `${errorMessage}: ${response.statusText}`;
                }
                
                showToast('error', errorMessage);
                return;
            }
            
            // Parse successful response
            const responseData = await response.json();
            console.log('[ProfileFix] Profile updated successfully:', responseData);
            
            // Update local storage
            try {
                const savedUserData = localStorage.getItem('flowtest_user_data');
                const parsedUserData = savedUserData ? JSON.parse(savedUserData) : {};
                
                // Merge existing data with updated data
                const updatedUserData = { 
                    ...parsedUserData,
                    first_name: responseData.first_name,
                    last_name: responseData.last_name,
                    email: responseData.email,
                    bio: responseData.bio
                };
                
                localStorage.setItem('flowtest_user_data', JSON.stringify(updatedUserData));
                
                // Show success message
                showToast('success', 'Profile updated successfully');
                
                // Refresh UI elements that display user data
                updateUserInterface(updatedUserData);
            } catch (storageError) {
                console.error('[ProfileFix] Error updating localStorage:', storageError);
                showToast('warning', 'Profile updated on server but failed to update local data cache');
            }
        } catch (error) {
            console.error('[ProfileFix] Profile update error:', error);
            showToast('error', `Error updating profile: ${error.message}`);
        }
    }
    
    // Helper function to update UI elements after profile update
    function updateUserInterface(userData) {
        // Update user name in header 
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        }
        
        // Update user full name in sidebar
        const userFullNameElement = document.getElementById('user-full-name');
        if (userFullNameElement) {
            userFullNameElement.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        }
        
        // Update email in sidebar
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = userData.email || '';
        }
        
        // Update user initials
        const initials = getInitials(`${userData.first_name || ''} ${userData.last_name || ''}`);
        const userInitialsElement = document.getElementById('user-initials');
        const userAvatarTextElement = document.getElementById('user-avatar-text');
        
        if (userInitialsElement && !userData.avatar) {
            userInitialsElement.textContent = initials;
        }
        
        if (userAvatarTextElement && !userData.avatar) {
            userAvatarTextElement.textContent = initials;
        }
    }
    
    // Helper function to get initials from name
    function getInitials(name) {
        if (!name || name.trim() === '') return 'U';
        
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    
    // Helper function to show toast messages
    function showToast(type, message) {
        if (window.ToastManager && typeof window.ToastManager[type] === 'function') {
            window.ToastManager[type](message);
        } else {
            // Fallback if toast manager not available
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
})();