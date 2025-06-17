from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Event, EventParticipant, EventTestResult
from .serializers import (
    EventSerializer, 
    EventDetailSerializer, 
    EventCreateUpdateSerializer,
    EventSummarySerializer,
    EventCalendarSerializer,
    EventTestExecutionSerializer,
    EventParticipantSerializer,
    EventTestResultSerializer
)
from .filters import EventFilter
from testcases.models import TestCase


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events with full CRUD operations
    """
    queryset = Event.objects.select_related('created_by', 'project').prefetch_related('test_cases')
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = EventFilter
    
    def get_queryset(self):
        """Filter events based on user permissions"""
        user = self.request.user
        if not user.is_authenticated:
            return Event.objects.none()
        
        # Users can see events they created or events from projects they're members of
        return Event.objects.filter(
            Q(created_by=user) | 
            Q(project__members=user)
        ).select_related('created_by', 'project').prefetch_related('test_cases').distinct()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return EventDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EventCreateUpdateSerializer
        elif self.action in ['calendar', 'summary']:
            return EventCalendarSerializer
        return EventSerializer
    
    def perform_create(self, serializer):
        """Set the creator when creating an event"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Ensure only creator can update events"""
        event = self.get_object()
        if not event.can_user_edit(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to edit this event.")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Ensure only creator can delete events"""
        if not instance.can_user_delete(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to delete this event.")
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming events"""
        queryset = self.get_queryset().filter(
            date__gte=timezone.now().date()
        ).order_by('date', 'time')
        
        # Limit to next 30 days by default
        days_ahead = int(request.query_params.get('days', 30))
        end_date = timezone.now().date() + timedelta(days=days_ahead)
        queryset = queryset.filter(date__lte=end_date)
        
        serializer = EventSummarySerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's events"""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(date=today).order_by('time')
        
        serializer = EventSummarySerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Get events for calendar view with date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date parameters are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get events that could have occurrences in the date range
        queryset = self.get_queryset().filter(
            Q(date__lte=end) &  # Event date is before or on end date
            (Q(recurring=False, date__gte=start) |  # Non-recurring events in range
             Q(recurring=True, recurrence_end_date__gte=start) |  # Recurring with end date
             Q(recurring=True, recurrence_end_date__isnull=True))  # Recurring without end date
        )
        
        # Prepare calendar data
        calendar_data = []
        for event in queryset:
            occurrences = event.get_occurrences_in_range(start, end)
            if occurrences:
                event_data = {
                    'id': event.id,
                    'title': event.title,
                    'type': event.event_type,
                    'priority': event.priority,
                    'time': event.time.strftime('%H:%M') if event.time else None,
                    'project': event.project.name if event.project else None,
                    'recurring': event.recurring,
                    'dates': [date.isoformat() for date in occurrences]
                }
                calendar_data.append(event_data)
        
        return Response(calendar_data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get event statistics"""
        queryset = self.get_queryset()
        
        # Basic counts
        total_events = queryset.count()
        upcoming_events = queryset.filter(date__gte=timezone.now().date()).count()
        past_events = queryset.filter(date__lt=timezone.now().date()).count()
        today_events = queryset.filter(date=timezone.now().date()).count()
        
        # Events by type
        events_by_type = {}
        for event_type, _ in Event.EVENT_TYPES:
            count = queryset.filter(event_type=event_type).count()
            events_by_type[event_type] = count
        
        # Events by priority
        events_by_priority = {}
        for priority, _ in Event.PRIORITY_CHOICES:
            count = queryset.filter(priority=priority).count()
            events_by_priority[priority] = count
        
        # Recurring vs non-recurring
        recurring_events = queryset.filter(recurring=True).count()
        non_recurring_events = queryset.filter(recurring=False).count()
        
        return Response({
            'total_events': total_events,
            'upcoming_events': upcoming_events,
            'past_events': past_events,
            'today_events': today_events,
            'events_by_type': events_by_type,
            'events_by_priority': events_by_priority,
            'recurring_events': recurring_events,
            'non_recurring_events': non_recurring_events,
        })
    
    @action(detail=True, methods=['post'])
    def create_instances(self, request, pk=None):
        """Create individual event instances for a recurring event"""
        event = self.get_object()
        
        if not event.recurring:
            return Response(
                {"error": "This is not a recurring event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get occurrences and create instances
        occurrences = event.get_occurrences_in_range(start, end)
        created_events = []
        
        for occurrence_date in occurrences:
            if occurrence_date != event.date:  # Don't duplicate the original event
                new_event = Event.objects.create(
                    title=f"{event.title} ({occurrence_date})",
                    description=event.description,
                    event_type=event.event_type,
                    priority=event.priority,
                    date=occurrence_date,
                    time=event.time,
                    recurring=False,  # Individual instances are not recurring
                    project=event.project,
                    created_by=event.created_by,
                )
                new_event.test_cases.set(event.test_cases.all())
                created_events.append(new_event)
        
        serializer = EventSummarySerializer(created_events, many=True, context={'request': request})
        return Response({
            'created_count': len(created_events),
            'events': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get events summary for dashboard"""
        queryset = self.get_queryset()
        
        # Get next 5 upcoming events
        upcoming = queryset.filter(
            date__gte=timezone.now().date()
        ).order_by('date', 'time')[:5]
        
        # Get today's events
        today_events = queryset.filter(date=timezone.now().date()).order_by('time')
        
        # Get overdue events (past events that might need attention)
        overdue = queryset.filter(
            date__lt=timezone.now().date(),
            event_type__in=['deadline', 'test-execution']
        ).order_by('-date')[:3]
        
        return Response({
            'upcoming': EventSummarySerializer(upcoming, many=True, context={'request': request}).data,
            'today': EventSummarySerializer(today_events, many=True, context={'request': request}).data,
            'overdue': EventSummarySerializer(overdue, many=True, context={'request': request}).data,
        })
    
    @action(detail=True, methods=['get'])
    def execution(self, request, pk=None):
        """Get detailed test execution view for an event"""
        event = self.get_object()
        
        if event.event_type != 'test-execution':
            return Response(
                {"error": "This is not a test execution event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = EventTestExecutionSerializer(event, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join an event as a participant"""
        event = self.get_object()
        
        if event.event_type != 'test-execution':
            return Response(
                {"error": "Can only join test execution events"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        role = request.data.get('role', 'tester')
        
        # Check if user is already a participant
        if EventParticipant.objects.filter(event=event, user=request.user).exists():
            return Response(
                {"error": "You are already a participant in this event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        participant = EventParticipant.objects.create(
            event=event,
            user=request.user,
            role=role
        )
        
        serializer = EventParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave an event"""
        event = self.get_object()
        
        try:
            participant = EventParticipant.objects.get(event=event, user=request.user)
            participant.delete()
            return Response({"message": "Successfully left the event"})
        except EventParticipant.DoesNotExist:
            return Response(
                {"error": "You are not a participant in this event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def initialize_tests(self, request, pk=None):
        """Initialize test results for an event based on test selection"""
        event = self.get_object()
        
        if event.event_type != 'test-execution':
            return Response(
                {"error": "This is not a test execution event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is event creator or test lead
        if event.created_by != request.user:
            participant = EventParticipant.objects.filter(
                event=event, 
                user=request.user, 
                role='lead'
            ).first()
            if not participant:
                return Response(
                    {"error": "Only event creator or test lead can initialize tests"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get test cases based on selection type
        test_cases = []
        
        if event.test_selection_type == 'all':
            if event.project:
                test_cases = event.project.testcase_set.all()
        elif event.test_selection_type == 'folder':
            if event.project and event.selected_folders:
                test_cases = TestCase.objects.filter(
                    project=event.project,
                    folder_id__in=event.selected_folders
                )
        elif event.test_selection_type == 'specific':
            test_cases = event.test_cases.all()
        
        # Create test results
        created_count = 0
        for test_case in test_cases:
            test_result, created = EventTestResult.objects.get_or_create(
                event=event,
                test_case=test_case,
                defaults={'status': 'pending'}
            )
            if created:
                created_count += 1
        
        return Response({
            'message': f'Initialized {created_count} test results',
            'total_tests': test_cases.count()
        })
    
    @action(detail=True, methods=['get'], url_path='test-results')
    def test_results(self, request, pk=None):
        """Get test results for an event"""
        event = self.get_object()
        
        if event.event_type != 'test-execution':
            return Response(
                {"error": "This is not a test execution event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        assigned_to = request.query_params.get('assigned_to')
        
        queryset = event.test_results.all()
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        
        serializer = EventTestResultSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='test-results/(?P<result_id>[^/.]+)/update')
    def update_test_result(self, request, pk=None, result_id=None):
        """Update a specific test result"""
        event = self.get_object()
        
        try:
            test_result = event.test_results.get(id=result_id)
        except EventTestResult.DoesNotExist:
            return Response(
                {"error": "Test result not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is a participant
        if not event.participants.filter(user=request.user).exists():
            return Response(
                {"error": "Only event participants can update test results"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = EventTestResultSerializer(
            test_result, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='assign-tests')
    def assign_tests(self, request, pk=None):
        """Assign tests to participants"""
        event = self.get_object()
        
        if event.event_type != 'test-execution':
            return Response(
                {"error": "This is not a test execution event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is event creator or test lead
        if event.created_by != request.user:
            participant = EventParticipant.objects.filter(
                event=event, 
                user=request.user, 
                role='lead'
            ).first()
            if not participant:
                return Response(
                    {"error": "Only event creator or test lead can assign tests"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        assignments = request.data.get('assignments', [])
        # assignments format: [{"test_result_id": 1, "user_id": 2}, ...]
        
        updated_count = 0
        for assignment in assignments:
            try:
                test_result = event.test_results.get(id=assignment['test_result_id'])
                user_id = assignment.get('user_id')
                
                if user_id:
                    # Check if user is a participant
                    if event.participants.filter(user_id=user_id).exists():
                        test_result.assigned_to_id = user_id
                        test_result.save()
                        updated_count += 1
                else:
                    # Unassign
                    test_result.assigned_to = None
                    test_result.save()
                    updated_count += 1
                    
            except (EventTestResult.DoesNotExist, KeyError):
                continue
        
        return Response({
            'message': f'Updated {updated_count} test assignments'
        })