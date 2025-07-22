from flask import Blueprint, render_template, request, g, jsonify, current_app
from utils.decorators import login_required
from database.db_manager import get_db
import json
import os
import glob
import logging
from datetime import datetime

tickets_bp = Blueprint('tickets', __name__, url_prefix='/tickets')

@tickets_bp.route('/')
@login_required
def index():
    """Tickets overview page"""
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        bereich_filter = request.args.get('bereich', '')
        
        tickets_data = get_tickets_data(page, search, status_filter, bereich_filter)
        
        return render_template(
            'tickets/index.html',
            user=g.user,
            roles=g.user_roles,
            tickets_data=tickets_data,
            current_search=search,
            current_status_filter=status_filter,
            current_bereich_filter=bereich_filter
        )
        
    except Exception as e:
        logging.error(f"Error loading tickets page: {e}")
        return render_template(
            'tickets/index.html',
            user=g.user,
            roles=g.user_roles,
            tickets_data={'tickets': [], 'total': 0, 'pages': 0},
            error="Fehler beim Laden der Tickets"
        )

@tickets_bp.route('/<int:ticket_id>')
@login_required
def detail(ticket_id):
    """Ticket detail page with transcript"""
    try:
        ticket = get_ticket_by_id(ticket_id)
        
        if not ticket:
            return render_template(
                'error.html',
                error_code=404,
                error_message="Ticket nicht gefunden"
            ), 404
        
        # Load transcript if available
        transcript_data = load_ticket_transcript(ticket_id)
        
        return render_template(
            'tickets/detail.html',
            user=g.user,
            roles=g.user_roles,
            ticket=ticket,
            transcript_data=transcript_data
        )
        
    except Exception as e:
        logging.error(f"Error loading ticket {ticket_id}: {e}")
        return render_template(
            'error.html',
            error_code=500,
            error_message="Fehler beim Laden des Tickets"
        ), 500

@tickets_bp.route('/api/search')
@login_required
def api_search():
    """API endpoint for ticket search"""
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 10, type=int)
        
        if len(query) < 2:
            return jsonify({
                'success': True,
                'data': []
            })
        
        tickets = search_tickets(query, limit)
        
        return jsonify({
            'success': True,
            'data': tickets
        })
        
    except Exception as e:
        logging.error(f"Error in ticket search API: {e}")
        return jsonify({
            'success': False,
            'error': 'Fehler bei der Ticket-Suche'
        }), 500

def get_tickets_data(page=1, search='', status_filter='', bereich_filter=''):
    """Get paginated tickets data with filtering"""
    try:
        db = get_db()
        items_per_page = current_app.config.get('ITEMS_PER_PAGE', 20)
        offset = (page - 1) * items_per_page
        
        # Build query
        where_conditions = []
        params = []
        
        if search:
            where_conditions.append('(ticket_ersteller_name LIKE ? OR ticket_modal_field_one LIKE ?)')
            params.extend([f'%{search}%', f'%{search}%'])
        
        if status_filter:
            where_conditions.append('ticket_status = ?')
            params.append(status_filter)
        
        if bereich_filter:
            where_conditions.append('ticket_bereich = ?')
            params.append(bereich_filter)
        
        where_clause = ' AND '.join(where_conditions) if where_conditions else '1=1'
        
        # Get total count
        count_sql = f'SELECT COUNT(*) as total FROM tickets WHERE {where_clause}'
        total = db.execute(count_sql, params).fetchone()['total']
        
        # Get tickets
        tickets_sql = f'''
            SELECT 
                ticket_id,
                ticket_status,
                ticket_bereich,
                ticket_ersteller_name,
                ticket_erstellungszeit,
                ticket_bearbeiter_name,
                ticket_bearbeitungszeit,
                ticket_schliesser_name,
                ticket_schliesszeit,
                ticket_modal_field_one,
                ticket_modal_field_two
            FROM tickets 
            WHERE {where_clause}
            ORDER BY ticket_id DESC
            LIMIT ? OFFSET ?
        '''
        
        params.extend([items_per_page, offset])
        tickets = db.execute(tickets_sql, params).fetchall()
        
        # Calculate pagination info
        pages = (total + items_per_page - 1) // items_per_page
        
        return {
            'tickets': [dict(ticket) for ticket in tickets],
            'total': total,
            'page': page,
            'pages': pages,
            'has_prev': page > 1,
            'has_next': page < pages,
            'prev_num': page - 1 if page > 1 else None,
            'next_num': page + 1 if page < pages else None
        }
        
    except Exception as e:
        logging.error(f"Error fetching tickets data: {e}")
        return {
            'tickets': [],
            'total': 0,
            'page': 1,
            'pages': 0,
            'has_prev': False,
            'has_next': False,
            'prev_num': None,
            'next_num': None
        }

def get_ticket_by_id(ticket_id):
    """Get ticket by ID"""
    try:
        db = get_db()
        
        ticket = db.execute(
            'SELECT * FROM tickets WHERE ticket_id = ?',
            (ticket_id,)
        ).fetchone()
        
        if ticket:
            return dict(ticket)
        return None
        
    except Exception as e:
        logging.error(f"Error fetching ticket {ticket_id}: {e}")
        return None

def load_ticket_transcript(ticket_id):
    """Load ticket transcript from JSON file"""
    try:
        transcripts_dir = current_app.config.get('TRANSCRIPTS_DIR', '../../bot/transcripts')
        
        # Try different possible file patterns
        possible_files = [
            f'ticket-{ticket_id}.json',
            f'transcript-{ticket_id}.json'
        ]
        
        for filename in possible_files:
            filepath = os.path.join(transcripts_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        # If no direct file found, search for files containing the ticket ID
        pattern = os.path.join(transcripts_dir, '*.json')
        for filepath in glob.glob(pattern):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Check if this transcript belongs to our ticket
                    if (data.get('ticket_id') == ticket_id or 
                        str(ticket_id) in os.path.basename(filepath)):
                        return data
            except:
                continue
        
        return None
        
    except Exception as e:
        logging.error(f"Error loading transcript for ticket {ticket_id}: {e}")
        return None

def search_tickets(query, limit=10):
    """Search tickets by query"""
    try:
        db = get_db()
        
        tickets = db.execute('''
            SELECT 
                ticket_id,
                ticket_ersteller_name,
                ticket_modal_field_one,
                ticket_status,
                ticket_bereich,
                ticket_erstellungszeit
            FROM tickets
            WHERE ticket_ersteller_name LIKE ? 
               OR ticket_modal_field_one LIKE ?
               OR CAST(ticket_id AS TEXT) LIKE ?
            ORDER BY ticket_id DESC
            LIMIT ?
        ''', (f'%{query}%', f'%{query}%', f'%{query}%', limit)).fetchall()
        
        return [dict(ticket) for ticket in tickets]
        
    except Exception as e:
        logging.error(f"Error searching tickets: {e}")
        return []