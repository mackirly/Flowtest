/**
 * Initialize Cropper and handle DOM events
 * This script is loaded as a module after Cropper.js is available globally
 */

import AvatarCropper from './avatar-cropper.js';
import ToastManager from './toast.js';

// Ensure Cropper is available
if (typeof window.Cropper === 'undefined') {
    console.error('Cropper.js not found! Make sure it is loaded before this script.');
    ToastManager.error('Ошибка загрузки компонента для обрезки изображений.');
} else {
    console.log('Cropper.js detected, initializing avatar cropper...');
    
    // Get avatar upload element
    const avatarUpload = document.getElementById('avatar-upload');
    
    if (avatarUpload) {
        console.log('Avatar upload element found. Setting up event listener...');
        
        // Direct event listener on the file input
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file
            if (!file.type.startsWith('image/')) {
                ToastManager.error('Пожалуйста, выберите изображение');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                ToastManager.error('Размер изображения не должен превышать 5 МБ');
                return;
            }
            
            // Use the avatar cropper directly
            AvatarCropper.handleFileSelect(e);
        });
    } else {
        console.error('Avatar upload element not found in the DOM');
    }
    
    // Initialize modal elements
    const cropModal = document.getElementById('avatar-crop-modal');
    const closeBtn = document.getElementById('close-avatar-crop-modal');
    const cancelBtn = document.getElementById('cancel-avatar-crop-button');
    const saveBtn = document.getElementById('save-avatar-crop-button');
    
    if (cropModal && closeBtn && cancelBtn && saveBtn) {
        // Close modal on close button click
        closeBtn.addEventListener('click', () => {
            AvatarCropper.closeModal();
        });
        
        // Close modal on cancel button click
        cancelBtn.addEventListener('click', () => {
            AvatarCropper.closeModal();
        });
        
        // Save cropped image on save button click
        saveBtn.addEventListener('click', () => {
            AvatarCropper.saveCroppedImage();
        });
        
        // Close modal on outside click
        cropModal.addEventListener('click', (e) => {
            if (e.target === cropModal) {
                AvatarCropper.closeModal();
            }
        });
    } else {
        console.error('Avatar crop modal elements not found in the DOM');
    }
}

export default {};