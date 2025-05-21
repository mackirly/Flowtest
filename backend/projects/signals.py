"""
Signal handlers for the projects app.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from projects.models import Project, Folder


@receiver(post_save, sender=Project)
def project_saved(sender, instance, created, **kwargs):
    """
    Signal handler for when a project is saved.
    Creates a default root folder if this is a new project.
    """
    if created:
        # Create default root folder for the project
        Folder.objects.create(
            name="Root",
            project=instance,
            parent=None,
            is_root=True
        )


@receiver(post_delete, sender=Project)
def project_deleted(sender, instance, **kwargs):
    """
    Signal handler for when a project is deleted.
    Performs additional cleanup if needed.
    """
    # Additional cleanup can be done here if needed
    pass