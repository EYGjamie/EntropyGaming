"""
Kalender Migration
Erstellt die Tabelle für Kalender Events
"""

def create_calendar_events_table(db):
    """Erstellt die calendar_events Tabelle"""
    
    cursor = db.cursor()
    
    # Kalender Events Tabelle
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            start_date DATE NOT NULL,
            start_time TIME,
            end_date DATE,
            end_time TIME,
            all_day BOOLEAN DEFAULT 0,
            event_type TEXT DEFAULT 'general',
            color TEXT DEFAULT '#dc2626',
            created_by TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(discord_id)
        )
    ''')
    
    # Index für bessere Performance
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_calendar_events_dates 
        ON calendar_events(start_date, end_date)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_calendar_events_creator 
        ON calendar_events(created_by)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_calendar_events_type 
        ON calendar_events(event_type)
    ''')
    
    db.commit()
    print("✓ Kalender Events Tabelle erstellt")

def add_sample_events(db):
    """Fügt Beispiel-Events hinzu (optional)"""
    
    cursor = db.cursor()
    
    sample_events = [
        {
            'title': 'Team Meeting',
            'description': 'Wöchentliches Team Meeting',
            'start_date': '2025-09-01',
            'start_time': '19:00',
            'end_date': '2025-09-01',
            'end_time': '20:00',
            'all_day': False,
            'event_type': 'meeting',
            'color': '#0891b2',
            'created_by': 'admin'
        },
        {
            'title': 'Valorant Turnier',
            'description': 'Internes Valorant Turnier',
            'start_date': '2025-09-15',
            'start_time': '18:00',
            'end_date': '2025-09-15',
            'end_time': '22:00',
            'all_day': False,
            'event_type': 'tournament',
            'color': '#ca8a04',
            'created_by': 'admin'
        },
        {
            'title': 'Server Wartung',
            'description': 'Geplante Server Wartung',
            'start_date': '2025-09-30',
            'start_time': '02:00',
            'end_date': '2025-09-30',
            'end_time': '06:00',
            'all_day': False,
            'event_type': 'general',
            'color': '#dc2626',
            'created_by': 'admin'
        },
        {
            'title': 'Community Event',
            'description': 'Großes Community Event',
            'start_date': '2025-10-15',
            'start_time': None,
            'end_date': '2025-10-15',
            'end_time': None,
            'all_day': True,
            'event_type': 'event',
            'color': '#16a34a',
            'created_by': 'admin'
        }
    ]
    
    for event in sample_events:
        cursor.execute('''
            INSERT OR IGNORE INTO calendar_events 
            (title, description, start_date, start_time, end_date, end_time, 
             all_day, event_type, color, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event['title'], event['description'], event['start_date'], 
            event['start_time'], event['end_date'], event['end_time'],
            event['all_day'], event['event_type'], event['color'], 
            event['created_by']
        ))
    
    db.commit()
    print(f"✓ {len(sample_events)} Beispiel-Events hinzugefügt")

def run_migration(db):
    """Führt die komplette Kalender Migration aus"""
    print("Starte Kalender Migration...")
    
    try:
        create_calendar_events_table(db)
        
        # Beispiel-Events hinzufügen (optional)
        # add_sample_events(db)
        
        print("✓ Kalender Migration erfolgreich abgeschlossen")
        
    except Exception as e:
        print(f"✗ Fehler bei Kalender Migration: {e}")
        db.rollback()
        raise e

if __name__ == "__main__":
    import sqlite3
    import os
    
    # Verbindung zur Datenbank
    db_path = r"c:\Users\Jamie\Documents\GitHub\EntropyGaming\db\data\entropy.db"
    print(f"Verwende Datenbank: {db_path}")
    
    with sqlite3.connect(db_path) as db:
        db.row_factory = sqlite3.Row
        run_migration(db)
