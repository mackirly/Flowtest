"""
Signal handlers for the automation app.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# Import Automation models here when they're created
# from automation.models import AutomationRun


# @receiver(post_save, sender=AutomationRun)
# def automation_run_saved(sender, instance, created, **kwargs):
#     """
#     Signal handler for when an automation run is saved.
#     """
#     if created:
#         # Handle automation run creation
#         pass
#     else:
#         # Handle automation run update
#         pass


# @receiver(post_delete, sender=AutomationRun)
# def automation_run_deleted(sender, instance, **kwargs):
#     """
#     Signal handler for when an automation run is deleted.
#     """
#     # Handle automation run deletion
#     pass