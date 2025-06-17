/**
 * Date formatting utilities
 */

import i18n from '../i18n/i18n.js';

/**
 * Format a date string into a readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    // Use the current locale from i18n
    const locale = i18n.currentLanguage === 'ru' ? 'ru-RU' : 
                   i18n.currentLanguage === 'de' ? 'de-DE' : 'en-US';
    
    return date.toLocaleDateString(locale, options);
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export function formatRelativeTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return i18n.t('justNow');
    } else if (diffMin < 60) {
        const key = diffMin === 1 ? 'minutesAgo' : 'minutesAgo_plural';
        return i18n.t(key).replace('{0}', diffMin);
    } else if (diffHour < 24) {
        const key = diffHour === 1 ? 'hoursAgo' : 'hoursAgo_plural';
        return i18n.t(key).replace('{0}', diffHour);
    } else if (diffDay < 30) {
        const key = diffDay === 1 ? 'daysAgo' : 'daysAgo_plural';
        return i18n.t(key).replace('{0}', diffDay);
    } else {
        return formatDateTime(dateString);
    }
}