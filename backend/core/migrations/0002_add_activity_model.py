from django.db import migrations, models
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Activity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('profile_update', 'Profile Update'), ('password_change', 'Password Change'), ('login', 'Login'), ('logout', 'Logout'), ('test_case_create', 'Test Case Created'), ('test_case_update', 'Test Case Updated'), ('test_case_delete', 'Test Case Deleted'), ('test_run', 'Test Run'), ('report_generate', 'Report Generated')], max_length=50)),
                ('description', models.TextField()),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'activity',
                'verbose_name_plural': 'activities',
                'ordering': ['-created_at'],
            },
        ),
    ]