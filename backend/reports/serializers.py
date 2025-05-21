from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import ReportTemplate, CustomChart, GeneratedReport, SchedulerEvent
from core.serializers import UserSerializer


class ReportTemplateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для шаблонов отчетов
    """
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'description', 'created_by', 'created_at', 'updated_at',
            'is_default', 'configuration', 'is_deleted', 'project'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'project', 'is_deleted']


class CustomChartSerializer(serializers.ModelSerializer):
    """
    Сериализатор для пользовательских графиков
    """
    created_by = UserSerializer(read_only=True)
    chart_type_display = serializers.CharField(source='get_chart_type_display', read_only=True)
    data_source_display = serializers.CharField(source='get_data_source_display', read_only=True)
    
    class Meta:
        model = CustomChart
        fields = [
            'id', 'name', 'description', 'chart_type', 'data_source',
            'configuration', 'custom_query', 'created_by', 'created_at',
            'updated_at', 'project', 'is_public', 'chart_type_display',
            'data_source_display'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'project']
        extra_kwargs = {
            'custom_query': {'write_only': True}  # Скрываем запрос из соображений безопасности
        }


class GeneratedReportSerializer(serializers.ModelSerializer):
    """
    Сериализатор для сгенерированных отчетов
    """
    created_by = UserSerializer(read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneratedReport
        fields = [
            'id', 'title', 'description', 'project', 'template', 'template_name',
            'created_by', 'created_at', 'file', 'format', 'format_display',
            'parameters', 'is_favorite', 'download_url'
        ]
        read_only_fields = [
            'created_at', 'created_by', 'project', 'file', 'download_url',
            'template_name', 'format_display'
        ]
    
    def get_download_url(self, obj):
        """
        Получить URL для скачивания отчета
        """
        if not obj.file:
            return None
            
        request = self.context.get('request')
        if request is None:
            return None
            
        return request.build_absolute_uri(f'/api/reports/projects/{obj.project.id}/reports/{obj.id}/download/')


class GenerateReportSerializer(serializers.Serializer):
    """
    Сериализатор для генерации отчетов
    """
    title = serializers.CharField(required=True, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    template_id = serializers.IntegerField(required=False, allow_null=True)
    use_default_template = serializers.BooleanField(required=False, default=False)
    format = serializers.ChoiceField(
        required=False, 
        default='html',
        choices=GeneratedReport.FORMAT_CHOICES
    )
    parameters = serializers.JSONField(required=False, default=dict)
    
    # Параметры для фильтрации данных отчета
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    include_test_runs = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    include_test_cases = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )


class SchedulerEventSerializer(serializers.ModelSerializer):
    """
    Сериализатор для запланированных событий
    """
    created_by = UserSerializer(read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    recurrence_display = serializers.CharField(source='get_recurrence_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = SchedulerEvent
        fields = [
            'id', 'title', 'description', 'event_type', 'event_type_display',
            'scheduled_time', 'recurrence', 'recurrence_display', 'project',
            'parent_event', 'configuration', 'created_at', 'updated_at',
            'last_run', 'next_run', 'status', 'status_display', 'created_by'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'created_by', 'project',
            'last_run', 'next_run', 'event_type_display',
            'recurrence_display', 'status_display'
        ]
    
    def validate(self, data):
        """
        Проверка, что конфигурация события соответствует его типу
        """
        event_type = data.get('event_type')
        configuration = data.get('configuration')
        
        if event_type == 'run_tests' and (not configuration or 'test_ids' not in configuration):
            raise serializers.ValidationError({
                'configuration': _('Для запуска тестов необходимо указать идентификаторы тестов')
            })
        elif event_type == 'generate_report' and (not configuration or 'report_config' not in configuration):
            raise serializers.ValidationError({
                'configuration': _('Для генерации отчета необходимо указать конфигурацию отчета')
            })
            
        return data