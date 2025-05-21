"""
Signal handlers for the reports app.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# Import Report models here when they're created
# from reports.models import Report


# @receiver(post_save, sender=Report)
# def report_saved(sender, instance, created, **kwargs):
#     """
#     Signal handler for when a report is saved.
#     """
#     if created:
#         # Handle report creation
#         pass
#     else:
#         # Handle report update
#         pass


# @receiver(post_delete, sender=Report)
# def report_deleted(sender, instance, **kwargs):
#     """
#     Signal handler for when a report is deleted.
#     """
#     # Handle report deletion
#     pass