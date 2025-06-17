# Settings Synchronization Implementation

## Overview
Implemented a centralized settings manager to ensure theme and language preferences persist across all pages and synchronize between multiple tabs/windows.

## Problem Solved
Previously, when users changed the theme or language on one page, the changes didn't persist when navigating to other pages. Each page managed its own theme/language state independently.

## Solution Architecture

### 1. Centralized Settings Manager (`js/utils/settings-manager.js`)
- Single source of truth for all application settings
- Handles localStorage persistence
- Implements cross-tab synchronization using storage events
- Dispatches custom events when settings change

### 2. Updated Theme Manager (`js/utils/theme.js`)
- Now uses settings manager for persistence
- Removed direct localStorage access
- Added `applyTheme` method to public API

### 3. Updated i18n System (`js/i18n/i18n.js`)
- Now uses settings manager for language persistence
- Listens for language change events
- Automatically updates when language changes in another tab

### 4. Settings Initialization (`js/utils/init-settings.js`)
- Unified initialization script for all pages
- Applies saved settings on page load
- Sets up event listeners for cross-tab synchronization

## Implementation Details

### Settings Manager API
```javascript
// Get current settings
settingsManager.getTheme()      // Returns: 'light', 'dark', or 'system'
settingsManager.getLanguage()   // Returns: 'en', 'ru', or 'de'

// Set settings (automatically persists and syncs)
settingsManager.setTheme('dark')
settingsManager.setLanguage('ru')

// Get all settings
settingsManager.getAllSettings()

// Clear all settings
settingsManager.clearSettings()
```

### Cross-Tab Synchronization
When a setting is changed in one tab:
1. Setting is saved to localStorage
2. Storage event is triggered
3. Other tabs receive the storage event
4. Settings manager dispatches custom events
5. Theme/language systems update automatically

### Custom Events
- `theme-changed`: Fired when theme changes
  ```javascript
  window.addEventListener('theme-changed', (e) => {
    console.log('Theme changed to:', e.detail.theme);
  });
  ```
- `language-changed`: Fired when language changes
  ```javascript
  window.addEventListener('language-changed', (e) => {
    console.log('Language changed to:', e.detail.language);
  });
  ```

## Files Modified

### HTML Files (Updated script imports)
- `index.html`
- `test-cases.html`
- `reports.html`
- `profile.html`
- `settings.html`
- `login.html`
- `register.html`
- `forgot-password.html`
- `reset-password.html`
- `events.html`

Changed from:
```html
<script type="module" src="js/utils/theme.js"></script>
```

To:
```html
<script type="module" src="js/utils/init-settings.js"></script>
```

### JavaScript Files
1. **New Files:**
   - `js/utils/settings-manager.js` - Centralized settings management
   - `js/utils/init-settings.js` - Initialization script

2. **Modified Files:**
   - `js/utils/theme.js` - Uses settings manager, exports applyTheme
   - `js/i18n/i18n.js` - Uses settings manager, listens for events
   - `js/pages/settings.js` - Uses settings manager for theme/language dropdowns

## Testing

### Test Page
Created `test-settings-sync.html` to verify:
- Settings persistence across page reloads
- Cross-tab synchronization
- Event dispatching and handling

### How to Test
1. Open the application in multiple tabs
2. Change theme or language in one tab
3. Observe immediate updates in all other tabs
4. Refresh any tab - settings persist
5. Open new tab - inherits current settings

## Benefits
1. **Consistent User Experience** - Settings persist across all pages
2. **Real-time Synchronization** - Changes reflect immediately in all tabs
3. **Centralized Management** - Single source of truth for settings
4. **Extensible** - Easy to add new settings in the future
5. **Performance** - Minimal overhead, uses native browser APIs

## Future Enhancements
1. Add more settings (font size, compact mode, etc.)
2. Implement user preference profiles
3. Add settings export/import functionality
4. Integrate with backend API for cloud sync
5. Add settings version migration system