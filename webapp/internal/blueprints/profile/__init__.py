from flask import Blueprint, render_template, request, redirect, url_for, flash, g, current_app, abort
from werkzeug.utils import secure_filename
from utils.decorators import login_required
from database.db_manager import log_activity, get_db
from models.user import User
import os
import uuid
import logging

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route('/')
@login_required
def index():
    """User profile page (own profile)"""
    try:
        # Get user activity log
        user_activity = get_user_activity(g.user.id)
        
        return render_template(
            'profile/index.html',
            user=g.user,
            roles=g.user_roles,
            user_activity=user_activity,
            is_own_profile=True
        )
        
    except Exception as e:
        logging.error(f"Error loading profile: {e}")
        return render_template(
            'profile/index.html',
            user=g.user,
            roles=g.user_roles,
            user_activity=[],
            error="Fehler beim Laden des Profils",
            is_own_profile=True,
            top_role = get_top_role(),
        )

@profile_bp.route('/view/<int:user_id>')
@login_required
def view_profile(user_id):
    """View profile of another user (only for management)"""
    try:
        # Check if current user has management role
        if not g.user.has_management_role():
            flash('Sie haben keine Berechtigung, andere Profile anzusehen.', 'error')
            return redirect(url_for('profile.index'))
        
        # Get target user
        target_user = User.get_by_id(user_id)
        if not target_user:
            flash('Benutzer nicht gefunden.', 'error')
            return redirect(url_for('dashboard.index'))
        
        # Get target user's roles
        target_user_roles = target_user.get_roles()
        
        # Get user activity log (limited for privacy)
        user_activity = get_user_activity(user_id, limit=10)
        
        return render_template(
            'profile/index.html',
            user=target_user,
            roles=target_user_roles,
            user_activity=user_activity,
            is_own_profile=False
        )
        
    except Exception as e:
        logging.error(f"Error loading profile for user {user_id}: {e}")
        flash('Fehler beim Laden des Profils.', 'error')
        return redirect(url_for('dashboard.index'))

@profile_bp.route('/edit', methods=['GET', 'POST'])
@login_required
def edit():
    """Edit user profile"""
    if request.method == 'POST':
        try:
            # Get form data
            full_name = request.form.get('full_name', '').strip()
            phone = request.form.get('phone', '').strip()
            description = request.form.get('description', '').strip()
            
            # Update user profile (no image upload needed anymore)
            g.user.update_profile(
                full_name=full_name or None,
                phone=phone or None,
                description=description or None
            )
            
            flash('Profil erfolgreich aktualisiert.', 'success')
            return redirect(url_for('profile.index'))
            
        except Exception as e:
            logging.error(f"Error updating profile: {e}")
            flash('Fehler beim Aktualisieren des Profils.', 'error')
            
    return render_template('profile/edit.html', user=g.user)

def get_user_activity(user_id, limit=50, page=1):
    """Get user activity with pagination"""
    try:
        db = get_db()
        items_per_page = limit
        offset = (page - 1) * items_per_page
        
        # Get total count
        total = db.execute(
            'SELECT COUNT(*) as total FROM web_activity_log WHERE user_id = ?',
            (user_id,)
        ).fetchone()['total']
        
        # Get activities
        activities = db.execute('''
            SELECT 
                action,
                resource_type,
                resource_id,
                details,
                ip_address,
                created_at
            FROM web_activity_log
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (user_id, items_per_page, offset)).fetchall()
        
        # Calculate pagination info
        pages = (total + items_per_page - 1) // items_per_page
        
        return {
            'activities': [dict(activity) for activity in activities],
            'total': total,
            'page': page,
            'pages': pages,
            'has_prev': page > 1,
            'has_next': page < pages,
            'prev_num': page - 1 if page > 1 else None,
            'next_num': page + 1 if page < pages else None
        }
        
    except Exception as e:
        logging.error(f"Error fetching paginated user activity: {e}")
        return {
            'activities': [],
            'total': 0,
            'page': 1,
            'pages': 0,
            'has_prev': False,
            'has_next': False,
            'prev_num': None,
            'next_num': None
        }

def get_top_role(user_roles):
    """Get the highest priority role for display"""
    # Role hierarchy (highest to lowest priority)
    role_hierarchy = [
        'Projektleitung',
        'Head Management',
        'Developer',
        'Management', 
        'Entropy Member',
        'Diamond Teams',
        'Diamond Club'    
    ]
    
    for role in role_hierarchy:
        if role in user_roles:
            return role
    
    return None

def get_role_badge_class(role):
    """Get CSS class for role badge"""
    role_classes = {
        'Head Management': 'badge-danger',
        'Management': 'badge-warning',
        'Developer': 'badge-info',
        'Projektleitung': 'badge-success',
        'Diamond Club': 'badge-purple',
        'Diamond Teams': 'badge-purple',
        'Entropy Member': 'badge-secondary'
    }
    return role_classes.get(role, 'badge-secondary')

# Register template functions
@profile_bp.app_template_filter('top_role')
def top_role_filter(roles):
    return get_top_role(roles)

@profile_bp.app_template_filter('role_badge_class')
def role_badge_class_filter(role):
    return get_role_badge_class(role)