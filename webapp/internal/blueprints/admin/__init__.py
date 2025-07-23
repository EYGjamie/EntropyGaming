from flask import Blueprint, render_template, request, redirect, url_for, flash, g, jsonify, current_app
from database.db_manager import get_db, log_activity
from models.user import User
from utils.decorators import login_required, role_required
import bcrypt
import logging
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
@login_required
@role_required('Projektleitung', 'Developer')  
def index():
    """Admin dashboard"""
    try:
        # Get admin statistics
        stats = get_admin_stats()
        
        # Get recent admin activity
        recent_activity = get_recent_admin_activity()
        
        # Get system information
        system_info = get_system_info()
        
        return render_template(
            'admin/index.html',
            user=g.user,
            roles=g.user_roles,
            stats=stats,
            recent_activity=recent_activity,
            system_info=system_info
        )
        
    except Exception as e:
        logging.error(f"Error loading admin dashboard: {e}")
        return render_template(
            'admin/index.html',
            user=g.user,
            roles=g.user_roles,
            stats={},
            recent_activity=[],
            system_info={},
            error="Fehler beim Laden des Admin-Dashboards"
        )

@admin_bp.route('/users')
@login_required
@role_required('Projektleitung', 'Developer')
def users():
    """User management page"""
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        
        users_data = get_users_data(page, search, role_filter)
        available_roles = get_available_roles()
        
        return render_template(
            'admin/users.html',
            user=g.user,
            roles=g.user_roles,
            users_data=users_data,
            available_roles=available_roles,
            current_search=search,
            current_role_filter=role_filter
        )
        
    except Exception as e:
        logging.error(f"Error loading users page: {e}")
        return render_template(
            'admin/users.html',
            user=g.user,
            roles=g.user_roles,
            users_data={'users': [], 'total': 0, 'pages': 0},
            available_roles=[],
            error="Fehler beim Laden der Benutzerverwaltung"
        )

@admin_bp.route('/users/<int:user_id>/edit', methods=['GET', 'POST'])
@login_required
@role_required('Projektleitung', 'Developer')
def edit_user(user_id):
    """Edit user page"""
    try:
        target_user = User.get_by_id(user_id)
        if not target_user:
            flash('Benutzer nicht gefunden.', 'error')
            return redirect(url_for('admin.users'))
        
        if request.method == 'POST':
            # Update user data
            full_name = request.form.get('full_name', '').strip()
            email = request.form.get('email', '').strip()
            phone = request.form.get('phone', '').strip()
            description = request.form.get('description', '').strip()
            is_active = request.form.get('is_active') == 'on'
            
            # Update basic info
            target_user.update_profile(
                full_name=full_name,
                phone=phone,
                description=description
            )
            
            # Update email (requires validation)
            if email != target_user.email:
                db = get_db()
                existing = db.execute(
                    'SELECT id FROM web_users WHERE email = ? AND id != ?',
                    (email, user_id)
                ).fetchone()
                
                if existing:
                    flash('Diese E-Mail-Adresse wird bereits verwendet.', 'error')
                else:
                    db.execute(
                        'UPDATE web_users SET email = ? WHERE id = ?',
                        (email, user_id)
                    )
                    db.commit()
            
            # Update active status
            db = get_db()
            db.execute(
                'UPDATE web_users SET is_active = ? WHERE id = ?',
                (is_active, user_id)
            )
            db.commit()
            
            # Handle roles
            current_roles = set(target_user.get_roles())
            new_roles = set(request.form.getlist('roles'))
            
            # Remove roles
            for role in current_roles - new_roles:
                target_user.remove_role(role, g.user.id)
            
            # Add roles
            for role in new_roles - current_roles:
                target_user.add_role(role, g.user.id)
            
            log_activity(
                user_id=g.user.id,
                action='user_updated',
                resource_type='user',
                resource_id=str(user_id),
                details=f"Updated user {target_user.username}"
            )
            
            flash('Benutzer erfolgreich aktualisiert.', 'success')
            return redirect(url_for('admin.users'))
        
        return render_template(
            'admin/edit_user.html',
            user=g.user,
            roles=g.user_roles,
            target_user=target_user,
            target_user_roles=target_user.get_roles(),
            available_roles=get_available_roles()
        )
        
    except Exception as e:
        logging.error(f"Error editing user {user_id}: {e}")
        flash('Fehler beim Bearbeiten des Benutzers.', 'error')
        return redirect(url_for('admin.users'))

@admin_bp.route('/users/create', methods=['GET', 'POST'])
@login_required
@role_required('Projektleitung', 'Developer')
def create_user():
    """Create new user"""
    if request.method == 'POST':
        try:
            username = request.form.get('username', '').strip()
            email = request.form.get('email', '').strip()
            password = request.form.get('password', '')
            full_name = request.form.get('full_name', '').strip()
            phone = request.form.get('phone', '').strip()
            description = request.form.get('description', '').strip()
            roles = request.form.getlist('roles')
            
            # Validation
            if not username or not email or not password:
                flash('Username, E-Mail und Passwort sind erforderlich.', 'error')
                return render_template('admin/create_user.html', 
                                     user=g.user, roles=g.user_roles,
                                     available_roles=get_available_roles())
            
            # Check if user exists
            db = get_db()
            existing = db.execute(
                'SELECT id FROM web_users WHERE username = ? OR email = ?',
                (username, email)
            ).fetchone()
            
            if existing:
                flash('Benutzername oder E-Mail bereits vergeben.', 'error')
                return render_template('admin/create_user.html',
                                     user=g.user, roles=g.user_roles,
                                     available_roles=get_available_roles())
            
            # Create user
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cursor = db.execute('''
                INSERT INTO web_users 
                (username, email, password_hash, full_name, phone, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (username, email, password_hash, full_name, phone, description, True))
            
            new_user_id = cursor.lastrowid
            
            # Assign roles
            for role in roles:
                db.execute(
                    'INSERT INTO web_user_roles (user_id, role, assigned_by) VALUES (?, ?, ?)',
                    (new_user_id, role, g.user.id)
                )
            
            db.commit()
            
            log_activity(
                user_id=g.user.id,
                action='user_created',
                resource_type='user',
                resource_id=str(new_user_id),
                details=f"Created user {username}"
            )
            
            flash(f'Benutzer "{username}" erfolgreich erstellt.', 'success')
            return redirect(url_for('admin.users'))
            
        except Exception as e:
            logging.error(f"Error creating user: {e}")
            flash('Fehler beim Erstellen des Benutzers.', 'error')
    
    return render_template(
        'admin/create_user.html',
        user=g.user,
        roles=g.user_roles,
        available_roles=get_available_roles()
    )

@admin_bp.route('/activity')
@login_required
@role_required('Admin', 'Dev')
def activity():
    """System activity log"""
    try:
        page = request.args.get('page', 1, type=int)
        activity_data = get_activity_data(page)
        
        return render_template(
            'admin/activity.html',
            user=g.user,
            roles=g.user_roles,
            activity_data=activity_data
        )
        
    except Exception as e:
        logging.error(f"Error loading activity page: {e}")
        return render_template(
            'admin/activity.html',
            user=g.user,
            roles=g.user_roles,
            activity_data={'activities': [], 'total': 0, 'pages': 0}
        )

# Helper functions
def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        db = get_db()
        
        # Get counts from last 24 hours
        yesterday = datetime.now() - timedelta(days=1)
        
        stats = {
            'total_web_users': db.execute('SELECT COUNT(*) as count FROM web_users').fetchone()['count'],
            'active_web_users': db.execute('SELECT COUNT(*) as count FROM web_users WHERE is_active = 1').fetchone()['count'],
            'new_users_today': db.execute(
                'SELECT COUNT(*) as count FROM web_users WHERE created_at > ?',
                (yesterday,)
            ).fetchone()['count'],
            'activity_logs_today': db.execute(
                'SELECT COUNT(*) as count FROM web_activity_log WHERE created_at > ?',
                (yesterday,)
            ).fetchone()['count'],
        }
        
        # Add Discord bot stats if available
        try:
            stats.update({
                'discord_users': db.execute('SELECT COUNT(*) as count FROM users WHERE is_bot = 0').fetchone()['count'],
                'total_tickets': db.execute('SELECT COUNT(*) as count FROM tickets').fetchone()['count'],
                'open_tickets': db.execute('SELECT COUNT(*) as count FROM tickets WHERE ticket_status = "open"').fetchone()['count']
            })
        except:
            pass
        
        return stats
        
    except Exception as e:
        logging.error(f"Error getting admin stats: {e}")
        return {}

def get_recent_admin_activity():
    """Get recent admin activity"""
    try:
        db = get_db()
        
        activities = db.execute('''
            SELECT 
                wal.action,
                wal.resource_type,
                wal.resource_id,
                wal.details,
                wal.created_at,
                wu.username,
                wu.full_name
            FROM web_activity_log wal
            LEFT JOIN web_users wu ON wal.user_id = wu.id
            WHERE wal.action IN ('user_created', 'user_updated', 'role_assigned', 'role_removed', 'login_failed')
            ORDER BY wal.created_at DESC
            LIMIT 10
        ''').fetchall()
        
        return [dict(activity) for activity in activities]
        
    except Exception as e:
        logging.error(f"Error getting admin activity: {e}")
        return []

def get_system_info():
    """Get system information"""
    try:
        import sys
        import platform
        
        return {
            'python_version': sys.version.split()[0],
            'platform': platform.system(),
            'flask_env': current_app.config.get('FLASK_ENV', 'unknown'),
            'debug_mode': current_app.debug
        }
        
    except Exception as e:
        logging.error(f"Error getting system info: {e}")
        return {}

def get_users_data(page=1, search='', role_filter=''):
    """Get paginated users data"""
    try:
        db = get_db()
        items_per_page = current_app.config.get('ITEMS_PER_PAGE', 20)
        offset = (page - 1) * items_per_page
        
        # Build query
        where_conditions = ['1=1']
        params = []
        
        if search:
            where_conditions.append('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)')
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        if role_filter:
            where_conditions.append('id IN (SELECT user_id FROM web_user_roles WHERE role = ?)')
            params.append(role_filter)
        
        where_clause = ' AND '.join(where_conditions)
        
        # Get total count
        count_sql = f'SELECT COUNT(*) as total FROM web_users WHERE {where_clause}'
        total = db.execute(count_sql, params).fetchone()['total']
        
        # Get users
        users_sql = f'''
            SELECT id, username, email, full_name, is_active, last_login, created_at
            FROM web_users 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        '''
        
        params.extend([items_per_page, offset])
        users = db.execute(users_sql, params).fetchall()
        
        # Add roles to each user
        users_with_roles = []
        for user_row in users:
            user_dict = dict(user_row)
            user_roles = db.execute(
                'SELECT role FROM web_user_roles WHERE user_id = ?',
                (user_dict['id'],)
            ).fetchall()
            user_dict['roles'] = [role['role'] for role in user_roles]
            users_with_roles.append(user_dict)
        
        # Calculate pagination info
        pages = (total + items_per_page - 1) // items_per_page
        
        return {
            'users': users_with_roles,
            'total': total,
            'page': page,
            'pages': pages,
            'has_prev': page > 1,
            'has_next': page < pages,
            'prev_num': page - 1 if page > 1 else None,
            'next_num': page + 1 if page < pages else None
        }
        
    except Exception as e:
        logging.error(f"Error getting users data: {e}")
        return {
            'users': [],
            'total': 0,
            'page': 1,
            'pages': 0,
            'has_prev': False,
            'has_next': False,
            'prev_num': None,
            'next_num': None
        }

def get_available_roles():
    """Get available user roles"""
    return ['Admin', 'Dev', 'Member', 'Guest']

def get_activity_data(page=1):
    """Get paginated activity data"""
    try:
        db = get_db()
        items_per_page = current_app.config.get('ITEMS_PER_PAGE', 20)
        offset = (page - 1) * items_per_page
        
        # Get total count
        total = db.execute('SELECT COUNT(*) as total FROM web_activity_log').fetchone()['total']
        
        # Get activities
        activities = db.execute('''
            SELECT 
                wal.action,
                wal.resource_type,
                wal.resource_id,
                wal.details,
                wal.ip_address,
                wal.created_at,
                wu.username,
                wu.full_name
            FROM web_activity_log wal
            LEFT JOIN web_users wu ON wal.user_id = wu.id
            ORDER BY wal.created_at DESC
            LIMIT ? OFFSET ?
        ''', (items_per_page, offset)).fetchall()
        
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
        logging.error(f"Error getting activity data: {e}")
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