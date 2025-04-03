import { login } from './auth.js';
import { showNotification } from './notifications.js';

const HOME_PAGE = '/index.html';

document.addEventListener('DOMContentLoaded', function() {
    try {
        // Проверяем, есть ли действующий токен
        const token = localStorage.getItem('authToken');
        if (token) {
            window.location.replace(HOME_PAGE);
            return;
        }

        // Initialize i18n once
        i18n.init();
        
        // Initialize language select
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            const currentLang = localStorage.getItem('language') || 'en';
            languageSelect.value = currentLang;
            updateFlag(currentLang);
        }

        // Handle login form
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                // Отключаем кнопку на время запроса
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.disabled = true;
                }
                
                try {
                    const success = await login(username, password);
                    if (success) {
                        showNotification('Успешная авторизация', 'success');
                        window.location.replace(HOME_PAGE);
                    } else {
                        throw new Error('Ошибка авторизации');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showNotification(error.message || 'Ошибка авторизации', 'error');
                } finally {
                    // Включаем кнопку обратно
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Ошибка инициализации страницы', 'error');
    }
});

// Function to update the flag icon
function updateFlag(lang) {
    const flagElement = document.querySelector('.language-flag');
    if (flagElement) {
        // Remove all existing classes
        flagElement.className = 'language-flag fi';
        
        // Add the appropriate flag class
        switch (lang) {
            case 'en':
                flagElement.classList.add('fi-gb');
                break;
            case 'ru':
                flagElement.classList.add('fi-ru');
                break;
            case 'de':
                flagElement.classList.add('fi-de');
                break;
        }
    }
}
