from flask import Blueprint, render_template, request, g, jsonify, current_app
from utils.decorators import login_required, role_required
from database.db_manager import get_db
import json
import os
import glob
import logging
from datetime import datetime

tickets_bp = Blueprint('tickets', __name__, url_prefix='/tickets')

@tickets_bp.route('/')
@login_required
@role_required('Management')
def index():
    """Tickets overview page"""
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        bereich_filter = request.args.get('bereich', '')
        
        tickets_data = get_tickets_data(page, search, status_filter, bereich_filter)
        bereiche_list = get_all_bereiche()
        
        return render_template(
            'tickets/index.html',
            user=g.user,
            roles=g.user_roles,
            tickets_data=tickets_data,
            bereiche=bereiche_list,
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
            bereiche=[],
            error="Fehler beim Laden der Tickets"
        )

@tickets_bp.route('/<int:ticket_id>')
@login_required
@role_required('Management')
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
@role_required('Management')
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
    """Get paginated tickets data with filtering and formatted timestamps"""
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
        
        # Format timestamps for each ticket
        formatted_tickets = []
        for ticket in tickets:
            ticket_dict = dict(ticket)
            
            # Format timestamps
            timestamp_fields = [
                'ticket_erstellungszeit',
                'ticket_bearbeitungszeit', 
                'ticket_schliesszeit'
            ]
            
            for field in timestamp_fields:
                if field in ticket_dict and ticket_dict[field]:
                    # Keep original timestamp for sorting/calculations
                    original_field = f"{field}_raw"
                    ticket_dict[original_field] = ticket_dict[field]
                    
                    # Format for display
                    formatted = format_timestamp(ticket_dict[field])
                    ticket_dict[field] = formatted
            
            formatted_tickets.append(ticket_dict)
        
        # Calculate pagination info
        pages = (total + items_per_page - 1) // items_per_page
        
        return {
            'tickets': formatted_tickets,
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
    """Get ticket by ID with formatted timestamps"""
    try:
        db = get_db()
        
        ticket = db.execute(
            'SELECT * FROM tickets WHERE ticket_id = ?',
            (ticket_id,)
        ).fetchone()
        
        if not ticket:
            return None
            
        # Convert to dict
        ticket_dict = dict(ticket)
        
        # Format timestamps
        timestamp_fields = [
            'ticket_erstellungszeit',
            'ticket_bearbeitungszeit', 
            'ticket_schliesszeit',
            'ticket_loeschzeit'
        ]
        
        for field in timestamp_fields:
            if field in ticket_dict and ticket_dict[field]:
                # Keep original timestamp for calculations
                original_field = f"{field}_raw"
                ticket_dict[original_field] = ticket_dict[field]
                
                # Format for display
                formatted = format_timestamp(ticket_dict[field])
                ticket_dict[field] = formatted
        
        return ticket_dict
        
    except Exception as e:
        logging.error(f"Error fetching ticket {ticket_id}: {e}")
        return None

def load_ticket_transcript(ticket_id):
    """Load ticket transcript from JSON file and enrich with user data"""
    try:
        transcripts_dir = current_app.config.get('TRANSCRIPTS_DIR', '../../bot/transcripts')
        
        # Get ticket details to construct the filename
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return None
        
        ticket_ersteller = ticket.get('ticket_ersteller_name', '')
        
        # Try different possible file patterns based on the format {ticket_id}_{ticket_ersteller}.json
        possible_files = [
            f'{ticket_id}_{ticket_ersteller}.json',
            f'{ticket_id}_*.json'  # Fallback pattern
        ]
        
        transcript_data = None
        
        # First try the exact filename format
        for filename in possible_files:
            if '*' in filename:
                # Use glob for wildcard patterns
                pattern = os.path.join(transcripts_dir, filename)
                matching_files = glob.glob(pattern)
                for filepath in matching_files:
                    if os.path.exists(filepath):
                        with open(filepath, 'r', encoding='utf-8') as f:
                            transcript_data = json.load(f)
                            break
                if transcript_data:
                    break
            else:
                # Direct file check
                filepath = os.path.join(transcripts_dir, filename)
                if os.path.exists(filepath):
                    with open(filepath, 'r', encoding='utf-8') as f:
                        transcript_data = json.load(f)
                    break
        
        # If no direct file found, search for files containing the ticket ID
        if not transcript_data:
            pattern = os.path.join(transcripts_dir, '*.json')
            for filepath in glob.glob(pattern):
                try:
                    filename = os.path.basename(filepath)
                    # Check if filename starts with the ticket_id followed by underscore
                    if filename.startswith(f'{ticket_id}_'):
                        with open(filepath, 'r', encoding='utf-8') as f:
                            transcript_data = json.load(f)
                            if isinstance(transcript_data, list) and len(transcript_data) > 0:
                                break
                except Exception as e:
                    logging.error(f"Error reading transcript file {filepath}: {e}")
                    continue
        
        if not transcript_data:
            return None
        
        # Ensure transcript_data is a list
        if not isinstance(transcript_data, list):
            return None
            
        # Sort messages by timestamp (oldest first for chat display)
        transcript_data.sort(key=lambda x: x.get('timestamp', ''))
        
        # Enrich each message with user data from database
        db = get_db()
        enhanced_messages = []
        
        for message in transcript_data:
            user_id = message.get('userID')
            if not user_id:
                continue
                
            try:
                # Look up user in database by discord_id
                user_row = db.execute(
                    'SELECT discord_id, username, display_name, nickname, avatar_url FROM users WHERE discord_id = ?',
                    (str(user_id),)
                ).fetchone()
                
                # Create enhanced message object
                enhanced_message = {
                    'userID': user_id,
                    'username': message.get('username', 'Unknown User'),
                    'message': message.get('message', ''),
                    'timestamp': message.get('timestamp', ''),
                    'avatar_url': None,
                    'display_name': None,
                    'nickname': None
                }
                
                # If user found in database, use their data
                if user_row:
                    user_data = dict(user_row)
                    enhanced_message.update({
                        'username': user_data.get('username', enhanced_message['username']),
                        'display_name': user_data.get('display_name'),
                        'nickname': user_data.get('nickname'),
                        'avatar_url': user_data.get('avatar_url')
                    })
                
                # Determine display name (priority: nickname > display_name > username)
                display_name = (enhanced_message['nickname'] or 
                               enhanced_message['display_name'] or 
                               enhanced_message['username'])
                enhanced_message['display_name'] = display_name
                
                # Format timestamp for display
                try:
                    if enhanced_message['timestamp']:
                        # Parse ISO format timestamp: 2025-04-09T14:26:55Z
                        dt = datetime.fromisoformat(enhanced_message['timestamp'].replace('Z', '+00:00'))
                        enhanced_message['formatted_timestamp'] = dt.strftime('%d.%m.%Y %H:%M')
                    else:
                        enhanced_message['formatted_timestamp'] = 'Unknown'
                except Exception as e:
                    logging.error(f"Error parsing timestamp {enhanced_message['timestamp']}: {e}")
                    enhanced_message['formatted_timestamp'] = 'Invalid Date'
                
                enhanced_messages.append(enhanced_message)
                
            except Exception as e:
                logging.error(f"Error processing message for user {user_id}: {e}")
                # Add message without user enhancement as fallback
                enhanced_message = {
                    'userID': user_id,
                    'username': message.get('username', 'Unknown User'),
                    'display_name': message.get('username', 'Unknown User'),
                    'message': message.get('message', ''),
                    'timestamp': message.get('timestamp', ''),
                    'formatted_timestamp': 'Unknown',
                    'avatar_url': None,
                    'nickname': None
                }
                enhanced_messages.append(enhanced_message)
        
        return {'messages': enhanced_messages} if enhanced_messages else None
        
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

def get_all_bereiche():
    """Get all distinct ticket departments"""
    try:
        db = get_db()
        
        bereiche = db.execute('''
            SELECT DISTINCT ticket_bereich
            FROM tickets
            WHERE ticket_bereich IS NOT NULL AND ticket_bereich != ''
            ORDER BY ticket_bereich
        ''').fetchall()
        
        return [bereich['ticket_bereich'] for bereich in bereiche]
        
    except Exception as e:
        logging.error(f"Error fetching bereiche: {e}")
        return []
    
def format_timestamp(timestamp):
    """Format Unix timestamp to readable German date string"""
    try:
        if timestamp is None or timestamp == 0 or timestamp == "0":
            return None
        
        # Convert to int if it's a string
        if isinstance(timestamp, str):
            timestamp = int(timestamp)
        
        # Convert Unix timestamp to datetime
        dt = datetime.fromtimestamp(timestamp)
        
        # Format to German date string: "DD.MM.YYYY HH:MM"
        return dt.strftime('%d.%m.%Y %H:%M')
        
    except (ValueError, TypeError, OSError) as e:
        logging.error(f"Error formatting timestamp {timestamp}: {e}")
        return None