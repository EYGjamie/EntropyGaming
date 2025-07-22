import sqlite3
import bcrypt
from flask import current_app, g
import logging

def get_db():
    """Get database connection for current request"""
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DATABASE_PATH'])
        g.db.row_factory = sqlite3.Row
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
        create_default_users(db)
        
    # Register close_db with app teardown
    app.teardown_appcontext(close_db)

def create_tables(db):
    """Create necessary tables for web application"""
    try:
        # Web users table
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
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # User roles table
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
        
        # User sessions table (optional, for session management)
        db.execute('''
            CREATE TABLE IF NOT EXISTS web_user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
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
                resource TEXT,
                resource_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES web_users (id)
            )
        ''')
        
        db.commit()
        logging.info("Database tables created successfully")
        
    except Exception as e:
        logging.error(f"Error creating database tables: {e}")
        db.rollback()
        raise

def create_default_users(db):
    """Create default admin user if it doesn't exist"""
    try:
        # Check if admin user exists
        admin_exists = db.execute(
            'SELECT id FROM web_users WHERE username = ?', ('admin',)
        ).fetchone()
        
        if not admin_exists:
            password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            
            cursor = db.execute('''
                INSERT INTO web_users (username, email, password_hash, full_name, description)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                'admin', 
                'admin@entropy.local', 
                password_hash, 
                'System Administrator', 
                'Standard-Administratorkonto mit vollständigen Berechtigungen'
            ))
            
            user_id = cursor.lastrowid
            
            # Assign admin role
            db.execute(
                'INSERT INTO web_user_roles (user_id, role) VALUES (?, ?)', 
                (user_id, 'Admin')
            )
            
            logging.info("Default admin user created")
        
        # Check if dev user exists
        dev_exists = db.execute(
            'SELECT id FROM web_users WHERE username = ?', ('developer',)
        ).fetchone()
        
        if not dev_exists:
            password_hash = bcrypt.hashpw('dev123'.encode('utf-8'), bcrypt.gensalt())
            
            cursor = db.execute('''
                INSERT INTO web_users (username, email, password_hash, full_name, description)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                'developer', 
                'dev@entropy.local', 
                password_hash, 
                'Developer Account', 
                'Entwicklerkonto für Bot-Konfiguration und technische Verwaltung'
            ))
            
            user_id = cursor.lastrowid
            
            # Assign dev and mitglied roles
            db.execute(
                'INSERT INTO web_user_roles (user_id, role) VALUES (?, ?)', 
                (user_id, 'Dev')
            )
            db.execute(
                'INSERT INTO web_user_roles (user_id, role) VALUES (?, ?)', 
                (user_id, 'Mitglied')
            )
            
            logging.info("Default developer user created")
        
        db.commit()
        
    except Exception as e:
        logging.error(f"Error creating default users: {e}")
        db.rollback()
        raise