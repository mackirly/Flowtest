import django_filters
from django.db.models import Q
from .models import Event


class EventFilter(django_filters.FilterSet):
    """Filter class for Event model"""
    
    # Date filters
    date = django_filters.DateFilter(field_name='date')
    date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    date_range = django_filters.DateFromToRangeFilter(field_name='date')
    
    # Text search
    search = django_filters.CharFilter(method='filter_search')
    
    # Choice filters
    event_type = django_filters.ChoiceFilter(choices=Event.EVENT_TYPES)
    priority = django_filters.ChoiceFilter(choices=Event.PRIORITY_CHOICES)
    
    # Boolean filters
    recurring = django_filters.BooleanFilter()
    is_past = django_filters.BooleanFilter(method='filter_is_past')
    is_upcoming = django_filters.BooleanFilter(method='filter_is_upcoming')
    is_today = django_filters.BooleanFilter(method='filter_is_today')
    
    # Related object filters
    project = django_filters.NumberFilter(field_name='project__id')
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    
    # Time-based filters
    has_time = django_filters.BooleanFilter(method='filter_has_time')
    
    class Meta:
        model = Event
        fields = [
            'date', 'date_after', 'date_before', 'date_range',
            'event_type', 'priority', 'recurring', 'project',
            'created_by', 'search', 'is_past', 'is_upcoming',
            'is_today', 'has_time'
        ]
    
    def filter_search(self, queryset, name, value):
        """Search in title and description"""
        return queryset.filter(
            Q(title__icontains=value) | 
            Q(description__icontains=value)
        )
    
    def filter_is_past(self, queryset, name, value):
        """Filter past events"""
        from django.utils import timezone
        today = timezone.now().date()
        
        if value:
            return queryset.filter(date__lt=today)
        else:
            return queryset.filter(date__gte=today)
    
    def filter_is_upcoming(self, queryset, name, value):
        """Filter upcoming events"""
        from django.utils import timezone
        today = timezone.now().date()
        
        if value:
            return queryset.filter(date__gt=today)
        else:
            return queryset.filter(date__lte=today)
    
    def filter_is_today(self, queryset, name, value):
        """Filter today's events"""
        from django.utils import timezone
        today = timezone.now().date()
        
        if value:
            return queryset.filter(date=today)
        else:
            return queryset.exclude(date=today)
    
    def filter_has_time(self, queryset, name, value):
        """Filter events that have time specified"""
        if value:
            return queryset.filter(time__isnull=False)
        else:
            return queryset.filter(time__isnull=True)