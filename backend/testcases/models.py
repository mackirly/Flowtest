from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField

from projects.models import Project, Folder
from automation.models import AutomationProject


class TestCase(models.Model):
    """
    Test case model for storing test information
    """
    PRIORITY_CHOICES = [
        ('high', _('High')),
        ('medium', _('Medium')),
        ('low', _('Low')),
    ]
    
    TEST_TYPE_CHOICES = [
        ('manual', _('Manual')),
        ('automated', _('Automated')),
    ]
    
    FRAMEWORK_CHOICES = [
        ('pytest', _('PyTest')),
        ('unittest', _('UnitTest')),
        ('robot', _('Robot Framework')),
        ('cypress', _('Cypress')),
        ('selenium', _('Selenium')),
        ('playwright', _('Playwright')),
        ('other', _('Other')),
    ]
    
    folder = models.ForeignKey(
        Folder, 
        related_name='test_cases', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name=_('Folder'),
        help_text=_('Folder containing this test case')
    )
    project = models.ForeignKey(
        Project, 
        related_name='test_cases', 
        on_delete=models.CASCADE,
        verbose_name=_('Project'),
        help_text=_('Project that this test case belongs to')
    )
    title = models.CharField(
        _('Title'), 
        max_length=255, 
        default="Unnamed Test Case",
        help_text=_('Title of the test case')
    )
    description = models.TextField(
        _('Description'), 
        blank=True, 
        null=True,
        help_text=_('Detailed description of the test case')
    )
    created_at = models.DateTimeField(
        _('Created at'), 
        auto_now_add=True,
        help_text=_('Date and time when the test case was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'), 
        auto_now=True,
        help_text=_('Date and time when the test case was last updated')
    )
    condition = models.TextField(
        _('Preconditions'), 
        blank=True, 
        null=True,
        help_text=_('Preconditions required for the test case')
    )
    steps = models.TextField(
        _('Test steps'), 
        blank=True, 
        null=True,
        help_text=_('Steps to follow for the test case')
    )
    expected_results = models.TextField(
        _('Expected results'), 
        blank=True, 
        null=True,
        help_text=_('Expected results of the test case')
    )
    priority = models.CharField(
        _('Priority'),
        max_length=50,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text=_('Priority level of the test case')
    )
    platform = models.CharField(
        _('Platform'), 
        max_length=50, 
        default="Any",
        help_text=_('Platform or environment for the test case')
    )
    estimated_time = models.CharField(
        _('Estimated time'),
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Estimated time for test execution')
    )
    test_type = models.CharField(
        _('Test type'),
        max_length=50, 
        choices=TEST_TYPE_CHOICES, 
        default='manual',
        help_text=_('Type of test case (manual or automated)')
    )
    test_code = models.TextField(
        _('Test code'), 
        blank=True, 
        null=True,
        help_text=_('Source code for automated tests')
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='authored_tests',
        verbose_name=_('Author'),
        help_text=_('User that created this test case')
    )
    # Fields for automated tests
    script_path = models.CharField(
        _('Script path'), 
        max_length=255, 
        blank=True, 
        null=True,
        help_text=_('Path to the test script file')
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
    framework = models.CharField(
        _('Framework'),
        max_length=50,
        choices=FRAMEWORK_CHOICES,
        default='pytest',
        blank=True,
        null=True,
        help_text=_('Test framework used')
    )
    automation_project = models.ForeignKey(
        'automation.AutomationProject', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='test_cases',
        verbose_name=_('Automation project'),
        help_text=_('Automation project that this test case belongs to')
    )
    automation_test_name = models.CharField(
        _('Automation test name'),
        max_length=500,
        blank=True,
        null=True,
        help_text=_('Full name of the automation test in the repository (e.g., tests/test_login.py::TestLogin::test_successful_login)')
    )
    automation_test = models.ForeignKey(
        'automation.AutomationTest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_test_cases',
        help_text=_('Linked automation test from repository')
    )
    tags = models.JSONField(
        _('Tags'),
        blank=True, 
        null=True, 
        default=list,
        help_text=_('Tags for categorizing the test case')
    )
    
    class Meta:
        verbose_name = _('test case')
        verbose_name_plural = _('test cases')
        ordering = ['title']
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['folder']),
            models.Index(fields=['priority']),
            models.Index(fields=['test_type']),
        ]
    
    def __str__(self):
        return self.title
    
    def get_last_run(self):
        """
        Return the latest test run for this test case
        """
        return self.test_runs.order_by('-started_at').first()
    
    def get_last_report(self):
        """
        Return the latest test report for this test case
        """
        return self.reports.order_by('-execution_date').first()
    
    def get_status(self):
        """
        Return the current status of the test case based on the latest run or report
        """
        last_run = self.get_last_run()
        if last_run:
            return last_run.status
        
        last_report = self.get_last_report()
        if last_report:
            return last_report.status
        
        return 'unknown'


class TestRun(models.Model):
    """
    Test run model for tracking test execution
    """
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('running', _('Running')),
        ('passed', _('Passed')),
        ('failed', _('Failed')),
        ('error', _('Error')),
        ('skipped', _('Skipped')),
    ]
    
    RUN_TYPE_CHOICES = [
        ('manual', _('Manual')),
        ('automated', _('Automated')),
    ]
    
    test_case = models.ForeignKey(
        TestCase, 
        on_delete=models.CASCADE, 
        null=True,
        related_name='test_runs',
        verbose_name=_('Test case'),
        help_text=_('Test case that was executed')
    )
    status = models.CharField(
        _('Status'),
        max_length=20, 
        choices=STATUS_CHOICES,
        help_text=_('Current status of the test run')
    )
    started_at = models.DateTimeField(
        _('Started at'),
        null=True,
        help_text=_('Date and time when the test run started')
    )
    finished_at = models.DateTimeField(
        _('Finished at'),
        null=True,
        help_text=_('Date and time when the test run finished')
    )
    duration = models.FloatField(
        _('Duration'),
        null=True,
        help_text=_('Duration of the test run in seconds')
    )
    error_message = models.TextField(
        _('Error message'),
        null=True, 
        blank=True,
        help_text=_('Error message if the test run failed')
    )
    output = models.TextField(
        _('Output'),
        null=True, 
        blank=True,
        help_text=_('Output from the test run')
    )
    executor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='executed_runs',
        verbose_name=_('Executor'),
        help_text=_('User that executed the test run')
    )
    run_id = models.CharField(
        _('Run ID'),
        max_length=50, 
        blank=True, 
        null=True,
        help_text=_('Unique identifier for batch test runs')
    )
    run_type = models.CharField(
        _('Run type'),
        max_length=20,
        choices=RUN_TYPE_CHOICES,
        default='automated',
        help_text=_('Type of test run (manual or automated)')
    )
    regression_run = models.ForeignKey(
        'RegressionRun',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='test_runs',
        help_text=_('Regression run this test is part of')
    )
    
    class Meta:
        verbose_name = _('test run')
        verbose_name_plural = _('test runs')
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['test_case', 'status']),
            models.Index(fields=['started_at']),
            models.Index(fields=['run_id']),
        ]
    
    def __str__(self):
        return f"{self.test_case} - {self.status}"
    
    def save(self, *args, **kwargs):
        """
        Override save to calculate duration if not provided
        """
        if self.started_at and self.finished_at and not self.duration:
            self.duration = (self.finished_at - self.started_at).total_seconds()
        
        if not self.started_at and self.status == 'running':
            self.started_at = timezone.now()
            
        super().save(*args, **kwargs)


class TestReport(models.Model):
    """
    Test report model for manual test execution results
    """
    STATUS_CHOICES = [
        ('passed', _('Passed')),
        ('failed', _('Failed')),
        ('blocked', _('Blocked')),
        ('skipped', _('Skipped')),
        ('in_progress', _('In Progress')),
    ]
    
    test_case = models.ForeignKey(
        TestCase, 
        on_delete=models.CASCADE, 
        related_name='reports',
        verbose_name=_('Test case'),
        help_text=_('Test case that was executed')
    )
    executor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='executed_reports',
        verbose_name=_('Executor'),
        help_text=_('User that executed the test')
    )
    status = models.CharField(
        _('Status'),
        max_length=50,
        choices=STATUS_CHOICES,
        default='in_progress',
        help_text=_('Status of the test execution')
    )
    execution_date = models.DateTimeField(
        _('Execution date'),
        auto_now_add=True,
        help_text=_('Date and time when the test was executed')
    )
    execution_time = models.DurationField(
        _('Execution time'),
        null=True, 
        blank=True,
        help_text=_('Time taken to execute the test')
    )
    actual_result = models.TextField(
        _('Actual result'),
        blank=True, 
        null=True,
        help_text=_('Actual result of the test execution')
    )
    comments = models.TextField(
        _('Comments'),
        blank=True, 
        null=True,
        help_text=_('Additional comments about the test execution')
    )
    attachments = models.FileField(
        _('Attachments'),
        upload_to='test_reports/',
        null=True, 
        blank=True,
        help_text=_('Attachments related to the test execution')
    )
    environment = models.CharField(
        _('Environment'),
        max_length=255, 
        blank=True, 
        null=True,
        help_text=_('Environment where the test was executed')
    )
    version = models.CharField(
        _('Version'),
        max_length=50, 
        blank=True, 
        null=True,
        help_text=_('Version of the software being tested')
    )
    report_id = models.CharField(
        _('Report ID'),
        max_length=50, 
        blank=True, 
        null=True,
        help_text=_('Unique identifier for batch reports')
    )
    
    class Meta:
        verbose_name = _('test report')
        verbose_name_plural = _('test reports')
        ordering = ['-execution_date']
        indexes = [
            models.Index(fields=['test_case', 'status']),
            models.Index(fields=['execution_date']),
            models.Index(fields=['report_id']),
        ]
    
    def __str__(self):
        return f"Report for {self.test_case.title} - {self.status} ({self.execution_date})"


class TestEvent(models.Model):
    """
    Test event model for tracking events during test execution
    """
    EVENT_TYPE_CHOICES = [
        ('start', _('Test Started')),
        ('step_complete', _('Step Completed')),
        ('error', _('Error Occurred')),
        ('warning', _('Warning')),
        ('info', _('Information')),
        ('finish', _('Test Finished')),
    ]
    
    SEVERITY_CHOICES = [
        ('critical', _('Critical')),
        ('high', _('High')),
        ('medium', _('Medium')),
        ('low', _('Low')),
        ('info', _('Info')),
    ]
    
    test_case = models.ForeignKey(
        TestCase, 
        on_delete=models.CASCADE, 
        related_name='events',
        verbose_name=_('Test case'),
        help_text=_('Test case related to this event')
    )
    test_report = models.ForeignKey(
        TestReport, 
        on_delete=models.CASCADE, 
        related_name='events', 
        null=True, 
        blank=True,
        verbose_name=_('Test report'),
        help_text=_('Test report related to this event')
    )
    event_type = models.CharField(
        _('Event type'),
        max_length=50,
        choices=EVENT_TYPE_CHOICES,
        help_text=_('Type of event')
    )
    timestamp = models.DateTimeField(
        _('Timestamp'),
        auto_now_add=True,
        help_text=_('Date and time when the event occurred')
    )
    description = models.TextField(
        _('Description'),
        help_text=_('Description of the event')
    )
    details = models.JSONField(
        _('Details'),
        null=True, 
        blank=True,
        help_text=_('Additional details about the event in JSON format')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_test_events',
        verbose_name=_('Created by'),
        help_text=_('User that created this event')
    )
    severity = models.CharField(
        _('Severity'),
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='info',
        help_text=_('Severity level of the event')
    )
    screenshot = models.ImageField(
        _('Screenshot'),
        upload_to='test_events/screenshots/', 
        null=True, 
        blank=True,
        help_text=_('Screenshot related to the event')
    )
    log_file = models.FileField(
        _('Log file'),
        upload_to='test_events/logs/', 
        null=True, 
        blank=True,
        help_text=_('Log file related to the event')
    )
    
    class Meta:
        verbose_name = _('test event')
        verbose_name_plural = _('test events')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['event_type']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.timestamp} - {self.test_case.title}"


class RegressionRun(models.Model):
    """
    Regression run model for tracking regression testing sessions
    """
    STATUS_CHOICES = [
        ('planned', _('Planned')),
        ('in_progress', _('In Progress')),
        ('completed', _('Completed')),
        ('cancelled', _('Cancelled')),
    ]
    
    name = models.CharField(
        _('Name'),
        max_length=255,
        help_text=_('Name of the regression run')
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='regression_runs',
        help_text=_('Project this regression run belongs to')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_regression_runs',
        help_text=_('User who created this regression run')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('When the regression run was created')
    )
    started_at = models.DateTimeField(
        _('Started at'),
        null=True,
        blank=True,
        help_text=_('When the regression run was started')
    )
    completed_at = models.DateTimeField(
        _('Completed at'),
        null=True,
        blank=True,
        help_text=_('When the regression run was completed')
    )
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned',
        help_text=_('Current status of the regression run')
    )
    description = models.TextField(
        _('Description'),
        blank=True,
        null=True,
        help_text=_('Description of the regression run')
    )
    test_cases = models.ManyToManyField(
        TestCase,
        related_name='regression_runs',
        help_text=_('Test cases included in this regression run')
    )
    
    class Meta:
        verbose_name = _('regression run')
        verbose_name_plural = _('regression runs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.get_status_display()}"
    
    def get_progress(self):
        """
        Calculate progress of the regression run
        """
        total_tests = self.test_cases.count()
        if total_tests == 0:
            return 0
        
        completed_tests = self.test_runs.exclude(status__in=['pending', 'running']).count()
        return int((completed_tests / total_tests) * 100)
    
    def get_statistics(self):
        """
        Get statistics for the regression run
        """
        test_runs = self.test_runs.all()
        return {
            'total': test_runs.count(),
            'passed': test_runs.filter(status='passed').count(),
            'failed': test_runs.filter(status='failed').count(),
            'skipped': test_runs.filter(status='skipped').count(),
            'error': test_runs.filter(status='error').count(),
            'pending': test_runs.filter(status='pending').count(),
            'running': test_runs.filter(status='running').count(),
        }