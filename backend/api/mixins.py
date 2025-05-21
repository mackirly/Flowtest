from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action


class MultiSerializerMixin:
    """
    Mixin to use different serializers for different actions
    """
    serializer_classes = {
        'default': None,
    }
    
    def get_serializer_class(self):
        """
        Return the serializer class for the current action
        """
        return self.serializer_classes.get(self.action, self.serializer_classes.get('default', super().get_serializer_class()))


class ReadWriteSerializerMixin:
    """
    Mixin to use different serializers for read and write operations
    """
    read_serializer_class = None
    write_serializer_class = None
    
    def get_serializer_class(self):
        """
        Return the serializer class based on the HTTP method
        """
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return self.write_serializer_class
        return self.read_serializer_class


class NestedViewSetMixin:
    """
    Mixin to handle URL-based filtering for nested viewsets
    """
    parent_lookup_field = None
    parent_model = None
    parent_queryset = None
    
    def get_queryset(self):
        """
        Filter queryset based on parent object
        """
        queryset = super().get_queryset()
        
        # If parent_lookup_field is defined, filter by parent object
        if self.parent_lookup_field and self.kwargs.get(self.parent_lookup_field):
            parent_id = self.kwargs.get(self.parent_lookup_field)
            filter_kwargs = {self.parent_lookup_field: parent_id}
            queryset = queryset.filter(**filter_kwargs)
            
        return queryset


class BulkOperationsMixin:
    """
    Mixin to support bulk create, update, and delete operations
    """
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Create multiple objects in a single request
        """
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        self.perform_bulk_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_bulk_create(self, serializer):
        """
        Perform the bulk create operation
        """
        serializer.save()
    
    @action(detail=False, methods=['put', 'patch'])
    def bulk_update(self, request):
        """
        Update multiple objects in a single request
        """
        partial = request.method == 'PATCH'
        instances = self.get_bulk_instances(request.data)
        serializer = self.get_serializer(instances, data=request.data, many=True, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_bulk_update(serializer)
        return Response(serializer.data)
    
    def perform_bulk_update(self, serializer):
        """
        Perform the bulk update operation
        """
        serializer.save()
    
    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """
        Delete multiple objects in a single request
        """
        ids = request.data.get('ids', [])
        self.get_queryset().filter(id__in=ids).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def get_bulk_instances(self, data):
        """
        Get instances for bulk update based on data
        """
        # Extract IDs from data
        ids = [item.get('id') for item in data if 'id' in item]
        return self.get_queryset().filter(id__in=ids)


class SearchFilterMixin:
    """
    Mixin to add search functionality to viewsets
    """
    search_fields = []
    
    def get_queryset(self):
        """
        Filter queryset based on search parameter
        """
        queryset = super().get_queryset()
        search_term = self.request.query_params.get('search', None)
        
        if search_term and self.search_fields:
            # Dynamically build Q objects for each search field
            from django.db.models import Q
            import functools
            import operator
            
            conditions = []
            for field in self.search_fields:
                lookup = {f"{field}__icontains": search_term}
                conditions.append(Q(**lookup))
                
            # Combine all conditions with OR operator
            queryset = queryset.filter(functools.reduce(operator.or_, conditions))
            
        return queryset