// Конфигурация приложения
const config = {
    // API endpoints
    API_BASE_URL: 'http://127.0.0.1:8000',
    API_PREFIX: '/api',
    
    // Authentication
    TOKEN_REFRESH_INTERVAL: 4 * 60 * 1000, // 4 minutes
    
    // Theme
    DEFAULT_THEME: 'light',
    
    // Projects
    DEFAULT_PROJECT_ID: 1,
    
    // Endpoints
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/token/',
            REFRESH: '/token/refresh/',
            VERIFY: '/token/verify/',
            CURRENT_USER: '/users/get_current_user/'
        },
        USERS: {
            BASE: '/users/',
            PROFILE: '/users/profile/',
            LANGUAGE: '/users/language/',
            THEME: '/users/theme/',
            AVATAR: '/users/profile/avatar/',
            ALL: '/users/',
            PROJECT_USERS: '/users/project/{id}/',
            ADD_TO_PROJECT: '/users/add-to-project/',
            REMOVE_FROM_PROJECT: '/users/remove-from-project/'
        },
        PROJECTS: {
            BASE: '/projects/',
            ALL: '/projects/',
            DETAILS: '/projects/{id}/',
            USERS: '/projects/{id}/users/'
        },
        FOLDERS: {
            BASE: '/folders/'
        },
        TEST_CASES: {
            BASE: '/test-cases/'
        },
        REPORTS: {
            TEMPLATES: '/report-templates/',
            ANALYTICS: '/backend/report-templates/analytics/',
            METRICS: '/backend/report-templates/analytics/metrics/',
            CHARTS: '/backend/report-templates/analytics/charts/'
        },
        AUTOMATION: {
            PROJECTS: '/automation-projects/',
            DETAILS: '/automation-projects/{id}/',
            SYNC: '/automation-projects/{id}/sync/'
        }
    },
    
    // Получение полного URL для эндпоинта
    getFullEndpoint(endpoint, params = {}) {
        // Проверяем наличие слешей между префиксом и эндпоинтом
        const formattedPrefix = this.API_PREFIX.endsWith('/') ? this.API_PREFIX : `${this.API_PREFIX}/`;
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        
        let url = `${this.API_BASE_URL}${formattedPrefix}${formattedEndpoint}`;
        
        // Заменяем параметры в формате {param} значениями
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    }
};

// Export config for ES modules
export { config };

// Also make available globally
window.config = config;
