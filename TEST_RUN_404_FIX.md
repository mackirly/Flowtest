# Исправление ошибки 404 при получении статуса тест запуска

## Проблема
После исправления токена авторизации возникла новая ошибка:
```
test-cases.js:1930 GET http://localhost/api/testcases/runs/33/ 404 (Not Found)
```

## Причина
В методе `get_queryset` класса `TestRunViewSet` (backend/testcases/views.py) был обязательный фильтр по `project_id`, который брался из `self.kwargs.get('project_id')`. 

Но URL `/api/testcases/runs/{id}/` не содержит `project_id` в пути, поэтому фильтр всегда возвращал пустой queryset, что приводило к 404 ошибке.

## Решение
Обновлен метод `get_queryset` в `TestRunViewSet`:

```python
def get_queryset(self):
    """
    Filter test runs based on project.
    """
    user = self.request.user
    project_id = self.kwargs.get('project_id')
    
    if project_id:
        return TestRun.objects.filter(
            test_case__project_id=project_id,
            test_case__project__members=user
        )
    else:
        # If no project_id, return all test runs user has access to
        return TestRun.objects.filter(
            test_case__project__members=user
        )
```

Теперь если `project_id` отсутствует в kwargs, метод возвращает все тест запуски, к которым у пользователя есть доступ через членство в проекте.

## Дополнительные изменения
1. Добавлен параметр `projectId` в вызов `monitorTestExecution` для возможности будущих улучшений
2. Обновлена сигнатура метода `monitorTestExecution` для приема `projectId`

## Как проверить исправление
1. Откройте страницу тест-кейсов
2. Выберите проект
3. Найдите автоматизированный тест
4. Нажмите кнопку "Run Test"
5. Должен появиться прогресс-бар
6. В консоли браузера не должно быть ошибок 404
7. Статус теста должен обновляться каждые 2 секунды

## Архитектурная заметка
Существует два подхода к URL для тест запусков:
1. `/api/testcases/runs/{id}/` - глобальный доступ с фильтрацией по правам
2. `/api/projects/{project_id}/test-cases/{test_case_id}/test_runs/{id}/` - явная иерархия

В данном случае используется первый подход, так как он проще и test_run_id уникален глобально.