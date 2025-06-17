// Initialize settings manager before page loads
import settingsManager from './settings-manager.js';
import ThemeManager from './theme.js';

// Apply theme immediately to prevent flash
const theme = settingsManager.getTheme();
ThemeManager.applyTheme(theme);

// Export for use in other modules
export { settingsManager, ThemeManager };