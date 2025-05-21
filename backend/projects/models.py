from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Project(models.Model):
    """
    Project model to group test cases and manage access
    """
    STATUS_CHOICES = [
        ('active', _('Active')),
        ('archived', _('Archived')),
    ]
    
    name = models.CharField(
        _('Project name'), 
        max_length=255, 
        unique=True,
        help_text=_('Unique name for the project')
    )
    description = models.TextField(
        _('Description'), 
        blank=True, 
        null=True, 
        default='',
        help_text=_('Detailed description of the project')
    )
    created_at = models.DateTimeField(
        _('Created at'), 
        auto_now_add=True,
        help_text=_('Date and time when the project was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'), 
        auto_now=True,
        help_text=_('Date and time when the project was last updated')
    )
    status = models.CharField(
        _('Status'),
        max_length=50, 
        choices=STATUS_CHOICES, 
        default='active',
        help_text=_('Current status of the project')
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='projects', 
        blank=True,
        verbose_name=_('Project members'),
        help_text=_('Users that are members of this project')
    )
    
    class Meta:
        verbose_name = _('project')
        verbose_name_plural = _('projects')
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def get_folders_count(self):
        """
        Return the count of folders in this project
        """
        return self.folders.count()
    
    def get_testcases_count(self):
        """
        Return the count of test cases in this project
        """
        return self.test_cases.count()
    
    def get_root_folders(self):
        """
        Return the root level folders (folders without a parent)
        """
        return self.folders.filter(parent=None)


class Folder(models.Model):
    """
    Folder model to organize test cases in a hierarchical structure
    """
    name = models.CharField(
        _('Folder name'), 
        max_length=255,
        help_text=_('Name of the folder')
    )
    description = models.TextField(
        _('Description'), 
        blank=True, 
        null=True, 
        default='',
        help_text=_('Detailed description of the folder')
    )
    created_at = models.DateTimeField(
        _('Created at'), 
        auto_now_add=True,
        help_text=_('Date and time when the folder was created')
    )
    updated_at = models.DateTimeField(
        _('Updated at'), 
        auto_now=True,
        help_text=_('Date and time when the folder was last updated')
    )
    project = models.ForeignKey(
        Project, 
        related_name='folders', 
        on_delete=models.CASCADE,
        verbose_name=_('Project'),
        help_text=_('Project that this folder belongs to')
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subfolders',
        verbose_name=_('Parent folder'),
        help_text=_('Parent folder of this folder, if any')
    )
    is_root = models.BooleanField(
        _('Is root folder'),
        default=False,
        help_text=_('Whether this is a root-level folder')
    )
    status = models.CharField(
        _('Status'),
        max_length=50, 
        default='active', 
        blank=True, 
        null=True,
        help_text=_('Current status of the folder')
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='authored_folders',
        verbose_name=_('Author'),
        help_text=_('User that created this folder')
    )
    
    class Meta:
        verbose_name = _('folder')
        verbose_name_plural = _('folders')
        ordering = ['name']
        # Ensure folder names are unique within a project and parent folder
        unique_together = [['name', 'project', 'parent']]
    
    def __str__(self):
        return self.name
    
    def get_full_path(self):
        """
        Return the full path of the folder (e.g., "Root/Parent/Child")
        """
        if self.parent:
            return f"{self.parent.get_full_path()}/{self.name}"
        return self.name
    
    def get_testcases_count(self):
        """
        Return the count of test cases in this folder
        """
        return self.test_cases.count()
    
    def get_all_testcases(self):
        """
        Return all test cases in this folder and its subfolders
        """
        # Get direct test cases
        test_cases = list(self.test_cases.all())
        
        # Get test cases from subfolders
        for subfolder in self.subfolders.all():
            test_cases.extend(subfolder.get_all_testcases())
            
        return test_cases
    
    def get_level(self):
        """
        Return the nesting level of this folder (0 for root folders)
        """
        level = 0
        parent = self.parent
        
        while parent:
            level += 1
            parent = parent.parent
            
        return level