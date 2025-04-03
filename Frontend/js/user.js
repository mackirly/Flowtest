import { fetchWithAuth } from './api-utils.js';
import { I18N_CONFIG } from './i18n-config.js';

// Создаем и экспортируем модуль
export const UserModule = {
    loadUserData,
    updateUserInfo,
    showDefaultUserInfo
};

// Делаем модуль доступным глобально
window.UserModule = UserModule;

const USER_ENDPOINTS = [
    '/api/users/get_current_user/',
    '/api/users/profile/'
];

// Функция для загрузки данных пользователя
async function loadUserData() {
    console.log('%cu041fu043eu043fu044bu0442u043au0430 u0437u0430u0433u0440u0443u0437u0438u0442u044c u0434u0430u043du043du044bu0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a...', 'background: #3f51b5; color: white; padding: 3px; border-radius: 3px;');
    console.log('u0414u043eu0441u0442u0443u043fu043du044bu0435 u043au043eu043du0435u0447u043du044bu0435 u0442u043eu0447u043au0438:', USER_ENDPOINTS);
    
    // u041fu0440u043eu0432u0435u0440u044fu0435u043c u043du0430u043bu0438u0447u0438u0435 u0442u043eu043au0435u043du0430
    const token = localStorage.getItem('authToken');
    console.log('u0422u043eu043au0435u043d u0430u0432u0442u043eu0440u0438u0437u0430u0446u0438u0438 u043fu0440u0438u0441u0443u0442u0441u0442u0432u0443u0435u0442:', !!token);
    if (!token) {
        console.error('u041du0435u0442 u0434u043eu0441u0442u0443u043fu043du043eu0433u043e u0442u043eu043au0435u043du0430 u0430u0432u0442u043eu0440u0438u0437u0430u0446u0438u0438!');
    }
    
    for (const endpoint of USER_ENDPOINTS) {
        try {
            console.log(`u041fu0440u043eu0431u0443u0435u043c u043au043eu043du0435u0447u043du044bu0435 u0442u043eu0447u043au0443: ${endpoint}`);
            const response = await fetchWithAuth(endpoint);
            console.log(`u041eu0442u0432u0435u0442 u043eu0442 ${endpoint}:`, response.status, response.ok);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('%cu0414u0430u043du043du044bu0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a u0437u0430u0433u0440u0443u0436u0435u043du044b u0443u0441u043fu0435u0448u043du043e:', 'background: #4caf50; color: white; padding: 3px; border-radius: 3px;', userData);
                updateUserInfo(userData);
                return userData;
            } else {
                console.error(`u041eu0448u0438u0431u043au0430 u043fu0440u0438 u0437u0430u0433u0440u0443u0437u043au0435 u0434u0430u043du043du044bu0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a u0438u0437 ${endpoint}:`, response.status);
                try {
                    const errorText = await response.text();
                    console.error('u0422u0435u043au0441u0442 u043eu0448u0438u0431u043au0438:', errorText);
                } catch (e) {
                    console.error('u041du0435 u0443u0434u0430u043bu043eu0441u044c u043fu043eu043bu0443u0447u0438u0442u044c u0442u0435u043au0441u0442 u043eu0448u0438u0431u043au0438');
                }
            }
        } catch (error) {
            console.error(`u041eu0448u0438u0431u043au0430 u043fu0440u0438 u0437u0430u043fu0440u043eu0441u0435 u043a ${endpoint}:`, error);
        }
    }
    
    // u0415u0441u043bu0438 u043cu044b u0434u043eu0448u043bu0438 u0434u043e u0441u044eu0434u0430, u0437u043du0430u0447u0438u0442 u043du0438 u043eu0434u0438u043d u0437u0430u043fu0440u043eu0441 u043du0435 u0443u0434u0430u043lu0441u044c
    console.error('%cu041du0435 u0443u0434u0430u043lu043eu0441u044c u0437u0430u0433u0440u0443u0437u0438u0442u044c u0434u0430u043du043du044bu0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a', 'background: #f44336; color: white; padding: 3px; border-radius: 3px;');
    // u041fu043eu043au0430u0437u044bu0432u0430u0435u043c u0434u0435u0444u043eu043bu0442u043du043eu0433u043e u0438u043du0444u043eu0440u043cu0430u0446u0438u0438 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a
    showDefaultUserInfo();
    
    throw new Error('Failed to load user data');
}

// Функция для обновления информации о пользователе на странице
function updateUserInfo(userData) {
    try {
        console.log('Updating user info with data:', userData);
        
        // Обновляем имя пользователя
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userData.username || 'Guest';
        }

        // Обновляем аватар
        const userAvatarContainer = document.getElementById('user-avatar');
        if (userAvatarContainer) {
            if (userData.avatar && userData.avatar !== 'null' && userData.avatar !== 'undefined') {
                // Создаем полный URL для аватара
                const avatarUrl = userData.avatar.startsWith('http') ? userData.avatar : `${I18N_CONFIG.API_BASE_URL}${userData.avatar}`;
                userAvatarContainer.innerHTML = `<img src="${avatarUrl}" alt="${userData.username}" class="w-8 h-8 rounded-full">`;
            } else {
                // Показываем инициалы, если нет аватара
                const initials = userData.username
                    ? userData.username.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)
                    : '?';
                userAvatarContainer.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-600">${initials}</span>
                    </div>
                `;
            }
        }

        // Показываем/скрываем ссылку на админ-панель
        const adminPanelLink = document.getElementById('adminPanelLink');
        if (adminPanelLink) {
            if (userData.is_staff || userData.is_superuser) {
                adminPanelLink.classList.remove('hidden');
            } else {
                adminPanelLink.classList.add('hidden');
            }
        }

        console.log('User info updated successfully');
    } catch (error) {
        console.error('Error updating user info:', error);
        showDefaultUserInfo();
    }
}

// Функция для показа заглушки при ошибке загрузки данных пользователя
function showDefaultUserInfo() {
    console.log('u041fu043eu043au0430u0437 u0434u0435u0444u043eu043bu0442u043du043eu0439 u0438u043du0444u043eu0440u043cu0430u0446u0438u0438 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a');
    
    // u041fu043eu043au0430u0437 u0434u0435u0444u043eu043bu0442u043du043eu0433u043e u0438u043cu0435u043du0438
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = 'u0410u043du043eu043du0438u043c';
        console.log('u0423u0441u0442u0430u043du043eu0432u043bu0435u043du043e u0434u0435u0444u043eu043bu0442u043du043eu0433u043e u0438u043cu044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a');
    } else {
        console.warn('u042du043bu0435u043cu0435u043du0442 userName u043du0435 u043du0430u0439u0434u0435u043d u0432 DOM!');
    }
    
    // u041fu043eu043au0430u0437 u0434u0435u0444u043eu043bu0442u043du043eu0433u043e u0430u0432u0430u0442u0430u0440u0430
    const userAvatarContainer = document.getElementById('user-avatar');
    if (userAvatarContainer) {
        userAvatarContainer.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="text-sm font-medium text-blue-600">?</span>
            </div>
        `;
        console.log('u0423u0441u0442u0430u043du043eu0432u043bu0435u043du043e u0434u0435u0444u043eu043bu0442u043du044bu0439 u0430u0432u0430u0442u0430u0440');
    } else {
        console.warn('u042du043bu0435u043cu0435u043du0442 user-avatar u043du0435 u043du0430u0439u0434u0435u043d u0432 DOM!');
    }
    
    // u0421u043au0440u044bu0432u0430u0435u043c u0441u0441u044bu043bu043au0443 u043du0430 u0430u0434u043cu0438u043d-u043fu0430u043du0435u043bu044c
    const adminPanelLink = document.getElementById('adminPanelLink');
    if (adminPanelLink) {
        adminPanelLink.classList.add('hidden');
        console.log('u0421u0441u044bu043bu043au0430 u043du0430 u0430u0434u043cu0438u043d-u043fu0430u043du0435u043bu044c u0441u043au0440u044bu0442u0430');
    }
    
    // u0414u043eu043fu043eu043bu043du0438u0442u0435u043bu044cu043du0430u044f u043fu0440u043eu0432u0435u0440u043au0430 DOM u044du043bu0435u043cu0435u043du0442u043eu0432
    console.log('DOM u044du043bu0435u043cu0435u043du0442u044b u0434u043bu044f u043fu0440u043eu0444u0438u043bu044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a:');
    console.log('userMenuButton:', !!document.getElementById('userMenuButton'));
    console.log('userName:', !!document.getElementById('userName'));
    console.log('user-avatar:', !!document.getElementById('user-avatar'));
    console.log('userMenu:', !!document.getElementById('userMenu'));
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing user menu...');
    
    // u041fu0440u0438 u0438u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u0438 u043du0435 u0437u0430u0433u0440u0443u0436u0430u0435u043c u0434u0430u043du043du044bu0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a, 
    // u044du0442u043e u0431u0443u0434u0435u0442 u0434u0435u043bu0430u0442u044c TestCaseManager
    // loadUserData();

    // u041eu0431u0440u0430u0431u043eu0442u0447u0438u043a u043au043bu0438u043au0430 u043fu043e u043au043du043eu043fu043au0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044a
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenu = document.getElementById('userMenu');
    
    if (userMenuButton && userMenu) {
        userMenuButton.addEventListener('click', () => {
            const isExpanded = userMenuButton.getAttribute('aria-expanded') === 'true';
            userMenuButton.setAttribute('aria-expanded', !isExpanded);
            userMenu.classList.toggle('hidden');
        });

        // u0417u0430u043au0440u044bu0432u0430u0435u043c u043cu0435u043du044e u043fu0440u0438 u043au043bu0438u043au0435 u0432u043du0435 u0435u0433u043e
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                userMenuButton.setAttribute('aria-expanded', 'false');
                userMenu.classList.add('hidden');
            }
        });
    }
});
