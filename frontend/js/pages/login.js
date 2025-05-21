/**
 * Login page functionality
 * Handles user authentication and login
 */
import auth from '../api/auth.js';
import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';

document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы формы и уведомлений
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginSuccess = document.getElementById('login-success');
    
    // Add a small delay to prevent page flickering
    // Initialize auth first
    auth.initialize().then(async (initialized) => {
        console.log('Checking authentication status...');
        try {
            const isAuth = await auth.isAuthenticated();
            console.log('Authentication status:', isAuth);
            
            if (isAuth) {
                console.log('User is authenticated, checking profile...');
                try {
                    const user = await auth.getUserProfile();
                    console.log('User profile:', user);
                    
                    // Only redirect if we're on the login page and have a valid user
                    if (window.location.pathname.endsWith('login.html')) {
                        console.log('User is authenticated, redirecting to index.html');
                        window.location.href = 'index.html'; // Убираем слеш в начале пути
                        return; // Exit to prevent further execution
                    }
                } catch (profileError) {
                    console.error('Error getting user profile:', profileError);
                    // If we can't get profile, clear auth and stay on login page
                    if (!window.location.pathname.endsWith('login.html')) {
                        window.location.href = 'login.html'; // Убираем слеш в начале пути
                    }
                    return;
                }
            } else {
                console.log('User is not authenticated');
                // If not authenticated, make sure we're on the login page
                if (!window.location.pathname.endsWith('login.html')) {
                    console.log('Redirecting to login page - not authenticated');
                    window.location.href = 'login.html'; // Убираем слеш в начале пути
                }
            }
        } catch (error) {
            console.error('Error checking authentication:', error);
            // On error, redirect to login page if not already there
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html'; // Убираем слеш в начале пути
            }
        }
    });
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        loginError.classList.add('hidden');
        loginError.textContent = '';
        
        const username = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Перемещаем объявление переменных за пределы блока try-catch
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        
        try {
            console.log('Attempting to login...');
            // Call login API with retry logic
            const user = await auth.login(username, password);
            
            if (!user) {
                throw new Error('No user data received');
            }
            
            console.log('Login successful, user:', user);
            
            // Логируем информацию для отладки
            if (user.is_superuser || user.role_name === 'Admin' || user.username === 'root') {
                console.log('Admin user logged in successfully');
            } else {
                console.log('Regular user logged in successfully');
            }
            
            // Показываем зеленое уведомление Toast об успешном входе
            ToastManager.success('Успешный вход в систему');
            
            // Добавляем небольшую задержку перед редиректом
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            console.log('Redirecting to index.html');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Determine error message
            let errorMessage = 'Ошибка при входе в систему. Пожалуйста, попробуйте снова.';
            
            if (error.message.includes('429')) {
                errorMessage = 'Слишком много попыток входа. Пожалуйста, подождите несколько минут и попробуйте снова.';
            } else if (error.message.includes('401') || error.message.includes('credentials') || error.message.includes('Authentication failed')) {
                errorMessage = 'Неверное имя пользователя или пароль. Пожалуйста, попробуйте снова.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Показываем красное toast-уведомление об ошибке
            console.error('Login failed:', error);
            ToastManager.error(errorMessage);
            
            // Reset button with a small delay to prevent rapid clicks
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }, 1000);
        }
    });
    
    // Handle language changes
    window.addEventListener('language-changed', () => {
        // Update any dynamic content that needs translation
        if (loginError && !loginError.classList.contains('hidden')) {
            loginError.textContent = i18n.t('login-error');
        }
    });
});