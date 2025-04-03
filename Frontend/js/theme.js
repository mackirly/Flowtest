import { API } from './api-config.js';
import { fetchWithAuth } from './api-utils.js';
const api = new API();

// Функция для установки темы
export async function setTheme(theme) {
    try {
        console.log('Setting theme to:', theme);
        
        // Сохраняем тему в localStorage
        localStorage.setItem('theme', theme);
        
        // Применяем тему к документу
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Проверяем наличие токена авторизации
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('No authentication token found, skipping server update');
            return;
        }

        // Пытаемся сохранить предпочтение темы на сервере
        // try {
        //     // Use the API endpoint with fetchWithAuth
        //     const response = await fetchWithAuth(api.USERS.UPDATE_THEME, {
        //         method: 'PATCH',
        //         body: JSON.stringify({ theme })
        //     });

        //     console.log('Response status:', response.status);
            
        //     if (response.ok) {
        //         console.log('Theme preference saved successfully');
        //         try {
        //             const responseData = await response.json();
        //             console.log('Response data:', responseData);
        //         } catch (e) {
        //             console.log('No JSON response from theme update');
        //         }
        //     } else {
        //         console.warn('Failed to save theme preference. Status:', response.status);
        //         try {
        //             const responseData = await response.json();
        //             console.warn('Response data:', responseData);
        //         } catch (e) {
        //             try {
        //                 const responseText = await response.text();
        //                 console.warn('Response text:', responseText);
        //             } catch (e2) {
        //                 console.warn('Could not read response');
        //             }
        //         }
        //     }
        // } catch (error) {
        //     console.error('Error saving theme preference:', error);
        //     // Продолжаем работу, так как тема уже применена локально
        // }
    } catch (error) {
        console.error('Error setting theme:', error);
    }
}

// Функция для получения текущей темы
export function getTheme() {
    return localStorage.getItem('theme') || 'light';
}

// Инициализация темы
document.addEventListener('DOMContentLoaded', () => {
    // Применяем сохраненную тему
    const currentTheme = getTheme();
    setTheme(currentTheme);

    // Добавляем обработчик для кнопки переключения темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = getTheme() === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
});

// Provide global access to theme functions
window.themeManager = { setTheme, getTheme };
