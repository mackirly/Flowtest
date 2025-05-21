from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import TestCase, TestRun, TestReport, TestEvent
from projects.models import Project, Folder
from projects.serializers import ProjectSerializer, FolderSerializer

User = get_user_model()


class TestCaseSerializer(serializers.ModelSerializer):
    """Serializer for TestCase model"""
    author_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TestCase
        fields = [
            'id', 'title', 'description', 'created_at', 'updated_at',
            'condition', 'steps', 'expected_results', 'folder', 'folder_name',
            'project', 'project_name', 'priority', 'platform', 'test_type',
            'author', 'author_name', 'status', 'tags'
        ]
        read_only_fields = ['created_at', 'updated_at', 'author', 'author_name', 
                           'status', 'folder_name', 'project_name']
    
    def get_author_name(self, obj):
        """Get the name of the author"""
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username
        return None
    
    def get_status(self, obj):
        """Get the current status of the test case"""
        return obj.get_status()
    
    def get_folder_name(self, obj):
        """Get the name of the folder"""
        if obj.folder:
            return obj.folder.name
        return None
    
    def get_project_name(self, obj):
        """Get the name of the project"""
        return obj.project.name
    
    def create(self, validated_data):
        """Create a new test case and set the author"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        return super().create(validated_data)
    
    def validate(self, data):
        """Validate that folder belongs to the project"""
        folder = data.get('folder')
        project = data.get('project')
        
        if folder and project and folder.project_id != project.id:
            raise serializers.ValidationError({"folder": "Folder must belong to the selected project"})
        
        return data


class AutomatedTestCaseSerializer(TestCaseSerializer):
    """Serializer for automated test cases"""
    class Meta(TestCaseSerializer.Meta):
        fields = TestCaseSerializer.Meta.fields + [
            'test_code', 'script_path', 'class_name', 'method_name',
            'framework', 'automation_project'
        ]


class TestRunSerializer(serializers.ModelSerializer):
    """Serializer for TestRun model"""
    executor_name = serializers.SerializerMethodField()
    test_case_title = serializers.SerializerMethodField()
    
    class Meta:
        model = TestRun
        fields = [
            'id', 'test_case', 'test_case_title', 'status', 'started_at', 'finished_at',
            'duration', 'error_message', 'output', 'executor', 'executor_name',
            'run_id'
        ]
        read_only_fields = ['started_at', 'finished_at', 'duration', 'executor', 
                           'executor_name', 'test_case_title']
    
    def get_executor_name(self, obj):
        """Get the name of the executor"""
        if obj.executor:
            return f"{obj.executor.first_name} {obj.executor.last_name}".strip() or obj.executor.username
        return None
    
    def get_test_case_title(self, obj):
        """Get the title of the test case"""
        if obj.test_case:
            return obj.test_case.title
        return None
    
    def create(self, validated_data):
        """Create a new test run and set the executor"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['executor'] = request.user
        
        # Set default timestamps
        if not validated_data.get('started_at'):
            validated_data['started_at'] = timezone.now()
            
        return super().create(validated_data)


class TestReportSerializer(serializers.ModelSerializer):
    """Serializer for TestReport model"""
    executor_name = serializers.SerializerMethodField()
    test_case_title = serializers.SerializerMethodField()
    
    class Meta:
        model = TestReport
        fields = [
            'id', 'test_case', 'test_case_title', 'executor', 'executor_name',
            'status', 'execution_date', 'execution_time', 'actual_result',
            'comments', 'attachments', 'environment', 'version', 'report_id'
        ]
        read_only_fields = ['execution_date', 'executor', 'executor_name', 'test_case_title']
    
    def get_executor_name(self, obj):
        """Get the name of the executor"""
        if obj.executor:
            return f"{obj.executor.first_name} {obj.executor.last_name}".strip() or obj.executor.username
        return None
    
    def get_test_case_title(self, obj):
        """Get the title of the test case"""
        return obj.test_case.title
    
    def create(self, validated_data):
        """Create a new test report and set the executor"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['executor'] = request.user
        return super().create(validated_data)


class TestEventSerializer(serializers.ModelSerializer):
    """Serializer for TestEvent model"""
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TestEvent
        fields = [
            'id', 'test_case', 'test_report', 'event_type', 'timestamp',
            'description', 'details', 'created_by', 'created_by_name',
            'severity', 'screenshot', 'log_file'
        ]
        read_only_fields = ['timestamp', 'created_by', 'created_by_name']
    
    def get_created_by_name(self, obj):
        """Get the name of the creator"""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None
    
    def create(self, validated_data):
        """Create a new test event and set the creator"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ExecuteTestSerializer(serializers.Serializer):
    """Serializer for test execution request"""
    parameters = serializers.JSONField(required=False, help_text="Test parameters")
    environment = serializers.CharField(required=False, help_text="Test environment")
    version = serializers.CharField(required=False, help_text="Software version")
    

class BatchExecuteTestsSerializer(serializers.Serializer):
    """Serializer for batch test execution request"""
    test_case_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text="List of test case IDs to execute"
    )
    parameters = serializers.JSONField(required=False, help_text="Test parameters")
    environment = serializers.CharField(required=False, help_text="Test environment")
    version = serializers.CharField(required=False, help_text="Software version")
    

class TestCaseImportSerializer(serializers.Serializer):
    """Serializer for importing test cases"""
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=True,
        help_text="Project to import test cases into"
    )
    folder = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        required=False,
        help_text="Folder to import test cases into"
    )
    file = serializers.FileField(
        required=True,
        help_text="CSV or JSON file with test cases"
    )
    format = serializers.ChoiceField(
        choices=['csv', 'json'],
        required=True,
        help_text="Format of the import file"
    )
    
    def validate(self, data):
        """Validate that folder belongs to the project"""
        folder = data.get('folder')
        project = data.get('project')
        
        if folder and folder.project_id != project.id:
            raise serializers.ValidationError({"folder": "Folder must belong to the selected project"})
        
        return data


class TestCaseExportSerializer(serializers.Serializer):
    """Serializer for exporting test cases"""
    test_case_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of test case IDs to export"
    )
    project_id = serializers.IntegerField(
        required=False,
        help_text="Project ID to export all test cases from"
    )
    folder_id = serializers.IntegerField(
        required=False,
        help_text="Folder ID to export all test cases from"
    )
    format = serializers.ChoiceField(
        choices=['csv', 'json', 'pdf', 'html'],
        required=True,
        help_text="Format of the export file"
    )
    include_results = serializers.BooleanField(
        default=False,
        help_text="Whether to include test results in the export"
    )
    
    def validate(self, data):
        """Validate that at least one of test_case_ids, project_id or folder_id is provided"""
        test_case_ids = data.get('test_case_ids')
        project_id = data.get('project_id')
        folder_id = data.get('folder_id')
        
        if not test_case_ids and not project_id and not folder_id:
            raise serializers.ValidationError(
                "At least one of test_case_ids, project_id or folder_id must be provided"
            )
        
        return data