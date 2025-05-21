from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from projects.models import Project


class ReportTemplate(models.Model):
    """
    Report template model for storing report configurations
    """
    name = models.CharField(
        _('Name'),
        max_length=255,
        help_text=_('Name of the report template')
    )
    description = models.TextField(
        _('Description'),
        blank=True,
        help_text=_('Detailed description of the report template')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='created_templates',
        verbose_name=_('Created by'),
        help_text=_('User that created this template')
    )
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE,
        related_name='report_templates',
        verbose_name=_('Project'),
        help_text=_('Project that this template belongs to')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('Date and time when the template was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'),
        auto_now=True,
        help_text=_('Date and time when the template was last updated')
    )
    is_deleted = models.BooleanField(
        _('Is deleted'),
        default=False,
        help_text=_('Whether the template has been deleted (soft delete)')
    )
    configuration = models.JSONField(
        _('Configuration'),
        default=dict,
        help_text=_('Configuration of the report template in JSON format')
    )
    is_default = models.BooleanField(
        _('Is default'),
        default=False,
        help_text=_('Whether this is the default template for the project')
    )
    
    class Meta:
        verbose_name = _('report template')
        verbose_name_plural = _('report templates')
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project', 'is_default']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.project.name}"


class CustomChart(models.Model):
    """
    Custom chart model for storing chart configurations
    """
    CHART_TYPES = [
        ('line', _('Line Chart')),
        ('bar', _('Bar Chart')),
        ('pie', _('Pie Chart')),
        ('doughnut', _('Doughnut Chart')),
        ('radar', _('Radar Chart')),
        ('polarArea', _('Polar Area Chart')),
        ('bubble', _('Bubble Chart')),
        ('scatter', _('Scatter Chart')),
    ]
    
    DATA_SOURCES = [
        ('test_status', _('Test Status')),
        ('user_activity', _('User Activity')),
        ('daily_trends', _('Daily Trends')),
        ('custom_query', _('Custom Query')),
        ('test_execution_time', _('Test Execution Time')),
        ('test_failures', _('Test Failures')),
        ('test_priority', _('Test Priority')),
    ]
    
    name = models.CharField(
        _('Name'),
        max_length=255,
        help_text=_('Name of the chart')
    )
    description = models.TextField(
        _('Description'),
        blank=True, 
        null=True,
        help_text=_('Detailed description of the chart')
    )
    chart_type = models.CharField(
        _('Chart type'),
        max_length=50, 
        choices=CHART_TYPES,
        help_text=_('Type of chart to display')
    )
    data_source = models.CharField(
        _('Data source'),
        max_length=50, 
        choices=DATA_SOURCES,
        help_text=_('Source of data for the chart')
    )
    configuration = models.JSONField(
        _('Configuration'),
        default=dict, 
        help_text=_('Chart-specific configuration in JSON format')
    )
    custom_query = models.TextField(
        _('Custom query'),
        blank=True, 
        null=True, 
        help_text=_('SQL query for custom data source')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='created_charts',
        verbose_name=_('Created by'),
        help_text=_('User that created this chart')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('Date and time when the chart was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'),
        auto_now=True,
        help_text=_('Date and time when the chart was last updated')
    )
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='custom_charts',
        verbose_name=_('Project'),
        help_text=_('Project that this chart belongs to')
    )
    is_public = models.BooleanField(
        _('Is public'),
        default=False,
        help_text=_('Whether the chart is public (visible to all project members)')
    )
    
    class Meta:
        verbose_name = _('custom chart')
        verbose_name_plural = _('custom charts')
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project', 'chart_type']),
            models.Index(fields=['data_source']),
        ]
    
    def __str__(self):
        return self.name


class SchedulerEvent(models.Model):
    """
    Scheduler event model for scheduling reports and test runs
    """
    EVENT_TYPE_CHOICES = [
        ('run_tests', _('Run Tests')),
        ('generate_report', _('Generate Report')),
        ('general', _('General Event')),
    ]
    
    RECURRENCE_CHOICES = [
        ('none', _('None')),
        ('daily', _('Daily')),
        ('weekly', _('Weekly')),
        ('monthly', _('Monthly')),
    ]
    
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('running', _('Running')),
        ('completed', _('Completed')),
        ('failed', _('Failed')),
    ]
    
    title = models.CharField(
        _('Title'),
        max_length=255,
        help_text=_('Title of the event')
    )
    description = models.TextField(
        _('Description'),
        blank=True, 
        null=True,
        help_text=_('Detailed description of the event')
    )
    event_type = models.CharField(
        _('Event type'),
        max_length=50, 
        choices=EVENT_TYPE_CHOICES, 
        default='general',
        help_text=_('Type of event to schedule')
    )
    scheduled_time = models.DateTimeField(
        _('Scheduled time'),
        help_text=_('Date and time when the event is scheduled')
    )
    recurrence = models.CharField(
        _('Recurrence'),
        max_length=50,
        choices=RECURRENCE_CHOICES,
        default='none',
        help_text=_('Recurrence pattern for the event')
    )
    project = models.ForeignKey(
        Project, 
        related_name='events', 
        on_delete=models.CASCADE,
        verbose_name=_('Project'),
        help_text=_('Project that this event belongs to')
    )
    parent_event = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='child_events',
        verbose_name=_('Parent event'),
        help_text=_('Parent event that generated this event')
    )
    configuration = models.JSONField(
        _('Configuration'),
        null=True,
        blank=True,
        help_text=_('Configuration for the event in JSON format')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('Date and time when the event was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'),
        auto_now=True,
        help_text=_('Date and time when the event was last updated')
    )
    last_run = models.DateTimeField(
        _('Last run'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the event was last executed')
    )
    next_run = models.DateTimeField(
        _('Next run'),
        null=True, 
        blank=True,
        help_text=_('Date and time when the event will be executed next')
    )
    status = models.CharField(
        _('Status'),
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        help_text=_('Current status of the event')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_scheduler_events',
        verbose_name=_('Created by'),
        help_text=_('User that created this event')
    )
    
    class Meta:
        verbose_name = _('scheduler event')
        verbose_name_plural = _('scheduler events')
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['scheduled_time']),
            models.Index(fields=['event_type']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return self.title
    
    def clean(self):
        """
        Validate that the configuration is appropriate for the event type
        """
        from django.core.exceptions import ValidationError
        
        if self.event_type == 'run_tests' and not self.configuration:
            raise ValidationError({
                'configuration': _('Test configuration is required for test execution events')
            })
        elif self.event_type == 'generate_report' and not self.configuration:
            raise ValidationError({
                'configuration': _('Report configuration is required for report generation events')
            })
    
    def clone_for_next_occurrence(self):
        """
        Create a new event for the next occurrence based on recurrence settings
        """
        if self.recurrence == 'none':
            return None
            
        import copy
        from django.utils import timezone
        
        # Calculate next occurrence
        if self.recurrence == 'daily':
            next_time = self.scheduled_time + timezone.timedelta(days=1)
        elif self.recurrence == 'weekly':
            next_time = self.scheduled_time + timezone.timedelta(weeks=1)
        elif self.recurrence == 'monthly':
            # Calculate next month (handle month boundaries)
            current_month = self.scheduled_time.month
            current_year = self.scheduled_time.year
            
            if current_month == 12:
                next_month = 1
                next_year = current_year + 1
            else:
                next_month = current_month + 1
                next_year = current_year
                
            import calendar
            # Get the last day of next month
            _, last_day = calendar.monthrange(next_year, next_month)
            # Make sure the day exists in the next month
            next_day = min(self.scheduled_time.day, last_day)
            
            next_time = timezone.datetime(
                next_year, next_month, next_day,
                self.scheduled_time.hour, self.scheduled_time.minute, self.scheduled_time.second,
                tzinfo=self.scheduled_time.tzinfo
            )
        else:
            return None
            
        # Create a new event as a child of this one
        new_event = copy.copy(self)
        new_event.id = None  # Ensure a new ID is assigned
        new_event.parent_event = self
        new_event.scheduled_time = next_time
        new_event.last_run = None
        new_event.status = 'pending'
        new_event.created_at = timezone.now()
        new_event.updated_at = timezone.now()
        
        return new_event


class GeneratedReport(models.Model):
    """
    Generated report model for storing report results
    """
    FORMAT_CHOICES = [
        ('html', _('HTML')),
        ('pdf', _('PDF')),
        ('excel', _('Excel')),
        ('csv', _('CSV')),
    ]
    
    title = models.CharField(
        _('Title'),
        max_length=255,
        help_text=_('Title of the report')
    )
    description = models.TextField(
        _('Description'),
        blank=True, 
        null=True,
        help_text=_('Detailed description of the report')
    )
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='generated_reports',
        verbose_name=_('Project'),
        help_text=_('Project that this report belongs to')
    )
    template = models.ForeignKey(
        ReportTemplate, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='generated_reports',
        verbose_name=_('Template'),
        help_text=_('Template used to generate this report')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='generated_reports',
        verbose_name=_('Created by'),
        help_text=_('User that generated this report')
    )
    created_at = models.DateTimeField(
        _('Created at'),
        auto_now_add=True,
        help_text=_('Date and time when the report was generated')
    )
    file = models.FileField(
        _('File'),
        upload_to='reports/',
        null=True, 
        blank=True,
        help_text=_('Generated report file')
    )
    format = models.CharField(
        _('Format'),
        max_length=10, 
        choices=FORMAT_CHOICES, 
        default='html',
        help_text=_('Format of the generated report')
    )
    parameters = models.JSONField(
        _('Parameters'),
        default=dict,
        help_text=_('Parameters used to generate the report')
    )
    is_favorite = models.BooleanField(
        _('Is favorite'),
        default=False,
        help_text=_('Whether this report is marked as a favorite')
    )
    
    class Meta:
        verbose_name = _('generated report')
        verbose_name_plural = _('generated reports')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'created_at']),
            models.Index(fields=['format']),
        ]
    
    def __str__(self):
        return self.title
    
    def get_file_url(self):
        """
        Return the URL of the report file
        """
        if self.file:
            return self.file.url
        return None