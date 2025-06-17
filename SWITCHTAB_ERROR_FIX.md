# Исправление ошибки "switchTab is not a function"

## Проблема
При открытии тест-кейса возникала ошибка:
```
TypeError: this.switchTab is not a function
    at window.openTestCaseForm (test-cases.js:3107:14)
```

## Причина
Функция `window.openTestCaseForm` является глобальной функцией, а не методом класса `TestCasesPage`. При вызове `this.switchTab('details')` контекст `this` не указывает на экземпляр класса.

## Решение

1. **Исправлен вызов switchTab в openTestCaseForm**:
   ```javascript
   // Было:
   this.switchTab('details');
   
   // Стало:
   if (window.testCasesPage && window.testCasesPage.switchTab) {
       window.testCasesPage.switchTab('details');
   }
   ```

2. **Добавлено сохранение currentTestCase**:
   - При открытии тест-кейса из метода `openTestCase`
   - При открытии через `window.openTestCaseForm`
   - Очистка при создании нового тест-кейса

## Что было исправлено

1. В функции `window.openTestCaseForm` (строка ~3107):
   - Заменен вызов `this.switchTab` на `window.testCasesPage.switchTab`
   - Добавлена проверка существования объекта

2. В методе `openTestCase` (строка ~715):
   - Добавлено сохранение `this.currentTestCase = fullTestCase`
   - Это нужно для корректной работы вкладки "История запусков"

3. При создании нового тест-кейса:
   - Добавлена очистка `window.testCasesPage.currentTestCase = null`

## Проверка

1. Откройте любой тест-кейс - ошибка не должна появляться
2. Переключитесь на вкладку "История запусков" - должна загружаться история
3. Создайте новый тест-кейс - форма должна открываться без ошибок