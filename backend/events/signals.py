from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Event


@receiver(post_save, sender=Event)
def log_event_activity(sender, instance, created, **kwargs):
    """Log event creation and updates as user activities"""
    try:
        from core.models import Activity
        
        if created:
            Activity.objects.create(
                user=instance.created_by,
                type='event_create',
                description=f'Created event: {instance.title}',
                metadata={
                    'event_id': instance.id,
                    'event_title': instance.title,
                    'event_type': instance.event_type,
                    'event_date': instance.date.isoformat(),
                }
            )
        else:
            Activity.objects.create(
                user=instance.created_by,
                type='event_update',
                description=f'Updated event: {instance.title}',
                metadata={
                    'event_id': instance.id,
                    'event_title': instance.title,
                    'event_type': instance.event_type,
                    'event_date': instance.date.isoformat(),
                }
            )
    except ImportError:
        # If Activity model doesn't exist, skip logging
        pass


@receiver(post_delete, sender=Event)
def log_event_deletion(sender, instance, **kwargs):
    """Log event deletion as user activity"""
    try:
        from core.models import Activity
        
        Activity.objects.create(
            user=instance.created_by,
            type='event_delete',
            description=f'Deleted event: {instance.title}',
            metadata={
                'event_title': instance.title,
                'event_type': instance.event_type,
                'event_date': instance.date.isoformat(),
            }
        )
    except ImportError:
        # If Activity model doesn't exist, skip logging
        pass