from flask import g
from utils.helpers import (
    format_datetime, format_timestamp, get_role_badge_class, 
    get_status_badge_class, truncate_text, get_file_size_human
)

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