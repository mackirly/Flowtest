from rest_framework import serializers
from .models import Project, Folder, TestCase, TestRun, SchedulerEvent, CustomUser, Role, Permission, AutomationProject, AutomationTest, TestSchedule, ReportTemplate, CustomChart


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class FolderSerializer(serializers.ModelSerializer):
    test_cases_count = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username', read_only=True, required=False)

    class Meta:
        model = Folder
        fields = '__all__'

    def get_test_cases_count(self, obj):
        return obj.test_cases.count()


class TestCaseSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True, required=False)

    class Meta:
        model = TestCase
        fields = '__all__'
        extra_kwargs = {
            'tags': {'required': False},
            'steps': {'required': False}
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if representation['tags'] is None:
            representation['tags'] = []
        if representation['steps'] is None:
            representation['steps'] = []
        return representation


class TestRunSerializer(serializers.ModelSerializer):
    test_case_title = serializers.CharField(source='test_case.title', read_only=True)
    executed_by_username = serializers.CharField(source='executor.username', read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = TestRun
        fields = ['id', 'test_case', 'test_case_title', 'status', 'started_at', 'finished_at', 
                 'execution_time', 'error_message', 'output', 'executor', 'executed_by_username', 'duration']
        read_only_fields = ['id', 'test_case_title', 'executed_by_username', 'duration']

    def get_duration(self, obj):
        if obj.started_at and obj.finished_at:
            return (obj.finished_at - obj.started_at).total_seconds()
        return None


class SchedulerEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchedulerEvent
        fields = '__all__'

    def validate(self, data):
        project = data.get('project')
        scheduled_time = data.get('scheduled_time')
        overlapping_events = SchedulerEvent.objects.filter(
            project=project,
            scheduled_time=scheduled_time
        )
        if self.instance:
            overlapping_events = overlapping_events.exclude(pk=self.instance.pk)
        if overlapping_events.exists():
            raise serializers.ValidationError('An event is already scheduled at this time for this project.')
        return data


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'description', 'category']

class RoleSerializer(serializers.ModelSerializer):
    permissions_details = PermissionSerializer(source='permissions', many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permissions_details', 'is_admin_role']


class CustomUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)
    theme = serializers.ChoiceField(choices=['light', 'dark'], required=False)

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'password', 'email', 'first_name', 'last_name', 
                  'middle_name', 'language', 'phone_number', 'avatar', 'theme', 'role']
        extra_kwargs = {
            'password': {'write_only': True},
            'theme': {'required': False}
        }

    def update(self, instance, validated_data):
        if 'avatar' in validated_data:
            if instance.avatar:
                instance.avatar.delete(save=False)
        if 'theme' in validated_data:
            instance.theme = validated_data['theme']
            instance.save(update_fields=['theme'])
            return instance
        return super().update(instance, validated_data)


class AutomationProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationProject
        fields = ['id', 'project', 'name', 'repository_url', 'repository_type',
                 'branch', 'framework', 'tests_directory', 'access_token', 
                 'username', 'last_sync', 'sync_status']
        read_only_fields = ['last_sync', 'sync_status']
        extra_kwargs = {
            'access_token': {'write_only': True},  # Токен не будет возвращаться в ответах API
            'username': {'write_only': True},  # Имя пользователя тоже скрываем
            'project': {'required': False}  # Делаем поле project необязательным
        }


class AutomationTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationTest
        fields = ['id', 'name', 'file_path', 'is_available', 'last_run', 'last_status']


class TestScheduleSerializer(serializers.ModelSerializer):
    tests = AutomationTestSerializer(many=True, read_only=True)

    class Meta:
        model = TestSchedule
        fields = ['id', 'project', 'schedule_time', 'tests', 'created_at']


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'description', 'created_by', 'project', 
                 'created_at', 'updated_at', 'configuration']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class CustomChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChart
        fields = ['id', 'name', 'description', 'chart_type', 'data_source', 
                 'configuration', 'custom_query', 'created_by', 'created_at', 
                 'updated_at', 'project']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class ReportMetricsSerializer(serializers.Serializer):
    success_rate = serializers.FloatField()
    avg_duration = serializers.FloatField()
    total_tests = serializers.IntegerField()


class ReportChartDataSerializer(serializers.Serializer):
    trends = serializers.DictField()
    distribution = serializers.DictField()


class TestReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestRun
        fields = ['id', 'test_case', 'status', 'duration', 'started_at', 'finished_at']


class AnalyticsResponseSerializer(serializers.Serializer):
    metrics = ReportMetricsSerializer()
    charts = ReportChartDataSerializer()
    results = TestReportSerializer(many=True)
