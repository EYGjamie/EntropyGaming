from flask import Blueprint, render_template, g, jsonify, current_app
from utils.decorators import login_required
from database.db_manager import get_db, get_stats_from_cache, update_stats_cache
import json
import os
import logging
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/')

@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
@login_required
def index():
    """Dashboard overview page"""
    try:
        # Get dashboard statistics
        stats = get_dashboard_stats()
        
        # Get recent activity
        recent_activity = get_recent_activity()
        
        # Get user's teams (if applicable)
        user_teams = get_user_teams()
        
        return render_template(
            'dashboard/index.html',
            user=g.user,
            roles=g.user_roles,
            stats=stats,
            recent_activity=recent_activity,
            user_teams=user_teams
        )
        
    except Exception as e:
        logging.error(f"Error loading dashboard: {e}")
        return render_template(
            'dashboard/index.html',
            user=g.user,
            roles=g.user_roles,
            stats={},
            recent_activity=[],
            user_teams=[],
            error="Fehler beim Laden des Dashboards"
        )

@dashboard_bp.route('/orgchart')
@login_required
def orgchart():
    """Organizational chart page"""
    try:
        # Load organizational chart data
        orgchart_data = load_orgchart_data()
        
        return render_template(
            'dashboard/orgchart.html',
            user=g.user,
            roles=g.user_roles,
            orgchart_data=orgchart_data
        )
        
    except Exception as e:
        logging.error(f"Error loading orgchart: {e}")
        return render_template(
            'dashboard/orgchart.html',
            user=g.user,
            roles=g.user_roles,
            orgchart_data={},
            error="Fehler beim Laden des Organigramms"
        )

@dashboard_bp.route('/api/dashboard-stats')
@login_required
def api_dashboard_stats():
    """API endpoint for dashboard statistics"""
    try:
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

def get_dashboard_stats():
    """Get dashboard statistics with caching"""
    try:
        # Check cache first
        cached_stats = get_stats_from_cache('dashboard_stats')
        
        # Refresh if cache is older than 5 minutes
        if cached_stats and cached_stats.get('last_updated'):
            last_updated = datetime.fromisoformat(cached_stats['last_updated'])
            if datetime.now() - last_updated < timedelta(minutes=5):
                return json.loads(cached_stats['value'])
        
        # Generate fresh stats
        db = get_db()
        
        # Get total members count from Discord bot database
        try:
            total_members = db.execute(
                'SELECT COUNT(*) as count FROM users WHERE is_bot = 0'
            ).fetchone()['count']
        except:
            total_members = 0
        
        # Get total teams count
        try:
            total_teams = db.execute(
                'SELECT COUNT(*) as count FROM team_areas WHERE is_active = "true"'
            ).fetchone()['count']
        except:
            total_teams = 0
        
        # Get total tickets count
        try:
            total_tickets = db.execute(
                'SELECT COUNT(*) as count FROM tickets'
            ).fetchone()['count']
        except:
            total_tickets = 0
        
        # Get open tickets count
        try:
            open_tickets = db.execute(
                'SELECT COUNT(*) as count FROM tickets WHERE ticket_status = "open"'
            ).fetchone()['count']
        except:
            open_tickets = 0
        
        # Get active web users count
        try:
            web_users = db.execute(
                'SELECT COUNT(*) as count FROM web_users WHERE is_active = 1'
            ).fetchone()['count']
        except:
            web_users = 0
        
        # Get games count
        try:
            games = db.execute(
                'SELECT COUNT(DISTINCT game) as count FROM team_areas WHERE is_active = "true"'
            ).fetchone()['count']
        except:
            games = 0
        
        stats = {
            'total_members': total_members,
            'total_teams': total_teams,
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'web_users': web_users,
            'games': games,
            'last_updated': datetime.now().isoformat()
        }
        
        # Cache the stats
        update_stats_cache('dashboard_stats', json.dumps(stats))
        
        return stats
        
    except Exception as e:
        logging.error(f"Error generating dashboard stats: {e}")
        return {
            'total_members': 0,
            'total_teams': 0,
            'total_tickets': 0,
            'open_tickets': 0,
            'web_users': 0,
            'games': 0,
            'error': True
        }

def get_recent_activity():
    """Get recent activity from web activity log"""
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
            ORDER BY wal.created_at DESC
            LIMIT 10
        ''').fetchall()
        
        return [dict(activity) for activity in activities]
        
    except Exception as e:
        logging.error(f"Error fetching recent activity: {e}")
        return []

def get_user_teams():
    """Get teams associated with current user (if Discord ID is linked)"""
    try:
        if not g.user.discord_id:
            return []
        
        db = get_db()
        
        # This is simplified - you might need more complex logic
        # to determine which teams a user belongs to based on their Discord roles
        teams = db.execute('''
            SELECT ta.* 
            FROM team_areas ta
            WHERE ta.is_active = "true"
            ORDER BY ta.game, ta.team_name
        ''').fetchall()
        
        return [dict(team) for team in teams[:5]]  # Limit to 5 for dashboard
        
    except Exception as e:
        logging.error(f"Error fetching user teams: {e}")
        return []

def load_orgchart_data():
    """Load organizational chart data from JSON file"""
    try:
        orgchart_file = current_app.config.get('ORGCHART_DATA_FILE', 'data/orgchart.json')
        
        if os.path.exists(orgchart_file):
            with open(orgchart_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        else:
            # Return default structure if file doesn't exist
            return {
                "organization": "Entropy Gaming",
                "structure": {
                    "name": "Management",
                    "title": "Führungsebene",
                    "children": [
                        {
                            "name": "Development",
                            "title": "Entwicklung",
                            "children": []
                        },
                        {
                            "name": "Teams",
                            "title": "Gaming Teams",
                            "children": []
                        }
                    ]
                }
            }
            
    except Exception as e:
        logging.error(f"Error loading orgchart data: {e}")
        return {
            "organization": "Entropy Gaming",
            "structure": {
                "name": "Error",
                "title": "Fehler beim Laden",
                "children": []
            }
        }