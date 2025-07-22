from flask import Blueprint, render_template, request, redirect, url_for, session, flash, g
from models.user import User
from utils.decorators import login_required, logout_required
from utils.activity_logger import log_activity
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
@logout_required
def login():
    """Login page and authentication"""
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
            
            # Log failed attempt
            log_activity(
                action='login_failed',
                resource=username,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
    
    return render_template('auth/login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    """Logout user"""
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

@auth_bp.route('/profile')
@login_required
def profile():
    """User profile page"""
    return render_template('auth/profile.html', user=g.user, roles=g.user_roles)

@auth_bp.route('/profile/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    """Edit user profile"""
    if request.method == 'POST':
        # Update profile data
        g.user.full_name = request.form.get('full_name', '').strip()
        g.user.phone = request.form.get('phone', '').strip()
        g.user.description = request.form.get('description', '').strip()
        
        try:
            g.user.save()
            
            log_activity(
                user_id=g.user.id,
                action='profile_updated',
                ip_address=request.remote_addr
            )
            
            flash('Profil erfolgreich aktualisiert.', 'success')
            return redirect(url_for('auth.profile'))
            
        except Exception as e:
            logging.error(f"Error updating profile for user {g.user.id}: {e}")
            flash('Fehler beim Aktualisieren des Profils.', 'error')
    
    return render_template('auth/edit_profile.html', user=g.user)

@auth_bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Change user password"""
    if request.method == 'POST':
        current_password = request.form.get('current_password', '')
        new_password = request.form.get('new_password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        if not current_password or not new_password or not confirm_password:
            flash('Alle Felder sind erforderlich.', 'error')
            return render_template('auth/change_password.html')
        
        if not g.user.verify_password(current_password):
            flash('Aktuelles Passwort ist falsch.', 'error')
            return render_template('auth/change_password.html')
        
        if new_password != confirm_password:
            flash('Neue Passwörter stimmen nicht überein.', 'error')
            return render_template('auth/change_password.html')
        
        if len(new_password) < 6:
            flash('Neues Passwort muss mindestens 6 Zeichen lang sein.', 'error')
            return render_template('auth/change_password.html')
        
        try:
            g.user.set_password(new_password)
            
            log_activity(
                user_id=g.user.id,
                action='password_changed',
                ip_address=request.remote_addr
            )
            
            flash('Passwort erfolgreich geändert.', 'success')
            return redirect(url_for('auth.profile'))
            
        except Exception as e:
            logging.error(f"Error changing password for user {g.user.id}: {e}")
            flash('Fehler beim Ändern des Passworts.', 'error')
    
    return render_template('auth/change_password.html')

@auth_bp.route('/')
def index():
    """Redirect to appropriate page based on auth status"""
    if g.user:
        return redirect(url_for('dashboard.index'))
    return redirect(url_for('auth.login'))