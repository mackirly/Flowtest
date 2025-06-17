from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

User = get_user_model()


class Event(models.Model):
    EVENT_TYPES = [
        ('general', 'General Event'),
        ('test-execution', 'Test Execution'),
        ('maintenance', 'Maintenance'),
        ('meeting', 'Meeting'),
        ('deadline', 'Deadline'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    RECURRENCE_PERIODS = [
        ('day', 'Day'),
        ('week', 'Week'),
        ('month', 'Month'),
        ('year', 'Year'),
    ]
    
    TEST_SELECTION_TYPES = [
        ('all', 'All Tests'),
        ('folder', 'By Folders'),
        ('specific', 'Specific Test Cases'),
    ]
    
    # Basic event information
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='general')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Date and time
    date = models.DateField()
    time = models.TimeField(blank=True, null=True)
    
    # Recurrence settings
    recurring = models.BooleanField(default=False)
    recurrence_interval = models.PositiveIntegerField(blank=True, null=True, help_text="Repeat every X periods")
    recurrence_period = models.CharField(max_length=10, choices=RECURRENCE_PERIODS, blank=True, null=True)
    recurrence_end_date = models.DateField(blank=True, null=True)
    
    # Relations
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, blank=True, null=True)
    test_cases = models.ManyToManyField('testcases.TestCase', blank=True)
    
    # Test selection configuration (for test-execution events)
    test_selection_type = models.CharField(
        max_length=20, 
        choices=TEST_SELECTION_TYPES, 
        blank=True, 
        null=True,
        help_text="How tests are selected for execution"
    )
    selected_folders = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of folder IDs when test_selection_type is 'folder'"
    )
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date', 'time']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['event_type']),
            models.Index(fields=['created_by']),
            models.Index(fields=['project']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.date}"
    
    def clean(self):
        # Validate recurrence settings
        if self.recurring:
            if not self.recurrence_interval or not self.recurrence_period:
                raise ValidationError("Recurrence interval and period are required for recurring events.")
            
            if self.recurrence_interval < 1:
                raise ValidationError("Recurrence interval must be at least 1.")
            
            if self.recurrence_end_date and self.recurrence_end_date <= self.date:
                raise ValidationError("Recurrence end date must be after the event date.")
            
            # Check 3-year limit
            max_end_date = self.date + relativedelta(years=3)
            if self.recurrence_end_date and self.recurrence_end_date > max_end_date:
                raise ValidationError("Recurrence cannot extend more than 3 years from the start date.")
        
        # Validate test case relationships
        if self.event_type == 'test-execution' and self.project:
            # Note: This validation will be done in the serializer since
            # we can't access many-to-many fields during model validation
            pass
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_past(self):
        """Check if the event is in the past"""
        return self.date < timezone.now().date()
    
    @property
    def is_today(self):
        """Check if the event is today"""
        return self.date == timezone.now().date()
    
    @property
    def is_upcoming(self):
        """Check if the event is in the future"""
        return self.date > timezone.now().date()
    
    def get_next_occurrence(self, from_date=None):
        """Get the next occurrence of this recurring event"""
        if not self.recurring:
            return None
        
        if from_date is None:
            from_date = timezone.now().date()
        
        if from_date <= self.date:
            return self.date
        
        # Calculate next occurrence based on recurrence pattern
        current_date = self.date
        
        while current_date <= from_date:
            if self.recurrence_period == 'day':
                current_date += timedelta(days=self.recurrence_interval)
            elif self.recurrence_period == 'week':
                current_date += timedelta(weeks=self.recurrence_interval)
            elif self.recurrence_period == 'month':
                current_date += relativedelta(months=self.recurrence_interval)
            elif self.recurrence_period == 'year':
                current_date += relativedelta(years=self.recurrence_interval)
        
        # Check if next occurrence is within end date
        if self.recurrence_end_date and current_date > self.recurrence_end_date:
            return None
        
        return current_date
    
    def get_occurrences_in_range(self, start_date, end_date):
        """Get all occurrences of this event within a date range"""
        occurrences = []
        
        # Always include the original event if it's in range
        if start_date <= self.date <= end_date:
            occurrences.append(self.date)
        
        if not self.recurring:
            return occurrences
        
        # Generate recurring occurrences
        current_date = self.date
        max_end_date = self.recurrence_end_date or end_date
        
        while current_date <= min(end_date, max_end_date):
            if self.recurrence_period == 'day':
                current_date += timedelta(days=self.recurrence_interval)
            elif self.recurrence_period == 'week':
                current_date += timedelta(weeks=self.recurrence_interval)
            elif self.recurrence_period == 'month':
                current_date += relativedelta(months=self.recurrence_interval)
            elif self.recurrence_period == 'year':
                current_date += relativedelta(years=self.recurrence_interval)
            
            if start_date <= current_date <= end_date and current_date <= max_end_date:
                occurrences.append(current_date)
        
        return occurrences
    
    def can_user_view(self, user):
        """Check if user can view this event"""
        if not user.is_authenticated:
            return False
        
        # Event creator can always view
        if self.created_by == user:
            return True
        
        # Check project permissions if event is associated with a project
        if self.project:
            return self.project.members.filter(id=user.id).exists()
        
        # For events without project, only creator can view
        return False
    
    def can_user_edit(self, user):
        """Check if user can edit this event"""
        if not user.is_authenticated:
            return False
        
        # Only creator can edit
        return self.created_by == user
    
    def can_user_delete(self, user):
        """Check if user can delete this event"""
        return self.can_user_edit(user)
    
    def get_progress(self):
        """Get test execution progress for this event"""
        if self.event_type != 'test-execution':
            return None
        
        total_tests = self.test_results.count()
        if total_tests == 0:
            return {
                'total': 0,
                'completed': 0,
                'percentage': 0
            }
        
        completed_tests = self.test_results.exclude(status='pending').count()
        percentage = round((completed_tests / total_tests) * 100, 1)
        
        return {
            'total': total_tests,
            'completed': completed_tests,
            'percentage': percentage
        }
    
    def get_statistics(self):
        """Get test execution statistics"""
        if self.event_type != 'test-execution':
            return None
        
        from django.db.models import Count
        stats = self.test_results.values('status').annotate(count=Count('status'))
        
        result = {
            'total': self.test_results.count(),
            'pending': 0,
            'passed': 0,
            'failed': 0,
            'skipped': 0,
            'blocked': 0
        }
        
        for stat in stats:
            result[stat['status']] = stat['count']
        
        return result


class EventParticipant(models.Model):
    """Model to track event participants"""
    ROLE_CHOICES = [
        ('tester', 'Tester'),
        ('observer', 'Observer'),
        ('lead', 'Test Lead'),
    ]
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_participations')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tester')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['event', 'user']
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user} - {self.event.title}"


class EventTestResult(models.Model):
    """Model to track test results within an event"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
        ('blocked', 'Blocked'),
    ]
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='test_results')
    test_case = models.ForeignKey('testcases.TestCase', on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_event_tests')
    executed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='executed_event_tests')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    comment = models.TextField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    
    executed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['event', 'test_case']
        ordering = ['test_case__title']
    
    def __str__(self):
        return f"{self.event.title} - {self.test_case.title} - {self.status}"