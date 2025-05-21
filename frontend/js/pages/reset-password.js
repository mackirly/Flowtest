/**
 * Reset password page functionality
 * Handles resetting password with token
 */
import auth from '../api/auth.js';
import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';

document.addEventListener('DOMContentLoaded', function() {
    const resetForm = document.getElementById('reset-form');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');
    const resetComplete = document.getElementById('reset-complete');
    
    // Check if user is already logged in
    if (auth.isAuthenticated()) {
        // Redirect to dashboard if already authenticated
        window.location.href = 'index.html';
        return;
    }
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        // If no token is provided, display error and redirect to forgot password page
        ToastManager.error(i18n.t('resetLinkExpired') || 'Reset link expired or invalid');
        setTimeout(() => {
            window.location.href = 'forgot-password.html';
        }, 2000);
        return;
    }
    
    // Set token in hidden field
    document.getElementById('reset-token').value = token;
    
    // Form validation
    function validateForm() {
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        
        // Reset error and success messages
        resetError.classList.add('hidden');
        resetError.textContent = '';
        resetSuccess.classList.add('hidden');
        
        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            displayError(i18n.t('passwordRequirements') || 'Password does not meet requirements');
            return false;
        }
        
        if (password !== passwordConfirm) {
            displayError(i18n.t('passwordMismatch') || 'Passwords do not match');
            return false;
        }
        
        return true;
    }
    
    function displayError(message) {
        resetError.textContent = message;
        resetError.classList.remove('hidden');
    }
    
    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate the form
        if (!validateForm()) {
            return;
        }
        
        const password = document.getElementById('password').value;
        
        try {
            // Show loading state
            const submitButton = resetForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${i18n.t('saveNewPassword')}...
            `;
            
            // Attempt to reset password
            await auth.resetPassword(token, password);
            
            // Show success message
            ToastManager.success(i18n.t('passwordResetSuccess') || 'Password reset successful');
            
            // Hide form and show completion message
            resetForm.classList.add('hidden');
            resetComplete.classList.remove('hidden');
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            // Display error message
            if (error.message.includes('expired') || error.message.includes('invalid')) {
                displayError(i18n.t('resetLinkExpired') || 'Reset link expired or invalid');
            } else {
                displayError(i18n.t('passwordResetFailed') || 'Password reset failed. Please try again.');
            }
            
            // Show error toast
            ToastManager.error(i18n.t('passwordResetFailed') || 'Password reset failed');
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
    
    // Handle language changes
    window.addEventListener('language-changed', () => {
        // Update any dynamic content that needs translation
        if (resetError && !resetError.classList.contains('hidden')) {
            // Re-run validation to update error message in current language
            validateForm();
        }
    });
});