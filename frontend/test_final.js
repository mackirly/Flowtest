// Финальный тест режима прогона

console.log('=== ТЕСТ РЕЖИМА ПРОГОНА ===');
console.log('Нажмите на "Прогоны тестов" в левом меню');
console.log('Выберите прогон и нажмите "Продолжить прогон"');
console.log('\nИли запустите автоматически:');

// Автоматический запуск через 2 секунды
setTimeout(() => {
    console.log('\nАвтоматический запуск...');
    
    // 1. Открываем секцию прогонов
    toggleTestRunSection();
    
    setTimeout(() => {
        // 2. Выбираем первый прогон
        const selector = document.getElementById('test-run-selector');
        if (selector && selector.options.length > 1) {
            selector.selectedIndex = 1;
            loadSelectedTestRun();
            
            setTimeout(() => {
                // 3. Продолжаем прогон
                console.log('Продолжаем прогон...');
                continueTestRun();
                
                // 4. Проверяем результат через 5 секунд
                setTimeout(() => {
                    const controls = document.querySelectorAll('.test-run-status');
                    const testItems = document.querySelectorAll('.test-case-item');
                    
                    console.log('\n=== РЕЗУЛЬТАТЫ ===');
                    console.log('Тесты в дереве:', testItems.length);
                    console.log('Элементы управления:', controls.length);
                    
                    if (controls.length > 0) {
                        console.log('✓ УСПЕХ! Режим прогона активирован');
                        console.log('Теперь вы можете кликать на кнопки рядом с тестами:');
                        console.log('✓ - пройден, ✗ - провален, ⏩ - пропущен');
                        
                        // Показываем прогресс-бар
                        const progressBar = document.getElementById('test-run-progress');
                        if (progressBar) {
                            console.log('✓ Прогресс-бар отображается внизу справа');
                        }
                    } else {
                        console.log('✗ Элементы управления не найдены');
                        console.log('Убедитесь, что у вас есть тест-кейсы в папках');
                    }
                }, 5000);
            }, 1000);
        } else {
            console.error('Нет доступных прогонов');
        }
    }, 1000);
}, 2000);