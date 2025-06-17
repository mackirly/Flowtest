/**
 * Toast notification system for FlowTest
 * Creates temporary notifications that appear at the bottom of the screen
 */
const ToastManager = (() => {
  // Toast constants
  const CONTAINER_ID = 'toast-container';
  const DEFAULT_DURATION = 5000; // 5 seconds
  const TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  };
  
  // Toast container element
  let container = null;
  
  /**
   * Initialize the toast container
   */
  const initialize = () => {
    // Get or create container
    container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.className = 'fixed bottom-4 right-4 z-50 space-y-4';
      document.body.appendChild(container);
    }
  };
  
  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of toast (success, error, warning, info)
   * @param {number} duration - How long to show the toast (in ms)
   */
  const show = (message, type = TYPES.INFO, duration = DEFAULT_DURATION) => {
    if (!container) {
      initialize();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = getToastClasses(type);
    toast.role = 'alert';
    toast.innerHTML = createToastContent(message, type);
    
    // Добавляем явные инлайн-стили в зависимости от типа уведомления
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    switch (type) {
      case TYPES.SUCCESS:
        toast.style.backgroundColor = isDarkMode ? 'rgba(22, 101, 52, 0.3)' : '#dcfce7'; // зеленый
        toast.style.color = isDarkMode ? '#bbf7d0' : '#166534';
        toast.style.borderColor = isDarkMode ? '#166534' : '#86efac';
        break;
      case TYPES.ERROR:
        toast.style.backgroundColor = isDarkMode ? 'rgba(153, 27, 27, 0.3)' : '#fee2e2'; // красный
        toast.style.color = isDarkMode ? '#fecaca' : '#991b1b';
        toast.style.borderColor = isDarkMode ? '#991b1b' : '#fca5a5';
        break;
      case TYPES.WARNING:
        toast.style.backgroundColor = isDarkMode ? 'rgba(146, 64, 14, 0.3)' : '#fef3c7'; // желтый
        toast.style.color = isDarkMode ? '#fde68a' : '#92400e';
        toast.style.borderColor = isDarkMode ? '#92400e' : '#fcd34d';
        break;
      case TYPES.INFO:
        toast.style.backgroundColor = isDarkMode ? 'rgba(255, 69, 0, 0.2)' : '#ffece6'; // brand-orange
        toast.style.color = isDarkMode ? '#ff8c66' : '#cc3700';
        toast.style.borderColor = isDarkMode ? '#ff4500' : '#ff7f5c';
        break;
    }
    
    // Add to container
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('opacity-100');
      toast.classList.remove('opacity-0');
    }, 10);
    
    // Set timeout to remove
    const timeout = setTimeout(() => {
      removeToast(toast);
    }, duration);
    
    // Add close button functionality
    const closeButton = toast.querySelector('.toast-close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        clearTimeout(timeout);
        removeToast(toast);
      });
    }
    
    return toast;
  };
  
  /**
   * Get CSS classes for a toast based on type
   * @param {string} type - The type of toast
   * @returns {string} The CSS classes
   */
  const getToastClasses = (type) => {
    const baseClasses = 'flex items-center justify-between p-4 rounded-lg shadow-md transition-opacity duration-300 opacity-0 max-w-md';
    
    let typeClasses = '';
    switch (type) {
      case TYPES.SUCCESS:
        typeClasses = 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800/30';
        break;
      case TYPES.ERROR:
        typeClasses = 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800/30';
        break;
      case TYPES.WARNING:
        typeClasses = 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800/30';
        break;
      case TYPES.INFO:
      default:
        typeClasses = 'bg-brand-100 text-brand-700 border border-brand-200 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-800/30';
        break;
    }
    
    return `${baseClasses} ${typeClasses}`;
  };
  
  /**
   * Create the HTML content for a toast
   * @param {string} message - The message to display
   * @param {string} type - The type of toast
   * @returns {string} The HTML content
   */
  const createToastContent = (message, type) => {
    let icon = '';
    
    switch (type) {
      case TYPES.SUCCESS:
        icon = '<i class="ri-checkbox-circle-line text-xl mr-3"></i>';
        break;
      case TYPES.ERROR:
        icon = '<i class="ri-error-warning-line text-xl mr-3"></i>';
        break;
      case TYPES.WARNING:
        icon = '<i class="ri-alert-line text-xl mr-3"></i>';
        break;
      case TYPES.INFO:
      default:
        icon = '<i class="ri-information-line text-xl mr-3"></i>';
        break;
    }
    
    return `
      <div class="flex items-center">
        ${icon}
        <div>${message}</div>
      </div>
      <button class="toast-close-btn ml-4 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
        <i class="ri-close-line"></i>
      </button>
    `;
  };
  
  /**
   * Remove a toast with animation
   * @param {HTMLElement} toast - The toast element to remove
   */
  const removeToast = (toast) => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
    
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300); // Match the CSS transition duration
  };
  
  /**
   * Show a success toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the toast (in ms)
   */
  const success = (message, duration = DEFAULT_DURATION) => {
    return show(message, TYPES.SUCCESS, duration);
  };
  
  /**
   * Show an error toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the toast (in ms)
   */
  const error = (message, duration = DEFAULT_DURATION) => {
    return show(message, TYPES.ERROR, duration);
  };
  
  /**
   * Show a warning toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the toast (in ms)
   */
  const warning = (message, duration = DEFAULT_DURATION) => {
    return show(message, TYPES.WARNING, duration);
  };
  
  /**
   * Show an info toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the toast (in ms)
   */
  const info = (message, duration = DEFAULT_DURATION) => {
    return show(message, TYPES.INFO, duration);
  };
  
  // Return public API
  return {
    initialize,
    show,
    success,
    error,
    warning,
    info,
    TYPES
  };
})();

// Initialize toast system on page load
document.addEventListener('DOMContentLoaded', ToastManager.initialize);

// Export for use in other modules
export default ToastManager;
export { ToastManager };