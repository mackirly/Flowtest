from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from urllib.parse import urlparse

from projects.models import Project


class AutomationProject(models.Model):
    """
    Automation project model for managing test automation repositories
    """
    REPOSITORY_TYPE_CHOICES = [
        ('github', _('GitHub')),
        ('gitlab', _('GitLab')),
        ('bitbucket', _('Bitbucket')),
    ]
    
    FRAMEWORK_CHOICES = [
        ('auto', _('Auto-detect')),
        ('pytest', _('PyTest')),
        ('unittest', _('UnitTest')),
        ('robot', _('Robot Framework')),
        ('playwright', _('Playwright')),
    ]
    
    SYNC_STATUS_CHOICES = [
        ('synced', _('Synced')),
        ('not_synced', _('Not Synced')),
        ('error', _('Error')),
        ('syncing', _('Syncing')),
    ]
    
    name = models.CharField(
        _('Name'), 
        max_length=100,
        help_text=_('Name of the automation project')
    )
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='automation_projects', 
        null=True, 
        blank=True,
        verbose_name=_('Project'),
        help_text=_('Project that this automation project belongs to')
    )
    repository_url = models.URLField(
        _('Repository URL'),
        help_text=_('URL of the repository containing the automated tests')
    )
    repository_type = models.CharField(
        _('Repository type'),
        max_length=20, 
        choices=REPOSITORY_TYPE_CHOICES, 
        default='github',
        help_text=_('Type of the repository')
    )
    branch = models.CharField(
        _('Branch'),
        max_length=100, 
        default='main',
        help_text=_('Branch of the repository to use')
    )
    framework = models.CharField(
        _('Framework'),
        max_length=20, 
        choices=FRAMEWORK_CHOICES, 
        default='auto',
        help_text=_('Test framework used in the repository')
    )
    tests_directory = models.CharField(
        _('Tests directory'),
        max_length=255, 
        default='', 
        blank=True,
        help_text=_('Directory in the repository containing the tests')
    )
    local_path = models.CharField(
        _('Local path'),
        max_length=255, 
        null=True, 
        blank=True,
        help_text=_('Local path where the repository is cloned')
    )
    detected_frameworks = models.JSONField(
        _('Detected frameworks'),
        default=list, 
        blank=True, 
        null=True,
        help_text=_('List of frameworks detected in the repository')
    )
    access_token = models.CharField(
        _('Access token'),
        max_length=255, 
        null=True, 
        blank=True, 
        help_text=_('Personal access token for private repositories')
    )
    username = models.CharField(
        _('Username'),
        max_length=100, 
        null=True, 
        blank=True, 
        help_text=_('Username for private repositories')
    )
    last_sync = models.DateTimeField(
        _('Last sync'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the repository was last synchronized')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        default=timezone.now,
        help_text=_('Date and time when the automation project was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'),
        auto_now=True,
        help_text=_('Date and time when the automation project was last updated')
    )
    sync_status = models.CharField(
        _('Sync status'),
        max_length=20, 
        default='not_synced', 
        choices=SYNC_STATUS_CHOICES,
        help_text=_('Current synchronization status')
    )
    sync_message = models.TextField(
        _('Sync message'),
        blank=True, 
        null=True,
        help_text=_('Message from the last synchronization attempt')
    )
    
    class Meta:
        verbose_name = _('automation project')
        verbose_name_plural = _('automation projects')
        ordering = ['name']
        unique_together = [['name', 'project']]
    
    def __str__(self):
        if self.project:
            return f"{self.name} ({self.project.name})"
        return self.name
    
    def get_repository_url_with_auth(self):
        """
        Return the repository URL with authentication included
        """
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
    
    def get_tests_count(self):
        """
        Return the count of tests in this automation project
        """
        return self.tests.count()


class AutomationTest(models.Model):
    """
    Automation test model for storing information about automated tests
    """
    FRAMEWORK_CHOICES = [
        ('pytest', _('PyTest')),
        ('unittest', _('UnitTest')),
        ('robot', _('Robot Framework')),
        ('playwright', _('Playwright')),
        ('other', _('Other')),
    ]
    
    project = models.ForeignKey(
        AutomationProject, 
        on_delete=models.CASCADE, 
        related_name='tests',
        verbose_name=_('Automation project'),
        help_text=_('Automation project that this test belongs to')
    )
    name = models.CharField(
        _('Name'),
        max_length=255,
        help_text=_('Name of the test')
    )
    file_path = models.CharField(
        _('File path'),
        max_length=255,
        help_text=_('Path to the test file in the repository')
    )
    class_name = models.CharField(
        _('Class name'),
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Name of the test class')
    )
    method_name = models.CharField(
        _('Method name'),
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Name of the test method')
    )
    is_available = models.BooleanField(
        _('Is available'),
        default=True,
        help_text=_('Whether the test is available for execution')
    )
    last_run = models.DateTimeField(
        _('Last run'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the test was last executed')
    )
    last_status = models.CharField(
        _('Last status'),
        max_length=50, 
        null=True, 
        blank=True,
        help_text=_('Status of the last test execution')
    )
    framework = models.CharField(
        _('Framework'),
        max_length=20,
        choices=FRAMEWORK_CHOICES,
        default='pytest',
        help_text=_('Test framework used for this test')
    )
    description = models.TextField(
        _('Description'),
        blank=True,
        null=True,
        help_text=_('Description of the test extracted from docstrings or comments')
    )
    parameters = models.JSONField(
        _('Parameters'),
        blank=True,
        null=True,
        default=dict,
        help_text=_('Parameters required for the test')
    )
    tags = models.JSONField(
        _('Tags'),
        blank=True,
        null=True,
        default=list,
        help_text=_('Tags associated with the test')
    )
    
    class Meta:
        verbose_name = _('automation test')
        verbose_name_plural = _('automation tests')
        ordering = ['name']
        unique_together = [['project', 'file_path', 'class_name', 'method_name']]
    
    def __str__(self):
        return f"{self.project.name} - {self.name}"
    
    def get_full_name(self):
        """
        Return the full name of the test including class and method names
        """
        parts = []
        if self.class_name:
            parts.append(self.class_name)
        if self.method_name:
            parts.append(self.method_name)
        
        if parts:
            return f"{self.file_path}::{'.'.join(parts)}"
        return self.file_path
    
    def get_command(self):
        """
        Return the command to execute this test
        """
        if self.framework == 'pytest':
            return f"pytest {self.get_full_name()} -v"
        elif self.framework == 'unittest':
            return f"python -m unittest {self.get_full_name()}"
        elif self.framework == 'robot':
            return f"robot -t '{self.name}' {self.file_path}"
        elif self.framework == 'playwright':
            return f"npx playwright test {self.file_path}"
        return f"pytest {self.file_path}"


class TestSchedule(models.Model):
    """
    Test schedule model for scheduling automated test runs
    """
    STATUS_CHOICES = [
        ('success', _('Success')),
        ('error', _('Error')),
        ('pending', _('Pending')),
    ]
    
    RECURRENCE_CHOICES = [
        ('none', _('None')),
        ('daily', _('Daily')),
        ('weekly', _('Weekly')),
        ('monthly', _('Monthly')),
    ]
    
    project = models.ForeignKey(
        AutomationProject, 
        on_delete=models.CASCADE, 
        related_name='schedules',
        verbose_name=_('Automation project'),
        help_text=_('Automation project that this schedule belongs to')
    )
    name = models.CharField(
        _('Name'),
        max_length=255,
        help_text=_('Name of the schedule')
    )
    description = models.TextField(
        _('Description'),
        blank=True,
        null=True,
        help_text=_('Description of the schedule')
    )
    tests = models.ManyToManyField(
        AutomationTest, 
        blank=True,
        related_name='schedules',
        verbose_name=_('Tests'),
        help_text=_('Tests to be executed according to this schedule')
    )
    schedule_time = models.TimeField(
        _('Schedule time'),
        help_text=_('Time of day when the tests should be executed')
    )
    schedule_days = models.JSONField(
        _('Schedule days'),
        default=list,
        blank=True,
        null=True,
        help_text=_('Days of the week when the tests should be executed (0-6 for Monday-Sunday)')
    )
    recurrence = models.CharField(
        _('Recurrence'),
        max_length=20,
        choices=RECURRENCE_CHOICES,
        default='none',
        help_text=_('Recurrence pattern for the schedule')
    )
    is_active = models.BooleanField(
        _('Is active'),
        default=True,
        help_text=_('Whether the schedule is active')
    )
    last_run = models.DateTimeField(
        _('Last run'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the tests were last executed')
    )
    next_run = models.DateTimeField(
        _('Next run'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the tests will be executed next')
    )
    last_status = models.CharField(
        _('Last status'),
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        help_text=_('Status of the last scheduled execution')
    )
    last_result = models.TextField(
        _('Last result'),
        blank=True,
        help_text=_('Result of the last scheduled execution')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('Date and time when the schedule was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'),
        auto_now=True,
        help_text=_('Date and time when the schedule was last updated')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_schedules',
        verbose_name=_('Created by'),
        help_text=_('User that created this schedule')
    )
    notification_emails = models.JSONField(
        _('Notification emails'),
        default=list,
        blank=True,
        null=True,
        help_text=_('Email addresses to notify about schedule execution results')
    )
    
    class Meta:
        verbose_name = _('test schedule')
        verbose_name_plural = _('test schedules')
        ordering = ['schedule_time', 'name']
    
    def __str__(self):
        return f"Schedule for {self.project.name} at {self.schedule_time}"
    
    def save(self, *args, **kwargs):
        """
        Override save to update next_run if not set
        """
        if not self.next_run and self.is_active:
            self.update_next_run()
            
        super().save(*args, **kwargs)
    
    def update_next_run(self):
        """
        Update the next run time based on the schedule settings
        """
        now = timezone.now()
        today = now.date()
        schedule_time = timezone.make_aware(
            timezone.datetime.combine(today, self.schedule_time)
        )
        
        # If schedule time is in the past, move to next occurrence
        if schedule_time < now:
            if self.recurrence == 'daily':
                # Next day at the scheduled time
                schedule_time = schedule_time + timezone.timedelta(days=1)
            elif self.recurrence == 'weekly':
                # Find the next day in schedule_days
                days = self.schedule_days or [0]  # Default to Monday if not specified
                current_weekday = now.weekday()
                days_sorted = sorted(days)
                
                # Find next scheduled day
                next_day = None
                for day in days_sorted:
                    if day > current_weekday:
                        next_day = day
                        break
                
                # If no next day found, wrap around to the first day
                if next_day is None:
                    next_day = days_sorted[0]
                    # Add a week if we're wrapping around
                    if next_day <= current_weekday:
                        days_ahead = 7 - current_weekday + next_day
                    else:
                        days_ahead = next_day - current_weekday
                else:
                    days_ahead = next_day - current_weekday
                
                schedule_time = schedule_time + timezone.timedelta(days=days_ahead)
            elif self.recurrence == 'monthly':
                # Next month on the same day at the scheduled time
                month = now.month + 1
                year = now.year
                if month > 12:
                    month = 1
                    year += 1
                
                day = min(now.day, 28)  # Avoid issues with months with fewer days
                schedule_time = timezone.make_aware(
                    timezone.datetime(year, month, day, 
                                      self.schedule_time.hour, 
                                      self.schedule_time.minute, 
                                      self.schedule_time.second)
                )
            else:  # 'none' - one-time schedule
                # If it's a one-time schedule and the time has passed, deactivate
                self.is_active = False
                self.next_run = None
                return
        
        self.next_run = schedule_time


class TestExecution(models.Model):
    """
    Test execution model for tracking the execution of automated tests
    """
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('in_progress', _('In Progress')),
        ('success', _('Success')),
        ('failed', _('Failed')),
        ('error', _('Error')),
        ('cancelled', _('Cancelled')),
        ('timeout', _('Timeout')),
    ]
    
    automation_test = models.ForeignKey(
        AutomationTest, 
        on_delete=models.CASCADE, 
        related_name='executions',
        verbose_name=_('Automation test'),
        help_text=_('Automation test associated with this execution')
    )
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='triggered_executions',
        verbose_name=_('Triggered by'),
        help_text=_('User that triggered this execution')
    )
    scheduled_run = models.ForeignKey(
        TestSchedule, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='executions',
        verbose_name=_('Scheduled run'),
        help_text=_('Schedule that triggered this execution, if any')
    )
    status = models.CharField(
        _('Status'),
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        help_text=_('Current status of the execution')
    )
    start_time = models.DateTimeField(
        _('Start time'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the execution started')
    )
    end_time = models.DateTimeField(
        _('End time'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the execution ended')
    )
    duration = models.DurationField(
        _('Duration'),
        null=True, 
        blank=True,
        help_text=_('Duration of the execution')
    )
    result = models.TextField(
        _('Result'),
        blank=True,
        null=True,
        help_text=_('Result of the execution')
    )
    error_message = models.TextField(
        _('Error message'),
        blank=True,
        null=True,
        help_text=_('Error message if the execution failed')
    )
    logs = models.TextField(
        _('Logs'),
        blank=True,
        null=True,
        help_text=_('Logs of the execution')
    )
    environment = models.CharField(
        _('Environment'),
        max_length=100, 
        default='default',
        help_text=_('Environment in which the test was executed')
    )
    parameters = models.JSONField(
        _('Parameters'),
        blank=True,
        null=True,
        default=dict,
        help_text=_('Parameters used for the execution')
    )
    artifacts = models.JSONField(
        _('Artifacts'),
        blank=True,
        null=True,
        default=list,
        help_text=_('Artifacts produced by the execution (screenshots, files, etc.)')
    )
    output = models.TextField(
        _('Output'),
        blank=True,
        null=True,
        help_text=_('Output of the execution (stdout/stderr)')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('Date and time when the execution record was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'),
        auto_now=True,
        help_text=_('Date and time when the execution record was last updated')
    )
    
    class Meta:
        verbose_name = _('test execution')
        verbose_name_plural = _('test executions')
        ordering = ['-start_time', '-created_at']
    
    def __str__(self):
        return f"Execution of {self.automation_test.name} ({self.status})"
    
    def save(self, *args, **kwargs):
        """
        Override save to update duration if start_time and end_time are set
        """
        if self.start_time and self.end_time and not self.duration:
            self.duration = self.end_time - self.start_time
            
        super().save(*args, **kwargs)
        
        # Update the associated test with the last execution status
        if self.status not in ['pending', 'in_progress'] and self.automation_test:
            self.automation_test.last_status = self.status
            self.automation_test.last_run = self.end_time or timezone.now()
            self.automation_test.save(update_fields=['last_status', 'last_run'])