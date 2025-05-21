/**
 * Forgot password page functionality
 * Handles password reset request
 */
import auth from '../api/auth.js';
import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';

document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgot-form');
    const forgotError = document.getElementById('forgot-error');
    const forgotSuccess = document.getElementById('forgot-success');
    const resetInstructions = document.getElementById('reset-instructions');
    const resendLink = document.getElementById('resend-link');
    
    // Check if user is already logged in
    if (auth.isAuthenticated()) {
        // Redirect to dashboard if already authenticated
        window.location.href = 'index.html';
        return;
    }
    
    // Form validation
    function validateForm() {
        const email = document.getElementById('email').value.trim();
        
        // Reset error and success messages
        forgotError.classList.add('hidden');
        forgotError.textContent = '';
        forgotSuccess.classList.add('hidden');
        forgotSuccess.textContent = '';
        
        // Basic validations
        if (!email || !email.includes('@')) {
            displayError(i18n.t('validEmailRequired') || 'A valid email address is required');
            return false;
        }
        
        return true;
    }
    
    function displayError(message) {
        forgotError.textContent = message;
        forgotError.classList.remove('hidden');
        resetInstructions.classList.add('hidden');
    }
    
    function displaySuccess() {
        resetInstructions.classList.remove('hidden');
        forgotForm.classList.add('hidden');
    }
    
    async function sendPasswordResetRequest(email) {
        try {
            // Show loading state
            const submitButton = forgotForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${i18n.t('resetPassword')}...
            `;
            
            // Attempt to request password reset
            await auth.requestPasswordReset(email);
            
            // Show success message
            ToastManager.success(i18n.t('resetEmailSent') || 'Password reset email sent');
            displaySuccess();
            
        } catch (error) {
            console.error('Password reset request error:', error);
            
            // Don't show error for security reasons - always show success to prevent email enumeration
            ToastManager.success(i18n.t('resetEmailSent') || 'Password reset email sent');
            displaySuccess();
            
        } finally {
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
    
    forgotForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate the form
        if (!validateForm()) {
            return;
        }
        
        const email = document.getElementById('email').value.trim();
        
        // Send password reset request
        await sendPasswordResetRequest(email);
    });
    
    // Handle resend link
    if (resendLink) {
        resendLink.addEventListener('click', async function() {
            const email = document.getElementById('email').value.trim();
            
            if (!email || !email.includes('@')) {
                displayError(i18n.t('validEmailRequired') || 'A valid email address is required');
                return;
            }
            
            // Resend password reset request
            await sendPasswordResetRequest(email);
        });
    }
    
    // Handle language changes
    window.addEventListener('language-changed', () => {
        // Update any dynamic content that needs translation
        if (forgotError && !forgotError.classList.contains('hidden')) {
            // Re-run validation to update error message in current language
            validateForm();
        }
    });
});