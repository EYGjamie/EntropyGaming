from functools import wraps
from flask import g, redirect, url_for, request, flash, abort, current_app
import logging

def login_required(f):
    """Decorator to require user login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            flash('Bitte melden Sie sich mit Discord an, um diese Seite zu besuchen.', 'warning')
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
    """Decorator to require specific Discord roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if g.user is None:
                flash('Bitte melden Sie sich mit Discord an.', 'warning')
                return redirect(url_for('auth.login', next=request.url))
            
            if not g.user.has_role(*roles):
                flash('Sie haben nicht die erforderlichen Discord-Rollen für diese Aktion.', 'error')
                abort(403)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def management_required(f):
    """Decorator to require management role"""
    return role_required('Management', 'Head Management', 'Developer')(f)

def developer_required(f):
    """Decorator to require developer role"""
    return role_required('Developer', 'Head Management')(f)

def projektleitung_required(f):
    """Decorator to require head management role"""
    return role_required('Projektleitung')(f)

# Backward compatibility aliases
admin_required = projektleitung_required
dev_required = developer_required