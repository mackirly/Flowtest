/**
 * Registration page functionality
 * Handles user registration
 */
import auth from '../api/auth.js';
import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';

document.addEventListener('DOMContentLoaded', async function() {
    const registerForm = document.getElementById('register-form');
    const registerError = document.getElementById('register-error');
    
    // Temporarily disable auth check to allow access to registration page
    console.log('[Register] Registration page loaded, skipping auth check for now');
    
    // Form validation
    function validateForm() {
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const terms = document.getElementById('terms').checked;
        
        // Reset error
        registerError.classList.add('hidden');
        registerError.textContent = '';
        
        // Basic validations
        if (!firstName || !lastName) {
            displayError(i18n.t('nameRequired') || 'First and last name are required');
            return false;
        }
        
        if (!email || !email.includes('@')) {
            displayError(i18n.t('validEmailRequired') || 'A valid email address is required');
            return false;
        }
        
        if (!username || username.length < 3) {
            displayError(i18n.t('usernameMinLength') || 'Username must be at least 3 characters');
            return false;
        }
        
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
        
        if (!terms) {
            displayError(i18n.t('termsRequired') || 'You must accept the terms of service');
            return false;
        }
        
        return true;
    }
    
    function displayError(message) {
        registerError.textContent = message;
        registerError.classList.remove('hidden');
    }
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate the form
        if (!validateForm()) {
            return;
        }
        
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        try {
            // Show loading state
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${i18n.t('createAccountBtn')}...
            `;
            
            // Attempt to register
            await auth.register({
                first_name: firstName,
                last_name: lastName,
                email: email,
                username: username,
                password: password
            });
            
            // Show success message
            ToastManager.success(i18n.t('registrationSuccess') || 'Registration successful. You can now log in.');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Display error message
            if (error.message.includes('username')) {
                displayError(i18n.t('usernameExists') || 'Username already exists');
            } else if (error.message.includes('email')) {
                displayError(i18n.t('emailExists') || 'Email already registered');
            } else {
                displayError(i18n.t('registrationFailed') || 'Registration failed. Please try again.');
            }
            
            // Show error toast
            ToastManager.error(i18n.t('registrationFailed') || 'Registration failed');
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
    
    // Handle language changes
    window.addEventListener('language-changed', () => {
        // Update any dynamic content that needs translation
        if (registerError && !registerError.classList.contains('hidden')) {
            // Re-run validation to update error message in current language
            validateForm();
        }
    });
});