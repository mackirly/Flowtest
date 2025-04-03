from django.db import models
from rest_framework.views import APIView
from django.contrib.auth.models import AbstractUser
# Import Django's Permission as DjangoPermission to avoid naming conflict
from django.contrib.auth.models import Permission as DjangoPermission
from django.conf import settings
from django.utils import timezone
from urllib.parse import urlparse
from django.core.exceptions import ValidationError
from asgiref.sync import sync_to_async
from django.db.models.signals import post_save
from django.dispatch import receiver
import threading
from playwright.sync_api import sync_playwright
import logging
import os
from .validators import validate_avatar_size, validate_avatar_extension, avatar_upload_path

logger = logging.getLogger(__name__)

# Create your models here.
class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=[('active', 'Active'), ('archived', 'Archived')], blank=True, null=True, default='active')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='projects', blank=True)

    def __str__(self):
        return self.name

class Folder(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    project = models.ForeignKey(Project, related_name='folders', on_delete=models.CASCADE)
    parent_folder = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subfolders'
    )
    status = models.CharField(max_length=50, default='active', blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='authored_folders')

    def __str__(self):
        return self.name


class TestCase(models.Model):
    folder = models.ForeignKey(Folder, related_name='test_cases', on_delete=models.SET_NULL, null=True, blank=True)
    project = models.ForeignKey(Project, related_name='test_cases', on_delete=models.CASCADE)
    title = models.CharField(max_length=255, default="Unnamed Test Case")
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    condition = models.TextField(blank=True, null=True)
    steps = models.TextField(blank=True, null=True)
    expected_results = models.TextField(blank=True, null=True)
    priority = models.CharField(
        max_length=50,
        choices=[
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low')
        ],
        default='medium'
    )
    platform = models.CharField(max_length=50, default="Any")
    test_type = models.CharField(max_length=50, choices=[('manual', 'Manual'), ('automated', 'Automated')], default='manual')
    test_code = models.TextField(blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='authored_tests')
    # Поля для автоматизированных тестов
    script_path = models.CharField(max_length=255, blank=True, null=True)
    class_name = models.CharField(max_length=255, blank=True, null=True)
    method_name = models.CharField(max_length=255, blank=True, null=True)
    framework = models.CharField(
        max_length=50,
        choices=[
            ('pytest', 'PyTest'),
            ('unittest', 'UnitTest'),
            ('robot', 'Robot Framework'),
            ('cypress', 'Cypress'),
            ('selenium', 'Selenium'),
            ('playwright', 'Playwright'),
            ('other', 'Other')
        ],
        default='pytest',
        blank=True,
        null=True
    )
    automation_project = models.ForeignKey('AutomationProject', on_delete=models.SET_NULL, null=True, blank=True, related_name='test_cases')
    tags = models.JSONField(blank=True, null=True, default=list)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['title']

class TestRun(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, null=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
        ('error', 'Error'),
        ('skipped', 'Skipped')
    ])
    started_at = models.DateTimeField(null=True)
    finished_at = models.DateTimeField(null=True)
    execution_time = models.FloatField(null=True)  # в секундах
    error_message = models.TextField(null=True, blank=True)
    output = models.TextField(null=True, blank=True)
    executor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.test_case} - {self.status}"

    def save(self, *args, **kwargs):
        if self.started_at and self.finished_at and not self.execution_time:
            self.execution_time = (self.finished_at - self.started_at).total_seconds()
        super().save(*args, **kwargs)

class Permission(models.Model):
    """
    Модель для хранения прав доступа
    """
    CATEGORY_CHOICES = [
        ('user_management', 'Управление пользователями'),
        ('project_management', 'Управление проектами'),
        ('test_management', 'Управление тестами'),
        ('report_management', 'Управление отчетами'),
        ('event_management', 'Управление событиями'),
        ('automation_management', 'Управление автоматизацией'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    codename = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='test_management')
    
    def __str__(self):
        return self.name
        
    class Meta:
        ordering = ['category', 'name']

class Role(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, related_name="roles", blank=True)
    is_admin_role = models.BooleanField(default=False, help_text="Администраторская роль с полным доступом")
    
    def __str__(self):
        return self.name

class CustomUser(AbstractUser):
    """
    Расширенная модель пользователя
    """
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Русский'),
    ]
    
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
    ]
    
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    first_name = models.CharField(max_length=150, blank=False, verbose_name="Имя")
    last_name = models.CharField(max_length=150, blank=False, verbose_name="Фамилия")
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='ru')
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    phone_number = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        null=True,
        blank=True,
        validators=[validate_avatar_size, validate_avatar_extension]
    )
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if self.avatar:
            # Валидация при сохранении
            validate_avatar_size(self.avatar)
            validate_avatar_extension(self.avatar)
        super().save(*args, **kwargs)

class SchedulerEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('run_tests', 'Run Tests'),
        ('general', 'General Event'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, default='general')
    scheduled_time = models.DateTimeField()
    recurrence = models.CharField(
        max_length=50,
        choices=[('none', 'None'), ('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')],
        default='none'
    )
    project = models.ForeignKey(Project, related_name='events', on_delete=models.CASCADE)
    parent_event = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='child_events'
    )
    test_config = models.JSONField(
        null=True,
        blank=True,
        help_text='Configuration for test execution: {"run_all_project_tests": true} or {"folder_id": 123} or {"test_cases": [1, 2, 3]}'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_run = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('running', 'Running'),
            ('completed', 'Completed'),
            ('failed', 'Failed')
        ],
        default='pending'
    )

    def __str__(self):
        return self.title

    def clean(self):
        if self.event_type == 'run_tests' and not self.test_config:
            raise ValidationError({
                'test_config': 'Test configuration is required for test execution events'
            })

class TestReport(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name='reports')
    executor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='executed_reports')
    status = models.CharField(
        max_length=50,
        choices=[
            ('passed', 'Passed'),
            ('failed', 'Failed'),
            ('blocked', 'Blocked'),
            ('skipped', 'Skipped'),
            ('in_progress', 'In Progress')
        ],
        default='in_progress'
    )
    execution_date = models.DateTimeField(auto_now_add=True)
    execution_time = models.DurationField(null=True, blank=True)
    actual_result = models.TextField(blank=True, null=True)
    comments = models.TextField(blank=True, null=True)
    attachments = models.FileField(upload_to='test_reports/', null=True, blank=True)
    environment = models.CharField(max_length=255, blank=True, null=True)
    version = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"Report for {self.test_case.title} - {self.status} ({self.execution_date})"

    class Meta:
        ordering = ['-execution_date']

class TestEvent(models.Model):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name='events')
    test_report = models.ForeignKey(TestReport, on_delete=models.CASCADE, related_name='events', null=True, blank=True)
    event_type = models.CharField(
        max_length=50,
        choices=[
            ('start', 'Test Started'),
            ('step_complete', 'Step Completed'),
            ('error', 'Error Occurred'),
            ('warning', 'Warning'),
            ('info', 'Information'),
            ('finish', 'Test Finished')
        ]
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    details = models.JSONField(null=True, blank=True)  # Для хранения дополнительной информации в формате JSON
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_events')
    severity = models.CharField(
        max_length=20,
        choices=[
            ('critical', 'Critical'),
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low'),
            ('info', 'Info')
        ],
        default='info'
    )
    screenshot = models.ImageField(upload_to='test_events/screenshots/', null=True, blank=True)
    log_file = models.FileField(upload_to='test_events/logs/', null=True, blank=True)

    def __str__(self):
        return f"{self.event_type} - {self.timestamp} - {self.test_case.title}"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['event_type']),
            models.Index(fields=['severity'])
        ]

class ReportTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Флаг "мягкого удаления" - если True, шаблон считается удаленным
    is_deleted = models.BooleanField(default=False)
    
    # Конфигурация отчета в JSON формате
    configuration = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-updated_at']
        
    def __str__(self):
        return f"{self.name} - {self.project.name}"

class AutomationProject(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='automation_projects', null=True, blank=True)
    repository_url = models.URLField()
    repository_type = models.CharField(max_length=20, choices=[
        ('github', 'GitHub'),
        ('gitlab', 'GitLab'),
        ('bitbucket', 'Bitbucket')
    ], default='github')
    branch = models.CharField(max_length=100, default='main')
    framework = models.CharField(max_length=20, choices=[
        ('pytest', 'PyTest'),
        ('unittest', 'UnitTest'),
        ('robot', 'Robot Framework'),
        ('playwright', 'Playwright')
    ])
    tests_directory = models.CharField(max_length=255, default='tests/')
    local_path = models.CharField(max_length=255, null=True, blank=True)
    access_token = models.CharField(max_length=255, null=True, blank=True, help_text='Personal access token for private repositories')
    username = models.CharField(max_length=100, null=True, blank=True, help_text='Username for private repositories')
    last_sync = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    sync_status = models.CharField(max_length=20, default='not_synced', choices=[
        ('synced', 'Synced'),
        ('not_synced', 'Not Synced'),
        ('error', 'Error')
    ])

    def __str__(self):
        return f"{self.name} ({self.project.name})"

    def get_repository_url_with_auth(self):
        """Возвращает URL репозитория с учетом аутентификации"""
        if not self.access_token:
            return self.repository_url

        parsed_url = urlparse(self.repository_url)
        if self.repository_type == 'github':
            return f"https://{self.access_token}@{parsed_url.netloc}{parsed_url.path}"
        elif self.repository_type == 'gitlab':
            return f"https://oauth2:{self.access_token}@{parsed_url.netloc}{parsed_url.path}"
        elif self.repository_type == 'bitbucket':
            if self.username:
                return f"https://{self.username}:{self.access_token}@{parsed_url.netloc}{parsed_url.path}"
        return self.repository_url

class AutomationTest(models.Model):
    project = models.ForeignKey(AutomationProject, on_delete=models.CASCADE, related_name='tests')
    name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=255)
    is_available = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=50, null=True, blank=True)
    framework = models.CharField(
        max_length=20,
        choices=[
            ('pytest', 'PyTest'),
            ('unittest', 'UnitTest'),
            ('robot', 'Robot Framework'),
            ('playwright', 'Playwright')
        ],
        default='pytest'
    )

    def __str__(self):
        return f"{self.project.name} - {self.name}"

class TestSchedule(models.Model):
    project = models.ForeignKey(AutomationProject, on_delete=models.CASCADE, related_name='schedules')
    tests = models.ManyToManyField(AutomationTest, blank=True)
    schedule_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('error', 'Error'),
        ('pending', 'Pending')
    ], default='pending')
    last_result = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Schedule for {self.project.name} at {self.schedule_time}"

class CustomChart(models.Model):
    CHART_TYPES = [
        ('line', 'Line Chart'),
        ('bar', 'Bar Chart'),
        ('pie', 'Pie Chart'),
        ('doughnut', 'Doughnut Chart')
    ]
    
    DATA_SOURCES = [
        ('test_status', 'Test Status'),
        ('user_activity', 'User Activity'),
        ('daily_trends', 'Daily Trends'),
        ('custom_query', 'Custom Query')
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    chart_type = models.CharField(max_length=50, choices=CHART_TYPES)
    data_source = models.CharField(max_length=50, choices=DATA_SOURCES)
    configuration = models.JSONField(default=dict, help_text='Chart-specific configuration')
    custom_query = models.TextField(blank=True, null=True, help_text='SQL query for custom data source')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='custom_charts')
    
    class Meta:
        ordering = ['-updated_at']
        
    def __str__(self):
        return self.name