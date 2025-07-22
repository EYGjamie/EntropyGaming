from flask import Blueprint, render_template, request, redirect, url_for, session, flash, g
from models.user import User
from database.db_manager import log_activity
import logging

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.before_app_request
def load_logged_in_user():
    """Load user for each request if logged in"""
    user_id = session.get('user_id')
    
    if user_id is None:
        g.user = None
        g.user_roles = []
    else:
        g.user = User.get_by_id(user_id)
        if g.user:
            g.user_roles = g.user.get_roles()
        else:
            # Invalid user_id in session, clear it
            session.clear()
            g.user = None
            g.user_roles = []

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication"""
    # Redirect if already logged in
    if g.user:
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        remember_me = request.form.get('remember_me') == 'on'
        
        # Validation
        if not username or not password:
            flash('Benutzername und Passwort sind erforderlich.', 'error')
            return render_template('auth/login.html')
        
        # Find user
        user = User.get_by_username_or_email(username)
        
        if user and user.verify_password(password):
            # Successful login
            session.clear()
            session['user_id'] = user.id
            session['username'] = user.username
            session.permanent = remember_me
            
            # Update last login
            user.update_last_login()
            
            # Log activity
            log_activity(
                user_id=user.id,
                action='login',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            flash(f'Willkommen zurück, {user.full_name or user.username}!', 'success')
            
            # Redirect to next page or dashboard
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('dashboard.index'))
        
        else:
            # Failed login
            flash('Ungültige Anmeldedaten.', 'error')
            
            # Log failed login attempt
            log_activity(
                user_id=None,
                action='login_failed',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                details=f"Failed login attempt for username: {username}"
            )
    
    return render_template('auth/login.html')

@auth_bp.route('/logout')
def logout():
    """Logout and clear session"""
    if g.user:
        log_activity(
            user_id=g.user.id,
            action='logout',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Auf Wiedersehen, {g.user.full_name or g.user.username}!', 'info')
    
    session.clear()
    return redirect(url_for('auth.login'))

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Registration page (optional for MVP)"""
    # For MVP, we might disable registration or restrict it to admins
    flash('Registrierung ist derzeit nicht verfügbar. Kontaktieren Sie einen Administrator.', 'info')
    return redirect(url_for('auth.login'))