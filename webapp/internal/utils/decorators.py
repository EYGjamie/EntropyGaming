from functools import wraps
from flask import g, redirect, url_for, flash, request, abort, jsonify

def login_required(f):
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'error': 'Anmeldung erforderlich'}), 401
            
            flash('Bitte melden Sie sich an, um fortzufahren.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def logout_required(f):
    """Decorator to require logout (for login page etc.)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is not None:
            return redirect(url_for('dashboard.index'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(*roles):
    """Decorator to require specific roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if g.user is None:
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({'error': 'Anmeldung erforderlich'}), 401
                
                flash('Bitte melden Sie sich an, um fortzufahren.', 'warning')
                return redirect(url_for('auth.login', next=request.url))
            
            user_roles = g.user_roles
            if not any(role in user_roles for role in roles):
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({'error': 'Keine Berechtigung'}), 403
                
                flash(f'Keine Berechtigung. Erforderliche Rollen: {", ".join(roles)}', 'error')
                return redirect(url_for('dashboard.index'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to require admin role"""
    return role_required('Admin')(f)

def dev_required(f):
    """Decorator to require dev or admin role"""
    return role_required('Admin', 'Dev')(f)

def member_required(f):
    """Decorator to require member level or higher"""
    return role_required('Admin', 'Dev', 'Mitglied')(f)