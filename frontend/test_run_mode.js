// Тестовый скрипт для проверки режима прогона тестов

// Эмулируем клик на секцию прогонов
console.log('=== Тестирование режима прогона ===');
console.log('1. Открываем секцию прогонов...');
toggleTestRunSection();

// Ждем и выбираем прогон
setTimeout(() => {
    console.log('2. Выбираем первый прогон из списка...');
    const selector = document.getElementById('test-run-selector');
    if (selector && selector.options.length > 1) {
        selector.selectedIndex = 1;
        loadSelectedTestRun();
        
        // Продолжаем прогон
        setTimeout(() => {
            console.log('3. Нажимаем "Продолжить прогон"...');
            continueTestRun();
            
            // Проверяем результаты через 2 секунды
            setTimeout(() => {
                console.log('4. Проверяем результаты:');
                
                // Проверяем, что режим прогона активен
                console.log('- Текущий прогон:', window.testCasesPage?.currentTestRun);
                
                // Проверяем элементы управления
                const testRunControls = document.querySelectorAll('.test-run-status');
                console.log('- Элементы управления прогоном:', testRunControls.length);
                
                // Проверяем тест-кейсы в дереве
                const testItems = document.querySelectorAll('.test-case-item');
                console.log('- Тест-кейсы в дереве:', testItems.length);
                
                // Проверяем статистику папок
                const folderStats = document.querySelectorAll('.folder-test-run-stats');
                console.log('- Статистика папок:', folderStats.length);
                
                // Проверяем прогресс-бар
                const progressBar = document.getElementById('test-run-progress');
                console.log('- Прогресс-бар:', progressBar ? 'Отображается' : 'Не найден');
                
                // Тестируем установку статуса
                if (testItems.length > 0) {
                    console.log('5. Тестируем установку статусов...');
                    const firstTestId = testItems[0].dataset.testCaseId;
                    if (firstTestId) {
                        console.log('- Устанавливаем статус "Пройден" для первого теста');
                        setTestStatus(firstTestId, 'passed');
                        
                        setTimeout(() => {
                            const secondTestId = testItems[1]?.dataset.testCaseId;
                            if (secondTestId) {
                                console.log('- Устанавливаем статус "Провален" для второго теста');
                                setTestStatus(secondTestId, 'failed');
                            }
                            
                            const thirdTestId = testItems[2]?.dataset.testCaseId;
                            if (thirdTestId) {
                                console.log('- Устанавливаем статус "Пропущен" для третьего теста');
                                setTestStatus(thirdTestId, 'skipped');
                            }
                            
                            console.log('=== Тестирование завершено ===');
                        }, 1000);
                    }
                }
            }, 2000);
        }, 1000);
    } else {
        console.error('Нет доступных прогонов в списке');
    }
}, 500);