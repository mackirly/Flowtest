/**
 * Main application script for FlowTest
 */
const App = (() => {
  /**
   * Initialize the application
   */
  const initialize = async () => {
    // First check authentication
    try {
      const authGuardModule = await import('./auth-guard.js');
      const AuthGuard = authGuardModule.default;
      
      const isAuthenticated = await AuthGuard.initialize();
      
      // Only continue initialization if authenticated or on public page
      if (!isAuthenticated && AuthGuard.requiresAuth()) {
        console.log('[App] User not authenticated, halting initialization');
        return;
      }
    } catch (error) {
      console.error('[App] Failed to load auth guard:', error);
      // Continue with initialization on error (fallback)
    }
    
    // Initialize UI components
    initializeNavigation();
    initializeUserMenu();
    
    // Set up page-specific functionality
    setupPageSpecificFunctionality();
    
    // Set up event listeners
    setupEventListeners();
    
    // Show a welcome toast only for authenticated users
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
      // Import ToastManager dynamically when needed
      try {
        const toastModule = await import('./utils/toast.js');
        const ToastManager = toastModule.default;
        ToastManager.success('Welcome to FlowTest!');
      } catch (error) {
        console.log('[App] Welcome to FlowTest!');
      }
    }
  };
  
  /**
   * Initialize navigation functionality
   */
  const initializeNavigation = () => {
    // Mobile menu toggle
    const menuButton = document.querySelector('.md\\:hidden');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuButton && mobileMenu) {
      menuButton.addEventListener('click', () => {
        const isMenuHidden = mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden', !isMenuHidden);
      });
    }
    
    // Highlight current page in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (currentPath === href || (currentPath.includes(href) && href !== '#' && href !== '/')) {
        link.classList.add('nav-link-active');
        link.classList.remove('nav-link');
      }
    });
  };
  
  /**
   * Initialize user menu functionality
   */
  const initializeUserMenu = () => {
    const userMenuButton = document.querySelector('#user-menu button');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuButton && userDropdown) {
      userMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        userDropdown.classList.toggle('hidden');
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (event) => {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
          userDropdown.classList.add('hidden');
        }
      });
    }
  };
  
  /**
   * Set up page-specific functionality based on current page
   */
  const setupPageSpecificFunctionality = () => {
    const currentPath = window.location.pathname;
    
    // Dashboard
    if (currentPath === '/' || currentPath.includes('index.html')) {
      // Nothing specific for now
    }
    
    // Projects page
    else if (currentPath.includes('projects.html')) {
      // Will be implemented later
    }
    
    // Test cases page
    else if (currentPath.includes('test-cases.html')) {
      // Will be implemented later
    }
    
    // Login page
    else if (currentPath.includes('login.html')) {
      // Will be implemented later
    }
  };
  
  /**
   * Set up global event listeners
   */
  const setupEventListeners = () => {
    // Example: Listen for authentication events
    window.addEventListener('auth:login', (event) => {
      ToastManager.success(`Welcome back, ${event.detail.username}!`);
    });
    
    window.addEventListener('auth:logout', () => {
      ToastManager.info('You have been logged out.');
    });
    
    // Handle form submissions
    document.addEventListener('submit', (event) => {
      // Check if the form has a data-ajax attribute
      const form = event.target;
      if (form.hasAttribute('data-ajax')) {
        event.preventDefault();
        // Handle AJAX form submission (to be implemented)
      }
    });
  };
  
  /**
   * Helper function to format dates
   * @param {string|Date} date - The date to format
   * @returns {string} Formatted date string
   */
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  /**
   * Helper function to format time
   * @param {string|Date} date - The date to format
   * @returns {string} Formatted time string
   */
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Return public API
  return {
    initialize,
    formatDate,
    formatTime
  };
})();

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', App.initialize);