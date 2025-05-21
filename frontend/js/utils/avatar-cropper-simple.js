/**
 * Simplified Avatar Cropper Utility
 */

import ToastManager from './toast.js';

// Debug helper
function debug(message, data = {}) {
    console.log('[Avatar Cropper]', message, data);
    const event = new CustomEvent('avatar-debug', { 
        detail: { message, data, timestamp: new Date().toISOString() }
    });
    document.dispatchEvent(event);
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
    
    // Get DOM elements
    cropModal = document.getElementById('avatar-crop-modal');
    cropImage = document.getElementById('avatar-to-crop');
    fileInput = document.getElementById('avatar-upload');
    
    debug('DOM elements found', {
        cropModal: !!cropModal,
        cropImage: !!cropImage,
        fileInput: !!fileInput
    });

    if (!cropModal || !cropImage || !fileInput) {
        debug('ERROR: Required elements not found');
        return;
    }
    
    // Set up event listeners
    fileInput.addEventListener('change', handleFileSelect);
    
    document.getElementById('close-avatar-crop-modal')?.addEventListener('click', closeModal);
    document.getElementById('cancel-avatar-crop-button')?.addEventListener('click', closeModal);
    document.getElementById('save-avatar-crop-button')?.addEventListener('click', saveCroppedImage);
    
    cropModal.addEventListener('click', (e) => {
        if (e.target === cropModal) closeModal();
    });
    
    debug('Event listeners attached');
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
    debug('File selected', { files: e.target.files });
    
    const file = e.target.files[0];
    if (!file) {
        debug('No file selected');
        return;
    }
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        debug('Invalid file type', { type: file.type });
        ToastManager.error('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        debug('File too large', { size: file.size });
        ToastManager.error('Image must be smaller than 5MB');
        return;
    }
    
    // Clear input
    fileInput.value = '';
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(event) {
        debug('File loaded', { dataUrl: event.target.result.substring(0, 100) + '...' });
        
        if (!cropImage || !cropModal) {
            debug('ERROR: Crop elements not found');
            ToastManager.error('Error: crop elements not found');
            return;
        }
        
        // Set image and show modal
        cropImage.src = event.target.result;
        openModal();
        
        // Initialize cropper after modal is visible
        setTimeout(() => {
            debug('Checking for Cropper');
            if (typeof Cropper === 'undefined') {
                debug('ERROR: Cropper not loaded');
                ToastManager.error('Error: Cropper not loaded');
                closeModal();
                return;
            }
            
            try {
                if (cropperInstance) {
                    debug('Destroying existing cropper');
                    cropperInstance.destroy();
                }
                
                debug('Creating new Cropper instance');
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
                        debug('Cropper ready');
                        cropModal.classList.add('active');
                    }
                });
            } catch (error) {
                debug('ERROR: Failed to create Cropper', { error });
                ToastManager.error('Error initializing image cropper');
                closeModal();
            }
        }, 100);
    };
    
    reader.onerror = function(error) {
        debug('ERROR: Failed to read file', { error });
        ToastManager.error('Error reading image file');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Open the crop modal
 */
function openModal() {
    debug('Opening modal');
    if (cropModal) {
        cropModal.classList.remove('hidden');
        cropModal.classList.add('active');
        debug('Modal classes after opening', { className: cropModal.className });
    }
}

/**
 * Close the crop modal
 */
function closeModal() {
    debug('Closing modal');
    if (cropModal) {
        cropModal.classList.add('hidden');
        cropModal.classList.remove('active');
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