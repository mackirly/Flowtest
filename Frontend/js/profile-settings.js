import { fetchWithAuth } from './api-utils.js';
import { I18N_CONFIG } from './i18n-config.js';
// Используем глобальные переменные из CDN
const i18next = window.i18next;
const Backend = window.i18nextHttpBackend;

// Проверяем наличие зависимостей
if (!i18next || !Backend) {
    throw new Error('i18next dependencies not loaded. Please check CDN scripts.');
}

// Инициализация i18n
i18next
  .use(Backend)
  .init({
    lng: I18N_CONFIG.DEFAULT_LANGUAGE,
    fallbackLng: 'en',
    debug: true,
    keySeparator: '.', // Указываем разделитель ключей
    ns: ['translation'], // Используем неймспейс 'translation'
    defaultNS: 'translation',
    backend: {
        // Исправляем путь для соответствия файлам en.json, ru.json и т.д.
        loadPath: `${window.location.origin}/locales/{{lng}}.json`, // Убираем API префикс, предполагаем статический доступ
    }
  }, (err, t) => {
    if (err) {
        console.error('Error initializing i18next:', err);
        return;
    }
    console.log('i18next initialized successfully!');
    // После инициализации обновляем переводы
    updatePageTranslations();
  });

// Функция для обновления переводов на странице
function updatePageTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = i18next.t(key);
        console.log(`Translating key ${key} to: ${translation}`);
        el.textContent = translation;
    });
}

// Обработчик смены языка
function handleLanguageChange(event) {
    const newLang = event.target.value;
    i18next.changeLanguage(newLang, (err, t) => {
        if (err) return console.error('Error changing language:', err);
        updatePageTranslations();
        localStorage.setItem('userLanguage', newLang); // Сохраняем выбор пользователя
        // Добавляем логистику выбора языка, т.е. язык настраивается в выбранном варианте
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.value = newLang;
        }
    });
}

// Экспортируем функции для использования в других модулях
export {
  showNotification,
  setAvatar,
  updateProfile,
  getCurrentUser,
  loadUserData,
  uploadAvatar
};

let currentUserId = null;
let originalData = {};

// Константы для аватаров
const DEFAULT_AVATAR = generateDefaultAvatar(); // Simple avatar placeholder SVG
const VALID_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

// Показ уведомлений
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 
        'bg-blue-500'
    } text-white`;
    notification.textContent = message;

    // Добавляем на страницу
    document.body.appendChild(notification);

    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Функции для генерации аватара
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Google-like colors в формате RGB
    const colors = [
        'rgb(66, 133, 244)',   // Google Blue
        'rgb(219, 68, 55)',    // Google Red
        'rgb(244, 180, 0)',    // Google Yellow
        'rgb(15, 157, 88)',    // Google Green
        'rgb(170, 71, 188)',   // Purple
        'rgb(0, 172, 193)',    // Cyan
        'rgb(255, 112, 67)',   // Deep Orange
        'rgb(158, 157, 36)'    // Lime
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

function getInitial(name) {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
}

function generateDefaultAvatar(name = '') {
    const color = stringToColor(name);
    const initial = getInitial(name);
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="100" fill="${color}"/>
        <text 
            x="100" 
            y="110" 
            font-family="Arial" 
            font-size="85" 
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="middle"
        >${initial}</text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Функция для установки аватара
function setAvatar(imageUrl, username) {
    const avatarElement = document.getElementById('avatar-preview');
    if (!imageUrl) {
        console.log('No avatar URL provided, using default avatar');
        avatarElement.src = generateDefaultAvatar(username);
        return;
    }

    try {
        console.log('Setting avatar URL:', imageUrl);
        avatarElement.onerror = () => {
            console.error('Failed to load avatar from URL:', imageUrl);
            avatarElement.src = generateDefaultAvatar(username);
        };
        avatarElement.src = imageUrl;
    } catch (error) {
        console.error('Error setting avatar:', error);
        avatarElement.src = generateDefaultAvatar(username);
    }
}

// Функция для обновления профиля
async function updateProfile(formData) {
    try {
        if (!currentUserId) {
            throw new Error('User ID not found');
        }

        console.log('Updating profile for user:', currentUserId);
        console.log('Form data:', Object.fromEntries(formData));

        // Конвертируем FormData в объект
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });

        const response = await fetchWithAuth(`/api/users/${currentUserId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        if (!response.ok) {
            let errorMessage = 'Failed to update profile';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.detail || errorMessage;
            } catch (e) {
                // Если не удалось распарсить JSON, пробуем получить текст ошибки
                const text = await response.text();
                console.error('Server response:', text);
            }
            throw new Error(errorMessage);
        }

        const updatedUser = await response.json();
        showNotification('Profile updated successfully', 'success');
        return updatedUser;
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message || 'Error updating profile', 'error');
        throw error;
    }
}

// Функция для получения текущего пользователя
async function getCurrentUser() {
    try {
        const response = await fetchWithAuth('/api/users/get_current_user/');
        if (!response.ok) throw new Error('Failed to get current user');
        const data = await response.json();
        currentUserId = data.id;
        return data;
    } catch (error) {
        console.error('Error getting current user:', error);
        throw error;
    }
}

// Функция для загрузки данных пользователя
async function loadUserData() {
    try {
        if (!currentUserId) {
            const user = await getCurrentUser();
            console.log('Current user data:', user);
            originalData = user;
            
            // Update form fields
            document.getElementById('username').value = user.username || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('first_name').value = user.first_name || '';
            document.getElementById('last_name').value = user.last_name || '';
            
            // Update avatar
            const avatarElement = document.getElementById('avatar-preview');
            console.log('Avatar URL from API:', user.avatar);
            if (user.avatar) {
                console.log('Setting avatar URL:', user.avatar);
                avatarElement.onerror = () => {
                    console.error('Failed to load avatar from URL:', user.avatar);
                    avatarElement.src = generateDefaultAvatar(user.username || user.first_name || '');
                };
                avatarElement.src = user.avatar;
            } else {
                console.log('No avatar URL, using default avatar');
                avatarElement.src = generateDefaultAvatar(user.username || user.first_name || '');
            }
            return;
        }

        const response = await fetchWithAuth(`/api/users/${currentUserId}/`);
        if (!response.ok) throw new Error('Failed to load user data');
        
        const data = await response.json();
        console.log('User data from API:', data);
        originalData = data;
        
        // Update form fields
        document.getElementById('username').value = data.username || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('first_name').value = data.first_name || '';
        document.getElementById('last_name').value = data.last_name || '';
        
        // Update avatar
        const avatarElement = document.getElementById('avatar-preview');
        console.log('Avatar URL from API:', data.avatar_url);
        if (data.avatar_url) {
            console.log('Setting avatar URL:', data.avatar_url);
            avatarElement.onerror = () => {
                console.error('Failed to load avatar from URL:', data.avatar_url);
                avatarElement.src = generateDefaultAvatar(data.username || data.first_name || '');
            };
            avatarElement.src = data.avatar_url;
        } else {
            console.log('No avatar URL, using default avatar');
            avatarElement.src = generateDefaultAvatar(data.username || data.first_name || '');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Failed to load user data', 'error');
    }
}

// Функция для загрузки аватара
async function uploadAvatar(file) {
    try {
        if (!file) throw new Error('No file selected');
        if (!VALID_AVATAR_TYPES.includes(file.type)) throw new Error(window.i18n.t('profileSettings.invalidFileType'));
        if (file.size > MAX_AVATAR_SIZE) throw new Error('File is too large. Maximum size is 2MB.');

        const formData = new FormData();
        formData.append('avatar', file);  // Ключ 'avatar', как ожидает backend

        const response = await fetchWithAuth(`/api/users/${currentUserId}/update_avatar/`, {
            method: 'PATCH',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload avatar');
        }

        const data = await response.json();
        showNotification('Avatar updated successfully!', 'success');
        await loadUserData();  // Перезагружаем данные пользователя, чтобы обновить аватар
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showNotification(error.message || 'Failed to upload avatar', 'error');
        const avatarElement = document.getElementById('avatar-preview');
        avatarElement.src = generateDefaultAvatar(originalData?.username || originalData?.first_name || '');
    }
}

// Инициализация при загрузке страницы
// Ждем полной загрузки страницы
window.addEventListener('load', async () => {
    console.log('Page fully loaded, initializing profile settings...');
    
    // Проверяем наличие необходимых элементов DOM
    const requiredElements = [
        'username', 'email', 'first_name', 'last_name', 
        'avatar-preview', 'profileForm', 'avatar-upload'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        return;
    }
    try {
        // Загружаем данные пользователя
        await loadUserData();

        // Обработчик кнопки изменения пароля
        const togglePasswordBtn = document.getElementById('togglePasswordChange');
        const passwordSection = document.getElementById('passwordChangeSection');
        
        if (togglePasswordBtn && passwordSection) {
            togglePasswordBtn.addEventListener('click', function(e) {
                e.preventDefault();
                passwordSection.classList.toggle('hidden');
                this.textContent = passwordSection.classList.contains('hidden') 
                    ? 'Изменить пароль' 
                    : 'Скрыть';
            });
        }
        
        // Добавляем обработчик отправки формы
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                try {
                    const formData = new FormData(this);
                    const avatarInput = document.getElementById('avatar-upload');
                    if (avatarInput.files[0]) {
                        formData.append('avatar', avatarInput.files[0]);
                    }
                    await updateProfile(formData);
                } catch (error) {
                    console.error('Error in form submission:', error);
                }
            });
        } else {
            console.error('Profile form not found');
        }

        // Обработчик изменения файла аватара
        document.getElementById('avatar-upload').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                await uploadAvatar(file);
            }
        });
    } catch (error) {
    console.error('Failed to initialize profile settings:', error);
    showNotification('Failed to load profile data', 'error');
  }

  // Добавляем обработчик для селектора языка
  const languageSelector = document.getElementById('languageSelector');
  if (languageSelector) {
      languageSelector.addEventListener('change', handleLanguageChange);
      // Устанавливаем начальное значение из localStorage или i18next
      const savedLang = localStorage.getItem('userLanguage') || i18next.language;
      languageSelector.value = savedLang;
      // Если язык из localStorage отличается от текущего в i18next, меняем его
      if (savedLang !== i18next.language) {
          i18next.changeLanguage(savedLang, (err, t) => {
              if (err) return console.error('Error setting initial language:', err);
              updatePageTranslations();
          });
      }
  } else {
      console.error('Language selector not found');
  }
});

// Удаленный обработчик выбора языка из блока инициализации
// languageSelector.addEventListener('change', handleLanguageChange);

// Удаленный обработчик выбора языка из блока инициализации
// const savedLang = localStorage.getItem('userLanguage') || i18next.language;
// languageSelector.value = savedLang;
// if (savedLang !== i18next.language) {
//     i18next.changeLanguage(savedLang, (err, t) => {
//         if (err) return console.error('Error setting initial language:', err);
//         updatePageTranslations();
//     });
// }
