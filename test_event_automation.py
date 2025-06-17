#!/usr/bin/env python
"""
Тестовый скрипт для проверки автозапуска событий
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
from events.models import Event
from projects.models import Project
from core.models import CustomUser
from automation.models import AutomationProject, AutomationTest
from automation.tasks import process_due_events

def create_test_event():
    """Создать тестовое событие для автозапуска"""
    try:
        # Найти пользователя
        user = CustomUser.objects.filter(is_superuser=True).first()
        if not user:
            user = CustomUser.objects.first()
        
        if not user:
            print("❌ Пользователь не найден")
            return None
            
        print(f"✅ Используем пользователя: {user.username}")
        
        # Найти проект
        project = Project.objects.first()
        if not project:
            print("❌ Проект не найден")
            return None
            
        print(f"✅ Используем проект: {project.name}")
        
        # Проверить есть ли автоматизационный проект
        auto_project = AutomationProject.objects.filter(project=project).first()
        if not auto_project:
            print("❌ Автоматизационный проект не найден")
            return None
            
        print(f"✅ Найден автоматизационный проект: {auto_project.name}")
        print(f"   Статус синхронизации: {auto_project.sync_status}")
        
        # Проверить есть ли автотесты
        auto_tests_count = auto_project.tests.filter(is_available=True).count()
        print(f"   Доступных автотестов: {auto_tests_count}")
        
        # Создать событие на текущее время + 2 минуты
        now = timezone.now()
        event_time = now + timedelta(minutes=2)
        
        event = Event.objects.create(
            title="Тестовый автозапуск",
            description="Тестовое событие для проверки автозапуска автотестов",
            event_type="test-execution",
            priority="high",
            date=event_time.date(),
            time=event_time.time(),
            project=project,
            test_selection_type="all",  # Запустить все тесты
            created_by=user,
            recurring=False
        )
        
        print(f"✅ Создано тестовое событие:")
        print(f"   ID: {event.id}")
        print(f"   Название: {event.title}")
        print(f"   Дата: {event.date}")
        print(f"   Время: {event.time}")
        print(f"   Тип выбора тестов: {event.test_selection_type}")
        
        return event
        
    except Exception as e:
        print(f"❌ Ошибка создания события: {e}")
        return None

def check_existing_events():
    """Проверить существующие события"""
    events = Event.objects.filter(event_type='test-execution')
    print(f"\n📋 Найдено событий типа test-execution: {events.count()}")
    
    for event in events:
        print(f"  - {event.title} ({event.date} {event.time})")
        print(f"    Проект: {event.project.name if event.project else 'Не указан'}")
        print(f"    Тип выбора: {event.test_selection_type}")
        print(f"    Повторяется: {event.recurring}")

def test_process_due_events():
    """Тестировать обработку событий вручную"""
    print("\n🔄 Тестируем обработку событий...")
    result = process_due_events()
    print(f"Результат: {result}")

if __name__ == "__main__":
    print("🚀 Тестирование системы автозапуска событий")
    print("=" * 50)
    
    # Проверить существующие события
    check_existing_events()
    
    # Создать тестовое событие
    print("\n📝 Создание тестового события...")
    event = create_test_event()
    
    if event:
        print(f"\n⏰ Событие будет выполнено в {event.time}")
        print("   Ожидайте автоматического запуска или запустите вручную:")
        print("   docker-compose exec backend python manage.py shell -c \"from automation.tasks import process_due_events; print(process_due_events())\"")
        
        # Тестировать обработку
        test_process_due_events()
    
    print("\n✅ Тестирование завершено")