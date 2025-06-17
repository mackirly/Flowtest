// Диагностический скрипт для отладки режима прогона

console.log('=== ДИАГНОСТИКА РЕЖИМА ПРОГОНА ===');

// 1. Проверяем наличие тестов в дереве
console.log('\n1. Проверка элементов дерева:');
const folders = document.querySelectorAll('.folder-item');
console.log('- Папки в дереве:', folders.length);

const testItems = document.querySelectorAll('.test-case-item');
console.log('- Тест-кейсы в дереве:', testItems.length);

if (testItems.length > 0) {
    console.log('- Первый тест:', {
        text: testItems[0].textContent.trim(),
        id: testItems[0].dataset.testCaseId,
        classes: testItems[0].className
    });
}

// 2. Проверяем состояние страницы
console.log('\n2. Состояние страницы:');
console.log('- testCasesPage существует:', !!window.testCasesPage);
console.log('- Текущий проект:', window.testCasesPage?.currentProject);
console.log('- Текущий прогон:', window.testCasesPage?.currentTestRun);
console.log('- Раскрытые папки:', window.testCasesPage?.expandedFolders);

// 3. Проверяем наличие функций
console.log('\n3. Проверка функций:');
console.log('- addTestRunCheckboxesToTree:', typeof addTestRunCheckboxesToTree);
console.log('- checkAndAddTestRunControls:', typeof window.checkAndAddTestRunControls);
console.log('- setTestStatus:', typeof setTestStatus);

// 4. Пробуем вручную добавить элементы управления
console.log('\n4. Попытка вручную добавить элементы управления...');
if (testItems.length > 0 && typeof addTestRunCheckboxesToTree === 'function') {
    // Устанавливаем режим прогона
    if (window.testCasesPage) {
        window.testCasesPage.currentTestRun = {
            id: 'test-1',
            name: 'Тестовый прогон'
        };
    }
    
    // Вызываем функцию
    addTestRunCheckboxesToTree();
    
    // Проверяем результат
    setTimeout(() => {
        const controls = document.querySelectorAll('.test-run-status');
        console.log('- Элементы управления добавлены:', controls.length);
        
        if (controls.length === 0) {
            console.error('ОШИБКА: Элементы управления не были добавлены!');
            
            // Проверяем структуру первого тест-кейса
            if (testItems[0]) {
                console.log('Структура первого тест-кейса:');
                console.log(testItems[0].innerHTML);
            }
        } else {
            console.log('УСПЕХ: Элементы управления добавлены к', controls.length, 'тестам');
        }
    }, 500);
} else {
    console.error('Не могу запустить тест - нет тестов в дереве или функция не найдена');
}

// 5. Проверяем видимость основных контейнеров
console.log('\n5. Видимость контейнеров:');
const testCasesList = document.getElementById('test-cases-list');
console.log('- test-cases-list:', testCasesList ? (!testCasesList.classList.contains('hidden') ? 'видим' : 'скрыт') : 'не найден');

const folderFormView = document.getElementById('folder-form-view');
console.log('- folder-form-view:', folderFormView ? (!folderFormView.classList.contains('hidden') ? 'видим' : 'скрыт') : 'не найден');

const emptyState = document.getElementById('empty-state');
console.log('- empty-state:', emptyState ? (!emptyState.classList.contains('hidden') ? 'видим' : 'скрыт') : 'не найден');

console.log('\n=== КОНЕЦ ДИАГНОСТИКИ ===');