from flask import Blueprint, render_template, g, redirect, url_for
from database.db_manager import get_db
from utils.decorators import login_required
from utils.stats_helper import get_dashboard_stats
import logging

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')

@dashboard_bp.route('/')
@login_required
def index():
    """Main dashboard page"""
    try:
        # Get dashboard statistics
        stats = get_dashboard_stats()
        
        # Get recent activity
        recent_activity = get_recent_activity()
        
        # Get user's quick actions based on roles
        quick_actions = get_user_quick_actions(g.user_roles)
        
        return render_template(
            'dashboard/index.html',
            user=g.user,
            roles=g.user_roles,
            stats=stats,
            recent_activity=recent_activity,
            quick_actions=quick_actions
        )
        
    except Exception as e:
        logging.error(f"Error loading dashboard: {e}")
        return render_template(
            'dashboard/index.html',
            user=g.user,
            roles=g.user_roles,
            stats={},
            recent_activity=[],
            quick_actions=[],
            error="Fehler beim Laden der Dashboard-Daten"
        )

@dashboard_bp.route('/widgets/stats')
@login_required
def widget_stats():
    """AJAX endpoint for statistics widget"""
    try:
        stats = get_dashboard_stats()
        return stats
    except Exception as e:
        logging.error(f"Error loading stats widget: {e}")
        return {'error': 'Fehler beim Laden der Statistiken'}, 500

def get_recent_activity(limit=10):
    """Get recent activity from database"""
    try:
        db = get_db()
        
        # Get recent tickets
        recent_tickets = db.execute('''
            SELECT ticket_id, ticket_bereich, ticket_ersteller_name, 
                   ticket_erstellungszeit, ticket_status
            FROM tickets 
            WHERE ticket_erstellungszeit IS NOT NULL
            ORDER BY ticket_erstellungszeit DESC 
            LIMIT ?
        ''', (limit,)).fetchall()
        
        # Get recent team creations
        recent_teams = db.execute('''
            SELECT team_name, game, id
            FROM team_areas 
            WHERE is_active = 1
            ORDER BY id DESC 
            LIMIT 5
        ''').fetchall()
        
        # Get recent user registrations (web users)
        recent_users = db.execute('''
            SELECT username, full_name, created_at
            FROM web_users 
            WHERE is_active = 1
            ORDER BY created_at DESC 
            LIMIT 5
        ''').fetchall()
        
        activity = {
            'tickets': [dict(ticket) for ticket in recent_tickets],
            'teams': [dict(team) for team in recent_teams],
            'users': [dict(user) for user in recent_users]
        }
        
        return activity
        
    except Exception as e:
        logging.error(f"Error getting recent activity: {e}")
        return {
            'tickets': [],
            'teams': [],
            'users': []
        }

def get_user_quick_actions(user_roles):
    """Get quick actions based on user roles"""
    actions = [
        {
            'title': 'Teams',
            'description': 'Teamübersicht anzeigen',
            'url': 'teams.index',
            'icon': 'bi-people',
            'color': 'primary',
            'roles': ['Admin', 'Dev', 'Mitglied']
        },
        {
            'title': 'Organigramm',
            'description': 'Organisationsstruktur',
            'url': 'dashboard.orgchart',
            'icon': 'bi-diagram-3',
            'color': 'info',
            'roles': ['Admin', 'Dev', 'Mitglied']
        },
        {
            'title': 'Ticket suchen',
            'description': 'Ticket-Transkript finden',
            'url': '#',
            'icon': 'bi-search',
            'color': 'warning',
            'onclick': 'showTicketSearch()',
            'roles': ['Admin', 'Dev', 'Mitglied']
        },
        {
            'title': 'Bot Konfiguration',
            'description': 'Bot-Einstellungen verwalten',
            'url': 'admin.bot_configs',
            'icon': 'bi-gear',
            'color': 'danger',
            'roles': ['Admin', 'Dev']
        },
        {
            'title': 'Benutzer verwalten',
            'description': 'Benutzer und Rollen',
            'url': 'admin.users',
            'icon': 'bi-person-gear',
            'color': 'success',
            'roles': ['Admin']
        },
        {
            'title': 'System-Logs',
            'description': 'Aktivitätslogs anzeigen',
            'url': 'admin.activity_logs',
            'icon': 'bi-list-ul',
            'color': 'secondary',
            'roles': ['Admin', 'Dev']
        }
    ]
    
    # Filter actions based on user roles
    user_actions = []
    for action in actions:
        if any(role in user_roles for role in action['roles']):
            user_actions.append(action)
    
    return user_actions

@dashboard_bp.route('/orgchart')
@login_required
def orgchart():
    """Organization chart page"""
    try:
        import json
        import os
        
        # Try to load contacts/organization data
        contacts_file = os.path.join('..', '..', 'bot', 'handlers', 'discord_administration', 'utils', 'data', 'contacts.json')
        
        if os.path.exists(contacts_file):
            with open(contacts_file, 'r', encoding='utf-8') as f:
                org_data = json.load(f)
        else:
            # Fallback data structure
            org_data = {
                "title": "Entropy Gaming Organisation",
                "sections": [
                    {
                        "title": "Projektleitung",
                        "items": [
                            {"mention": "000000000000000000", "name": "Beispiel User (Leitung)"}
                        ]
                    },
                    {
                        "title": "Management",
                        "items": [
                            {"mention": "000000000000000001", "name": "Beispiel Manager"}
                        ]
                    }
                ]
            }
        
        return render_template(
            'dashboard/orgchart.html',
            user=g.user,
            roles=g.user_roles,
            org_data=org_data
        )
        
    except Exception as e:
        logging.error(f"Error loading orgchart: {e}")
        return render_template(
            'dashboard/orgchart.html',
            user=g.user,
            roles=g.user_roles,
            org_data={"title": "Organisation", "sections": []},
            error="Fehler beim Laden des Organigramms"
        )

@dashboard_bp.route('/redirect')
def redirect_to_dashboard():
    """Redirect to dashboard - used as default route"""
    return redirect(url_for('dashboard.index'))