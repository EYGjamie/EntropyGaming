from functools import wraps
from flask import g, redirect, url_for, request, flash, abort
import logging

def login_required(f):
    """Decorator to require user login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            flash('Bitte melden Sie sich an, um diese Seite zu besuchen.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def logout_required(f):
    """Decorator to require user to be logged out"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is not None:
            return redirect(url_for('dashboard.index'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    """Decorator to require specific user roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if g.user is None:
                flash('Bitte melden Sie sich an.', 'warning')
                return redirect(url_for('auth.login', next=request.url))
            
            if not g.user.has_role(*roles):
                flash('Sie haben nicht die erforderlichen Berechtigungen.', 'error')
                abort(403)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to require admin role"""
    return role_required('Admin')(f)

def dev_required(f):
    """Decorator to require dev role"""
    return role_required('Dev', 'Admin')(f)

"""
webapp/internal/utils/template_helpers.py
Template Helper Funktionen
"""
from flask import g, request, current_app
import os

def register_template_helpers(app):
    """Register template helper functions"""
    
    @app.template_global()
    def current_user():
        """Get current user in templates"""
        return g.user
    
    @app.template_global()
    def user_roles():
        """Get current user roles in templates"""
        return g.user_roles if g.user else []
    
    @app.template_global()
    def has_role(*roles):
        """Check if current user has specific role"""
        if not g.user:
            return False
        return g.user.has_role(*roles)
    
    @app.template_global()
    def is_active_route(route_name):
        """Check if current route matches"""
        return request.endpoint == route_name
    
    @app.template_global()
    def is_active_blueprint(blueprint_name):
        """Check if current blueprint matches"""
        if not request.endpoint:
            return False
        return request.endpoint.startswith(f"{blueprint_name}.")
    
    @app.template_filter()
    def datetime_format(value, format='%d.%m.%Y %H:%M'):
        """Format datetime in templates"""
        if value is None:
            return 'Unbekannt'
        try:
            from datetime import datetime
            if isinstance(value, str):
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            return value.strftime(format)
        except:
            return str(value)
    
    @app.template_filter()
    def role_badge_class(role):
        """Get CSS class for role badge"""
        role_classes = {
            'Admin': 'badge-role-admin',
            'Dev': 'badge-role-dev',
            'Member': 'badge-role-member',
            'Guest': 'badge-role-guest'
        }
        return role_classes.get(role, 'badge-secondary')
    
    @app.template_filter()
    def status_badge_class(status):
        """Get CSS class for status badge"""
        status_classes = {
            'open': 'bg-success',
            'closed': 'bg-secondary',
            'in_progress': 'bg-warning',
            'pending': 'bg-info'
        }
        return status_classes.get(status, 'bg-secondary')
    
    @app.template_filter()
    def file_exists(filepath):
        """Check if file exists (for profile images, etc.)"""
        if not filepath:
            return False
        full_path = os.path.join(current_app.root_path, 'static', filepath)
        return os.path.exists(full_path)
    
    @app.template_filter()
    def truncate_words(text, count=50):
        """Truncate text to specified word count"""
        if not text:
            return ''
        words = text.split()
        if len(words) <= count:
            return text
        return ' '.join(words[:count]) + '...'

"""
webapp/internal/utils/helpers.py
Allgemeine Helper-Funktionen
"""
import logging
import os
from datetime import datetime

def setup_logging(app):
    """Setup application logging"""
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = logging.FileHandler('logs/entropy_webapp.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('Entropy Webapp startup')

def allowed_file(filename, allowed_extensions):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def secure_filename_custom(filename):
    """Custom secure filename function"""
    import re
    import unicodedata
    
    # Normalize unicode characters
    filename = unicodedata.normalize('NFKD', filename)
    # Remove non-ASCII characters
    filename = filename.encode('ascii', 'ignore').decode('ascii')
    # Replace spaces and special chars with underscores
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    # Remove multiple underscores
    filename = re.sub(r'_+', '_', filename)
    # Remove leading/trailing underscores
    filename = filename.strip('_')
    
    return filename

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    import math
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    
    return f"{s} {size_names[i]}"

def get_client_ip(request):
    """Get real client IP address"""
    if request.environ.get('HTTP_X_FORWARDED_FOR') is None:
        return request.environ['REMOTE_ADDR']
    else:
        return request.environ['HTTP_X_FORWARDED_FOR']