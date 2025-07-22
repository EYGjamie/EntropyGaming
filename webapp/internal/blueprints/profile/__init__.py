"""
webapp/internal/blueprints/profile/__init__.py
Profile Blueprint für MVP
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, g, current_app
from werkzeug.utils import secure_filename
from utils.decorators import login_required
from database.db_manager import log_activity
import os
import uuid
import logging

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route('/')
@login_required
def index():
    """User profile page"""
    try:
        # Get user activity log
        user_activity = get_user_activity(g.user.id)
        
        return render_template(
            'profile/index.html',
            user=g.user,
            roles=g.user_roles,
            user_activity=user_activity
        )
        
    except Exception as e:
        logging.error(f"Error loading profile: {e}")
        return render_template(
            'profile/index.html',
            user=g.user,
            roles=g.user_roles,
            user_activity=[],
            error="Fehler beim Laden des Profils"
        )

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
            
            # Handle profile image upload
            profile_image = None
            if 'profile_image' in request.files:
                file = request.files['profile_image']
                if file and file.filename and allowed_file(file.filename):
                    profile_image = save_profile_image(file)
            
            # Update user profile
            g.user.update_profile(
                full_name=full_name or None,
                phone=phone or None,
                description=description or None,
                profile_image=profile_image
            )
            
            flash('Profil erfolgreich aktualisiert.', 'success')
            return redirect(url_for('profile.index'))
            
        except Exception as e:
            logging.error(f"Error updating profile: {e}")
            flash('Fehler beim Aktualisieren des Profils.', 'error')
    
    return render_template(
        'profile/edit.html',
        user=g.user,
        roles=g.user_roles
    )

@profile_bp.route('/settings')
@login_required
def settings():
    """Profile settings page"""
    return render_template(
        'profile/settings.html',
        user=g.user,
        roles=g.user_roles
    )

@profile_bp.route('/activity')
@login_required
def activity():
    """User activity log page"""
    try:
        page = request.args.get('page', 1, type=int)
        activity_data = get_user_activity_paginated(g.user.id, page)
        
        return render_template(
            'profile/activity.html',
            user=g.user,
            roles=g.user_roles,
            activity_data=activity_data
        )
        
    except Exception as e:
        logging.error(f"Error loading user activity: {e}")
        return render_template(
            'profile/activity.html',
            user=g.user,
            roles=g.user_roles,
            activity_data={'activities': [], 'total': 0, 'pages': 0}
        )

def get_user_activity(user_id, limit=10):
    """Get recent user activity"""
    try:
        from database.db_manager import get_db
        db = get_db()
        
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
            LIMIT ?
        ''', (user_id, limit)).fetchall()
        
        return [dict(activity) for activity in activities]
        
    except Exception as e:
        logging.error(f"Error fetching user activity: {e}")
        return []

def get_user_activity_paginated(user_id, page=1):
    """Get paginated user activity"""
    try:
        from database.db_manager import get_db
        db = get_db()
        
        items_per_page = current_app.config.get('ITEMS_PER_PAGE', 20)
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

def allowed_file(filename):
    """Check if file extension is allowed"""
    allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', {'png', 'jpg', 'jpeg', 'gif'})
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def save_profile_image(file):
    """Save uploaded profile image"""
    try:
        # Generate unique filename
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        unique_filename = f"{g.user.id}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'profiles')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filepath = os.path.join(upload_dir, unique_filename)
        file.save(filepath)
        
        # Delete old profile image if it exists and is not the default
        if (g.user.profile_image and 
            g.user.profile_image != 'default-avatar.png' and
            g.user.profile_image.startswith(f"{g.user.id}_")):
            
            old_filepath = os.path.join(upload_dir, g.user.profile_image)
            if os.path.exists(old_filepath):
                os.remove(old_filepath)
        
        # Log activity
        log_activity(
            user_id=g.user.id,
            action='profile_image_updated',
            details=f"Updated profile image to {unique_filename}"
        )
        
        return unique_filename
        
    except Exception as e:
        logging.error(f"Error saving profile image: {e}")
        raise