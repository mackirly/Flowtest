from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for API results
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000
    
    def get_paginated_response(self, data):
        """
        Return a paginated response with additional metadata
        """
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'current_page': self.page.number,
            'results': data
        })


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination for large result sets (e.g., reports data)
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 5000
    
    def get_paginated_response(self, data):
        """
        Return a paginated response with additional metadata
        """
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'current_page': self.page.number,
            'results': data
        })


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination for small result sets (e.g., dropdown options)
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100