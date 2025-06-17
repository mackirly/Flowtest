# Исправление ошибки 403 Forbidden для TestRun API

## Проблема
После исправления 404 ошибки возникла новая ошибка:
```
test-cases.js:1930 GET http://localhost/api/testcases/runs/34/ 403 (Forbidden)
```

## Причина
Класс разрешений `IsProjectMember` имел только метод `has_object_permission`, но не имел `has_permission`. 

Django REST Framework сначала проверяет `has_permission` для доступа к списку/представлению, и только потом `has_object_permission` для конкретного объекта. Без `has_permission` доступ блокировался на уровне представления.

## Решение
Добавлен метод `has_permission` в класс `IsProjectMember`:

```python
def has_permission(self, request, view):
    # For list views without project_id, allow authenticated users
    # Object-level permissions will be checked later
    return request.user and request.user.is_authenticated
```

Также улучшен `has_object_permission` для поддержки TestRun объектов:

```python
elif hasattr(obj, 'test_case') and hasattr(obj.test_case, 'project'):
    # For TestRun objects
    project = obj.test_case.project
```

## Проверка исправления
Создан тестовый скрипт `test_api_permission.py`, который подтвердил:
- Авторизация работает корректно
- Получение конкретного TestRun по ID успешно (статус 200)
- Возвращаются корректные данные о тест запуске

## Итоговое состояние
Теперь при запуске теста и мониторинге его выполнения:
1. ✅ Используется правильный токен авторизации (`flowtest_access_token`)
2. ✅ TestRunViewSet корректно обрабатывает запросы без project_id
3. ✅ Разрешения правильно проверяются для аутентифицированных пользователей
4. ✅ API возвращает статус тест запуска без ошибок

## Урок на будущее
При работе с Django REST Framework permissions:
- Всегда реализуйте оба метода: `has_permission` и `has_object_permission`
- `has_permission` проверяется первым для доступа к представлению
- `has_object_permission` проверяется для конкретных объектов
- Тестируйте API после изменений разрешений