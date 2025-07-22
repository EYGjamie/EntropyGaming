import logging
import os
from datetime import datetime
from flask import current_app

def setup_logging(app):
    """Setup application logging"""
    if not app.debug:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.makedirs('logs')
        
        # Setup file handler
        file_handler = logging.FileHandler('logs/webapp.log')
        file_handler.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        )
        file_handler.setFormatter(formatter)
        
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Internal webapp startup')

def format_datetime(dt, format='%d.%m.%Y %H:%M'):
    """Format datetime for display"""
    if dt is None:
        return '-'
    
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except:
            return dt
    
    return dt.strftime(format)

def format_timestamp(timestamp):
    """Format Unix timestamp for display"""
    if timestamp is None:
        return '-'
    
    try:
        dt = datetime.fromtimestamp(int(timestamp))
        return format_datetime(dt)
    except:
        return str(timestamp)

def get_role_badge_class(role):
    """Get CSS class for role badge"""
    role_classes = {
        'Admin': 'role-admin',
        'Dev': 'role-dev',
        'Mitglied': 'role-mitglied',
        'Guest': 'role-guest'
    }
    return role_classes.get(role, 'role-guest')

def get_status_badge_class(status):
    """Get CSS class for status badge"""
    status_classes = {
        'Open': 'bg-success',
        'Claimed': 'bg-warning',
        'Closed': 'bg-secondary',
        'Deleted': 'bg-danger',
        'UserLeft': 'bg-info'
    }
    return status_classes.get(status, 'bg-secondary')

def truncate_text(text, length=50, suffix='...'):
    """Truncate text to specified length"""
    if text is None:
        return '-'
    
    text = str(text)
    if len(text) <= length:
        return text
    
    return text[:length].rstrip() + suffix

def safe_int(value, default=0):
    """Safely convert value to int"""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default

def safe_float(value, default=0.0):
    """Safely convert value to float"""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def get_file_size_human(size_bytes):
    """Convert file size to human readable format"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"

def validate_email(email):
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Username validation"""
    import re
    # Username: 3-20 characters, alphanumeric and underscore
    pattern = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern, username) is not None

def generate_avatar_url(username):
    """Generate avatar URL based on username"""
    # Using Gravatar-style default avatars
    import hashlib
    
    # Create hash from username
    hash_object = hashlib.md5(username.lower().encode())
    avatar_hash = hash_object.hexdigest()
    
    # Return default avatar or generate from hash
    return f"https://www.gravatar.com/avatar/{avatar_hash}?d=identicon&s=80"

def clean_filename(filename):
    """Clean filename for safe storage"""
    import re
    import os
    
    # Get base name and extension
    name, ext = os.path.splitext(filename)
    
    # Replace special characters
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'[-\s]+', '-', name)
    
    return f"{name}{ext}"