import sqlite3
from flask import current_app, g
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def get_db():
    """Get database connection for current request"""
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DATABASE_PATH'])
        g.db.row_factory = sqlite3.Row
        # Enable foreign keys
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db

def close_db(e=None):
    """Close database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(app):
    """Initialize database with app context"""
    with app.app_context():
        db = get_db()
        create_webapp_tables(db)
        
    # Register close_db with app teardown
    app.teardown_appcontext(close_db)

def create_webapp_tables(db):
    """Create webapp-specific tables (keeping existing users table from bot)"""
    try:
        # Web-specific activity log (references users table from bot)
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        ''')
        
        # Web-specific stats cache
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_stats_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stat_key TEXT UNIQUE NOT NULL,
                stat_value TEXT NOT NULL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        db.commit()
        logging.info("Webapp database tables created successfully")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating webapp database tables: {e}")
        raise

def log_activity(user_id=None, action=None, resource_type=None, resource_id=None, 
                ip_address=None, user_agent=None, details=None):
    """Log user activity"""
    try:
        db = get_db()
        db.execute('''
            INSERT INTO web_activity_log 
            (user_id, action, resource_type, resource_id, ip_address, user_agent, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, action, resource_type, resource_id, ip_address, user_agent, details))
        db.commit()
        
    except Exception as e:
        logging.error(f"Error logging activity: {e}")

def get_stats_from_cache(stat_key):
    """Get cached statistics"""
    try:
        db = get_db()
        row = db.execute(
            'SELECT stat_value, last_updated FROM web_stats_cache WHERE stat_key = ?',
            (stat_key,)
        ).fetchone()
        
        if row:
            return {
                'value': row['stat_value'],
                'last_updated': row['last_updated']
            }
        return None
        
    except Exception as e:
        logging.error(f"Error getting stats from cache: {e}")
        return None

def update_stats_cache(stat_key, stat_value):
    """Update cached statistics"""
    try:
        db = get_db()
        db.execute('''
            INSERT OR REPLACE INTO web_stats_cache (stat_key, stat_value, last_updated)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (stat_key, stat_value))
        db.commit()
        
    except Exception as e:
        logging.error(f"Error updating stats cache: {e}")