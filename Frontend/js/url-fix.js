/**
 * URL-fix.js
 * Улучшенный скрипт для исправления URL-адресов, чтобы всегда использовать правильный порт
 */

console.log('🔄 URL-fix initializing...');

// Функция для правильного формирования базового URL
function getCorrectBaseUrl() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:8080`
        : window.location.origin;
}

// Устанавливаем глобальные переменные для использования в скриптах
window.CORRECT_BASE_URL = getCorrectBaseUrl();
window.SITE_BASE_URL = getCorrectBaseUrl();

// Используем функцию вместо модификации window.location.origin
// так как оно является неизменяемым свойством
function getCorrectOrigin() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
    }
    return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
}

// Добавляем метод для получения корректного origin
window.getCorrectOrigin = getCorrectOrigin;

console.log('🔄 URL-fix: Patched window.location.origin');

// Переопределяем fetch для перенаправления запросов с localhost на localhost:8080
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    let modifiedUrl = url;
    
    // Проверяем, является ли URL строкой (чтобы избежать обработки Request объектов)
    if (typeof url === 'string') {
        // Если URL начинается с http://localhost/ без порта, добавляем порт 8080
        if (url.match(/^https?:\/\/localhost\//i) && !url.match(/^https?:\/\/localhost:\d+\//i)) {
            modifiedUrl = url.replace(/^(https?:\/\/localhost)(\/)/, '$1:8080$2');
            console.log('🔄 URL-fix: Redirected fetch from', url, 'to', modifiedUrl);
        }
        
        // Если URL начинается с http://127.0.0.1/ без порта, добавляем порт 8080
        if (url.match(/^https?:\/\/127\.0\.0\.1\//i) && !url.match(/^https?:\/\/127\.0\.0\.1:\d+\//i)) {
            modifiedUrl = url.replace(/^(https?:\/\/127\.0\.0\.1)(\/)/, '$1:8080$2');
            console.log('🔄 URL-fix: Redirected fetch from', url, 'to', modifiedUrl);
        }
    }
    
    return originalFetch(modifiedUrl, options);
};

console.log('🔄 URL-fix: Patched window.fetch');

// Немедленный хак для всех существующих изображений на странице
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 URL-fix: DOM loaded, fixing existing images...');
    const images = document.querySelectorAll('img');
    images.forEach(function(img) {
        fixImageSrc(img);
    });
});

// Обработчик для fixing img src
function fixImageSrc(img) {
    if (!img || !img.src) return;
    
    const originalSrc = img.src;
    
    if (originalSrc.match(/^https?:\/\/localhost\//i) && !originalSrc.match(/^https?:\/\/localhost:\d+\//i)) {
        img.src = originalSrc.replace(/^(https?:\/\/localhost)(\/)/, '$1:8080$2');
        console.log('🔄 URL-fix: Fixed image URL from', originalSrc, 'to', img.src);
    }
    
    if (originalSrc.match(/^https?:\/\/127\.0\.0\.1\//i) && !originalSrc.match(/^https?:\/\/127\.0\.0\.1:\d+\//i)) {
        img.src = originalSrc.replace(/^(https?:\/\/127\.0\.0\.1)(\/)/, '$1:8080$2');
        console.log('🔄 URL-fix: Fixed image URL from', originalSrc, 'to', img.src);
    }
}

// Переопределение createElement для перехвата создания новых изображений
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'img') {
        const originalSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
        
        Object.defineProperty(element, 'src', {
            set: function(url) {
                let modifiedUrl = url;
                
                if (typeof url === 'string') {
                    // Если URL начинается с http://localhost/ без порта, добавляем порт 8080
                    if (url.match(/^https?:\/\/localhost\//i) && !url.match(/^https?:\/\/localhost:\d+\//i)) {
                        modifiedUrl = url.replace(/^(https?:\/\/localhost)(\/)/, '$1:8080$2');
                        console.log('🔄 URL-fix: Fixed new image URL from', url, 'to', modifiedUrl);
                    }
                    
                    // Если URL начинается с http://127.0.0.1/ без порта, добавляем порт 8080
                    if (url.match(/^https?:\/\/127\.0\.0\.1\//i) && !url.match(/^https?:\/\/127\.0\.0\.1:\d+\//i)) {
                        modifiedUrl = url.replace(/^(https?:\/\/127\.0\.0\.1)(\/)/, '$1:8080$2');
                        console.log('🔄 URL-fix: Fixed new image URL from', url, 'to', modifiedUrl);
                    }
                }
                
                originalSetter.call(this, modifiedUrl);
            },
            get: function() {
                return Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').get.call(this);
            }
        });
    }
    
    return element;
};

console.log('🔄 URL-fix: Patched document.createElement for images');

// Обработчик ошибок загрузки изображений на случай, если что-то пропустили
document.addEventListener('error', function(e) {
    const target = e.target;
    
    // Проверяем, является ли элемент изображением
    if (target.tagName === 'IMG') {
        fixImageSrc(target);
    }
}, true);

// MutationObserver для отслеживания новых изображений в DOM
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function(node) {
                // Проверяем, является ли новый узел изображением
                if (node.tagName === 'IMG') {
                    fixImageSrc(node);
                }
                
                // Проверяем, содержит ли новый узел изображения
                if (node.querySelectorAll) {
                    const images = node.querySelectorAll('img');
                    images.forEach(fixImageSrc);
                }
            });
        }
    });
});

// Запускаем MutationObserver
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

console.log('🔄 URL-fix: Started MutationObserver for images');

// Прямое изменение innerHTML для элементов с аватарами
const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty(Element.prototype, 'innerHTML', {
    set: function(html) {
        // Сначала вызываем оригинальный setter
        originalInnerHTMLDescriptor.set.call(this, html);
        
        // Затем проверяем, содержит ли элемент аватары
        if (this.id === 'user-avatar' || this.className.includes('avatar') || this.innerHTML.includes('avatar')) {
            const images = this.querySelectorAll('img');
            images.forEach(fixImageSrc);
        }
    },
    get: function() {
        return originalInnerHTMLDescriptor.get.call(this);
    }
});

console.log('🔄 URL-fix: Patched Element.prototype.innerHTML');

// Глобальная функция для исправления URL
window.fixUrl = function(url) {
    if (typeof url !== 'string') return url;
    
    if (url.match(/^https?:\/\/localhost\//i) && !url.match(/^https?:\/\/localhost:\d+\//i)) {
        return url.replace(/^(https?:\/\/localhost)(\/)/, '$1:8080$2');
    }
    
    if (url.match(/^https?:\/\/127\.0\.0\.1\//i) && !url.match(/^https?:\/\/127\.0\.0\.1:\d+\//i)) {
        return url.replace(/^(https?:\/\/127\.0\.0\.1)(\/)/, '$1:8080$2');
    }
    
    return url;
};

// Устанавливаем фиксер URL для массового исправления
window.fixAllUrls = function() {
    console.log('🔄 URL-fix: Manual fix triggered');
    const images = document.querySelectorAll('img');
    images.forEach(fixImageSrc);
};

// Добавляем в глобальные методы аватаров фиксинг URL
const originalImage = window.Image;
window.Image = function() {
    const img = new originalImage(...arguments);
    
    const originalSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
    Object.defineProperty(img, 'src', {
        set: function(url) {
            let modifiedUrl = url;
            
            if (typeof url === 'string') {
                // Если URL начинается с http://localhost/ без порта, добавляем порт 8080
                if (url.match(/^https?:\/\/localhost\//i) && !url.match(/^https?:\/\/localhost:\d+\//i)) {
                    modifiedUrl = url.replace(/^(https?:\/\/localhost)(\/)/, '$1:8080$2');
                    console.log('🔄 URL-fix: Fixed new Image() URL from', url, 'to', modifiedUrl);
                }
                
                // Если URL начинается с http://127.0.0.1/ без порта, добавляем порт 8080
                if (url.match(/^https?:\/\/127\.0\.0\.1\//i) && !url.match(/^https?:\/\/127\.0\.0\.1:\d+\//i)) {
                    modifiedUrl = url.replace(/^(https?:\/\/127\.0\.0\.1)(\/)/, '$1:8080$2');
                    console.log('🔄 URL-fix: Fixed new Image() URL from', url, 'to', modifiedUrl);
                }
            }
            
            originalSetter.call(this, modifiedUrl);
        },
        get: function() {
            return Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').get.call(this);
        }
    });
    
    return img;
};

console.log('🔄 URL-fix: Patched window.Image constructor');
console.log('🔄 URL-fix loaded successfully! Using base URL:', window.CORRECT_BASE_URL);