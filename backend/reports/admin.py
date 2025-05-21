from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import ReportTemplate, CustomChart, GeneratedReport, SchedulerEvent


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для шаблонов отчетов
    """
    list_display = ('name', 'project', 'created_by', 'is_default', 'is_deleted', 'created_at')
    list_filter = ('is_default', 'is_deleted', 'created_at')
    search_fields = ('name', 'description', 'project__name', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'project', 'created_by')
        }),
        (_('Настройки'), {
            'fields': ('is_default', 'is_deleted', 'configuration')
        }),
        (_('Даты'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(CustomChart)
class CustomChartAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для пользовательских графиков
    """
    list_display = ('name', 'chart_type', 'data_source', 'project', 'is_public', 'created_by', 'created_at')
    list_filter = ('chart_type', 'data_source', 'is_public', 'created_at')
    search_fields = ('name', 'description', 'project__name', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'project', 'created_by')
        }),
        (_('Настройки графика'), {
            'fields': ('chart_type', 'data_source', 'is_public', 'configuration')
        }),
        (_('SQL-запрос'), {
            'fields': ('custom_query',),
            'classes': ('collapse',),
            'description': _('Пользовательский SQL-запрос для источника данных "custom_query"')
        }),
        (_('Даты'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для сгенерированных отчетов
    """
    list_display = ('title', 'project', 'template', 'format', 'created_by', 'is_favorite', 'created_at')
    list_filter = ('format', 'is_favorite', 'created_at')
    search_fields = ('title', 'description', 'project__name', 'created_by__email')
    readonly_fields = ('created_at',)
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'project', 'created_by')
        }),
        (_('Настройки отчета'), {
            'fields': ('template', 'format', 'is_favorite', 'parameters')
        }),
        (_('Файл'), {
            'fields': ('file',),
        }),
        (_('Даты'), {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )


@admin.register(SchedulerEvent)
class SchedulerEventAdmin(admin.ModelAdmin):
    """
    Административный интерфейс для запланированных событий
    """
    list_display = ('title', 'event_type', 'scheduled_time', 'recurrence', 'status', 'project', 'created_by')
    list_filter = ('event_type', 'recurrence', 'status', 'scheduled_time')
    search_fields = ('title', 'description', 'project__name', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at', 'last_run', 'next_run')
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'project', 'created_by')
        }),
        (_('Настройки события'), {
            'fields': ('event_type', 'scheduled_time', 'recurrence', 'status', 'configuration')
        }),
        (_('Связи'), {
            'fields': ('parent_event',),
            'classes': ('collapse',),
        }),
        (_('Даты и время'), {
            'fields': ('created_at', 'updated_at', 'last_run', 'next_run'),
            'classes': ('collapse',),
        }),
    )
    
    def has_add_permission(self, request):
        """
        Запрещаем ручное добавление событий через админку
        """
        return False