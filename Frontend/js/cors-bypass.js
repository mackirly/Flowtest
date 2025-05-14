/**
 * Специальный модуль для обхода CORS-ограничений
 * Использует прокси-сервер вместо прямых запросов к API
 */

// Глобальный метод для создания проксированного запроса
window.bypassCORS = async function(url, options = {}) {
    console.log('🔄 CORS-bypass: Creating proxied request for:', url);
    
    // Метод для прямого запроса без прокси, с использованием XHR
    const directRequest = function(url, options) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url, true);
            
            // Устанавливаем заголовки
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    // Игнорируем заголовки, которые вызывают ошибки в XHR
                    if (!['Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'].includes(key)) {
                        xhr.setRequestHeader(key, options.headers[key]);
                    }
                });
            }
            
            // Заголовок X-Requested-With помогает серверу идентифицировать Ajax-запросы
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            
            // Обработчики событий
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = {
                            status: xhr.status,
                            statusText: xhr.statusText,
                            ok: true,
                            data: xhr.responseText,
                            json: function() {
                                return Promise.resolve(JSON.parse(xhr.responseText));
                            },
                            text: function() {
                                return Promise.resolve(xhr.responseText);
                            }
                        };
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                } else {
                    reject(new Error('Request failed with status: ' + xhr.status));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network error'));
            };
            
            // Отправляем запрос с данными или без них
            if (options.body) {
                xhr.send(options.body);
            } else {
                xhr.send();
            }
        });
    };
    
    try {
        // Сначала пробуем прямой запрос
        console.log('🔄 CORS-bypass: Attempting direct request first');
        return await directRequest(url, options);
    } catch (error) {
        console.warn('🔄 CORS-bypass: Direct request failed, error:', error.message);
        
        // Затем пробуем через проксирующую функцию
        try {
            // В режиме разработки просто используем разные порты
            // Заменяем порт 8000 на 8080 и добавляем /cors-proxy/ 
            let proxyUrl = url;
            if (url.includes(':8000')) {
                proxyUrl = url.replace(':8000', ':8080/cors-proxy');
                console.log('🔄 CORS-bypass: Using development proxy URL:', proxyUrl);
            }
            
            // Делаем запрос через прокси
            return await directRequest(proxyUrl, options);
        } catch (proxyError) {
            console.error('🔄 CORS-bypass: Both direct and proxy requests failed:', proxyError.message);
            throw proxyError;
        }
    }
};