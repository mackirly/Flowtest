#!/usr/bin/env python
"""
Создание тестовых данных для проверки истории запусков
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Настройка Django
sys.path.append('/mnt/d/Flowtest 2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowtest.settings')
django.setup()

from django.utils import timezone
from testcases.models import TestCase, TestRun
from core.models import CustomUser

def create_test_runs():
    """Создать тестовые запуски"""
    try:
        # Найти тест-кейс
        test_case = TestCase.objects.first()
        if not test_case:
            print('❌ Тест-кейс не найден')
            return
            
        print(f'✅ Тест-кейс: {test_case.title}')
        
        # Найти пользователя
        user = CustomUser.objects.first()
        
        # Удалить старые test runs для чистоты
        old_runs = TestRun.objects.filter(test_case=test_case)
        old_count = old_runs.count()
        old_runs.delete()
        print(f'🗑️ Удалено {old_count} старых запусков')
        
        # Создать несколько test runs с разными статусами
        statuses = ['passed', 'failed', 'running', 'pending', 'error']
        
        for i, status in enumerate(statuses):
            started_time = timezone.now() - timedelta(days=i+1, hours=2)
            finished_time = started_time + timedelta(minutes=30) if status not in ['running', 'pending'] else None
            duration = 30 * 60 if finished_time else None
            
            output_text = f'Результат выполнения теста {status}' if status != 'pending' else None
            error_text = f'Ошибка в тесте {status}' if status in ['failed', 'error'] else None
            
            test_run = TestRun.objects.create(
                test_case=test_case,
                status=status,
                started_at=started_time,
                finished_at=finished_time,
                duration=duration,
                output=output_text,
                error_message=error_text,
                executor=user,
                run_id=f'test_run_{i+1}'
            )
            
            print(f'✅ Создан test run #{test_run.id} со статусом {status}')
        
        # Проверить количество test runs
        total_runs = TestRun.objects.filter(test_case=test_case).count()
        print(f'\nВсего test runs для {test_case.title}: {total_runs}')
        print(f'ID тест-кейса: {test_case.id}')
        print(f'Проект: {test_case.project.name}')
        
    except Exception as e:
        print(f'❌ Ошибка: {e}')

if __name__ == "__main__":
    create_test_runs()