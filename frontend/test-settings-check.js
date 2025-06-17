// Quick test script to verify settings manager functionality
import settingsManager from './js/utils/settings-manager.js';

console.log('=== Settings Manager Test ===');
console.log('Current Theme:', settingsManager.getTheme());
console.log('Current Language:', settingsManager.getLanguage());

// Test setting theme
console.log('\nTesting theme change...');
settingsManager.setTheme('dark');
console.log('Theme after change:', settingsManager.getTheme());

// Test setting language  
console.log('\nTesting language change...');
settingsManager.setLanguage('ru');
console.log('Language after change:', settingsManager.getLanguage());

// Reset to defaults
console.log('\nResetting to defaults...');
settingsManager.setTheme('light');
settingsManager.setLanguage('en');

console.log('Final Theme:', settingsManager.getTheme());
console.log('Final Language:', settingsManager.getLanguage());
console.log('=== Test Complete ===');