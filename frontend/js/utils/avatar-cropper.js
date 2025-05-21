/**
 * Avatar Cropper Utility
 * Provides functions for avatar image processing and cropping
 */

import ToastManager from './toast.js';

/**
 * Avatar Cropper class for handling avatars
 * This is a singleton class that will be initialized once
 */
class AvatarCropper {
    constructor() {
        this.cropper = null;
        this.cropModal = document.getElementById('avatar-crop-modal');
        this.avatarImg = document.getElementById('avatar-to-crop');
        
        // We don't need to store these references since the event listeners
        // will be added in init-cropper.js
        
        this.onSave = null; // Callback function to execute after cropping
    }
    
    /**
     * Handle file selection
     * @param {Event} e - File input change event 
     */
    handleFileSelect(e) {
        // This method is called from init-cropper.js
        const file = e.target.files[0];
        if (!file) return;
        
        // File validation is now done in init-cropper.js
        
        // Read the file as data URL
        const reader = new FileReader();
        reader.onload = (event) => {
            // Make sure DOM elements exist
            if (!this.cropModal || !this.avatarImg) {
                console.error('Modal elements not found');
                ToastManager.error('Ошибка: не найдены элементы для кропа изображения');
                return;
            }
            
            // Set image source
            this.avatarImg.src = event.target.result;
            this.openModal();
            
            // Initialize cropper after image is loaded
            this.avatarImg.onload = () => {
                // Destroy previous cropper instance if exists
                if (this.cropper) {
                    this.cropper.destroy();
                    this.cropper = null;
                }
                
                // Check for global Cropper object
                if (typeof window.Cropper === 'undefined') {
                    console.error('Cropper.js is not loaded globally');
                    ToastManager.error('Ошибка: компонент кропа изображения не загружен');
                    this.closeModal();
                    return;
                }
                
                try {
                    // Create new Cropper instance
                    this.cropper = new window.Cropper(this.avatarImg, {
                        aspectRatio: 1, // Square avatar
                        viewMode: 1, // Restrict the minimum canvas size to fit within the container
                        dragMode: 'move', // Allow moving the image
                        guides: true, // Show the dashed lines for guiding
                        highlight: true, // Show the white modal to highlight the crop area
                        cropBoxMovable: true, // Enable cropper box moving
                        cropBoxResizable: true, // Enable cropper box resizing
                        responsive: true,
                        autoCropArea: 0.8, // Define default size of crop area
                        background: false, // Don't show the grid background
                        minContainerWidth: 250,
                        minContainerHeight: 250
                    });
                    
                    console.log('Cropper initialized successfully');
                } catch (error) {
                    console.error('Error initializing Cropper:', error);
                    ToastManager.error('Ошибка при создании кроппера изображения');
                    this.closeModal();
                }
            };
        };
        
        reader.readAsDataURL(file);
        
        // Reset file input to allow selecting the same file again
        const fileInput = document.getElementById('avatar-upload');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    /**
     * Open the crop modal
     */
    openModal() {
        this.cropModal.classList.remove('hidden');
        this.cropModal.classList.add('flex');
    }
    
    /**
     * Close the crop modal
     */
    closeModal() {
        this.cropModal.classList.add('hidden');
        this.cropModal.classList.remove('flex');
        
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
    }
    
    /**
     * Save the cropped image
     */
    saveCroppedImage() {
        if (!this.cropper) {
            ToastManager.error('Кроппер не инициализирован');
            return;
        }
        
        try {
            // Get the cropped canvas
            const canvas = this.cropper.getCroppedCanvas({
                width: 256, // Output image width
                height: 256, // Output image height
                minWidth: 128,
                minHeight: 128,
                maxWidth: 1024,
                maxHeight: 1024,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            if (!canvas) {
                ToastManager.error('Не удалось обработать изображение');
                return;
            }
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    ToastManager.error('Не удалось сохранить изображение');
                    return;
                }
                
                // Create a new File object from the blob
                const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
                
                // Call the callback function if set
                if (typeof this.onSave === 'function') {
                    this.onSave(croppedFile, canvas.toDataURL('image/png'));
                }
                
                // Close the modal
                this.closeModal();
            }, 'image/png', 0.9); // 0.9 quality (90%)
        } catch (error) {
            console.error('Error saving cropped image:', error);
            ToastManager.error('Произошла ошибка при сохранении изображения');
            this.closeModal();
        }
    }
    
    /**
     * Set the callback function to execute after cropping
     * @param {Function} callback - Function to call with the cropped image file and data URL
     */
    setOnSave(callback) {
        this.onSave = callback;
    }
}

export default new AvatarCropper();