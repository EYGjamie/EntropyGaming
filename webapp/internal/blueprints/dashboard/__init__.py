from flask import Blueprint, render_template, g, jsonify, current_app, request
from utils.decorators import login_required
from database.db_manager import get_db, get_stats_from_cache, update_stats_cache
import json
import os
import logging
from datetime import datetime, timedelta
import requests

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
    
@dashboard_bp.route('/api/orgchart-data')
@login_required
def api_orgchart_data():
    """API endpoint to get orgchart data"""
    try:
        orgchart_data = load_orgchart_data()
        return jsonify({
            'success': True,
            'data': orgchart_data
        })
        
    except Exception as e:
        logging.error(f"Error in orgchart API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler beim Laden der Organisationsstruktur'
        }), 500
    
@dashboard_bp.route('/api/orgchart-search')
@login_required
def api_orgchart_search():
    """API endpoint to search in orgchart"""
    try:
        query = request.args.get('q', '').lower()
        orgchart_data = load_orgchart_data()
        
        if not query:
            return jsonify({
                'success': True,
                'data': []
            })
        
        results = search_in_orgchart(orgchart_data.get('structure', {}), query)
        
        return jsonify({
            'success': True,
            'data': results
        })
        
    except Exception as e:
        logging.error(f"Error in orgchart search API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler bei der Suche'
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
            response = requests.get("http://localhost:321/api/stats")
            data = response.json()
            total_members = data.get("discord_members", 0)
        except Exception:
            total_members = 0

        # Get total dia club members count from Discord bot database
        try:
            total_club_members = db.execute(
                'SELECT COUNT(*) as count FROM users WHERE is_bot = 0 AND role_diamond_club = 1'
            ).fetchone()['count']
        except:
            total_club_members = 0
        
        # Get total teams count
        try:
            total_teams = db.execute(
                'SELECT COUNT(*) as count FROM team_areas WHERE is_active = 1'
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
                'SELECT COUNT(*) as count FROM tickets WHERE ticket_status IN ("Open", "Claimed")'
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
                'SELECT COUNT(DISTINCT game) as count FROM team_areas WHERE is_active = "1"'
            ).fetchone()['count']
        except:
            games = 0
        
        stats = {
            'total_members': total_members,
            'total_club_members': total_club_members,
            'total_teams': total_teams,
            'total_tickets': total_tickets + 42,
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
                wu.display_name
            FROM web_activity_log wal
            LEFT JOIN users wu ON wal.user_id = wu.id
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
    """Load organizational chart data from JSON file and provide both flat and hierarchical structure"""
    try:
        orgchart_file = current_app.config.get('ORGCHART_DATA_FILE', 'data/orgchart.json')
        
        if os.path.exists(orgchart_file):
            with open(orgchart_file, 'r', encoding='utf-8') as f:
                flat_data = json.load(f)
                
                # Convert flat structure with parentIds to hierarchical structure
                hierarchical_data = convert_flat_to_hierarchical(flat_data)
                
                return {
                    "organization": "Entropy Gaming",
                    "people": flat_data,  # Add flat data for template compatibility
                    "structure": hierarchical_data,
                    "total_members": len(flat_data),
                    "departments": get_department_stats(flat_data)
                }
        else:
            # Create the default orgchart.json file if it doesn't exist
            create_default_orgchart_file(orgchart_file)
            return load_orgchart_data()  # Retry loading
            
    except Exception as e:
        logging.error(f"Error loading orgchart data: {e}")
        return {
            "organization": "Entropy Gaming",
            "people": [],  # Empty list for template compatibility
            "structure": {
                "id": 0,
                "name": "Error",
                "position": "Fehler beim Laden",
                "children": []
            },
            "total_members": 0,
            "departments": {}
        }
    
def convert_flat_to_hierarchical(flat_data):
    """Convert flat orgchart data with parentIds to hierarchical structure"""
    if not flat_data:
        return {}
    
    # Create a lookup dictionary for quick access
    nodes_by_id = {person["id"]: {**person, "children": []} for person in flat_data}
    
    # Find root nodes (those with no parents or empty parentIds)
    root_nodes = []
    
    for person in flat_data:
        person_id = person["id"]
        parent_ids = person.get("parentIds", [])
        
        if not parent_ids:  # Root node
            root_nodes.append(nodes_by_id[person_id])
        else:
            # Add this person as child to all their parents
            for parent_id in parent_ids:
                if parent_id in nodes_by_id:
                    nodes_by_id[parent_id]["children"].append(nodes_by_id[person_id])
    
    # If we have multiple root nodes, create a virtual root
    if len(root_nodes) > 1:
        return {
            "id": 0,
            "name": "Entropy Gaming",
            "position": "Organisation",
            "children": root_nodes,
            "isVirtual": True
        }
    elif len(root_nodes) == 1:
        return root_nodes[0]
    else:
        return {
            "id": 0,
            "name": "Keine Daten",
            "position": "Fehler",
            "children": []
        }

def get_department_stats(flat_data):
    """Get statistics about departments/positions including specific descriptions"""
    if not flat_data:
        return {}
    
    departments = {}
    for person in flat_data:
        position = person.get("position", "Unbekannt")
        if position not in departments:
            departments[position] = {
                'count': 0,
                'members': [],
                'specifics': []
            }
        departments[position]['count'] += 1
        departments[position]['members'].append(person["name"])
        if person.get("specific"):
            departments[position]['specifics'].append(person["specific"])
    
    return departments

def create_default_orgchart_file(file_path):
    """Create a default orgchart.json file"""
    default_data = [
        {"id": 1, "name": "CEO", "position": "Chief Executive Officer", "parentIds": []},
        {"id": 2, "name": "CTO", "position": "Chief Technology Officer", "parentIds": [1]},
        {"id": 3, "name": "Team Lead", "position": "Development Team Lead", "parentIds": [2]}
    ]
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(default_data, f, indent=2, ensure_ascii=False)

def search_in_orgchart(node, query, results=None, path=None):
    """Recursively search for people in the orgchart"""
    if results is None:
        results = []
    if path is None:
        path = []
    
    current_path = path + [node.get('name', '')]
    
    # Check if current node matches search
    name = node.get('name', '').lower()
    position = node.get('position', '').lower()
    
    if query in name or query in position:
        results.append({
            'id': node.get('id'),
            'name': node.get('name'),
            'position': node.get('position'),
            'path': ' → '.join(current_path[:-1]) if len(current_path) > 1 else 'Wurzel'
        })
    
    # Search in children
    for child in node.get('children', []):
        search_in_orgchart(child, query, results, current_path)
    
    return results