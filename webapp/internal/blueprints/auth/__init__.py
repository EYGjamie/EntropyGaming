from flask import Blueprint, render_template, request, redirect, url_for, session, flash, g, current_app
from models.user import User
from utils.discord_helper import DiscordAPI, get_discord_oauth_url, exchange_code_for_token
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
            # Update last seen
            g.user.update_last_seen()
        else:
            # Invalid user_id in session, clear it
            session.clear()
            g.user = None
            g.user_roles = []

@auth_bp.route('/login')
def login():
    """Discord OAuth login page"""
    # Redirect if already logged in
    if g.user:
        return redirect(url_for('dashboard.index'))
    
    return render_template('auth/login.html', discord_oauth_url=get_discord_oauth_url())

@auth_bp.route('/discord/callback')
def discord_callback():
    """Discord OAuth callback"""
    try:
        # Get authorization code
        code = request.args.get('code')
        error = request.args.get('error')
        
        if error:
            flash(f'Discord Autorisierung fehlgeschlagen: {error}', 'error')
            return redirect(url_for('auth.login'))
        
        if not code:
            flash('Keine Autorisierung von Discord erhalten.', 'error')
            return redirect(url_for('auth.login'))
        
        # Exchange code for access token
        token_data = exchange_code_for_token(code)
        if not token_data:
            flash('Fehler beim Abrufen des Access Tokens von Discord.', 'error')
            return redirect(url_for('auth.login'))
        
        access_token = token_data.get('access_token')
        if not access_token:
            flash('Kein Access Token von Discord erhalten.', 'error')
            return redirect(url_for('auth.login'))
        
        # Get user info from Discord
        discord_user = DiscordAPI.get_user_info(access_token)
        if not discord_user:
            flash('Fehler beim Abrufen der Benutzerinformationen von Discord.', 'error')
            return redirect(url_for('auth.login'))
        
        discord_id = discord_user['id']
        
        # Check if user is in guild and get their roles
        guild_id = current_app.config['DISCORD_GUILD_ID']
        bot_token = current_app.config['DISCORD_BOT_TOKEN']
        
        guild_member = DiscordAPI.get_guild_member(discord_id, guild_id, bot_token)
        if not guild_member:
            flash('Sie sind nicht Mitglied des erforderlichen Discord-Servers.', 'error')
            return redirect(url_for('auth.login'))
        
        # Check if user has required roles
        required_roles = current_app.config['DISCORD_REQUIRED_ROLES']
        if not DiscordAPI.user_has_required_role(discord_id, guild_id, bot_token, required_roles):
            flash('Sie haben nicht die erforderlichen Rollen für den Zugriff auf diese Seite.', 'error')
            return redirect(url_for('auth.login'))
        
        # Create or update user in database
        user = User.create_or_update_from_discord(discord_user, guild_member)
        if not user:
            flash('Fehler beim Erstellen oder Aktualisieren des Benutzerprofils.', 'error')
            return redirect(url_for('auth.login'))
        
        # Update user roles from Discord
        user_roles = DiscordAPI.check_user_roles(discord_id, guild_id, bot_token)
        user.update_roles_from_discord(user_roles)
        
        # Log in user
        session.clear()
        session['user_id'] = user.id
        session['discord_id'] = user.discord_id
        session['access_token'] = access_token  # Store for potential future API calls
        session.permanent = True
        
        # Log activity
        log_activity(
            user_id=user.id,
            action='discord_login',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            details=f'Discord OAuth login: {user.username}'
        )
        
        flash(f'Willkommen, {user.effective_name}!', 'success')
        
        # Redirect to next page or dashboard
        next_page = request.args.get('next')
        if next_page:
            return redirect(next_page)
        return redirect(url_for('dashboard.index'))
        
    except Exception as e:
        logging.error(f"Error in Discord OAuth callback: {e}")
        flash('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.', 'error')
        return redirect(url_for('auth.login'))

@auth_bp.route('/logout')
def logout():
    """Logout user"""
    if g.user:
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='logout',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash('Sie wurden erfolgreich abgemeldet.', 'info')
    
    session.clear()
    return redirect(url_for('auth.login'))

@auth_bp.route('/profile')
def profile():
    """User profile (redirect to main profile page)"""
    if not g.user:
        return redirect(url_for('auth.login'))
    return redirect(url_for('profile.index'))