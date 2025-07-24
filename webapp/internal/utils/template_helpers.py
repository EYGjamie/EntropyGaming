from flask import g
from utils.helpers import (
    format_datetime, format_timestamp, get_role_badge_class, 
    get_status_badge_class, truncate_text, get_file_size_human
)
from datetime import datetime
import re
from markupsafe import Markup

def register_template_helpers(app):
    """Register template filters and global functions"""
    
    # Template filters
    app.jinja_env.filters['datetime'] = format_datetime
    app.jinja_env.filters['timestamp'] = format_timestamp
    app.jinja_env.filters['truncate'] = truncate_text
    app.jinja_env.filters['filesize'] = get_file_size_human
    app.jinja_env.filters['role_badge_class'] = get_role_badge_class
    app.jinja_env.filters['status_badge_class'] = get_status_badge_class
    
    # Template globals
    @app.template_global()
    def current_user():
        """Get current user in templates"""
        return g.user
    
    @app.template_global()
    def current_user_roles():
        """Get current user roles in templates"""
        return g.user_roles if hasattr(g, 'user_roles') else []
    
    @app.template_global()
    def has_role(role):
        """Check if current user has specific role"""
        return role in (g.user_roles if hasattr(g, 'user_roles') else [])
    
    @app.template_global()
    def has_any_role(*roles):
        """Check if current user has any of the specified roles"""
        user_roles = g.user_roles if hasattr(g, 'user_roles') else []
        return any(role in user_roles for role in roles)
    
    @app.template_global()
    def is_admin():
        """Check if current user is admin"""
        return has_role('Admin')
    
    @app.template_global()
    def is_dev():
        """Check if current user is dev or admin"""
        return has_any_role('Admin', 'Dev')
    
    @app.template_global()
    def get_role_display_name(role):
        """Get display name for role"""
        role_names = {
            'Admin': 'Administrator',
            'Dev': 'Entwickler',
            'Mitglied': 'Mitglied',
            'Guest': 'Gast'
        }
        return role_names.get(role, role)
    
    @app.template_global()
    def get_status_display_name(status):
        """Get display name for status"""
        status_names = {
            'Open': 'Offen',
            'Claimed': 'Bearbeitung',
            'Closed': 'Geschlossen',
            'Deleted': 'Gelöscht',
            'UserLeft': 'Benutzer verlassen'
        }
        return status_names.get(status, status)
    
    @app.template_global()
    def get_game_display_name(game):
        """Get display name for game"""
        game_names = {
            'R6': 'Rainbow Six Siege',
            'RL': 'Rocket League',
            'VALO': 'Valorant',
            'CS2': 'Counter-Strike 2',
            'LOL': 'League of Legends',
            'COC': 'Clash of Clans'
        }
        return game_names.get(game, game)
    
    @app.template_global()
    def get_game_icon(game):
        """Get icon class for game"""
        game_icons = {
            'R6': 'bi-shield-check',
            'RL': 'bi-car-front',
            'VALO': 'bi-crosshair',
            'CS2': 'bi-bullseye',
            'LOL': 'bi-gem',
            'COC': 'bi-house'
        }
        return game_icons.get(game, 'bi-controller')
    
    @app.template_global()
    def format_user_display(user):
        """Format user for display"""
        if not user:
            return 'Unbekannt'
        
        if hasattr(user, 'full_name') and user.full_name:
            return user.full_name
        elif hasattr(user, 'username'):
            return user.username
        else:
            return str(user)
    
    @app.template_global()
    def pagination_info(current_page, total_pages, total_items):
        """Generate pagination info text"""
        if total_items == 0:
            return "Keine Einträge gefunden"
        
        start = (current_page - 1) * 20 + 1
        end = min(current_page * 20, total_items)
        
        return f"Zeige {start}-{end} von {total_items} Einträgen"
    
    @app.template_global()
    def url_for_page(endpoint, page, **kwargs):
        """Generate URL for pagination"""
        from flask import url_for, request
        
        # Get current args and update page
        args = request.args.copy()
        args['page'] = page
        
        # Merge with provided kwargs
        for key, value in kwargs.items():
            args[key] = value
        
        return url_for(endpoint, **args)
    
    @app.template_global()
    def active_nav_class(endpoint):
        """Get active class for navigation"""
        from flask import request
        return 'active' if request.endpoint and request.endpoint.startswith(endpoint) else ''
    
    @app.template_global()
    def format_relative_time(dt):
        """Format datetime as relative time"""
        from datetime import datetime, timedelta
        
        if not dt:
            return 'Niemals'
        
        if isinstance(dt, str):
            try:
                dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            except:
                return dt
        
        now = datetime.now()
        diff = now - dt
        
        if diff.days > 7:
            return format_datetime(dt, '%d.%m.%Y')
        elif diff.days > 0:
            return f'vor {diff.days} Tag{"en" if diff.days > 1 else ""}'
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f'vor {hours} Stunde{"n" if hours > 1 else ""}'
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f'vor {minutes} Minute{"n" if minutes > 1 else ""}'
        else:
            return 'gerade eben'
        
    @app.template_filter('strftime')
    def strftime_filter(datetime_obj, format='%Y-%m-%d %H:%M'):
        """Format datetime object"""
        if not datetime_obj:
            return ''
        if isinstance(datetime_obj, str):
            try:
                datetime_obj = datetime.fromisoformat(datetime_obj.replace('Z', '+00:00'))
            except:
                return datetime_obj
        return datetime_obj.strftime(format)
    
    @app.template_filter('nl2br')
    def nl2br_filter(text):
        """Convert newlines to HTML line breaks"""
        if not text:
            return ''
        # Escape HTML first, then convert newlines
        text = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        text = re.sub(r'\r?\n', '<br>', text)
        return Markup(text)
    
    @app.template_filter('truncate_words')
    def truncate_words_filter(text, length=50, suffix='...'):
        """Truncate text to specified number of words"""
        if not text:
            return ''
        words = str(text).split()
        if len(words) <= length:
            return text
        return ' '.join(words[:length]) + suffix
    
    @app.template_filter('file_size')
    def file_size_filter(size_bytes):
        """Format file size in human readable format"""
        if not size_bytes:
            return '0 B'
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    @app.template_filter('time_ago')
    def time_ago_filter(datetime_obj):
        """Display time in 'X ago' format"""
        if not datetime_obj:
            return ''
        
        if isinstance(datetime_obj, str):
            try:
                datetime_obj = datetime.fromisoformat(datetime_obj.replace('Z', '+00:00'))
            except:
                return datetime_obj
        
        now = datetime.now()
        diff = now - datetime_obj
        
        if diff.days > 0:
            if diff.days == 1:
                return "vor 1 Tag"
            elif diff.days < 7:
                return f"vor {diff.days} Tagen"
            elif diff.days < 30:
                weeks = diff.days // 7
                return f"vor {weeks} Woche{'n' if weeks > 1 else ''}"
            elif diff.days < 365:
                months = diff.days // 30
                return f"vor {months} Monat{'en' if months > 1 else ''}"
            else:
                years = diff.days // 365
                return f"vor {years} Jahr{'en' if years > 1 else ''}"
        
        hours = diff.seconds // 3600
        if hours > 0:
            return f"vor {hours} Stunde{'n' if hours > 1 else ''}"
        
        minutes = diff.seconds // 60
        if minutes > 0:
            return f"vor {minutes} Minute{'n' if minutes > 1 else ''}"
        
        return "gerade eben"
    
    @app.template_filter('highlight_search')
    def highlight_search_filter(text, search_term):
        """Highlight search terms in text"""
        if not text or not search_term:
            return text
        
        # Escape special regex characters in search term
        escaped_term = re.escape(str(search_term))
        pattern = re.compile(f'({escaped_term})', re.IGNORECASE)
        highlighted = pattern.sub(r'<mark>\1</mark>', str(text))
        return Markup(highlighted)
    
    @app.template_filter('first_paragraph')
    def first_paragraph_filter(text, max_length=200):
        """Extract first paragraph or sentence for preview"""
        if not text:
            return ''
        
        text = str(text).strip()
        
        # Try to find first paragraph (double newline)
        paragraphs = re.split(r'\n\s*\n', text)
        first_para = paragraphs[0].strip()
        
        # If first paragraph is too long, try to find first sentence
        if len(first_para) > max_length:
            sentences = re.split(r'[.!?]+', first_para)
            if sentences and len(sentences[0]) <= max_length:
                first_para = sentences[0].strip() + '.'
            else:
                # Fallback to character truncation
                first_para = first_para[:max_length].rsplit(' ', 1)[0] + '...'
        
        return first_para
    
    @app.template_global()
    def get_file_icon(filename):
        """Get appropriate icon class for file type"""
        if not filename:
            return 'fas fa-file'
        
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        
        icon_map = {
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'xls': 'fas fa-file-excel',
            'xlsx': 'fas fa-file-excel',
            'ppt': 'fas fa-file-powerpoint',
            'pptx': 'fas fa-file-powerpoint',
            'jpg': 'fas fa-file-image',
            'jpeg': 'fas fa-file-image',
            'png': 'fas fa-file-image',
            'gif': 'fas fa-file-image',
            'txt': 'fas fa-file-alt',
            'zip': 'fas fa-file-archive',
            'rar': 'fas fa-file-archive',
            '7z': 'fas fa-file-archive',
        }
        
        return icon_map.get(ext, 'fas fa-file')
    
    @app.template_global()
    def is_image_file(filename):
        """Check if file is an image"""
        if not filename:
            return False
        
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        return ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    
    @app.template_global()
    def format_file_size(size_bytes):
        """Template global version of file_size filter"""
        return file_size_filter(size_bytes)
    
    @app.template_global()
    def get_unread_posts_count():
        """Get count of unread forum posts for current user"""
        if not hasattr(g, 'user') or not g.user:
            return 0
        
        try:
            from database.db_manager import get_db
            db = get_db()
            
            count = db.execute('''
                SELECT COUNT(*) as unread_count
                FROM forum_posts fp
                LEFT JOIN forum_post_reads fpr ON fp.id = fpr.post_id AND fpr.user_id = ?
                WHERE fpr.user_id IS NULL
            ''', (g.user.id,)).fetchone()
            
            return count['unread_count'] if count else 0
            
        except:
            return 0
    
    @app.template_global()
    def get_forum_stats():
        """Get basic forum statistics"""
        try:
            from database.db_manager import get_db
            db = get_db()
            
            stats = db.execute('''
                SELECT 
                    (SELECT COUNT(*) FROM forum_posts) as total_posts,
                    (SELECT COUNT(*) FROM forum_categories) as total_categories,
                    (SELECT COUNT(DISTINCT author_id) FROM forum_posts) as active_users
            ''').fetchone()
            
            return dict(stats) if stats else {}
            
        except:
            return {}
    
    # Add more template globals as needed for navigation, etc.
    @app.template_global()
    def get_navigation_items():
        """Get navigation items for the main menu"""
        nav_items = [
            {'name': 'Dashboard', 'url': 'dashboard.index', 'icon': 'fas fa-tachometer-alt'},
            {'name': 'Forum', 'url': 'forum.index', 'icon': 'fas fa-comments'},
            {'name': 'Teams', 'url': 'teams.index', 'icon': 'fas fa-users'},
            {'name': 'Tickets', 'url': 'tickets.index', 'icon': 'fas fa-ticket-alt'},
        ]
        
        # Add admin items for users with appropriate roles
        if hasattr(g, 'user') and g.user and hasattr(g.user, 'has_management_role'):
            if g.user.has_management_role():
                nav_items.append({'name': 'Admin', 'url': 'admin.index', 'icon': 'fas fa-cog'})
        
        return nav_items