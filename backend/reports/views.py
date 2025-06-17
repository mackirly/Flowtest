from django.shortcuts import get_object_or_404
from django.http import HttpResponse, Http404
from django.db.models import Count, Q, F, Sum, Avg, Min, Max
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import random
from datetime import timedelta

from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from projects.models import Project
from testcases.models import TestCase, TestRun
from core.permissions import IsProjectMember
from .models import ReportTemplate, CustomChart, GeneratedReport, SchedulerEvent
from . import serializers


class ReportPagination(PageNumberPagination):
    """
    Пагинация для списка отчетов
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """
    API для работы с шаблонами отчетов
    """
    serializer_class = serializers.ReportTemplateSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = ReportPagination

    def get_queryset(self):
        """
        Получить список шаблонов отчетов для проекта
        """
        project_id = self.kwargs.get('project_id')
        return ReportTemplate.objects.filter(
            project_id=project_id,
            is_deleted=False
        ).select_related('created_by', 'project')

    def perform_create(self, serializer):
        """
        Создать новый шаблон отчета
        """
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        serializer.save(created_by=self.request.user, project=project)

    @extend_schema(
        parameters=[
            OpenApiParameter(name='is_default', location=OpenApiParameter.QUERY, 
                            description='Фильтр по признаку "по умолчанию"', type=bool),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Получить список шаблонов отчетов
        """
        is_default = request.query_params.get('is_default')
        queryset = self.get_queryset()
        
        if is_default is not None:
            is_default = is_default.lower() == 'true'
            queryset = queryset.filter(is_default=is_default)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None, project_id=None):
        """
        Установить шаблон отчета по умолчанию
        """
        template = self.get_object()
        
        # Снимаем признак "по умолчанию" у всех шаблонов проекта
        ReportTemplate.objects.filter(
            project_id=project_id, 
            is_default=True
        ).update(is_default=False)
        
        # Устанавливаем новый шаблон по умолчанию
        template.is_default = True
        template.save()
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None, project_id=None):
        """
        Клонировать шаблон отчета
        """
        template = self.get_object()
        
        # Создаем новый шаблон с теми же параметрами
        new_template = ReportTemplate.objects.create(
            name=f"Копия {template.name}",
            description=template.description,
            created_by=request.user,
            project_id=project_id,
            configuration=template.configuration,
            is_default=False
        )
        
        serializer = self.get_serializer(new_template)
        return Response(serializer.data)
        
    def destroy(self, request, *args, **kwargs):
        """
        Мягкое удаление шаблона отчета
        """
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomChartViewSet(viewsets.ModelViewSet):
    """
    API для работы с пользовательскими графиками
    """
    serializer_class = serializers.CustomChartSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = ReportPagination

    def get_queryset(self):
        """
        Получить список графиков для проекта
        """
        project_id = self.kwargs.get('project_id')
        user = self.request.user
        
        # Пользователь может видеть публичные графики и свои собственные
        return CustomChart.objects.filter(
            project_id=project_id
        ).filter(
            Q(is_public=True) | Q(created_by=user)
        ).select_related('created_by', 'project')

    def perform_create(self, serializer):
        """
        Создать новый график
        """
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        serializer.save(created_by=self.request.user, project=project)

    @extend_schema(
        parameters=[
            OpenApiParameter(name='chart_type', location=OpenApiParameter.QUERY, 
                            description='Фильтр по типу графика', type=str),
            OpenApiParameter(name='data_source', location=OpenApiParameter.QUERY, 
                            description='Фильтр по источнику данных', type=str),
            OpenApiParameter(name='is_public', location=OpenApiParameter.QUERY, 
                            description='Фильтр по признаку "публичный"', type=bool),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Получить список графиков
        """
        queryset = self.get_queryset()
        
        chart_type = request.query_params.get('chart_type')
        data_source = request.query_params.get('data_source')
        is_public = request.query_params.get('is_public')
        
        if chart_type:
            queryset = queryset.filter(chart_type=chart_type)
            
        if data_source:
            queryset = queryset.filter(data_source=data_source)
            
        if is_public is not None:
            is_public = is_public.lower() == 'true'
            queryset = queryset.filter(is_public=is_public)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def data(self, request, pk=None, project_id=None):
        """
        Получить данные для графика
        """
        chart = self.get_object()
        project = get_object_or_404(Project, id=project_id)
        
        # Получаем параметры фильтрации из запроса
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Генерируем данные для графика в зависимости от его типа
        if chart.data_source == 'test_status':
            # Статистика по статусам тестов
            from testcases.models import TestCase, TestRun, TestReport
            
            query = Q(project=project)
            
            if start_date:
                query &= Q(test_runs__started_at__gte=start_date)
            if end_date:
                query &= Q(test_runs__started_at__lte=end_date)
            
            test_runs = TestRun.objects.filter(
                test_case__project=project
            )
            
            if start_date:
                test_runs = test_runs.filter(started_at__gte=start_date)
            if end_date:
                test_runs = test_runs.filter(started_at__lte=end_date)
            
            status_counts = test_runs.values('status').annotate(count=Count('id'))
            
            labels = []
            data = []
            background_colors = []
            
            for status_info in status_counts:
                status = status_info['status']
                count = status_info['count']
                
                labels.append(status)
                data.append(count)
                
                # Определяем цвет в зависимости от статуса
                if status == 'passed':
                    background_colors.append('rgba(75, 192, 192, 0.2)')
                elif status == 'failed':
                    background_colors.append('rgba(255, 99, 132, 0.2)')
                elif status == 'error':
                    background_colors.append('rgba(255, 159, 64, 0.2)')
                elif status == 'skipped':
                    background_colors.append('rgba(153, 102, 255, 0.2)')
                else:
                    background_colors.append('rgba(201, 203, 207, 0.2)')
            
            return Response({
                'labels': labels,
                'datasets': [{
                    'label': 'Статус тестов',
                    'data': data,
                    'backgroundColor': background_colors,
                    'borderColor': [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(201, 203, 207, 1)'
                    ],
                    'borderWidth': 1
                }]
            })
            
        elif chart.data_source == 'daily_trends':
            # Ежедневная статистика выполнения тестов
            from testcases.models import TestRun
            import datetime
            
            # Подготавливаем даты
            if not start_date:
                start_date = (timezone.now() - datetime.timedelta(days=30)).date()
            else:
                start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
                
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Получаем статистику по дням
            daily_stats = []
            current_date = start_date
            
            while current_date <= end_date:
                next_date = current_date + datetime.timedelta(days=1)
                
                # Получаем количество прогонов тестов за день
                day_runs = TestRun.objects.filter(
                    test_case__project=project,
                    started_at__gte=datetime.datetime.combine(current_date, datetime.time.min),
                    started_at__lt=datetime.datetime.combine(next_date, datetime.time.min)
                )
                
                passed = day_runs.filter(status='passed').count()
                failed = day_runs.filter(status='failed').count()
                other = day_runs.exclude(status__in=['passed', 'failed']).count()
                
                daily_stats.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'passed': passed,
                    'failed': failed,
                    'other': other,
                    'total': passed + failed + other
                })
                
                current_date = next_date
            
            # Форматируем данные для графика
            labels = [stat['date'] for stat in daily_stats]
            passed_data = [stat['passed'] for stat in daily_stats]
            failed_data = [stat['failed'] for stat in daily_stats]
            other_data = [stat['other'] for stat in daily_stats]
            total_data = [stat['total'] for stat in daily_stats]
            
            return Response({
                'labels': labels,
                'datasets': [
                    {
                        'label': 'Успешные',
                        'data': passed_data,
                        'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                        'borderColor': 'rgba(75, 192, 192, 1)',
                        'borderWidth': 1
                    },
                    {
                        'label': 'Неудачные',
                        'data': failed_data,
                        'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                        'borderColor': 'rgba(255, 99, 132, 1)',
                        'borderWidth': 1
                    },
                    {
                        'label': 'Прочие',
                        'data': other_data,
                        'backgroundColor': 'rgba(153, 102, 255, 0.2)',
                        'borderColor': 'rgba(153, 102, 255, 1)',
                        'borderWidth': 1
                    },
                    {
                        'label': 'Всего',
                        'data': total_data,
                        'backgroundColor': 'rgba(201, 203, 207, 0.2)',
                        'borderColor': 'rgba(201, 203, 207, 1)',
                        'borderWidth': 1,
                        'hidden': True
                    }
                ]
            })
            
        elif chart.data_source == 'custom_query' and chart.custom_query:
            # Пользовательский SQL-запрос
            # В реальном приложении здесь нужно добавить проверки безопасности
            from django.db import connection
            
            try:
                with connection.cursor() as cursor:
                    cursor.execute(chart.custom_query)
                    rows = cursor.fetchall()
                    
                    # Получаем названия колонок
                    columns = [col[0] for col in cursor.description]
                    
                    # Преобразуем в список словарей
                    results = []
                    for row in rows:
                        results.append(dict(zip(columns, row)))
                    
                    # Форматируем данные для графика
                    if 'label' in columns and 'value' in columns:
                        # Простой формат: метка и значение
                        labels = [row['label'] for row in results]
                        data = [row['value'] for row in results]
                        
                        return Response({
                            'labels': labels,
                            'datasets': [{
                                'label': 'Значение',
                                'data': data,
                                'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                                'borderColor': 'rgba(54, 162, 235, 1)',
                                'borderWidth': 1
                            }]
                        })
                    else:
                        # Возвращаем сырые данные
                        return Response(results)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Заглушка для других типов источников данных
            return Response({
                'labels': ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5'],
                'datasets': [{
                    'label': 'Значение',
                    'data': [12, 19, 3, 5, 2],
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                    'borderColor': 'rgba(54, 162, 235, 1)',
                    'borderWidth': 1
                }]
            })

    @action(detail=True, methods=['post'])
    def toggle_public(self, request, pk=None, project_id=None):
        """
        Переключить признак публичности графика
        """
        chart = self.get_object()
        
        # Только автор может менять признак публичности
        if chart.created_by != request.user:
            return Response(
                {'detail': _('Только автор может менять публичность графика')},
                status=status.HTTP_403_FORBIDDEN
            )
        
        chart.is_public = not chart.is_public
        chart.save()
        
        serializer = self.get_serializer(chart)
        return Response(serializer.data)


class GeneratedReportViewSet(viewsets.ModelViewSet):
    """
    API для работы с сгенерированными отчетами
    """
    serializer_class = serializers.GeneratedReportSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = ReportPagination
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """
        Получить список отчетов для проекта
        """
        project_id = self.kwargs.get('project_id')
        
        # Базовый запрос
        queryset = GeneratedReport.objects.filter(
            project_id=project_id
        ).select_related('created_by', 'project', 'template')
        
        # Фильтрация по избранным
        favorite = self.request.query_params.get('favorite')
        if favorite and favorite.lower() == 'true':
            queryset = queryset.filter(is_favorite=True)
            
        # Фильтрация по формату
        format_type = self.request.query_params.get('format')
        if format_type:
            queryset = queryset.filter(format=format_type)
            
        # Фильтрация по шаблону
        template_id = self.request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
            
        # Фильтрация по создателю
        created_by = self.request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by_id=created_by)
            
        return queryset

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None, project_id=None):
        """
        Скачать файл отчета
        """
        report = self.get_object()
        
        if not report.file:
            raise Http404(_('Файл отчета не найден'))
        
        # Определяем content_type в зависимости от формата
        content_types = {
            'pdf': 'application/pdf',
            'html': 'text/html',
            'csv': 'text/csv',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
        
        content_type = content_types.get(report.format, 'application/octet-stream')
        
        # Открываем файл и возвращаем его содержимое
        response = HttpResponse(report.file.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{report.file.name.split("/")[-1]}"'
        
        return response

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None, project_id=None):
        """
        Переключить признак избранного отчета
        """
        report = self.get_object()
        report.is_favorite = not report.is_favorite
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def generate(self, request, project_id=None):
        """
        Сгенерировать новый отчет
        """
        serializer = serializers.GenerateReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Валидируем данные
        data = serializer.validated_data
        project = get_object_or_404(Project, id=project_id)
        
        # Получаем шаблон отчета
        template = None
        if data.get('template_id'):
            template = get_object_or_404(
                ReportTemplate, 
                id=data['template_id'], 
                project=project
            )
        elif data.get('use_default_template', False):
            # Используем шаблон по умолчанию
            template = ReportTemplate.objects.filter(
                project=project,
                is_default=True
            ).first()
        
        # Создаем отчет
        report = GeneratedReport.objects.create(
            title=data['title'],
            description=data.get('description', ''),
            project=project,
            template=template,
            created_by=request.user,
            format=data.get('format', 'html'),
            parameters=data.get('parameters', {})
        )
        
        # В реальном приложении здесь будет запуск задачи Celery
        # для асинхронной генерации отчета
        # generate_report_task.delay(report.id)
        
        # Для примера, присвоим отчету фиктивный файл
        # (в реальном приложении файл будет создан задачей Celery)
        
        return Response(
            self.get_serializer(report).data,
            status=status.HTTP_201_CREATED
        )


class SchedulerEventViewSet(viewsets.ModelViewSet):
    """
    API для работы с запланированными событиями
    """
    serializer_class = serializers.SchedulerEventSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = ReportPagination

    def get_queryset(self):
        """
        Получить список событий для проекта
        """
        project_id = self.kwargs.get('project_id')
        
        # Базовый запрос
        queryset = SchedulerEvent.objects.filter(
            project_id=project_id
        ).select_related('created_by', 'project', 'parent_event')
        
        # Фильтрация по типу события
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
            
        # Фильтрация по статусу
        status_value = self.request.query_params.get('status')
        if status_value:
            queryset = queryset.filter(status=status_value)
            
        # Фильтрация по рекуррентности
        recurrence = self.request.query_params.get('recurrence')
        if recurrence:
            queryset = queryset.filter(recurrence=recurrence)
            
        # Фильтрация по датам
        scheduled_after = self.request.query_params.get('scheduled_after')
        if scheduled_after:
            queryset = queryset.filter(scheduled_time__gte=scheduled_after)
            
        scheduled_before = self.request.query_params.get('scheduled_before')
        if scheduled_before:
            queryset = queryset.filter(scheduled_time__lte=scheduled_before)
            
        return queryset

    def perform_create(self, serializer):
        """
        Создать новое событие
        """
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        serializer.save(created_by=self.request.user, project=project)

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None, project_id=None):
        """
        Запустить событие немедленно
        """
        event = self.get_object()
        
        # Проверяем, что событие еще не запущено
        if event.status == 'running':
            return Response(
                {'detail': _('Событие уже запущено')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем статус события
        event.status = 'running'
        event.last_run = timezone.now()
        event.save()
        
        # В реальном приложении здесь будет запуск задачи Celery
        # в зависимости от типа события
        # if event.event_type == 'run_tests':
        #     run_tests_task.delay(event.id)
        # elif event.event_type == 'generate_report':
        #     generate_report_task.delay(event.id)
        # else:
        #     generic_event_task.delay(event.id)
        
        # Для примера, обновим статус события на 'completed'
        event.status = 'completed'
        event.save()
        
        # Если событие рекуррентное, создаем следующее
        if event.recurrence != 'none':
            next_event = event.clone_for_next_occurrence()
            if next_event:
                next_event.save()
                event.next_run = next_event.scheduled_time
                event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request, project_id=None):
        """
        Получить список предстоящих событий
        """
        queryset = self.get_queryset().filter(
            scheduled_time__gte=timezone.now(),
            status='pending'
        ).order_by('scheduled_time')[:10]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ReportsMetricsView(APIView):
    """
    API для получения метрик отчетов
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get metrics data for reports
        """
        # Get query parameters
        project_id = request.query_params.get('project_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        # Filter test runs based on parameters
        test_runs = TestRun.objects.all()
        
        if project_id:
            test_runs = test_runs.filter(test_case__project_id=project_id)
            
        if date_from:
            test_runs = test_runs.filter(started_at__gte=date_from)
            
        if date_to:
            test_runs = test_runs.filter(started_at__lte=date_to)
        
        # Calculate real metrics if we have data
        total_runs = test_runs.count()
        
        if total_runs > 0:
            # Real metrics from database
            passed_runs = test_runs.filter(status='passed').count()
            failed_runs = test_runs.filter(status='failed').count()
            skipped_runs = test_runs.filter(status='skipped').count()
            
            # Calculate success rate
            success_rate = (passed_runs / total_runs * 100) if total_runs > 0 else 0
            
            # Calculate durations
            duration_stats = test_runs.aggregate(
                avg_duration=Avg('duration'),
                min_duration=Min('duration'),
                max_duration=Max('duration'),
                total_duration=Sum('duration')
            )
            
            metrics = {
                'tests_passed': passed_runs,
                'tests_failed': failed_runs,
                'tests_skipped': skipped_runs,
                'tests_total': total_runs,
                'test_success_rate': round(success_rate, 2),
                'avg_test_duration': round(duration_stats['avg_duration'] or 0, 2),
                'min_test_duration': round(duration_stats['min_duration'] or 0, 2),
                'max_test_duration': round(duration_stats['max_duration'] or 0, 2),
                'total_execution_time': round((duration_stats['total_duration'] or 0) / 60, 2),
                # Mock coverage and quality data
                'code_coverage': round(random.uniform(70, 90), 1),
                'feature_coverage': round(random.uniform(75, 95), 1),
                'requirement_coverage': round(random.uniform(80, 98), 1),
                'defect_count': random.randint(10, 50),
                'defect_density': round(random.uniform(0.5, 2.5), 2),
                'quality_score': random.randint(75, 95)
            }
        else:
            # Mock data if no test runs
            metrics = {
                'tests_passed': random.randint(200, 300),
                'tests_failed': random.randint(5, 20),
                'tests_skipped': random.randint(0, 10),
                'tests_total': random.randint(250, 350),
                'test_success_rate': round(random.uniform(85, 95), 2),
                'avg_test_duration': round(random.uniform(1, 5), 2),
                'min_test_duration': round(random.uniform(0.1, 0.5), 2),
                'max_test_duration': round(random.uniform(30, 60), 2),
                'total_execution_time': round(random.uniform(5, 15), 2),
                'code_coverage': round(random.uniform(70, 90), 1),
                'feature_coverage': round(random.uniform(75, 95), 1),
                'requirement_coverage': round(random.uniform(80, 98), 1),
                'defect_count': random.randint(10, 50),
                'defect_density': round(random.uniform(0.5, 2.5), 2),
                'quality_score': random.randint(75, 95)
            }
        
        return Response(metrics)


class ReportsChartDataView(APIView):
    """
    API для получения данных графиков
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get chart data for specific metric
        """
        metric_type = request.query_params.get('metric_type')
        project_id = request.query_params.get('project_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        group_by = request.query_params.get('group_by', 'day')
        
        # Generate mock chart data
        labels = []
        data = []
        
        if group_by == 'day':
            # Generate last 7 days
            for i in range(7):
                date = timezone.now() - timedelta(days=6-i)
                labels.append(date.strftime('%m/%d'))
                data.append(random.randint(50, 100))
        elif group_by == 'week':
            # Generate last 4 weeks
            for i in range(4):
                labels.append(f'Week {i+1}')
                data.append(random.randint(200, 400))
        else:
            # Generate last 12 months
            for i in range(12):
                labels.append(f'Month {i+1}')
                data.append(random.randint(500, 1000))
        
        chart_data = {
            'labels': labels,
            'datasets': [{
                'label': metric_type,
                'data': data,
                'borderColor': '#FF7F50',
                'backgroundColor': 'rgba(255, 127, 80, 0.1)'
            }]
        }
        
        return Response(chart_data)


class ExportReportView(APIView):
    """
    API для экспорта отчетов в различные форматы
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Export report to specified format
        """
        format_type = request.data.get('format', 'pdf')
        report_data = request.data.get('report_data', {})
        
        if format_type == 'pdf':
            return self.export_pdf(report_data)
        elif format_type == 'excel':
            return self.export_excel(report_data)
        else:
            return Response(
                {'error': 'Unsupported format'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def export_pdf(self, report_data):
        """
        Export report to PDF format
        """
        from io import BytesIO
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        
        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#FF7F50'),
            spaceAfter=30
        )
        
        # Add title
        elements.append(Paragraph("FlowTest Report", title_style))
        elements.append(Spacer(1, 12))
        
        # Add metadata
        metadata_style = styles['Normal']
        elements.append(Paragraph(f"Date: {timezone.now().strftime('%Y-%m-%d')}", metadata_style))
        elements.append(Paragraph(f"Project: {report_data.get('project_name', 'All Projects')}", metadata_style))
        elements.append(Spacer(1, 20))
        
        # Add metrics summary table
        if 'metrics' in report_data:
            metrics = report_data['metrics']
            
            # Test metrics table
            test_data = [
                ['Test Metrics', 'Value'],
                ['Total Tests', str(metrics.get('tests_total', 0))],
                ['Passed Tests', str(metrics.get('tests_passed', 0))],
                ['Failed Tests', str(metrics.get('tests_failed', 0))],
                ['Skipped Tests', str(metrics.get('tests_skipped', 0))],
                ['Success Rate', f"{metrics.get('test_success_rate', 0)}%"],
            ]
            
            test_table = Table(test_data)
            test_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF7F50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(test_table)
            elements.append(Spacer(1, 20))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF value
        pdf = buffer.getvalue()
        buffer.close()
        
        # Return PDF response
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="flowtest-report-{timezone.now().strftime("%Y%m%d")}.pdf"'
        
        return response
    
    def export_excel(self, report_data):
        """
        Export report to Excel format
        """
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        from io import BytesIO
        
        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Summary"
        
        # Define styles
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="FF7F50", end_color="FF7F50", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        
        # Add title
        ws['A1'] = 'FlowTest Report'
        ws['A1'].font = Font(size=20, bold=True, color="FF7F50")
        ws.merge_cells('A1:B1')
        
        # Add metadata
        ws['A3'] = 'Date:'
        ws['B3'] = timezone.now().strftime('%Y-%m-%d')
        ws['A4'] = 'Project:'
        ws['B4'] = report_data.get('project_name', 'All Projects')
        
        # Add metrics if available
        if 'metrics' in report_data:
            metrics = report_data['metrics']
            
            # Test metrics section
            row = 6
            ws[f'A{row}'] = 'Test Metrics'
            ws[f'A{row}'].font = Font(bold=True, size=14)
            ws.merge_cells(f'A{row}:B{row}')
            
            row += 1
            headers = ['Metric', 'Value']
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = header_alignment
            
            row += 1
            test_metrics = [
                ('Total Tests', metrics.get('tests_total', 0)),
                ('Passed Tests', metrics.get('tests_passed', 0)),
                ('Failed Tests', metrics.get('tests_failed', 0)),
                ('Skipped Tests', metrics.get('tests_skipped', 0)),
                ('Success Rate (%)', metrics.get('test_success_rate', 0)),
            ]
            
            for metric_name, metric_value in test_metrics:
                ws[f'A{row}'] = metric_name
                ws[f'B{row}'] = metric_value
                row += 1
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 20
        
        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        # Return Excel response
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="flowtest-report-{timezone.now().strftime("%Y%m%d")}.xlsx"'
        
        return response