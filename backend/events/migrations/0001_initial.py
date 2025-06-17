# Generated manually for events app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('projects', '0001_initial'),
        ('testcases', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text='Title of the event', max_length=255, verbose_name='Title')),
                ('description', models.TextField(blank=True, help_text='Detailed description of the event', null=True, verbose_name='Description')),
                ('event_type', models.CharField(choices=[('general', 'General'), ('test-execution', 'Test Execution'), ('maintenance', 'Maintenance'), ('meeting', 'Meeting'), ('deadline', 'Deadline')], default='general', help_text='Type of event', max_length=50, verbose_name='Event type')),
                ('priority', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium', help_text='Priority level of the event', max_length=50, verbose_name='Priority')),
                ('date', models.DateField(help_text='Date when the event occurs', verbose_name='Date')),
                ('time', models.TimeField(blank=True, help_text='Time when the event occurs (optional)', null=True, verbose_name='Time')),
                ('recurring', models.BooleanField(default=False, help_text='Whether this event repeats', verbose_name='Recurring')),
                ('recurrence_interval', models.IntegerField(blank=True, help_text='How often the event repeats (e.g., every 2 weeks)', null=True, verbose_name='Recurrence interval')),
                ('recurrence_period', models.CharField(blank=True, choices=[('day', 'Day'), ('week', 'Week'), ('month', 'Month'), ('year', 'Year')], help_text='Period for recurrence (day, week, month, year)', max_length=50, null=True, verbose_name='Recurrence period')),
                ('recurrence_end_date', models.DateField(blank=True, help_text='Date when the recurrence stops (optional)', null=True, verbose_name='Recurrence end date')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date and time when the event was created', verbose_name='Created at')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date and time when the event was last updated', verbose_name='Updated at')),
                ('created_by', models.ForeignKey(help_text='User who created this event', on_delete=django.db.models.deletion.CASCADE, related_name='created_events', to=settings.AUTH_USER_MODEL, verbose_name='Created by')),
                ('project', models.ForeignKey(blank=True, help_text='Project associated with this event (optional)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='projects.project', verbose_name='Project')),
                ('test_cases', models.ManyToManyField(blank=True, help_text='Test cases associated with this event (optional)', related_name='events', to='testcases.testcase', verbose_name='Test cases')),
            ],
            options={
                'verbose_name': 'event',
                'verbose_name_plural': 'events',
                'ordering': ['date', 'time'],
                'indexes': [
                    models.Index(fields=['date'], name='events_event_date_b64c8b_idx'),
                    models.Index(fields=['event_type'], name='events_event_event_t_34da7e_idx'),
                    models.Index(fields=['priority'], name='events_event_priorit_7a1097_idx'),
                    models.Index(fields=['project'], name='events_event_project_3b0ec3_idx'),
                    models.Index(fields=['created_by'], name='events_event_created_ee8f57_idx'),
                ],
            },
        ),
    ]