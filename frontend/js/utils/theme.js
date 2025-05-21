/**
 * Theme management utility for FlowTest 2.0
 * Handles switching between light and dark modes
 */
const ThemeManager = (() => {
  // Theme constants
  const THEME_STORAGE_KEY = 'flowtest-theme';
  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  };
  
  // Current theme
  let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || THEMES.SYSTEM;
  
  /**
   * Initialize theme based on saved preference or system preference
   */
  const initialize = () => {
    // Apply theme on page load
    applyTheme(currentTheme);
    
    // Setup toggle button event listener
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Setup theme select dropdown if available (login page)
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      // Set current theme in select
      themeSelect.value = currentTheme;
      
      // Add event listener for theme selection
      themeSelect.addEventListener('change', (event) => {
        setTheme(event.target.value);
      });
      
      // Update the icon to match the current theme
      updateThemeIcon();
    }
    
    // Listen for system preference changes
    if (window.matchMedia) {
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Apply theme on system preference change if using system theme
      prefersDarkScheme.addEventListener('change', (event) => {
        if (currentTheme === THEMES.SYSTEM) {
          applySystemTheme(event.matches);
          updateThemeIcon();
        }
      });
    }
  };
  
  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    // If currently using system theme, switch to light/dark based on current state
    if (currentTheme === THEMES.SYSTEM) {
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDarkScheme ? THEMES.LIGHT : THEMES.DARK);
      return;
    }
    
    // Toggle between light and dark
    setTheme(currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
  };
  
  /**
   * Set theme to a specific value
   * @param {string} theme - The theme to set (light, dark, or system)
   */
  const setTheme = (theme) => {
    if (!Object.values(THEMES).includes(theme)) {
      console.error(`Invalid theme: ${theme}`);
      return;
    }
    
    currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
    updateThemeIcon();
    
    // Update select dropdown if available
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = theme;
    }
    
    // Dispatch event for other components to react to theme change
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: currentTheme } }));
  };
  
  /**
   * Apply theme to the document
   * @param {string} theme - The theme to apply
   */
  const applyTheme = (theme) => {
    if (theme === THEMES.SYSTEM) {
      // Check system preference
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applySystemTheme(prefersDarkScheme);
    } else {
      // Apply specific theme
      const isDark = theme === THEMES.DARK;
      document.documentElement.classList.toggle('dark', isDark);
      updateThemeMetaTags(isDark);
    }
  };
  
  /**
   * Apply theme based on system preference
   * @param {boolean} isDark - Whether the system prefers dark mode
   */
  const applySystemTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    updateThemeMetaTags(isDark);
  };
  
  /**
   * Update theme meta tags
   * @param {boolean} isDark - Whether to use dark mode
   */
  const updateThemeMetaTags = (isDark) => {
    // Update theme-color meta tags
    const lightThemeMeta = document.querySelector('meta.light-theme');
    const darkThemeMeta = document.querySelector('meta.dark-theme');
    
    if (lightThemeMeta && darkThemeMeta) {
      if (isDark) {
        lightThemeMeta.setAttribute('disabled', '');
        darkThemeMeta.removeAttribute('disabled');
      } else {
        darkThemeMeta.setAttribute('disabled', '');
        lightThemeMeta.removeAttribute('disabled');
      }
    }
  };
  
  /**
   * Update the theme icon to match current theme
   */
  const updateThemeIcon = () => {
    const selectedThemeIcon = document.getElementById('selected-theme-icon');
    if (!selectedThemeIcon) return;
    
    // Determine if dark mode is currently active
    const isDark = document.documentElement.classList.contains('dark');
    
    // Update icon based on theme
    if (isDark) {
      selectedThemeIcon.innerHTML = '<i class="ri-moon-line"></i>';
    } else {
      selectedThemeIcon.innerHTML = '<i class="ri-sun-line"></i>';
    }
  };
  
  /**
   * Get the current theme
   * @returns {string} The current theme
   */
  const getCurrentTheme = () => {
    return currentTheme;
  };
  
  /**
   * Check if dark mode is currently active
   * @returns {boolean} True if dark mode is active
   */
  const isDarkMode = () => {
    return document.documentElement.classList.contains('dark');
  };
  
  // Return public API
  return {
    initialize,
    toggleTheme,
    setTheme,
    getCurrentTheme,
    isDarkMode,
    THEMES
  };
})();

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', ThemeManager.initialize);

// Export for use in other modules
export default ThemeManager;