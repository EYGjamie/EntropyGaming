from flask import Blueprint, jsonify, g, request
from database.db_manager import get_db
from utils.decorators import login_required, role_required
from utils.stats_helper import get_dashboard_stats
import logging

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/stats')
@login_required
def stats():
    """Get dashboard statistics"""
    try:
        stats_data = get_dashboard_stats()
        return jsonify({
            'success': True,
            'data': stats_data
        })
    except Exception as e:
        logging.error(f"Error in stats API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Statistiken'
        }), 500

@api_bp.route('/stats/live')
@login_required
def live_stats():
    """Get live statistics (updated frequently)"""
    try:
        db = get_db()
        
        # Get some live stats
        live_data = {
            'timestamp': request.args.get('timestamp', ''),
            'discord_members': db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count'],
            'active_teams': db.execute('SELECT COUNT(*) as count FROM team_areas WHERE is_active = 1').fetchone()['count'],
            'open_tickets': db.execute('SELECT COUNT(*) as count FROM tickets WHERE ticket_status = "Open"').fetchone()['count'],
            'web_users_online': 1  # Placeholder - would need session tracking
        }
        
        return jsonify({
            'success': True,
            'data': live_data
        })
        
    except Exception as e:
        logging.error(f"Error in live stats API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Live-Statistiken'
        }), 500

@api_bp.route('/search/tickets')
@login_required
@role_required('Admin', 'Dev', 'Mitglied')
def search_tickets():
    """Search for tickets"""
    try:
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10, type=int)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Suchbegriff erforderlich'
            }), 400
        
        db = get_db()
        
        # Search in tickets table
        search_results = db.execute('''
            SELECT ticket_id, ticket_bereich, ticket_ersteller_name, 
                   ticket_status, ticket_erstellungszeit
            FROM tickets 
            WHERE ticket_id LIKE ? 
               OR ticket_bereich LIKE ? 
               OR ticket_ersteller_name LIKE ?
            ORDER BY ticket_erstellungszeit DESC
            LIMIT ?
        ''', (f'%{query}%', f'%{query}%', f'%{query}%', limit)).fetchall()
        
        results = []
        for ticket in search_results:
            results.append({
                'id': ticket['ticket_id'],
                'bereich': ticket['ticket_bereich'],
                'ersteller': ticket['ticket_ersteller_name'],
                'status': ticket['ticket_status'],
                'erstellt': ticket['ticket_erstellungszeit']
            })
        
        return jsonify({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        logging.error(f"Error in ticket search API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler bei der Ticket-Suche'
        }), 500

@api_bp.route('/search/users')
@login_required
@role_required('Admin')
def search_users():
    """Search for users"""
    try:
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10, type=int)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Suchbegriff erforderlich'
            }), 400
        
        db = get_db()
        
        # Search in web users
        search_results = db.execute('''
            SELECT wu.id, wu.username, wu.email, wu.full_name, wu.is_active,
                   GROUP_CONCAT(wur.role) as roles
            FROM web_users wu
            LEFT JOIN web_user_roles wur ON wu.id = wur.user_id
            WHERE wu.username LIKE ? 
               OR wu.email LIKE ? 
               OR wu.full_name LIKE ?
            GROUP BY wu.id
            ORDER BY wu.created_at DESC
            LIMIT ?
        ''', (f'%{query}%', f'%{query}%', f'%{query}%', limit)).fetchall()
        
        results = []
        for user in search_results:
            results.append({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'is_active': bool(user['is_active']),
                'roles': user['roles'].split(',') if user['roles'] else []
            })
        
        return jsonify({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        logging.error(f"Error in user search API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler bei der Benutzer-Suche'
        }), 500

@api_bp.route('/health')
def health():
    """Health check endpoint"""
    try:
        # Test database connection
        db = get_db()
        db.execute('SELECT 1').fetchone()
        
        return jsonify({
            'status': 'healthy',
            'service': 'entropy-internal-webapp',
            'version': '1.0.0'
        })
        
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@api_bp.route('/user/info')
@login_required
def user_info():
    """Get current user information"""
    try:
        return jsonify({
            'success': True,
            'data': {
                'id': g.user.id,
                'username': g.user.username,
                'full_name': g.user.full_name,
                'email': g.user.email,
                'roles': g.user_roles,
                'is_active': g.user.is_active,
                'last_login': g.user.last_login.isoformat() if g.user.last_login else None
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting user info: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Benutzerinformationen'
        }), 500

# Error handlers for API routes
@api_bp.errorhandler(404)
def api_not_found(error):
    return jsonify({
        'success': False,
        'error': 'API-Endpunkt nicht gefunden'
    }), 404

@api_bp.errorhandler(500)
def api_internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Interner Serverfehler'
    }), 500

@api_bp.errorhandler(403)
def api_forbidden(error):
    return jsonify({
        'success': False,
        'error': 'Keine Berechtigung'
    }), 403