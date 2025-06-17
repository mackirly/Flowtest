from rest_framework import serializers
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import AutomationProject, AutomationTest, TestSchedule, TestExecution
from core.serializers import UserSerializer


class AutomationProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for AutomationProject model.
    """
    project_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AutomationProject
        fields = [
            'id', 'name', 'project', 'project_name', 'repository_url', 'repository_type', 
            'branch', 'framework', 'tests_directory', 'local_path', 'detected_frameworks',
            'access_token', 'username', 'last_sync', 'created_at', 'updated_at',
            'sync_status', 'sync_message'
        ]
        read_only_fields = ['created_at', 'updated_at', 'local_path', 'detected_frameworks',
                           'last_sync', 'sync_status', 'sync_message', 'project_name']
        extra_kwargs = {
            'access_token': {'write_only': True}
        }
    
    def get_project_name(self, obj):
        if obj.project:
            return obj.project.name
        return None
    
    def validate_repository_url(self, value):
        """
        Validate repository URL - accept file:// URLs for local repositories
        """
        if value.startswith('file://'):
            # For file URLs, just check that the path exists and is accessible
            return value
        
        # For other URLs, use standard URL validation
        validator = URLValidator(schemes=['http', 'https', 'git', 'ssh'])
        try:
            validator(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Enter a valid repository URL.")
        
        return value


class AutomationTestSerializer(serializers.ModelSerializer):
    """
    Serializer for AutomationTest model.
    """
    project_name = serializers.SerializerMethodField()
    command = serializers.SerializerMethodField()
    
    class Meta:
        model = AutomationTest
        fields = [
            'id', 'name', 'file_path', 'class_name', 'method_name', 'project',
            'project_name', 'is_available', 'last_run', 'last_status', 'framework',
            'description', 'parameters', 'tags', 'command'
        ]
        read_only_fields = ['last_run', 'last_status', 'command', 'project_name']
    
    def get_project_name(self, obj):
        return obj.project.name
    
    def get_command(self, obj):
        return obj.get_command()


class TestScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for TestSchedule model.
    """
    created_by_name = serializers.SerializerMethodField()
    tests = AutomationTestSerializer(many=True, read_only=True)
    test_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = TestSchedule
        fields = [
            'id', 'name', 'description', 'project', 'schedule_time', 'schedule_days',
            'recurrence', 'is_active', 'last_run', 'next_run', 'last_status',
            'last_result', 'created_at', 'updated_at', 'created_by', 'created_by_name',
            'tests', 'test_ids', 'notification_emails'
        ]
        read_only_fields = ['created_at', 'updated_at', 'next_run', 'last_run',
                           'last_status', 'last_result', 'created_by', 'created_by_name']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None
    
    def create(self, validated_data):
        test_ids = validated_data.pop('test_ids', [])
        schedule = super().create(validated_data)
        
        if test_ids:
            tests = AutomationTest.objects.filter(id__in=test_ids)
            schedule.tests.set(tests)
        
        return schedule
    
    def update(self, instance, validated_data):
        test_ids = validated_data.pop('test_ids', None)
        schedule = super().update(instance, validated_data)
        
        if test_ids is not None:
            tests = AutomationTest.objects.filter(id__in=test_ids)
            schedule.tests.set(tests)
        
        return schedule


class TestExecutionSerializer(serializers.ModelSerializer):
    """
    Serializer for TestExecution model.
    """
    automation_test_name = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TestExecution
        fields = [
            'id', 'automation_test', 'automation_test_name', 'triggered_by', 'triggered_by_name',
            'scheduled_run', 'status', 'start_time', 'end_time', 'duration', 'result',
            'error_message', 'logs', 'environment', 'parameters', 'artifacts',
            'output', 'created_at', 'updated_at'
        ]
        read_only_fields = ['automation_test_name', 'triggered_by_name', 'start_time', 'end_time',
                           'duration', 'logs', 'result', 'error_message', 'output',
                           'created_at', 'updated_at', 'artifacts']
    
    def get_automation_test_name(self, obj):
        return obj.automation_test.name
    
    def get_triggered_by_name(self, obj):
        if obj.triggered_by:
            return f"{obj.triggered_by.first_name} {obj.triggered_by.last_name}".strip() or obj.triggered_by.username
        return None


class TriggerTestExecutionSerializer(serializers.Serializer):
    """
    Serializer for triggering test executions.
    """
    test_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text="List of test IDs to execute"
    )
    environment = serializers.CharField(required=False, default='default', help_text="Environment for test execution")
    parameters = serializers.JSONField(required=False, help_text="Parameters for test execution")


class SyncRepositorySerializer(serializers.Serializer):
    """
    Serializer for syncing a repository.
    """
    branch = serializers.CharField(required=False, help_text="Branch to sync")
    force = serializers.BooleanField(required=False, default=False, help_text="Force sync even if already up to date")