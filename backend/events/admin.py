from django.contrib import admin
from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'event_type', 'priority', 'date', 'time', 
        'project', 'recurring', 'created_by', 'created_at'
    ]
    list_filter = [
        'event_type', 'priority', 'recurring', 'date', 
        'created_at', 'project'
    ]
    search_fields = ['title', 'description', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'event_type', 'priority')
        }),
        ('Date & Time', {
            'fields': ('date', 'time')
        }),
        ('Recurrence', {
            'fields': ('recurring', 'recurrence_interval', 'recurrence_period', 'recurrence_end_date'),
            'classes': ('collapse',)
        }),
        ('Relations', {
            'fields': ('project', 'test_cases', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ('test_cases',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'created_by', 'project'
        ).prefetch_related('test_cases')
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new event
            obj.created_by = request.user
        super().save_model(request, obj, form, change)