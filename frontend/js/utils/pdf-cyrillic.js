/**
 * PDF Cyrillic Support Utilities
 * Provides functions to handle Cyrillic text in jsPDF
 */

// Transliteration map for Cyrillic to Latin
const cyrillicToLatin = {
    'А': 'A', 'а': 'a',
    'Б': 'B', 'б': 'b',
    'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g',
    'Д': 'D', 'д': 'd',
    'Е': 'E', 'е': 'e',
    'Ё': 'E', 'ё': 'e',
    'Ж': 'Zh', 'ж': 'zh',
    'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i',
    'Й': 'Y', 'й': 'y',
    'К': 'K', 'к': 'k',
    'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm',
    'Н': 'N', 'н': 'n',
    'О': 'O', 'о': 'o',
    'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's',
    'Т': 'T', 'т': 't',
    'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f',
    'Х': 'Kh', 'х': 'kh',
    'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ch', 'ч': 'ch',
    'Ш': 'Sh', 'ш': 'sh',
    'Щ': 'Shch', 'щ': 'shch',
    'Ъ': '', 'ъ': '',
    'Ы': 'Y', 'ы': 'y',
    'Ь': '', 'ь': '',
    'Э': 'E', 'э': 'e',
    'Ю': 'Yu', 'ю': 'yu',
    'Я': 'Ya', 'я': 'ya'
};

/**
 * Transliterate Cyrillic text to Latin
 * @param {string} text - Text to transliterate
 * @returns {string} - Transliterated text
 */
export function transliterate(text) {
    if (!text) return '';
    
    return text.split('').map(char => {
        return cyrillicToLatin[char] || char;
    }).join('');
}

/**
 * Prepare text for PDF (handles Cyrillic)
 * @param {string} text - Text to prepare
 * @param {boolean} useTransliteration - Whether to transliterate Cyrillic
 * @returns {string} - Prepared text
 */
export function preparePDFText(text, useTransliteration = true) {
    if (!text) return '';
    
    // If transliteration is enabled, convert Cyrillic
    if (useTransliteration) {
        return transliterate(text);
    }
    
    // Otherwise return as-is (may cause encoding issues)
    return text;
}

/**
 * Get English translations for common Russian terms
 */
export const translations = {
    // Report terms
    'Отчет по тестированию': 'Test Report',
    'Дата создания': 'Created Date',
    'Проект': 'Project',
    'Все проекты': 'All Projects',
    
    // Section headers
    'Элементы отчета': 'Report Elements',
    'Показатели': 'Indicators',
    'Сводка метрик': 'Metrics Summary',
    
    // Testing metrics
    'Тестирование': 'Testing',
    'Всего тестов': 'Total tests',
    'Успешных': 'Passed',
    'Провалено': 'Failed',
    'Пропущено': 'Skipped',
    'Процент успеха': 'Success rate',
    
    // Time metrics
    'Время выполнения': 'Execution Time',
    'Средняя длительность': 'Average duration',
    'Минимальная длительность': 'Min duration',
    'Максимальная длительность': 'Max duration',
    'Общее время': 'Total time',
    
    // Coverage metrics
    'Покрытие': 'Coverage',
    'Покрытие кода': 'Code coverage',
    'Покрытие функций': 'Feature coverage',
    'Покрытие требований': 'Requirement coverage',
    
    // Quality metrics
    'Качество': 'Quality',
    'Количество дефектов': 'Defect count',
    'Плотность дефектов': 'Defect density',
    'Оценка качества': 'Quality score',
    
    // Chart types
    'График': 'Chart',
    'Метрики': 'Metrics',
    
    // Units
    'шт': 'pcs',
    'сек': 'sec',
    'мин': 'min',
    'деф/KLOC': 'def/KLOC'
};

/**
 * Translate Russian text to English
 * @param {string} text - Text to translate
 * @returns {string} - Translated text
 */
export function translateToEnglish(text) {
    if (!text) return '';
    
    // Check if we have a direct translation
    if (translations[text]) {
        return translations[text];
    }
    
    // Otherwise, transliterate
    return transliterate(text);
}

/**
 * Load Cyrillic font for jsPDF (alternative approach)
 * This would require adding a Cyrillic-supporting font file
 */
export async function loadCyrillicFont(pdf) {
    // This is a placeholder for loading a custom font
    // In production, you would:
    // 1. Convert a Cyrillic font (like Roboto) to Base64
    // 2. Add it to jsPDF using pdf.addFont()
    // 3. Set it as the active font
    
    // For now, we'll use the transliteration approach
    console.warn('Cyrillic font loading not implemented. Using transliteration.');
    return false;
}

export default {
    transliterate,
    preparePDFText,
    translateToEnglish,
    translations,
    loadCyrillicFont
};