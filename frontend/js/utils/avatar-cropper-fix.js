/**
 * Fixed Avatar Cropper Utility
 */

import ToastManager from './toast.js';

// Debug helper
function debug(message, data = {}) {
    console.log('[Avatar Cropper]', message, data);
}

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
    debug('Initializing avatar cropper');
    console.log('Avatar cropper initialization started');
    
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
        console.error('ERROR: Required elements not found for avatar cropper');
        return;
    }
    
    // Проверим, правильно ли загружен Cropper.js
    console.log('Cropper.js loaded:', typeof Cropper !== 'undefined');
    
    // Fix modal styling
    if (cropModal.hasAttribute('style')) {
        cropModal.removeAttribute('style');
    }
    
    // Исправляем любые возможные проблемы со стилями модального окна
    const modalStyle = window.getComputedStyle(cropModal);
    console.log('Initial modal computed style:', {
        display: modalStyle.display,
        visibility: modalStyle.visibility,
        opacity: modalStyle.opacity,
        zIndex: modalStyle.zIndex
    });
    
    // Set up event listeners
    fileInput.addEventListener('change', function(e) {
        console.log('File input change event triggered');
        handleFileSelect(e);
    });
    
    const closeButton = document.getElementById('close-avatar-crop-modal');
    const cancelButton = document.getElementById('cancel-avatar-crop-button');
    const saveButton = document.getElementById('save-avatar-crop-button');
    
    console.log('Control buttons found:', {
        closeButton: !!closeButton,
        cancelButton: !!cancelButton,
        saveButton: !!saveButton
    });
    
    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);
    if (saveButton) saveButton.addEventListener('click', saveCroppedImage);
    
    cropModal.addEventListener('click', (e) => {
        if (e.target === cropModal) closeModal();
    });
    
    console.log('Event listeners attached');
    debug('Initialization completed');
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
    debug('File selected', { files: e.target.files });
    console.log('File selection handler called', { filesCount: e.target.files?.length });
    
    const file = e.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified)
    });
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        console.log('Invalid file type', { type: file.type });
        ToastManager.error('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        console.log('File too large', { size: file.size });
        ToastManager.error('Image must be smaller than 5MB');
        return;
    }
    
    // Clear input
    fileInput.value = '';
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(event) {
        console.log('File successfully loaded into reader');
        
        if (!cropImage || !cropModal) {
            console.error('ERROR: Crop elements not found after file load');
            ToastManager.error('Error: crop elements not found');
            return;
        }
        
        // Set image and show modal
        cropImage.src = event.target.result;
        console.log('Image source set, opening modal...');
        openModal();
        
        // Initialize cropper after modal is visible
        setTimeout(() => {
            console.log('Creating cropper, global Cropper available:', typeof Cropper !== 'undefined');
            
            if (typeof Cropper === 'undefined') {
                console.error('ERROR: Cropper not loaded - trying to load it again');
                
                // Try to load Cropper
                if (typeof window.Cropper === 'undefined') {
                    // Look for Cropper in other places
                    console.log('Checking all window properties for Cropper...');
                    const possibleNames = Object.getOwnPropertyNames(window).filter(name => 
                        name.toLowerCase().includes('crop') || 
                        (typeof window[name] === 'function' && window[name].toString().includes('cropper'))
                    );
                    console.log('Possible Cropper instances:', possibleNames);
                    
                    ToastManager.error('Error: Cropper not loaded');
                    closeModal();
                    return;
                }
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
                
                console.log('Cropper instance created successfully!');
            } catch (error) {
                console.error('ERROR: Failed to create Cropper', error);
                ToastManager.error('Error initializing image cropper');
                closeModal();
            }
        }, 500); // Increased timeout for reliability
    };
    
    reader.onerror = function(error) {
        console.error('ERROR: Failed to read file', error);
        ToastManager.error('Error reading image file');
    };
    
    console.log('Starting to read file as data URL...');
    reader.readAsDataURL(file);
}

/**
 * Open the crop modal
 */
function openModal() {
    debug('Opening modal');
    if (cropModal) {
        // Удаляем все классы, которые могут мешать отображению
        cropModal.classList.remove('hidden');
        
        // Убедимся, что модальное окно отображается поверх других элементов
        cropModal.style.display = 'flex';
        cropModal.style.zIndex = '9999';
        
        // Добавим важный флаг для стилей
        cropModal.style.opacity = '1';
        cropModal.style.visibility = 'visible';
        
        console.log('Modal styles after opening:', {
            display: cropModal.style.display,
            zIndex: cropModal.style.zIndex,
            opacity: cropModal.style.opacity,
            visibility: cropModal.style.visibility,
            classList: cropModal.className
        });
    }
}

/**
 * Close the crop modal
 */
function closeModal() {
    debug('Closing modal');
    if (cropModal) {
        cropModal.classList.add('hidden');
        cropModal.style.display = 'none';
    }
    
    if (cropperInstance) {
        debug('Destroying cropper instance');
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

/**
 * Save the cropped image
 */
function saveCroppedImage() {
    debug('Saving cropped image');
    
    if (!cropperInstance) {
        debug('ERROR: No cropper instance');
        ToastManager.error('Error: cropper not initialized');
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
            debug('ERROR: Failed to get canvas');
            ToastManager.error('Error getting cropped image');
            return;
        }
        
        canvas.toBlob(function(blob) {
            if (!blob) {
                debug('ERROR: Failed to create blob');
                ToastManager.error('Error creating image file');
                return;
            }
            
            const file = new File([blob], 'avatar.png', { type: 'image/png' });
            
            if (typeof saveCallback === 'function') {
                debug('Calling save callback');
                saveCallback(file, canvas.toDataURL('image/png'));
            }
            
            closeModal();
        }, 'image/png', 0.9);
    } catch (error) {
        debug('ERROR: Failed to save image', { error });
        ToastManager.error('Error saving cropped image');
        closeModal();
    }
}

/**
 * Set the callback function for when the image is saved
 */
function setSaveCallback(callback) {
    debug('Setting save callback');
    saveCallback = callback;
}

// Initialize on DOM load and make sure Cropper is available
function ensureCropperLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof Cropper !== 'undefined') {
            console.log('Cropper already loaded');
            resolve();
            return;
        }

        // Try to load Cropper.js dynamically if not available
        console.log('Attempting to load Cropper.js dynamically');
        const script = document.createElement('script');
        script.src = 'js/lib/cropper.min.js';
        script.onload = () => {
            console.log('Cropper.js loaded dynamically');
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load Cropper.js');
            reject(new Error('Failed to load Cropper.js'));
        };
        document.head.appendChild(script);
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    ensureCropperLoaded().then(() => {
        console.log('Initializing avatar cropper after ensuring Cropper is available');
        init();
    }).catch(error => {
        console.error('Could not initialize avatar cropper:', error);
    });
});

// Export public API
export default {
    init,
    handleFileSelect,
    openModal,
    closeModal,
    saveCroppedImage,
    setSaveCallback
};