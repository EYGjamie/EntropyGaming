from flask import Blueprint, render_template, request, jsonify, g, flash, redirect, url_for
from utils.decorators import login_required, admin_required
from database.db_manager import get_db
from datetime import datetime, timedelta, date
import calendar
import json
import logging

calender_bp = Blueprint('calender', __name__, url_prefix='/calender')

@calender_bp.route('/')
@login_required
def index():
    """Kalender Hauptseite"""
    try:
        # Aktueller Monat und Jahr
        today = date.today()
        year = request.args.get('year', today.year, type=int)
        month = request.args.get('month', today.month, type=int)
        
        # Kalender Daten generieren
        cal_data = generate_calendar_data(year, month)
        
        # Events für den Monat laden
        events = get_events_for_month(year, month)
        
        return render_template(
            'calender/index.html',
            calendar_data=cal_data,
            events=events,
            current_year=year,
            current_month=month,
            today=today,
            user=g.user,
            roles=g.user_roles
        )
        
    except Exception as e:
        logging.error(f"Error loading calendar: {e}")
        flash("Fehler beim Laden des Kalenders", "error")
        return redirect(url_for('dashboard.index'))

@calender_bp.route('/event/create', methods=['GET', 'POST'])
@login_required
def create_event():
    """Event erstellen"""
    if request.method == 'POST':
        try:
            data = request.get_json() if request.is_json else request.form
            
            title = data.get('title')
            description = data.get('description', '')
            start_date = data.get('start_date')
            start_time = data.get('start_time', '00:00')
            end_date = data.get('end_date')
            end_time = data.get('end_time', '23:59')
            all_day = data.get('all_day', False)
            event_type = data.get('event_type', 'general')
            color = data.get('color', '#dc2626')
            
            # Validierung
            if not title or not start_date:
                return jsonify({'success': False, 'message': 'Titel und Startdatum sind erforderlich'}), 400
            
            # Event in Datenbank speichern
            event_id = save_event(
                title=title,
                description=description,
                start_date=start_date,
                start_time=start_time,
                end_date=end_date or start_date,
                end_time=end_time,
                all_day=bool(all_day),
                event_type=event_type,
                color=color,
                created_by=g.user.discord_id
            )
            
            if request.is_json:
                return jsonify({'success': True, 'event_id': event_id, 'message': 'Event erfolgreich erstellt'})
            else:
                flash('Event erfolgreich erstellt', 'success')
                return redirect(url_for('calender.index'))
                
        except Exception as e:
            logging.error(f"Error creating event: {e}")
            if request.is_json:
                return jsonify({'success': False, 'message': 'Fehler beim Erstellen des Events'}), 500
            else:
                flash('Fehler beim Erstellen des Events', 'error')
                return redirect(url_for('calender.index'))
    
    return render_template('calender/create_event.html', user=g.user, roles=g.user_roles)

@calender_bp.route('/event/<int:event_id>')
@login_required
def view_event(event_id):
    """Event Details anzeigen"""
    try:
        event = get_event_by_id(event_id)
        if not event:
            flash('Event nicht gefunden', 'error')
            return redirect(url_for('calender.index'))
        
        return render_template('calender/view_event.html', event=event, user=g.user, roles=g.user_roles)
        
    except Exception as e:
        logging.error(f"Error loading event {event_id}: {e}")
        flash('Fehler beim Laden des Events', 'error')
        return redirect(url_for('calender.index'))

@calender_bp.route('/event/<int:event_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_event(event_id):
    """Event bearbeiten"""
    try:
        event = get_event_by_id(event_id)
        if not event:
            flash('Event nicht gefunden', 'error')
            return redirect(url_for('calender.index'))
        
        # Berechtigung prüfen
        if not can_edit_event(event, g.user, g.user_roles):
            flash('Keine Berechtigung zum Bearbeiten dieses Events', 'error')
            return redirect(url_for('calender.view_event', event_id=event_id))
        
        if request.method == 'POST':
            data = request.get_json() if request.is_json else request.form
            
            # Event aktualisieren
            update_event(event_id, data, g.user.discord_id)
            
            if request.is_json:
                return jsonify({'success': True, 'message': 'Event erfolgreich aktualisiert'})
            else:
                flash('Event erfolgreich aktualisiert', 'success')
                return redirect(url_for('calender.view_event', event_id=event_id))
        
        return render_template('calender/edit_event.html', event=event, user=g.user, roles=g.user_roles)
        
    except Exception as e:
        logging.error(f"Error editing event {event_id}: {e}")
        flash('Fehler beim Bearbeiten des Events', 'error')
        return redirect(url_for('calender.index'))

@calender_bp.route('/event/<int:event_id>/delete', methods=['POST'])
@login_required
def delete_event(event_id):
    """Event löschen"""
    try:
        event = get_event_by_id(event_id)
        if not event:
            return jsonify({'success': False, 'message': 'Event nicht gefunden'}), 404
        
        # Berechtigung prüfen
        if not can_edit_event(event, g.user, g.user_roles):
            return jsonify({'success': False, 'message': 'Keine Berechtigung zum Löschen dieses Events'}), 403
        
        # Event löschen
        delete_event_by_id(event_id)
        
        return jsonify({'success': True, 'message': 'Event erfolgreich gelöscht'})
        
    except Exception as e:
        logging.error(f"Error deleting event {event_id}: {e}")
        return jsonify({'success': False, 'message': 'Fehler beim Löschen des Events'}), 500

@calender_bp.route('/api/events')
@login_required
def api_events():
    """API Endpoint für Events (für AJAX/JavaScript)"""
    try:
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if year and month:
            events = get_events_for_month(year, month)
        elif start_date and end_date:
            events = get_events_for_range(start_date, end_date)
        else:
            # Aktueller Monat
            today = date.today()
            events = get_events_for_month(today.year, today.month)
        
        return jsonify({'success': True, 'events': events})
        
    except Exception as e:
        logging.error(f"Error fetching events: {e}")
        return jsonify({'success': False, 'message': 'Fehler beim Laden der Events'}), 500

# Hilfsfunktionen

def generate_calendar_data(year, month):
    """Generiert Kalender Daten für den angegebenen Monat"""
    cal = calendar.Calendar(firstweekday=0)  # Montag als erster Tag
    month_days = cal.monthdayscalendar(year, month)
    
    # Monatsnamen
    month_names = [
        '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ]
    
    # Vorheriger und nächster Monat
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    
    return {
        'year': year,
        'month': month,
        'month_name': month_names[month],
        'days': month_days,
        'prev_month': prev_month,
        'prev_year': prev_year,
        'next_month': next_month,
        'next_year': next_year,
        'weekdays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    }

def get_events_for_month(year, month):
    """Lädt alle Events für einen bestimmten Monat"""
    try:
        db = get_db()
        
        # Ersten und letzten Tag des Monats berechnen
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)
        
        cursor = db.execute('''
            SELECT 
                id, title, description, start_date, start_time, 
                end_date, end_time, all_day, event_type, color,
                created_by, created_at, updated_at
            FROM calendar_events 
            WHERE (start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?)
            ORDER BY start_date, start_time
        ''', (first_day.isoformat(), last_day.isoformat(), 
              first_day.isoformat(), last_day.isoformat()))
        
        events = []
        for row in cursor.fetchall():
            events.append({
                'id': row['id'],
                'title': row['title'],
                'description': row['description'],
                'start_date': row['start_date'],
                'start_time': row['start_time'],
                'end_date': row['end_date'],
                'end_time': row['end_time'],
                'all_day': bool(row['all_day']),
                'event_type': row['event_type'],
                'color': row['color'],
                'created_by': row['created_by'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
        
        return events
        
    except Exception as e:
        logging.error(f"Error fetching events for {year}-{month}: {e}")
        return []

def get_events_for_range(start_date, end_date):
    """Lädt alle Events für einen bestimmten Zeitraum"""
    try:
        db = get_db()
        
        cursor = db.execute('''
            SELECT 
                id, title, description, start_date, start_time, 
                end_date, end_time, all_day, event_type, color,
                created_by, created_at, updated_at
            FROM calendar_events 
            WHERE (start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?)
               OR (start_date <= ? AND end_date >= ?)
            ORDER BY start_date, start_time
        ''', (start_date, end_date, start_date, end_date, start_date, end_date))
        
        events = []
        for row in cursor.fetchall():
            events.append({
                'id': row['id'],
                'title': row['title'],
                'description': row['description'],
                'start_date': row['start_date'],
                'start_time': row['start_time'],
                'end_date': row['end_date'],
                'end_time': row['end_time'],
                'all_day': bool(row['all_day']),
                'event_type': row['event_type'],
                'color': row['color'],
                'created_by': row['created_by'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
        
        return events
        
    except Exception as e:
        logging.error(f"Error fetching events for range {start_date} to {end_date}: {e}")
        return []

def get_event_by_id(event_id):
    """Lädt ein Event anhand der ID"""
    try:
        db = get_db()
        
        cursor = db.execute('''
            SELECT 
                id, title, description, start_date, start_time, 
                end_date, end_time, all_day, event_type, color,
                created_by, created_at, updated_at
            FROM calendar_events 
            WHERE id = ?
        ''', (event_id,))
        
        row = cursor.fetchone()
        if row:
            return {
                'id': row['id'],
                'title': row['title'],
                'description': row['description'],
                'start_date': row['start_date'],
                'start_time': row['start_time'],
                'end_date': row['end_date'],
                'end_time': row['end_time'],
                'all_day': bool(row['all_day']),
                'event_type': row['event_type'],
                'color': row['color'],
                'created_by': row['created_by'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            }
        
        return None
        
    except Exception as e:
        logging.error(f"Error fetching event {event_id}: {e}")
        return None

def save_event(title, description, start_date, start_time, end_date, end_time, 
               all_day, event_type, color, created_by):
    """Speichert ein neues Event in der Datenbank"""
    try:
        db = get_db()
        
        cursor = db.execute('''
            INSERT INTO calendar_events 
            (title, description, start_date, start_time, end_date, end_time, 
             all_day, event_type, color, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (title, description, start_date, start_time, end_date, end_time,
              all_day, event_type, color, created_by, 
              datetime.now().isoformat(), datetime.now().isoformat()))
        
        db.commit()
        return cursor.lastrowid
        
    except Exception as e:
        logging.error(f"Error saving event: {e}")
        raise e

def update_event(event_id, data, updated_by):
    """Aktualisiert ein bestehendes Event"""
    try:
        db = get_db()
        
        # Nur die Felder aktualisieren, die übermittelt wurden
        update_fields = []
        values = []
        
        for field in ['title', 'description', 'start_date', 'start_time', 
                     'end_date', 'end_time', 'all_day', 'event_type', 'color']:
            if field in data:
                update_fields.append(f"{field} = ?")
                values.append(data[field])
        
        if update_fields:
            update_fields.append("updated_at = ?")
            values.append(datetime.now().isoformat())
            values.append(event_id)
            
            query = f"UPDATE calendar_events SET {', '.join(update_fields)} WHERE id = ?"
            db.execute(query, values)
            db.commit()
        
    except Exception as e:
        logging.error(f"Error updating event {event_id}: {e}")
        raise e

def delete_event_by_id(event_id):
    """Löscht ein Event aus der Datenbank"""
    try:
        db = get_db()
        db.execute('DELETE FROM calendar_events WHERE id = ?', (event_id,))
        db.commit()
        
    except Exception as e:
        logging.error(f"Error deleting event {event_id}: {e}")
        raise e

def can_edit_event(event, user, user_roles):
    """Prüft, ob ein Benutzer ein Event bearbeiten darf"""
    # Event Ersteller kann immer bearbeiten
    if event['created_by'] == user.discord_id:
        return True
    
    # Admins können alle Events bearbeiten
    if 'Projektleitung' in user_roles:
        return True
    
    return False
