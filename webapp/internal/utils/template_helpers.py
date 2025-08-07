"""
Template helpers and filters for Jinja2 templates
"""

from utils.helpers import (
    format_datetime, format_timestamp, get_role_badge_class, 
    get_status_badge_class, truncate_text, get_file_size_human
)

from datetime import datetime
import re
from markupsafe import Markup
import markdown

def datetime_format(value, format='%d.%m.%Y um %H:%M'):
    """Format datetime objects for display"""
    if value is None:
        return ''
    
    if isinstance(value, str):
        # Try to parse string datetime
        try:
            # Handle different datetime string formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S']:
                try:
                    value = datetime.strptime(value, fmt)
                    break
                except ValueError:
                    continue
            else:
                # If no format worked, return the original string
                return value
        except (ValueError, TypeError):
            return value
    
    if not isinstance(value, datetime):
        return value
    
    return value.strftime(format)

def nl2br(value):
    """Convert newlines to HTML <br> tags"""
    if value is None:
        return ''
    
    # Escape HTML first, then convert newlines
    import html
    escaped = html.escape(str(value))
    return Markup(escaped.replace('\n', '<br>\n'))

def markdown_to_html(value):
    """Convert Markdown to HTML"""
    if value is None:
        return ''
    
    # Configure markdown with extensions
    md = markdown.Markdown(extensions=[
        'codehilite',
        'fenced_code',
        'tables',
        'toc',
        'nl2br'
    ])
    
    return Markup(md.convert(str(value)))

def timeago(value):
    """Return a human-readable time difference"""
    if value is None:
        return ''
    
    if isinstance(value, str):
        try:
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S']:
                try:
                    value = datetime.strptime(value, fmt)
                    break
                except ValueError:
                    continue
            else:
                return value
        except (ValueError, TypeError):
            return value
    
    if not isinstance(value, datetime):
        return value
    
    now = datetime.now()
    diff = now - value
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "gerade eben"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"vor {minutes} Minute{'n' if minutes != 1 else ''}"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"vor {hours} Stunde{'n' if hours != 1 else ''}"
    elif seconds < 2592000:  # 30 days
        days = int(seconds / 86400)
        return f"vor {days} Tag{'en' if days != 1 else ''}"
    elif seconds < 31536000:  # 365 days
        months = int(seconds / 2592000)
        return f"vor {months} Monat{'en' if months != 1 else ''}"
    else:
        years = int(seconds / 31536000)
        return f"vor {years} Jahr{'en' if years != 1 else ''}"

def truncate_words(value, length=50, end='...'):
    """Truncate text to a specific number of words"""
    if value is None:
        return ''
    
    words = str(value).split()
    if len(words) <= length:
        return value
    
    return ' '.join(words[:length]) + end

def file_size_format(size_bytes):
    """Format file size in human readable format"""
    if size_bytes is None:
        return '0 B'
    
    size_bytes = int(size_bytes)
    
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    if i == 0:
        return f"{int(size_bytes)} {size_names[i]}"
    else:
        return f"{size_bytes:.1f} {size_names[i]}"

def strip_html(value):
    """Remove HTML tags from text"""
    if value is None:
        return ''
    
    # Simple HTML tag removal
    clean = re.compile('<.*?>')
    return re.sub(clean, '', str(value))

def excerpt(value, length=150, end='...'):
    """Create an excerpt from text"""
    if value is None:
        return ''
    
    # Strip HTML first
    text = strip_html(value)
    
    if len(text) <= length:
        return text
    
    # Try to break at a word boundary
    excerpt_text = text[:length].rsplit(' ', 1)[0]
    return excerpt_text + end

def pluralize(count, singular, plural=None):
    """Return singular or plural form based on count"""
    if plural is None:
        plural = singular + 's'
    
    return singular if count == 1 else plural

def avatar_placeholder(name, size=40):
    """Generate CSS for avatar placeholder"""
    if not name:
        name = "?"
    
    # Get first letter and make it uppercase
    initial = name[0].upper()
    
    # Generate a color based on the name
    import hashlib
    name_hash = hashlib.md5(name.encode()).hexdigest()
    hue = int(name_hash[:2], 16) * 360 / 255
    
    return Markup(f'''
        <div class="avatar-placeholder" style="
            width: {size}px; 
            height: {size}px; 
            background: hsl({hue}, 60%, 50%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-weight: 600;
            font-size: {size * 0.4}px;
        ">{initial}</div>
    ''')

def role_badge_class(role):
    """Get CSS class for role badge"""
    role_classes = {
        'Projektleitung': 'role-projektleitung',
        'Head Management': 'role-head-management', 
        'Management': 'role-management',
        'Developer': 'role-developer',
        'Diamond Club': 'role-diamond-club',
        'Diamond Teams': 'role-diamond-teams',
        'Entropy Member': 'role-entropy-member'
    }
    
    return role_classes.get(role, 'role-default')

def register_template_helpers(app):
    """Register all template helpers with the Flask app"""
    
    # Template filters
    app.jinja_env.filters['datetime_format'] = datetime_format
    app.jinja_env.filters['nl2br'] = nl2br
    app.jinja_env.filters['markdown'] = markdown_to_html
    app.jinja_env.filters['timeago'] = timeago
    app.jinja_env.filters['truncate_words'] = truncate_words
    app.jinja_env.filters['file_size'] = file_size_format
    app.jinja_env.filters['strip_html'] = strip_html
    app.jinja_env.filters['excerpt'] = excerpt
    app.jinja_env.filters['role_class'] = role_badge_class
    app.jinja_env.filters['status_badge_class'] = get_status_badge_class
    
    # Template functions (available as {{ function_name() }})
    app.jinja_env.globals['pluralize'] = pluralize
    app.jinja_env.globals['avatar_placeholder'] = avatar_placeholder
    
    # Additional template globals
    app.jinja_env.globals['now'] = datetime.now
    
    # Add some useful constants
    app.jinja_env.globals.update({
        'FORUM_ALLOWED_EXTENSIONS': ['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xlsx', 'pptx', 'zip', 'rar'],
        'MAX_FILE_SIZE_MB': 10
    })

def format_content_preview(content, length=200):
    """Format content for preview display"""
    if not content:
        return ''
    
    # Strip markdown and HTML
    text = strip_html(content)
    text = re.sub(r'[#*`_~\[\]()]+', '', text)  # Remove markdown syntax
    
    # Create excerpt
    preview = excerpt(text, length)
    
    return preview

# Register additional helper if needed
def register_forum_helpers(app):
    """Register forum-specific template helpers"""
    app.jinja_env.filters['content_preview'] = format_content_preview
    
    def file_icon_class(filename):
        """Get icon class for file type"""
        if not filename:
            return 'bi-file-earmark'
        
        ext = filename.split('.')[-1].lower()
        
        icon_map = {
            'pdf': 'bi-file-pdf',
            'doc': 'bi-file-word',
            'docx': 'bi-file-word', 
            'xls': 'bi-file-excel',
            'xlsx': 'bi-file-excel',
            'ppt': 'bi-file-ppt',
            'pptx': 'bi-file-ppt',
            'txt': 'bi-file-text',
            'jpg': 'bi-file-image',
            'jpeg': 'bi-file-image',
            'png': 'bi-file-image',
            'gif': 'bi-file-image',
            'zip': 'bi-file-zip',
            'rar': 'bi-file-zip'
        }
        
        return icon_map.get(ext, 'bi-file-earmark')
    
    app.jinja_env.filters['file_icon'] = file_icon_class