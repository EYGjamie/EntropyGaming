from flask import Blueprint, render_template, request, redirect, url_for, flash, g, jsonify
from database.db_manager import get_db
from models.user import User
from utils.decorators import login_required, role_required
from utils.activity_logger import log_activity
from utils.ticket_helper import load_ticket_transcript
import logging
import glob
import os
import json

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
@login_required
@role_required('Admin', 'Dev')
def index():
    """Admin dashboard"""
    try:
        # Get admin statistics
        stats = get_admin_stats()
        
        # Get recent admin activity
        recent_activity = get_recent_admin_activity()
        
        return render_template(
            'admin/index.html',
            user=g.user,
            roles=g.user_roles,
            stats=stats,
            recent_activity=recent_activity
        )
        
    except Exception as e:
        logging.error(f"Error loading admin dashboard: {e}")
        return render_template(
            'admin/index.html',
            user=g.user,
            roles=g.user_roles,
            stats={},
            recent_activity=[],
            error="Fehler beim Laden des Admin-Dashboards"
        )

@admin_bp.route('/users')
@login_required
@role_required('Admin')
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
            error="Fehler beim Laden der Benutzerliste"
        )

@admin_bp.route('/bot-configs')
@login_required
@role_required('Admin', 'Dev')
def bot_configs():
    """Bot configuration management (read-only)"""
    try:
        # Get bot configurations
        configs = get_bot_configs()
        
        return render_template(
            'admin/bot_configs.html',
            user=g.user,
            roles=g.user_roles,
            configs=configs
        )
        
    except Exception as e:
        logging.error(f"Error loading bot configs: {e}")
        return render_template(
            'admin/bot_configs.html',
            user=g.user,
            roles=g.user_roles,
            configs={},
            error="Fehler beim Laden der Bot-Konfiguration"
        )

@admin_bp.route('/tickets/<int:ticket_id>')
@login_required
@role_required('Admin', 'Dev', 'Mitglied')
def view_ticket(ticket_id):
    """View ticket transcript"""
    try:
        transcript = load_ticket_transcript(ticket_id)
        
        if not transcript:
            return render_template(
                'error.html',
                error_code=404,
                error_message="Ticket-Transkript nicht gefunden"
            ), 404
        
        # Log ticket access
        log_activity(
            user_id=g.user.id,
            action='ticket_viewed',
            resource='ticket',
            resource_id=str(ticket_id),
            ip_address=request.remote_addr
        )
        
        return render_template(
            'admin/ticket.html',
            user=g.user,
            roles=g.user_roles,
            transcript=transcript,
            ticket_id=ticket_id
        )
        
    except Exception as e:
        logging.error(f"Error loading ticket {ticket_id}: {e}")
        return render_template(
            'error.html',
            error_code=500,
            error_message="Fehler beim Laden des Ticket-Transkripts"
        ), 500

@admin_bp.route('/activity-logs')
@login_required
@role_required('Admin', 'Dev')
def activity_logs():
    """System activity logs"""
    try:
        page = request.args.get('page', 1, type=int)
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        
        logs_data = get_activity_logs(page, user_filter, action_filter)
        
        return render_template(
            'admin/activity_logs.html',
            user=g.user,
            roles=g.user_roles,
            logs_data=logs_data,
            current_user_filter=user_filter,
            current_action_filter=action_filter
        )
        
    except Exception as e:
        logging.error(f"Error loading activity logs: {e}")
        return render_template(
            'admin/activity_logs.html',
            user=g.user,
            roles=g.user_roles,
            logs_data={'logs': [], 'total': 0, 'pages': 0},
            error="Fehler beim Laden der Aktivitätslogs"
        )

# API endpoints for admin functions

@admin_bp.route('/api/users/<int:user_id>/toggle-status', methods=['POST'])
@login_required
@role_required('Admin')
def toggle_user_status(user_id):
    """Toggle user active status"""
    try:
        target_user = User.get_by_id(user_id)
        if not target_user:
            return jsonify({'success': False, 'error': 'Benutzer nicht gefunden'}), 404
        
        # Don't allow deactivating self
        if target_user.id == g.user.id:
            return jsonify({'success': False, 'error': 'Sie können sich nicht selbst deaktivieren'}), 400
        
        target_user.is_active = not target_user.is_active
        target_user.save()
        
        log_activity(
            user_id=g.user.id,
            action='user_status_changed',
            resource='user',
            resource_id=str(user_id),
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'new_status': target_user.is_active,
            'message': f'Benutzer {"aktiviert" if target_user.is_active else "deaktiviert"}'
        })
        
    except Exception as e:
        logging.error(f"Error toggling user status: {e}")
        return jsonify({'success': False, 'error': 'Interner Fehler'}), 500

def get_admin_stats():
    """Get statistics for admin dashboard"""
    try:
        db = get_db()
        
        stats = {
            'total_web_users': db.execute('SELECT COUNT(*) as count FROM web_users').fetchone()['count'],
            'active_web_users': db.execute('SELECT COUNT(*) as count FROM web_users WHERE is_active = 1').fetchone()['count'],
            'total_discord_users': db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count'],
            'total_teams': db.execute('SELECT COUNT(*) as count FROM team_areas WHERE is_active = 1').fetchone()['count'],
            'total_tickets': db.execute('SELECT COUNT(*) as count FROM tickets').fetchone()['count'],
            'open_tickets': db.execute('SELECT COUNT(*) as count FROM tickets WHERE ticket_status = "Open"').fetchone()['count']
        }
        
        return stats
        
    except Exception as e:
        logging.error(f"Error getting admin stats: {e}")
        return {}

def get_recent_admin_activity(limit=10):
    """Get recent admin activity"""
    try:
        db = get_db()
        
        activity = db.execute('''
            SELECT al.*, wu.username, wu.full_name
            FROM web_activity_log al
            LEFT JOIN web_users wu ON al.user_id = wu.id
            ORDER BY al.created_at DESC
            LIMIT ?
        ''', (limit,)).fetchall()
        
        return [dict(row) for row in activity]
        
    except Exception as e:
        logging.error(f"Error getting recent admin activity: {e}")
        return []

def get_users_data(page, search='', role_filter='', per_page=20):
    """Get paginated users data"""
    try:
        db = get_db()
        offset = (page - 1) * per_page
        
        # Build query
        query = '''
            SELECT wu.*, GROUP_CONCAT(wur.role) as roles
            FROM web_users wu
            LEFT JOIN web_user_roles wur ON wu.id = wur.user_id
            WHERE 1=1
        '''
        params = []
        
        if search:
            query += ' AND (wu.username LIKE ? OR wu.email LIKE ? OR wu.full_name LIKE ?)'
            search_param = f'%{search}%'
            params.extend([search_param, search_param, search_param])
        
        if role_filter:
            query += ' AND wu.id IN (SELECT user_id FROM web_user_roles WHERE role = ?)'
            params.append(role_filter)
        
        query += ' GROUP BY wu.id ORDER BY wu.created_at DESC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        users = db.execute(query, params).fetchall()
        
        # Get total count
        count_query = 'SELECT COUNT(DISTINCT wu.id) as count FROM web_users wu'
        if role_filter:
            count_query += ' JOIN web_user_roles wur ON wu.id = wur.user_id WHERE wur.role = ?'
            total = db.execute(count_query, [role_filter]).fetchone()['count']
        else:
            total = db.execute(count_query).fetchone()['count']
        
        pages = (total + per_page - 1) // per_page
        
        return {
            'users': [dict(user) for user in users],
            'total': total,
            'pages': pages,
            'current_page': page
        }
        
    except Exception as e:
        logging.error(f"Error getting users data: {e}")
        return {'users': [], 'total': 0, 'pages': 0, 'current_page': 1}

def get_available_roles():
    """Get list of available roles"""
    return ['Admin', 'Dev', 'Mitglied', 'Guest']

def get_bot_configs():
    """Get bot configurations grouped by category"""
    try:
        db = get_db()
        configs = db.execute('''
            SELECT const_key, prod_value, test_value, description, category, is_active
            FROM bot_const_ids
            WHERE is_active = 1
            ORDER BY category, const_key
        ''').fetchall()
        
        # Group by category
        configs_by_category = {}
        for config in configs:
            category = config['category'] or 'Uncategorized'
            if category not in configs_by_category:
                configs_by_category[category] = []
            configs_by_category[category].append(dict(config))
        
        return configs_by_category
        
    except Exception as e:
        logging.error(f"Error getting bot configs: {e}")
        return {}

def get_activity_logs(page, user_filter='', action_filter='', per_page=50):
    """Get paginated activity logs"""
    try:
        db = get_db()
        offset = (page - 1) * per_page
        
        # Build query
        query = '''
            SELECT al.*, wu.username, wu.full_name
            FROM web_activity_log al
            LEFT JOIN web_users wu ON al.user_id = wu.id
            WHERE 1=1
        '''
        params = []
        
        if user_filter:
            query += ' AND wu.username LIKE ?'
            params.append(f'%{user_filter}%')
        
        if action_filter:
            query += ' AND al.action LIKE ?'
            params.append(f'%{action_filter}%')
        
        query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        logs = db.execute(query, params).fetchall()
        
        # Get total count
        count_query = '''
            SELECT COUNT(*) as count 
            FROM web_activity_log al
            LEFT JOIN web_users wu ON al.user_id = wu.id
            WHERE 1=1
        '''
        count_params = []
        
        if user_filter:
            count_query += ' AND wu.username LIKE ?'
            count_params.append(f'%{user_filter}%')
        
        if action_filter:
            count_query += ' AND al.action LIKE ?'
            count_params.append(f'%{action_filter}%')
        
        total = db.execute(count_query, count_params).fetchone()['count']
        pages = (total + per_page - 1) // per_page
        
        return {
            'logs': [dict(log) for log in logs],
            'total': total,
            'pages': pages,
            'current_page': page
        }
        
    except Exception as e:
        logging.error(f"Error getting activity logs: {e}")
        return {'logs': [], 'total': 0, 'pages': 0, 'current_page': 1}