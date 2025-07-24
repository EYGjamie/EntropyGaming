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
        create_forum_tables(db)
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

def create_forum_tables(db=None):
    """Create forum-specific tables including comments"""
    if db is None:
        db = get_db()
    
    try:
        # Forum categories table
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        ''')
        
        # Forum posts table
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category_id INTEGER,
                author_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE SET NULL,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Forum attachments table
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                file_size INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
            )
        ''')
        
        # Forum post reads table (for unread tracking)
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_post_reads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
                UNIQUE(user_id, post_id)
            )
        ''')
        
        # NEW: Forum comments table
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                author_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                parent_id INTEGER NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES forum_comments(id) ON DELETE SET NULL
            )
        ''')
        
        # Create indexes for better performance
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_attachments_post ON forum_attachments(post_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_reads_user ON forum_post_reads(user_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_reads_post ON forum_post_reads(post_id)')
        
        # NEW: Indexes for comments
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_author ON forum_comments(author_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_parent ON forum_comments(parent_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_created ON forum_comments(created_at)')
        
        # Insert default categories
        default_categories = [
            ('Allgemein', 'Allgemeine Diskussionen und Ankündigungen'),
            ('Fragen & Antworten', 'Fragen und Support'),
            ('Projekte', 'Projektbezogene Diskussionen'),
            ('Ideen & Vorschläge', 'Verbesserungsvorschläge und neue Ideen')
        ]
        
        for name, description in default_categories:
            db.execute('''
                INSERT OR IGNORE INTO forum_categories (name, description)
                VALUES (?, ?)
            ''', (name, description))
        
        db.commit()
        logging.info("Forum database tables created successfully")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating forum database tables: {e}")
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