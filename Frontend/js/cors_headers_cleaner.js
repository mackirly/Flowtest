/**
 * CORS Headers Cleaner для FlowTest
 *
 * Эта библиотека обеспечивает удаление дублирующихся CORS заголовков
 * из ответов сервера и корректную работу CORS для SPA приложений.
 *
 * Основная проблема: Заголовок Access-Control-Allow-Origin содержит несколько значений,
 * что запрещено спецификацией CORS и приводит к ошибкам в браузере.
 */

(function() {
    // Сохраняем оригинальные методы XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const originalGetAllResponseHeaders = XMLHttpRequest.prototype.getAllResponseHeaders;
    const originalGetResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
    
    // Переопределяем метод getAllResponseHeaders, чтобы удалить дублирующиеся CORS заголовки
    XMLHttpRequest.prototype.getAllResponseHeaders = function() {
        const headers = originalGetAllResponseHeaders.apply(this);
        
        if (!headers) {
            return headers;
        }
        
        // Парсим заголовки
        const headerLines = headers.split('\r\n');
        const uniqueHeaders = {};
        
        // Обрабатываем каждый заголовок, сохраняя только первое вхождение CORS заголовков
        for (const line of headerLines) {
            if (!line) continue;
            
            const parts = line.split(': ');
            const name = parts[0].toLowerCase();
            const value = parts.slice(1).join(': ');
            
            // Для CORS заголовков берем только первое вхождение, для остальных сохраняем все
            if (!name.startsWith('access-control-') || !uniqueHeaders[name]) {
                uniqueHeaders[name] = value;
            }
        }
        
        // Собираем обратно заголовки
        return Object.entries(uniqueHeaders)
            .map(([name, value]) => `${name}: ${value}`)
            .join('\r\n') + '\r\n';
    };
    
    // Переопределяем метод getResponseHeader, чтобы корректно обрабатывать дублирующиеся CORS заголовки
    XMLHttpRequest.prototype.getResponseHeader = function(name) {
        const lowerName = name.toLowerCase();
        
        // Для CORS заголовков применяем особую логику
        if (lowerName.startsWith('access-control-')) {
            const headers = originalGetAllResponseHeaders.apply(this);
            
            if (!headers) {
                return null;
            }
            
            // Парсим заголовки и ищем первое вхождение нужного заголовка
            const headerLines = headers.split('\r\n');
            
            for (const line of headerLines) {
                if (!line) continue;
                
                const parts = line.split(': ');
                const headerName = parts[0].toLowerCase();
                
                if (headerName === lowerName) {
                    return parts.slice(1).join(': ');
                }
            }
            
            return null;
        }
        
        // Для остальных заголовков используем стандартное поведение
        return originalGetResponseHeader.apply(this, arguments);
    };
    
    // Переопределяем fetch, чтобы очищать CORS заголовки
    const originalFetch = window.fetch;
    
    window.fetch = function() {
        return originalFetch.apply(this, arguments)
            .then(function(response) {
                // Создаем новый Response с очищенными CORS заголовками
                const cleanedHeaders = new Headers();
                const corsHeaders = {};
                
                // Копируем все заголовки, запоминая только первое вхождение CORS заголовков
                response.headers.forEach(function(value, name) {
                    const lowerName = name.toLowerCase();
                    
                    if (lowerName.startsWith('access-control-')) {
                        if (!corsHeaders[lowerName]) {
                            corsHeaders[lowerName] = value;
                            cleanedHeaders.append(name, value);
                        }
                    } else {
                        cleanedHeaders.append(name, value);
                    }
                });
                
                // Создаем новый Response с очищенными заголовками
                const init = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: cleanedHeaders
                };
                
                // Клонируем тело ответа
                const responseClone = response.clone();
                
                // Создаем новый Response из клонированного тела и очищенных заголовков
                return responseClone.blob().then(function(blob) {
                    return new Response(blob, init);
                });
            });
    };
    
    console.log('[CORS Headers Cleaner] Успешно установлен');
})();