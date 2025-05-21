"""
Signal handlers for the testcases app.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# Import TestCase model here when it's created
# from testcases.models import TestCase


# @receiver(post_save, sender=TestCase)
# def testcase_saved(sender, instance, created, **kwargs):
#     """
#     Signal handler for when a test case is saved.
#     """
#     if created:
#         # Handle test case creation
#         pass
#     else:
#         # Handle test case update
#         pass


# @receiver(post_delete, sender=TestCase)
# def testcase_deleted(sender, instance, **kwargs):
#     """
#     Signal handler for when a test case is deleted.
#     """
#     # Handle test case deletion
#     pass