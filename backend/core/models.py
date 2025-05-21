from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator
from django.utils import timezone
import os
import uuid


class Activity(models.Model):
    """User activity model"""
    TYPE_CHOICES = [
        ('profile_update', _('Profile Update')),
        ('password_change', _('Password Change')),
        ('login', _('Login')),
        ('logout', _('Logout')),
        ('test_case_create', _('Test Case Created')),
        ('test_case_update', _('Test Case Updated')),
        ('test_case_delete', _('Test Case Deleted')),
        ('test_run', _('Test Run')),
        ('report_generate', _('Report Generated')),
    ]
    
    user = models.ForeignKey(
        'CustomUser',
        on_delete=models.CASCADE,
        related_name='activities'
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = _('activity')
        verbose_name_plural = _('activities')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user} - {self.get_type_display()} - {self.created_at}"


def avatar_upload_path(instance, filename):
    """Generate path for user avatar uploads"""
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a unique filename
    unique_filename = f"avatar.{ext}"
    # Return path like 'avatars/user_1/avatar.jpg'
    return os.path.join('avatars', f'user_{instance.id}', unique_filename)


class Permission(models.Model):
    """Permission model for custom permissions"""
    CATEGORY_CHOICES = [
        ('user_management', _('User Management')),
        ('project_management', _('Project Management')),
        ('test_management', _('Test Management')),
        ('report_management', _('Report Management')),
        ('event_management', _('Event Management')),
        ('automation_management', _('Automation Management')),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    codename = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='test_management')
    
    class Meta:
        ordering = ['category', 'name']
        verbose_name = _('permission')
        verbose_name_plural = _('permissions')
    
    def __str__(self):
        return self.name


class Role(models.Model):
    """Role model for grouping permissions"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(
        Permission, 
        related_name="roles", 
        blank=True,
        verbose_name=_('permissions')
    )
    is_admin_role = models.BooleanField(
        default=False, 
        help_text=_("Administrative role with full access")
    )
    
    class Meta:
        verbose_name = _('role')
        verbose_name_plural = _('roles')
    
    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    """Extended user model with additional fields"""
    LANGUAGE_CHOICES = [
        ('en', _('English')),
        ('ru', _('Russian')),
    ]
    
    THEME_CHOICES = [
        ('light', _('Light')),
        ('dark', _('Dark')),
        ('system', _('System')),
    ]
    
    # Override default name fields to make them required
    first_name = models.CharField(_('First name'), max_length=150)
    last_name = models.CharField(_('Last name'), max_length=150)
    
    # Additional fields
    middle_name = models.CharField(_('Middle name'), max_length=150, blank=True, null=True)
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='en')
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    phone_number = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])
        ]
    )
    role = models.ForeignKey(
        Role, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='users'
    )
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
    
    def __str__(self):
        return self.get_full_name() or self.username
    
    def get_full_name(self):
        """
        Return the first_name plus the last_name, with a space in between,
        and the middle name if available.
        """
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}".strip()
        else:
            return f"{self.first_name} {self.last_name}".strip()
    
    def save(self, *args, **kwargs):
        """Override save to implement custom behaviors"""
        # If this is a new user (no ID yet) we'll set the ID after saving
        is_new = self.id is None
        super().save(*args, **kwargs)
        
        # If avatar changed and old one exists, delete it
        if not is_new and self.avatar and hasattr(self, '_current_avatar') and self._current_avatar != self.avatar.path:
            import os
            if os.path.isfile(self._current_avatar):
                os.remove(self._current_avatar)
        
    def has_permission(self, permission_codename):
        """Check if user has a specific permission"""
        # Super users have all permissions
        if self.is_superuser:
            return True
            
        # Check if user has a role and if that role has the permission
        if self.role:
            if self.role.is_admin_role:
                return True
            return self.role.permissions.filter(codename=permission_codename).exists()
        
        return False
        
    def log_activity(self, activity_type, description, metadata=None):
        """Log a user activity"""
        Activity.objects.create(
            user=self,
            type=activity_type,
            description=description,
            metadata=metadata or {}
        )