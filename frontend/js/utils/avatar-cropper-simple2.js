/**
 * Simplified Avatar Cropper Utility - Version 2
 * Fixed encoding and display issues
 */

import ToastManager from './toast.js';

// Variables to hold references
let cropperInstance = null;
let cropModal = null;
let cropImage = null;
let saveCallback = null;
let fileInput = null;

/**
 * Initialize cropper elements
 */
function init() {
    console.log('Simple Avatar Cropper v2 - Initializing');
    
    // Get DOM elements
    cropModal = document.getElementById('avatar-crop-modal');
    cropImage = document.getElementById('avatar-to-crop');
    fileInput = document.getElementById('avatar-upload');
    
    console.log('DOM elements found', {
        cropModal: !!cropModal,
        cropImage: !!cropImage,
        fileInput: !!fileInput
    });

    if (!cropModal || !cropImage || !fileInput) {
        console.error('Required elements not found for avatar cropper');
        return;
    }
    
    // Set up event listeners
    fileInput.addEventListener('change', handleFileSelect);
    
    const closeButton = document.getElementById('close-avatar-crop-modal');
    const cancelButton = document.getElementById('cancel-avatar-crop-button');
    const saveButton = document.getElementById('save-avatar-crop-button');
    
    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);
    if (saveButton) saveButton.addEventListener('click', saveCroppedImage);
    
    console.log('Event listeners attached');
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
    console.log('File selection handler called', e.target.files);
    
    const file = e.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
    });
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        console.log('Invalid file type', { type: file.type });
        ToastManager.error('Пожалуйста, выберите файл изображения');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        console.log('File too large', { size: file.size });
        ToastManager.error('Изображение должно быть меньше 5MB');
        return;
    }
    
    // Clear input to allow selecting the same file again
    fileInput.value = '';
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(event) {
        console.log('File loaded successfully');
        
        if (!cropImage || !cropModal) {
            console.error('Crop elements not found after file load');
            ToastManager.error('Ошибка: элементы для кропа не найдены');
            return;
        }
        
        // Set image and show modal
        cropImage.src = event.target.result;
        cropImage.onload = function() {
            console.log('Image loaded in crop modal');
        };
        console.log('Opening modal...');
        openModal();
        
        // Initialize cropper after modal is visible
        setTimeout(() => {
            console.log('Is Cropper available?', typeof Cropper !== 'undefined');
            
            if (typeof Cropper === 'undefined') {
                console.error('Cropper not loaded');
                ToastManager.error('Ошибка: компонент кропа не загружен');
                closeModal();
                return;
            }
            
            try {
                if (cropperInstance) {
                    console.log('Destroying existing cropper instance');
                    cropperInstance.destroy();
                }
                
                console.log('Creating new Cropper instance');
                cropperInstance = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    guides: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    responsive: true,
                    autoCropArea: 0.8,
                    background: false,
                    ready: function() {
                        console.log('Cropper instance is ready!');
                    }
                });
                
                console.log('Cropper instance created successfully');
            } catch (error) {
                console.error('Failed to create Cropper', error);
                ToastManager.error('Ошибка инициализации кроппера');
                closeModal();
            }
        }, 300);
    };
    
    reader.onerror = function(error) {
        console.error('Failed to read file', error);
        ToastManager.error('Ошибка чтения файла');
    };
    
    console.log('Reading file as data URL...');
    reader.readAsDataURL(file);
}

/**
 * Open the crop modal
 */
function openModal() {
    console.log('Opening modal');
    if (cropModal) {
        cropModal.style.display = 'flex';
        cropModal.style.zIndex = '9999';
        
        console.log('Modal opened with styles:', {
            display: cropModal.style.display,
            zIndex: cropModal.style.zIndex
        });
    }
}

/**
 * Close the crop modal
 */
function closeModal() {
    console.log('Closing modal');
    if (cropModal) {
        cropModal.style.display = 'none';
    }
    
    if (cropperInstance) {
        console.log('Destroying cropper instance');
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

/**
 * Save the cropped image
 */
function saveCroppedImage() {
    console.log('Saving cropped image');
    
    if (!cropperInstance) {
        console.error('No cropper instance');
        ToastManager.error('Ошибка: кроппер не инициализирован');
        return;
    }
    
    try {
        const canvas = cropperInstance.getCroppedCanvas({
            width: 256,
            height: 256,
            minWidth: 128,
            minHeight: 128,
            maxWidth: 1024,
            maxHeight: 1024,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        if (!canvas) {
            console.error('Failed to get canvas');
            ToastManager.error('Ошибка получения обрезанного изображения');
            return;
        }
        
        canvas.toBlob(function(blob) {
            if (!blob) {
                console.error('Failed to create blob');
                ToastManager.error('Ошибка создания файла изображения');
                return;
            }
            
            const file = new File([blob], 'avatar.png', { type: 'image/png' });
            
            if (typeof saveCallback === 'function') {
                console.log('Calling save callback');
                saveCallback(file, canvas.toDataURL('image/png'));
            }
            
            closeModal();
        }, 'image/png', 0.9);
    } catch (error) {
        console.error('Failed to save image', error);
        ToastManager.error('Ошибка сохранения обрезанного изображения');
        closeModal();
    }
}

/**
 * Set the callback function for when the image is saved
 */
function setSaveCallback(callback) {
    console.log('Setting save callback');
    saveCallback = callback;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);

// Export public API
export default {
    init,
    handleFileSelect,
    openModal,
    closeModal,
    saveCroppedImage,
    setSaveCallback
};