from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Project, Folder
from core.serializers import UserProfileSerializer

User = get_user_model()


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model"""
    has_subfolders = serializers.SerializerMethodField()
    test_cases_count = serializers.SerializerMethodField()
    direct_test_cases_count = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at',
            'project', 'parent', 'status', 'author', 'author_name',
            'has_subfolders', 'test_cases_count', 'direct_test_cases_count'
        ]
        read_only_fields = ['created_at', 'updated_at', 'author', 'author_name']
        extra_kwargs = {
            'project': {'required': False}  # Project will be set in perform_create
        }
    
    def get_has_subfolders(self, obj):
        """Check if the folder has subfolders"""
        return obj.subfolders.exists()
    
    def get_test_cases_count(self, obj):
        """Get the count of test cases in this folder and all subfolders"""
        from django.db.models import Count, Q
        
        # Get all descendant folder IDs
        def get_all_subfolder_ids(folder):
            ids = [folder.id]
            for subfolder in folder.subfolders.all():
                ids.extend(get_all_subfolder_ids(subfolder))
            return ids
        
        all_folder_ids = get_all_subfolder_ids(obj)
        
        # Count test cases in all folders at once
        from testcases.models import TestCase
        return TestCase.objects.filter(folder_id__in=all_folder_ids).count()
    
    def get_direct_test_cases_count(self, obj):
        """Get the count of test cases in this folder only (not including subfolders)"""
        return obj.test_cases.count()
    
    def get_author_name(self, obj):
        """Get the name of the author"""
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username
        return None
    
    def create(self, validated_data):
        """Create a new folder and set the author"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        return super().create(validated_data)


class FolderDetailSerializer(FolderSerializer):
    """Detailed serializer for Folder model with hierarchical structure"""
    subfolders = serializers.SerializerMethodField()
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['subfolders']
    
    def get_subfolders(self, obj):
        """Get serialized subfolders"""
        subfolders = obj.subfolders.all()
        return FolderSerializer(subfolders, many=True, context=self.context).data


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model"""
    folders_count = serializers.SerializerMethodField()
    test_cases_count = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at',
            'status', 'folders_count', 'test_cases_count', 'members_count'
        ]
        read_only_fields = ['created_at', 'updated_at', 'folders_count', 'test_cases_count', 'members_count']
    
    def get_folders_count(self, obj):
        """Get the count of folders in this project"""
        return obj.folders.count()
    
    def get_test_cases_count(self, obj):
        """Get the count of test cases in this project"""
        return obj.test_cases.count()
    
    def get_members_count(self, obj):
        """Get the count of members in this project"""
        return obj.members.count()


class ProjectDetailSerializer(ProjectSerializer):
    """Detailed serializer for Project model with members and root folders"""
    root_folders = serializers.SerializerMethodField()
    members = UserProfileSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['root_folders', 'members']
    
    def get_root_folders(self, obj):
        """Get the root folders of this project"""
        root_folders = obj.folders.filter(parent__isnull=True)
        return FolderSerializer(root_folders, many=True, context=self.context).data


class ProjectMemberSerializer(serializers.Serializer):
    """Serializer for adding/removing project members"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text="List of user IDs to add/remove"
    )
    
    def validate_user_ids(self, value):
        """Validate that all users exist"""
        user_count = User.objects.filter(id__in=value).count()
        if user_count != len(value):
            raise serializers.ValidationError("One or more users do not exist")
        return value


class ProjectStatsSerializer(serializers.Serializer):
    """Serializer for project statistics"""
    total_test_cases = serializers.IntegerField()
    automated_test_cases = serializers.IntegerField()
    manual_test_cases = serializers.IntegerField()
    passed_tests = serializers.IntegerField()
    failed_tests = serializers.IntegerField()
    folders_count = serializers.IntegerField()
    members_count = serializers.IntegerField()
    test_execution_count = serializers.IntegerField()
    recent_activity = serializers.ListField(child=serializers.DictField())