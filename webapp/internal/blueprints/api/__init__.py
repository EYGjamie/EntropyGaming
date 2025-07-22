from flask import Blueprint, jsonify, request, g, current_app
from utils.decorators import login_required, role_required
from database.db_manager import get_db
import json
import os
import glob
import logging
import datetime

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/dashboard-stats')
@login_required
def dashboard_stats():
    """API endpoint for dashboard statistics"""
    try:
        from blueprints.dashboard import get_dashboard_stats
        stats = get_dashboard_stats()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logging.error(f"Error in dashboard stats API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Dashboard-Statistiken'
        }), 500

@api_bp.route('/bot-config')
@login_required
@role_required('Admin', 'Dev')
def bot_config():
    """API endpoint for bot configuration (read-only)"""
    try:
        config_dir = current_app.config.get('BOT_CONFIG_DIR', '../../bot/config')
        
        if not os.path.exists(config_dir):
            return jsonify({
                'success': False,
                'error': 'Bot-Konfigurationsverzeichnis nicht gefunden'
            }), 404
        
        config_data = {}
        
        # Load JSON config files
        json_files = glob.glob(os.path.join(config_dir, '*.json'))
        for filepath in json_files:
            try:
                filename = os.path.basename(filepath)
                with open(filepath, 'r', encoding='utf-8') as f:
                    config_data[filename] = json.load(f)
            except Exception as e:
                logging.warning(f"Could not load config file {filepath}: {e}")
                config_data[filename] = f"Error loading: {str(e)}"
        
        # If no JSON files found, return basic info
        if not config_data:
            config_data['info'] = 'Keine Konfigurationsdateien gefunden'
        
        return jsonify({
            'success': True,
            'data': config_data
        })
        
    except Exception as e:
        logging.error(f"Error in bot config API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Bot-Konfiguration'
        }), 500

@api_bp.route('/user-activity')
@login_required
def user_activity():
    """API endpoint for current user's activity"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        db = get_db()
        offset = (page - 1) * limit
        
        # Get total count
        total = db.execute(
            'SELECT COUNT(*) as total FROM web_activity_log WHERE user_id = ?',
            (g.user.id,)
        ).fetchone()['total']
        
        # Get activities
        activities = db.execute('''
            SELECT 
                action,
                resource_type,
                resource_id,
                details,
                created_at
            FROM web_activity_log
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (g.user.id, limit, offset)).fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'activities': [dict(activity) for activity in activities],
                'total': total,
                'page': page,
                'pages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logging.error(f"Error in user activity API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Benutzeraktivitäten'
        }), 500

@api_bp.route('/system-info')
@login_required
@role_required('Admin', 'Dev')
def system_info():
    """API endpoint for system information"""
    try:
        import sys
        import platform
        from datetime import datetime
        
        db = get_db()
        
        # Get database stats
        try:
            db_stats = {
                'web_users': db.execute('SELECT COUNT(*) as count FROM web_users').fetchone()['count'],
                'tickets': db.execute('SELECT COUNT(*) as count FROM tickets').fetchone()['count'],
                'teams': db.execute('SELECT COUNT(*) as count FROM team_areas WHERE is_active = "true"').fetchone()['count'],
                'activity_logs': db.execute('SELECT COUNT(*) as count FROM web_activity_log').fetchone()['count']
            }
        except:
            db_stats = {'error': 'Could not fetch database statistics'}
        
        system_info = {
            'python_version': sys.version,
            'platform': platform.platform(),
            'flask_env': current_app.config.get('FLASK_ENV', 'unknown'),
            'debug_mode': current_app.debug,
            'database_path': current_app.config.get('DATABASE_PATH', 'unknown'),
            'server_time': datetime.now().isoformat(),
            'database_stats': db_stats
        }
        
        return jsonify({
            'success': True,
            'data': system_info
        })
        
    except Exception as e:
        logging.error(f"Error in system info API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Systeminformationen'
        }), 500

@api_bp.route('/health')
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db = get_db()
        db.execute('SELECT 1').fetchone()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': json.dumps(datetime.now(), default=str),
            'version': '1.0.0'
        })
        
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@api_bp.errorhandler(404)
def api_not_found(error):
    """API 404 handler"""
    return jsonify({
        'success': False,
        'error': 'API endpoint not found'
    }), 404

@api_bp.errorhandler(403)
def api_forbidden(error):
    """API 403 handler"""
    return jsonify({
        'success': False,
        'error': 'Insufficient permissions'
    }), 403

@api_bp.errorhandler(500)
def api_internal_error(error):
    """API 500 handler"""
    logging.error(f'API Error: {error}')
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500