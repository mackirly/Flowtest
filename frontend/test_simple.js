// Простой тест для проверки режима прогона

console.log('=== БЫСТРЫЙ ТЕСТ РЕЖИМА ПРОГОНА ===');

// 1. Устанавливаем режим прогона
if (window.testCasesPage) {
    window.testCasesPage.currentTestRun = {
        id: 'test-1',
        name: 'Тестовый прогон'
    };
    console.log('✓ Режим прогона установлен');
}

// 2. Раскрываем первую папку
const firstFolder = document.querySelector('.folder-toggle');
if (firstFolder && !firstFolder.querySelector('i').classList.contains('rotate-90')) {
    console.log('Раскрываем первую папку...');
    firstFolder.click();
}

// 3. Ждем и добавляем элементы управления
setTimeout(() => {
    console.log('\nПроверяем тесты в дереве...');
    const testItems = document.querySelectorAll('.test-case-item');
    console.log('Найдено тестов:', testItems.length);
    
    if (testItems.length > 0) {
        console.log('Добавляем элементы управления...');
        addTestRunCheckboxesToTree();
        
        // Проверяем результат
        setTimeout(() => {
            const controls = document.querySelectorAll('.test-run-status');
            if (controls.length > 0) {
                console.log('✓ УСПЕХ! Элементы управления добавлены к', controls.length, 'тестам');
                console.log('\nТеперь можете кликать на кнопки ✓ ✗ ⏩ рядом с тестами');
            } else {
                console.log('✗ ОШИБКА: Элементы управления не добавлены');
            }
        }, 500);
    } else {
        console.log('✗ Нет тестов в дереве. Создайте тест-кейсы в папке.');
    }
}, 1000);