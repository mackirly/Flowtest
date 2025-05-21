/**
 * Settings page fixed navigation handling - v2.0 (Fixed)
 * This script properly handles navigation for the settings page
 * with correct section highlighting and active states management
 */

// Глобальная переменная для текущего активного раздела
let currentActiveSection = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ settings-fixed.js запускается');
    
    const navLinks = document.querySelectorAll('.settings-nav-link');
    
    // Добавляем CSS для предотвращения конфликтов стилей
    const fixedStyles = document.createElement('style');
    fixedStyles.textContent = `
        /* Отключаем все стандартные стили для active */
        .settings-nav-link.active { 
            background-color: transparent !important; 
            color: inherit !important;
        }
        
        /* Наш собственный класс для активного элемента */
        .nav-item-activated {
            background-color: #fff5f2 !important;
            color: #ff6347 !important;
        }
        
        /* Стиль для наведения на неактивный элемент */
        .settings-nav-link:not(.nav-item-activated):hover {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
        }
    `;
    document.head.appendChild(fixedStyles);
    
    // Сброс всех стилей и классов для всех ссылок навигации
    function resetAllNavLinks() {
        navLinks.forEach(link => {
            // Удаляем классы
            link.classList.remove('active', 'nav-item-activated');
            
            // Сбрасываем inline стили
            link.style.backgroundColor = '';
            link.style.color = '';
        });
    }
    
    // Функция навигации - показывает раздел и подсвечивает активную ссылку
    function handleNavigation() {
        // Получаем хеш из URL или используем 'general' по умолчанию
        const hash = window.location.hash.substring(1) || 'general';
        console.log('📍 Текущий хеш:', hash);
        
        // Запоминаем активный раздел
        currentActiveSection = hash;
        
        // Скрываем все разделы
        document.querySelectorAll('.settings-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Показываем активный раздел
        const activeSection = document.getElementById(hash);
        if (activeSection) {
            activeSection.style.display = 'block';
        } else {
            // Если раздел не найден, показываем 'general'
            const generalSection = document.getElementById('general');
            if (generalSection) {
                generalSection.style.display = 'block';
                currentActiveSection = 'general';
            }
        }
        
        // Сбрасываем все стили для всех ссылок
        resetAllNavLinks();
        
        // Находим активную ссылку и подсвечиваем её
        const activeLink = document.querySelector(`.settings-nav-link[href="#${currentActiveSection}"]`);
        if (activeLink) {
            console.log('✅ Подсвечиваем ссылку:', currentActiveSection);
            activeLink.classList.add('nav-item-activated');
        }
    }
    
    // Добавляем собственные обработчики событий для каждой ссылки
    navLinks.forEach(link => {
        // Создаём клон для удаления существующих обработчиков
        const newLink = link.cloneNode(true);
        if (link.parentNode) {
            link.parentNode.replaceChild(newLink, link);
        }
        
        // Обработчик клика
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            const hash = this.getAttribute('href')?.substring(1);
            if (hash) {
                // Перемещаемся к новому разделу
                window.location.hash = hash;
            }
        });
    });
    
    // Добавляем обработчик изменения хеша
    window.addEventListener('hashchange', handleNavigation);
    
    // Запускаем первоначальную навигацию
    handleNavigation();
    
    // Дополнительная проверка через небольшое время
    setTimeout(() => {
        handleNavigation();
        console.log('✅ Дополнительная проверка навигации');
    }, 300);
});
        
        // 2. Create a direct DOM-based navigation system
        function handleNavigation() {
            // Get current hash or default to 'general'
            const hash = window.location.hash.substring(1) || 'general';
            console.log('Current hash:', hash);
            
            // Hide all sections first
            const sections = document.querySelectorAll('.settings-section');
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show only the active section
            const activeSection = document.getElementById(hash);
            if (activeSection) {
                activeSection.style.display = 'block';
                console.log('Showing section:', hash);
            } else {
                // If section not found, default to general
                const generalSection = document.getElementById('general');
                if (generalSection) {
                    generalSection.style.display = 'block';
                    console.log('Defaulting to general section');
                }
            }
            
            // ВАЖНО: сначала сброс ВСЕХ стилей для всех ссылок
            navLinks.forEach(link => {
                // Полный сброс стилей
                link.classList.remove('active');
                link.style.backgroundColor = '';
                link.style.color = '';
                // Удаление всех атрибутов, которые могут влиять на стиль
                link.removeAttribute('data-active');
            });
            
            // Затем применяем стиль ТОЛЬКО к активной ссылке
            const activeLink = document.querySelector(`.settings-nav-link[href="#${hash}"]`);
            if (activeLink) {
                activeLink.style.backgroundColor = '#fff5f2';
                activeLink.style.color = '#ff6347';
                activeLink.setAttribute('data-active', 'true');
                console.log('Set active style for:', hash);
            } else {
                // Если активная ссылка не найдена, подсвечиваем general
                const generalLink = document.querySelector('.settings-nav-link[href="#general"]');
                if (generalLink) {
                    generalLink.style.backgroundColor = '#fff5f2';
                    generalLink.style.color = '#ff6347';
                    generalLink.setAttribute('data-active', 'true');
                    console.log('Defaulting active style to general');
                }
            }
        }
        
        // 3. Override the original click handlers
        navLinks.forEach(link => {
            // Remove existing event listeners by cloning and replacing
            const newLink = link.cloneNode(true);
            if (link.parentNode) {
                link.parentNode.replaceChild(newLink, link);
            }
            
            // Add our own click handler
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                const hash = this.getAttribute('href')?.substring(1);
                if (hash) {
                    window.location.hash = hash;
                    handleNavigation();
                }
            });
            
            // Add hover effects
            newLink.addEventListener('mouseenter', function() {
                const currentHash = window.location.hash.substring(1) || 'general';
                const linkHash = this.getAttribute('href')?.substring(1);
                
                if (linkHash !== currentHash) {
                    this.style.backgroundColor = '#f3f4f6';
                }
            });
            
            newLink.addEventListener('mouseleave', function() {
                const currentHash = window.location.hash.substring(1) || 'general';
                const linkHash = this.getAttribute('href')?.substring(1);
                
                if (linkHash !== currentHash) {
                    this.style.backgroundColor = '';
                }
            });
        });
        
        // 4. Setup the hashchange event listener
        window.addEventListener('hashchange', handleNavigation);
        
        // 5. Run initial navigation
        handleNavigation();
        
        // 6. Полностью перерабатываем интервальную функцию, которая может мешать
        // Вместо setInterval используем однократную проверку с setTimeout
        setTimeout(function() {
            // Проверяем текущий хеш
            const currentHash = window.location.hash.substring(1);
            console.log('Final check, current hash:', currentHash);
            
            if (currentHash) {
                // Если хеш не пустой, отправляем событие hashchange для повторной обработки
                console.log('Dispatching hashchange event for:', currentHash);
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            } else {
                // Если хеш пустой, но нужен раздел отличный от general
                // здесь можно указать конкретный раздел для активации
                console.log('Empty hash, default to current state');
            }
            
            // Принудительно удаляем класс active со всех ссылок
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
        }, 500); // Увеличиваем задержку для уверенности
        
    }, 50); // Small delay to ensure DOM is ready
});