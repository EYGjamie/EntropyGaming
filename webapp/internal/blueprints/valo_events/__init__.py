# webapp/internal/blueprints/valo_events/__init__.py
from flask import Blueprint, render_template, g, current_app, request
from utils.decorators import login_required
from database.db_manager import get_db, log_activity
from datetime import datetime
import logging

valo_events_bp = Blueprint('valo_events', __name__, url_prefix='/valo-events')

@valo_events_bp.route('/')
@valo_events_bp.route('/registrations')
@login_required
def registrations():
    """Zeigt alle Valorant Event Registrierungen an"""
    try:
        db = get_db()
        
        # JOIN Query um alle relevanten Daten zu bekommen
        query = """
        SELECT 
            ver.id,
            ver.user_id,
            ver.discord_username,
            ver.valorant_name,
            ver.registered_at,
            u.display_name,
            u.username,
            u.avatar_url,
            u.discord_id,
            u.nickname
        FROM valo_event_registrations ver
        LEFT JOIN users u ON ver.user_id = u.id
        ORDER BY ver.registered_at DESC
        """
        
        registrations = db.execute(query).fetchall()
        
        # Daten für Template aufbereiten
        registration_list = []
        for reg in registrations:
            registration_data = {
                'id': reg['id'],
                'user_id': reg['user_id'],
                'discord_username': reg['discord_username'],
                'display_name': reg['display_name'] or reg['username'],
                'valorant_name': reg['valorant_name'],
                'avatar_url': reg['avatar_url'],
                'registered_at': reg['registered_at'],
                'discord_id': reg['discord_id'],
                'nickname': reg['nickname']
            }
            registration_list.append(registration_data)
        
        # Activity logging
        log_activity(
            user_id=g.user.id,
            action='valo_events_view',
            details=f"Viewed {len(registration_list)} Valorant registrations"
        )
        
        return render_template(
            'valo_events/registrations.html',
            user=g.user,
            roles=g.user_roles,
            registrations=registration_list,
            total_count=len(registration_list)
        )
    
    except Exception as e:
        current_app.logger.error(f"Error loading Valorant registrations: {e}")
        return render_template(
            'valo_events/registrations.html',
            user=g.user,
            roles=g.user_roles,
            registrations=[],
            total_count=0,
            error="Fehler beim Laden der Registrierungen"
        )