import sqlite3
import bcrypt
from flask import current_app, g
import logging
from datetime import datetime

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
        create_tables(db)
        create_default_data(db)
        
    # Register close_db with app teardown
    app.teardown_appcontext(close_db)

def create_tables(db):
    """Create necessary tables for web application"""
    try:
        # Web users table (separate from Discord bot users)
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                phone TEXT,
                description TEXT,
                profile_image TEXT DEFAULT 'default-avatar.png',
                discord_id TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # User roles table (multiple roles per user possible)
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_user_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                assigned_by INTEGER,
                FOREIGN KEY (user_id) REFERENCES web_users (id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES web_users (id),
                UNIQUE(user_id, role)
            )
        ''')
        
        # User sessions table (for session management)
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES web_users (id) ON DELETE CASCADE
            )
        ''')
        
        # Activity log table
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
                FOREIGN KEY (user_id) REFERENCES web_users (id) ON DELETE SET NULL
            )
        ''')
        
        # Stats cache table (for dashboard performance)
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_stats_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stat_key TEXT UNIQUE NOT NULL,
                stat_value TEXT NOT NULL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        db.commit()
        logging.info("Database tables created successfully")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating database tables: {e}")
        raise

def create_default_data(db):
    """Create default users and roles"""
    try:
        # Check if admin user exists
        admin_exists = db.execute(
            'SELECT COUNT(*) FROM web_users WHERE username = ?',
            ('admin',)
        ).fetchone()[0]
        
        if admin_exists == 0:
            # Create admin user
            password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cursor = db.execute('''
                INSERT INTO web_users (username, email, password_hash, full_name, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                'admin',
                'admin@entropy.local',
                password_hash,
                'System Administrator',
                'System Administrator mit vollständigen Berechtigungen',
                True
            ))
            
            admin_id = cursor.lastrowid
            
            # Assign admin role
            db.execute('''
                INSERT INTO web_user_roles (user_id, role)
                VALUES (?, ?)
            ''', (admin_id, 'Admin'))
            
            # Create dev user
            dev_password_hash = bcrypt.hashpw('dev123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cursor = db.execute('''
                INSERT INTO web_users (username, email, password_hash, full_name, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                'developer',
                'dev@entropy.local',
                dev_password_hash,
                'Entwickler',
                'Developer mit erweiterten Berechtigungen',
                True
            ))
            
            dev_id = cursor.lastrowid
            
            # Assign dev role
            db.execute('''
                INSERT INTO web_user_roles (user_id, role)
                VALUES (?, ?)
            ''', (dev_id, 'Dev'))
            
            db.commit()
            logging.info("Default users created successfully")
            
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating default data: {e}")
        raise

def get_stats_from_cache(stat_key):
    """Get cached statistics"""
    db = get_db()
    result = db.execute(
        'SELECT stat_value, last_updated FROM web_stats_cache WHERE stat_key = ?',
        (stat_key,)
    ).fetchone()
    
    if result:
        return {
            'value': result['stat_value'],
            'last_updated': result['last_updated']
        }
    return None

def update_stats_cache(stat_key, stat_value):
    """Update cached statistics"""
    db = get_db()
    db.execute('''
        INSERT OR REPLACE INTO web_stats_cache (stat_key, stat_value, last_updated)
        VALUES (?, ?, ?)
    ''', (stat_key, str(stat_value), datetime.now()))
    db.commit()

def log_activity(user_id, action, resource_type=None, resource_id=None, 
                ip_address=None, user_agent=None, details=None):
    """Log user activity"""
    db = get_db()
    db.execute('''
        INSERT INTO web_activity_log 
        (user_id, action, resource_type, resource_id, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, action, resource_type, resource_id, ip_address, user_agent, details))
    db.commit()