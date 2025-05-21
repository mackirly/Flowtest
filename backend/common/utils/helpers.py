import os
import re
import uuid
import json
import datetime
from pathlib import Path
from django.utils import timezone
from django.conf import settings


def generate_unique_id():
    """
    Generate a unique ID for objects
    """
    return str(uuid.uuid4())


def generate_slug(text):
    """
    Generate a URL-friendly slug from the given text
    """
    # Convert to lowercase
    text = text.lower()
    # Replace spaces and other characters with hyphens
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


class JSONDateTimeEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to handle datetime objects
    """
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
            return obj.isoformat()
        return super().default(obj)


def to_json(data):
    """
    Convert data to JSON string, handling datetime objects
    """
    return json.dumps(data, cls=JSONDateTimeEncoder)


def from_json(json_str):
    """
    Convert JSON string to Python object
    """
    return json.loads(json_str)


def ensure_dir_exists(directory):
    """
    Ensure that the specified directory exists
    """
    Path(directory).mkdir(parents=True, exist_ok=True)


def get_file_extension(filename):
    """
    Get the file extension from a filename
    """
    return os.path.splitext(filename)[1].lower()


def is_valid_file_type(filename, allowed_extensions):
    """
    Check if the file type is allowed
    """
    ext = get_file_extension(filename)
    return ext in allowed_extensions


def format_datetime(dt, format_str=None):
    """
    Format a datetime object as a string
    """
    if not dt:
        return None
    
    if not format_str:
        format_str = "%Y-%m-%d %H:%M:%S"
    
    if timezone.is_aware(dt):
        dt = timezone.localtime(dt)
    
    return dt.strftime(format_str)


def relative_time(dt):
    """
    Return a relative time string (e.g., "2 hours ago")
    """
    if not dt:
        return None
    
    now = timezone.now()
    if not timezone.is_aware(dt):
        dt = timezone.make_aware(dt)
    
    diff = now - dt
    
    seconds = diff.total_seconds()
    minutes = seconds / 60
    hours = minutes / 60
    days = diff.days
    
    if seconds < 60:
        return "just now"
    elif minutes < 60:
        return f"{int(minutes)} minute{'s' if int(minutes) != 1 else ''} ago"
    elif hours < 24:
        return f"{int(hours)} hour{'s' if int(hours) != 1 else ''} ago"
    elif days < 7:
        return f"{days} day{'s' if days != 1 else ''} ago"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} week{'s' if weeks != 1 else ''} ago"
    elif days < 365:
        months = days // 30
        return f"{months} month{'s' if months != 1 else ''} ago"
    else:
        years = days // 365
        return f"{years} year{'s' if years != 1 else ''} ago"


def truncate_string(text, max_length=100, suffix='...'):
    """
    Truncate a string to a maximum length
    """
    if not text:
        return ''
    
    if len(text) <= max_length:
        return text
    
    return text[:max_length].rstrip() + suffix


def extract_filename(path):
    """
    Extract the filename from a path
    """
    return os.path.basename(path)


def human_readable_size(size_bytes):
    """
    Convert bytes to human-readable size
    """
    if size_bytes == 0:
        return "0B"
    
    suffixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    i = 0
    while size_bytes >= 1024 and i < len(suffixes) - 1:
        size_bytes /= 1024
        i += 1
    
    return f"{size_bytes:.2f}{suffixes[i]}"