from rest_framework import serializers
from django.utils import timezone
from .models import Event, EventParticipant, EventTestResult
from projects.serializers import ProjectSerializer
from testcases.serializers import TestCaseSerializer
from core.serializers import UserSerializer


class EventSerializer(serializers.ModelSerializer):
    """Main event serializer with computed fields"""
    is_past = serializers.ReadOnlyField()
    is_today = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    test_cases_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_type', 'priority',
            'date', 'time', 'recurring', 'recurrence_interval',
            'recurrence_period', 'recurrence_end_date', 'project',
            'project_name', 'test_cases', 'test_cases_count',
            'test_selection_type', 'selected_folders',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'is_past', 'is_today', 'is_upcoming'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_test_cases_count(self, obj):
        return obj.test_cases.count()


class EventDetailSerializer(serializers.ModelSerializer):
    """Detailed event serializer with related objects"""
    created_by = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    test_cases = TestCaseSerializer(many=True, read_only=True)
    is_past = serializers.ReadOnlyField()
    is_today = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    next_occurrence = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_type', 'priority',
            'date', 'time', 'recurring', 'recurrence_interval',
            'recurrence_period', 'recurrence_end_date', 'project',
            'test_cases', 'test_selection_type', 'selected_folders',
            'created_by', 'created_at', 'updated_at',
            'is_past', 'is_today', 'is_upcoming', 'next_occurrence',
            'can_edit', 'can_delete'
        ]
    
    def get_next_occurrence(self, obj):
        next_date = obj.get_next_occurrence()
        return next_date.isoformat() if next_date else None
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_user_edit(request.user)
        return False
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_user_delete(request.user)
        return False


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating events"""
    
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'event_type', 'priority',
            'date', 'time', 'recurring', 'recurrence_interval',
            'recurrence_period', 'recurrence_end_date', 'project',
            'test_cases', 'test_selection_type', 'selected_folders'
        ]
    
    def validate(self, data):
        """Custom validation for event data"""
        # Validate recurrence settings
        if data.get('recurring', False):
            if not data.get('recurrence_interval') or not data.get('recurrence_period'):
                raise serializers.ValidationError(
                    "Recurrence interval and period are required for recurring events."
                )
            
            if data['recurrence_interval'] < 1:
                raise serializers.ValidationError(
                    "Recurrence interval must be at least 1."
                )
            
            # Validate end date
            event_date = data.get('date')
            end_date = data.get('recurrence_end_date')
            
            if end_date and event_date and end_date <= event_date:
                raise serializers.ValidationError(
                    "Recurrence end date must be after the event date."
                )
            
            # Check 3-year limit
            if event_date and end_date:
                from dateutil.relativedelta import relativedelta
                max_end_date = event_date + relativedelta(years=3)
                if end_date > max_end_date:
                    raise serializers.ValidationError(
                        "Recurrence cannot extend more than 3 years from the start date."
                    )
        
        # Validate test cases belong to the selected project
        project = data.get('project')
        test_cases = data.get('test_cases', [])
        
        if project and test_cases:
            # Check if all test cases belong to the project
            project_test_case_ids = set(project.testcase_set.values_list('id', flat=True))
            selected_test_case_ids = set(tc.id for tc in test_cases)
            
            if not selected_test_case_ids.issubset(project_test_case_ids):
                raise serializers.ValidationError(
                    "All selected test cases must belong to the selected project."
                )
        
        # Validate that test execution events should have a project
        if data.get('event_type') == 'test-execution' and not project:
            raise serializers.ValidationError(
                "Test execution events must be associated with a project."
            )
        
        # Validate test selection configuration for test-execution events
        if data.get('event_type') == 'test-execution':
            test_selection_type = data.get('test_selection_type')
            selected_folders = data.get('selected_folders', [])
            
            if test_selection_type == 'folder' and not selected_folders:
                raise serializers.ValidationError(
                    "At least one folder must be selected when using folder-based test selection."
                )
            
            if test_selection_type == 'specific' and not test_cases:
                raise serializers.ValidationError(
                    "At least one test case must be selected when using specific test selection."
                )
        
        return data
    
    def create(self, validated_data):
        """Create event with current user as creator"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class EventSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for event lists and calendar views"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'event_type', 'priority', 'date', 'time',
            'project_name', 'created_by_name', 'recurring'
        ]


class EventCalendarSerializer(serializers.ModelSerializer):
    """Serializer for calendar view with occurrence dates"""
    occurrences = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'event_type', 'priority', 'time',
            'project_name', 'recurring', 'occurrences'
        ]
    
    def get_occurrences(self, obj):
        """Get occurrences within the requested date range"""
        request = self.context.get('request')
        
        # Get date range from request parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date and end_date:
            from datetime import datetime
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            occurrences = obj.get_occurrences_in_range(start, end)
            return [date.isoformat() for date in occurrences]
        
        # If no date range specified, return just the original date
        return [obj.date.isoformat()]


class EventParticipantSerializer(serializers.ModelSerializer):
    """Serializer for event participants"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EventParticipant
        fields = ['id', 'event', 'user', 'user_name', 'user_full_name', 'role', 'joined_at']
        read_only_fields = ['joined_at']
    
    def get_user_full_name(self, obj):
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.username


class EventTestResultSerializer(serializers.ModelSerializer):
    """Serializer for event test results"""
    test_case_title = serializers.CharField(source='test_case.title', read_only=True)
    test_case_priority = serializers.CharField(source='test_case.priority', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    executed_by_name = serializers.CharField(source='executed_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = EventTestResult
        fields = [
            'id', 'event', 'test_case', 'test_case_title', 'test_case_priority',
            'assigned_to', 'assigned_to_name', 'executed_by', 'executed_by_name',
            'status', 'comment', 'error_message', 'executed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['executed_by', 'created_at', 'updated_at']
    
    def update(self, instance, validated_data):
        """Update test result and set execution details"""
        request = self.context.get('request')
        
        # If status is changing from pending to completed, set execution details
        if instance.status == 'pending' and validated_data.get('status') != 'pending':
            validated_data['executed_by'] = request.user
            validated_data['executed_at'] = timezone.now()
        
        return super().update(instance, validated_data)


class EventTestExecutionSerializer(serializers.ModelSerializer):
    """Enhanced event serializer for test execution view"""
    participants = EventParticipantSerializer(many=True, read_only=True)
    test_results = EventTestResultSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    statistics = serializers.SerializerMethodField()
    current_user_participant = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_type', 'priority',
            'date', 'time', 'project', 'created_by', 'participants',
            'test_results', 'progress', 'statistics', 'current_user_participant'
        ]
    
    def get_progress(self, obj):
        return obj.get_progress()
    
    def get_statistics(self, obj):
        return obj.get_statistics()
    
    def get_current_user_participant(self, obj):
        """Check if current user is a participant"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            participant = obj.participants.filter(user=request.user).first()
            if participant:
                return EventParticipantSerializer(participant).data
        return None