from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser, Role, Permission


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """Admin configuration for Permission model"""
    list_display = ('name', 'codename', 'category')
    list_filter = ('category',)
    search_fields = ('name', 'codename', 'description')
    ordering = ('category', 'name')


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Admin configuration for Role model"""
    list_display = ('name', 'is_admin_role', 'get_permissions_count')
    list_filter = ('is_admin_role',)
    search_fields = ('name', 'description')
    filter_horizontal = ('permissions',)
    
    def get_permissions_count(self, obj):
        """Count permissions assigned to the role"""
        return obj.permissions.count()
    get_permissions_count.short_description = _('Permissions')


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin configuration for CustomUser model"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'role')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'role')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    
    # Customize fieldsets
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'middle_name', 'email', 'avatar')}),
        (_('Preferences'), {'fields': ('language', 'theme', 'phone_number')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'role', 'groups'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    
    # Customize add form
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'first_name', 'last_name'),
        }),
    )