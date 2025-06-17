from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from events.models import Event
from datetime import date, time, timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test events for development'

    def handle(self, *args, **options):
        # Get or create a test user
        user = User.objects.first()
        if not user:
            self.stdout.write(self.style.ERROR('No users found. Please create a user first.'))
            return

        # Clear existing test events
        Event.objects.all().delete()

        # Create test events
        today = date.today()
        
        test_events = [
            {
                'title': 'Планерка команды',
                'description': 'Еженедельная планерка команды разработки',
                'event_type': 'meeting',
                'priority': 'medium',
                'date': today,
                'time': time(10, 0),
                'created_by': user
            },
            {
                'title': 'Запуск автотестов',
                'description': 'Автоматическое выполнение регрессионных тестов',
                'event_type': 'test-execution',
                'priority': 'high',
                'date': today + timedelta(days=1),
                'time': time(14, 30),
                'created_by': user
            },
            {
                'title': 'Обновление сервера',
                'description': 'Плановое обновление серверного ПО',
                'event_type': 'maintenance',
                'priority': 'high',
                'date': today + timedelta(days=2),
                'time': time(22, 0),
                'created_by': user
            },
            {
                'title': 'Демо для клиента',
                'description': 'Презентация новых функций заказчику',
                'event_type': 'meeting',
                'priority': 'high',
                'date': today + timedelta(days=3),
                'time': time(15, 0),
                'created_by': user
            },
            {
                'title': 'Дедлайн релиза',
                'description': 'Крайний срок релиза версии 2.1',
                'event_type': 'deadline',
                'priority': 'high',
                'date': today + timedelta(days=7),
                'created_by': user
            },
            {
                'title': 'Общее собрание',
                'description': 'Ежемесячное собрание всей команды',
                'event_type': 'general',
                'priority': 'medium',
                'date': today + timedelta(days=10),
                'time': time(11, 0),
                'recurring': True,
                'recurrence_interval': 1,
                'recurrence_period': 'month',
                'recurrence_end_date': today + timedelta(days=365),
                'created_by': user
            }
        ]

        created_count = 0
        for event_data in test_events:
            event = Event.objects.create(**event_data)
            created_count += 1
            self.stdout.write(f'Created event: {event.title}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} test events')
        )