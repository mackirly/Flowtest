// Import required modules
import ToastManager from '../utils/toast.js';
import i18n from '../i18n/i18n.js';
import { profileService } from '../services/profile.js';
import auth from '../api/auth.js';
import AvatarCropper from '../utils/avatar-cropper-fix.js';

// Event handlers
let personalInfoForm;
let passwordForm;

// Export the initialize function first
export default {
    init() {
        return initializePage();
    }
};

// Автоматический запуск инициализации при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[Profile] DOMContentLoaded event fired');
        // Для модульного экспорта
        if (typeof exports !== 'undefined' && exports.init) {
            exports.init();
        }
        // Для обычного подключения
        if (typeof window !== 'undefined' && typeof window.default !== 'undefined' && window.default.init) {
            window.default.init();
        }
        // Явный вызов
        if (typeof initializePage === 'function') {
            initializePage();
        }
    } catch (e) {
        console.error('Error initializing profile page:', e);
    }
});

// Initialize page
async function initializePage() {
    console.log('[Profile] initializePage called');
    try {
        // Check auth using auth module
        const isAuthenticated = await auth.isAuthenticated();
        if (!isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        // Load initial data
        await loadUserProfile();
        
        // Setup UI after data is loaded
        setupTabNavigation();
        setupPasswordToggles();
        
        // Initialize avatar upload with a small delay to ensure Cropper.js is loaded
        setTimeout(() => {
            console.log('[Profile] Delayed avatar upload initialization');
            initializeAvatarUpload();
        }, 500);
        
        setupEventListeners();
        
        console.log('Profile page initialized successfully');
    } catch (error) {
        console.error('Failed to initialize profile:', error);
        ToastManager.error('Не удалось загрузить профиль');
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    personalInfoForm = document.getElementById('personal-info-form');
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleProfileUpdate(new FormData(personalInfoForm));
        });
    }

    passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handlePasswordChange(new FormData(passwordForm));
        });
    }
}

// Load user profile
async function loadUserProfile() {
    console.log('[Profile] loadUserProfile called');
    try {
        console.log('Loading user profile...');
        
        // Сначала попробуем получить профиль из auth.getUserProfile
        let userData = await auth.getUserProfile();
        
        if (!userData) {
            console.log('No user data from auth, trying profileService...');
            userData = await profileService.getProfile();
        }

        // Универсальная обработка avatar для любого источника
        if (userData && userData.avatar && !userData.avatar.startsWith('http')) {
    // Формируем URL без порта (http://localhost/media/...)
    if (userData.avatar.startsWith('/media')) {
        userData.avatar = window.location.origin.replace(/:\d+$/, '') + userData.avatar;
    } else {
        userData.avatar = new URL(userData.avatar, window.location.origin).href;
    }
    console.log('[Profile] Итоговый URL аватара:', userData.avatar);
}
        
        if (!userData) {
            console.error('Failed to load user profile from both sources');
            ToastManager.error('Не удалось загрузить данные профиля');
            return;
        }
        
        console.log('User profile loaded successfully:', userData);
        updateUI(userData);
        
        // Загрузим дополнительные данные, если они доступны
        try {
            const activities = await profileService.getActivity();
            if (activities) {
                updateActivityTimeline(activities);
            }
        } catch (activityError) {
            console.warn('Failed to load activities:', activityError);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        ToastManager.error('Не удалось загрузить профиль');
    }
}

// Update UI with profile data
function updateUI(userData) {
    if (!userData) {
        console.error('No user data provided to updateUI');
        return;
    }
    
    console.log('Updating UI with user data:', userData);

    const elements = {
        userName: document.getElementById('user-name'),
        userFullName: document.getElementById('user-full-name'),
        userEmail: document.getElementById('user-email'),
        userAvatarText: document.getElementById('user-avatar-text'),
        userAvatarImage: document.getElementById('user-avatar-image'),
        userRole: document.getElementById('user-role'),
        memberSince: document.getElementById('member-since-date'),
        lastActive: document.getElementById('last-active-time'),
        firstNameInput: document.getElementById('first-name'),
        nicknameInput: document.getElementById('nickname'),
        lastNameInput: document.getElementById('last-name'),
        emailInput: document.getElementById('email'),
        bioInput: document.getElementById('bio')
    };

    // Update main info
    // For header - use username
    const headerDisplayName = userData.username || userData.email?.split('@')[0] || 'Пользователь';
    
    // For profile card - use full name
    const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
    const profileDisplayName = fullName || userData.username || userData.email?.split('@')[0] || 'Пользователь';
    
    // Generate initials
    const headerInitialsText = getInitials(headerDisplayName); // Для хедера
    const profileInitialsText = getInitials(profileDisplayName); // Для профиля
    
    // Обновляем все элементы с проверкой на null
    if (elements.userName) elements.userName.textContent = headerDisplayName; // Header
    if (elements.userFullName) elements.userFullName.textContent = profileDisplayName; // Profile card
    if (elements.userEmail) elements.userEmail.textContent = userData.email || 'email@example.com';
    if (elements.userRole) {
        const roleName = userData.role_name || 'User';
        // Convert role name to lowercase for translation key
        const roleKey = roleName.toLowerCase();
        elements.userRole.textContent = i18n.t(roleKey) || roleName;
    }
    
    // Обновляем инициалы для аватара - используем полное имя для профиля
    if (elements.userAvatarText) {
        elements.userAvatarText.textContent = profileInitialsText;
    }
    
    // Update dates
    if (elements.memberSince && userData.date_joined) {
        try {
            elements.memberSince.textContent = new Date(userData.date_joined).toLocaleDateString();
        } catch (e) {
            console.warn('Error formatting date_joined:', e);
            elements.memberSince.textContent = 'Неизвестно';
        }
    }
    
    // Update form fields with null checks
    if (elements.firstNameInput) elements.firstNameInput.value = userData.first_name || '';
    if (elements.nicknameInput) elements.nicknameInput.value = userData.username || '';
    if (elements.lastNameInput) elements.lastNameInput.value = userData.last_name || '';
    if (elements.emailInput) elements.emailInput.value = userData.email || '';
    if (elements.bioInput) elements.bioInput.value = userData.bio || '';

    // Update avatar with proper error handling
    let avatarUrl = null;
    if (userData.avatar) {
        try {
            avatarUrl = new URL(userData.avatar, window.location.origin).href;
        } catch (e) {
            console.warn('Error parsing avatar URL:', e);
        }
    }
    // Initials уже определены выше

    // Update profile avatar
    if (avatarUrl && elements.userAvatarImage) {
        elements.userAvatarImage.src = avatarUrl;
        elements.userAvatarImage.classList.remove('hidden');
        if (elements.userAvatarText) {
            elements.userAvatarText.classList.add('hidden');
        }
    } else if (elements.userAvatarText) {
        elements.userAvatarText.textContent = userInitials;
        elements.userAvatarText.classList.remove('hidden');
        if (elements.userAvatarImage) {
            elements.userAvatarImage.classList.add('hidden');
        }
    }

    // Update header avatar
    try {
        const headerAvatar = document.querySelector('#user-avatar-img');
        const headerInitials = document.getElementById('user-initials');
        if (headerAvatar && headerInitials) {
            if (avatarUrl) {
                headerAvatar.src = avatarUrl;
                headerAvatar.classList.remove('hidden');
                headerInitials.classList.add('hidden');
            } else {
                headerInitials.textContent = headerInitialsText;
                headerInitials.classList.remove('hidden');
                headerAvatar.classList.add('hidden');
            }
        }
        console.log('[Profile] Updated header avatar:', { avatarUrl, initials: headerInitialsText });
    } catch (error) {
        console.error('[Profile] Error updating header avatar:', error);
    }

    // Update activity timeline if data exists
    if (userData.activity?.length) {
        updateActivityTimeline(userData.activity);
    }

    // Update statistics if data exists
    if (userData.statistics) {
        updateStatistics(userData.statistics);
    }
}

// Update activity timeline
function updateActivityTimeline(activities) {
    const timeline = document.getElementById('activity-timeline');
    if (!timeline) return;

    const activityHTML = activities.map(activity => `
        <div class="timeline-item">
            <div class="mb-1 flex items-center">
                <span class="font-medium">${i18n.t(activity.type)}</span>
                <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ${new Date(activity.created_at).toLocaleString()}
                </span>
            </div>
            <p class="text-sm">${activity.description}</p>
        </div>
    `).join('');

    timeline.innerHTML = activityHTML;
}

// Update statistics
function updateStatistics(stats) {
    // Add any statistics-specific UI updates here
}

// Handle form submissions
async function handleProfileUpdate(formData) {
    try {
        console.log('[Profile] Starting profile update...');
        const data = {
            first_name: formData.get('first-name'),
            username: formData.get('nickname'),
            last_name: formData.get('last-name'),
            email: formData.get('email'),
            bio: formData.get('bio')
        };
        console.log('[Profile] Form data:', data);

        const result = await profileService.updateProfile(data);
        console.log('[Profile] Update successful:', result);
        ToastManager.success(i18n.t('profileUpdated'));
        await loadUserProfile();
    } catch (error) {
        console.error('[Profile] Error updating profile:', error);
        ToastManager.error(`${i18n.t('failedToUpdateProfile')}: ${error.message}`);
    }
}

async function handlePasswordChange(formData) {
    try {
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        if (newPassword !== confirmPassword) {
            ToastManager.error(i18n.t('passwordsDoNotMatch'));
            return;
        }

        await profileService.changePassword(currentPassword, newPassword);
        ToastManager.success(i18n.t('passwordChanged'));
        passwordForm.reset();
    } catch (error) {
        console.error('Error changing password:', error);
        ToastManager.error(i18n.t('failedToChangePassword'));
    }
}

// Initialize avatar upload
function initializeAvatarUpload() {
    console.log('[Profile] Initializing avatar upload');
    const fileInput = document.getElementById('avatar-upload');
    if (!fileInput) {
        console.error('[Profile] Avatar upload input not found');
        return;
    }

    // Initialize AvatarCropper
    console.log('[Profile] Initializing AvatarCropper');
    AvatarCropper.init();
    
    // Set the save callback
    AvatarCropper.setSaveCallback(async (file, dataUrl) => {
        console.log('[Profile] Avatar save callback triggered');
        try {
            const result = await profileService.uploadAvatar(file);
            console.log('[Profile] Avatar upload result:', result);
            ToastManager.success(i18n.t('avatarUpdated') || 'Аватар обновлен');
            
            // Reload user profile to show new avatar
            await loadUserProfile();
        } catch (error) {
            console.error('[Profile] Error uploading avatar:', error);
            ToastManager.error(i18n.t('failedToUploadAvatar') || 'Ошибка загрузки аватара');
        }
    });

    fileInput.addEventListener('change', async (e) => {
        console.log('[Profile] File input changed');
        const file = e.target.files[0];
        if (!file) {
            console.log('[Profile] No file selected');
            return;
        }

        console.log('[Profile] File selected:', file.name, file.type, file.size);

        if (!file.type.startsWith('image/')) {
            ToastManager.error(i18n.t('invalidImageFile') || 'Выберите файл изображения');
            return;
        }

        // Let AvatarCropper handle the file
        AvatarCropper.handleFileSelect(e);
    });
    
    console.log('[Profile] Avatar upload initialized');
}

// Handle tab navigation
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.profile-nav-item');
    const sections = document.querySelectorAll('.profile-section');

    function setActiveTab(targetId) {
        navItems.forEach(item => {
            const active = item.getAttribute('href') === `#${targetId}`;
            item.classList.toggle('active', active);
        });

        sections.forEach(section => {
            const active = section.id === targetId;
            section.classList.toggle('active', active);
            section.classList.toggle('hidden', !active);
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            setActiveTab(targetId);

            // Update URL without reload
            const newUrl = new URL(window.location);
            newUrl.hash = targetId;
            window.history.pushState({}, '', newUrl);
        });
    });

    // Handle initial state and back/forward
    function handleLocationChange() {
        const hash = window.location.hash.substring(1) || 'personal-info';
        setActiveTab(hash);
    }

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();
}

// Функция для получения инициалов пользователя
function getInitials(name) {
    if (!name) return 'U';
    
    // Разделяем имя на части и берем первые буквы
    const nameParts = name.split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    
    // Берем первую букву первого и последнего слова
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
}

// Setup password toggles
function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.previousElementSibling;
            const icon = toggle.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'ri-eye-line';
            } else {
                input.type = 'password';
                icon.className = 'ri-eye-off-line';
            }
        });
    });
}