# webapp/internal/database/forum_migration.py
"""
Forum Database Migration Script
Run this script to update your existing forum database with new features:
- Summary field for posts
- Role permissions for categories  
- Markdown support
"""

import sqlite3
import logging
from pathlib import Path

def migrate_forum_database(db_path='db/data/test.db'):
    """Apply forum database migrations"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        logging.info("Starting forum database migration...")
        
        # Migration 1: Add summary field to forum_posts
        try:
            cursor.execute("ALTER TABLE forum_posts ADD COLUMN summary TEXT")
            logging.info("✓ Added summary field to forum_posts")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                logging.info("✓ Summary field already exists in forum_posts")
            else:
                raise e
        
        # Migration 2: Add required_roles field to forum_categories
        try:
            cursor.execute("ALTER TABLE forum_categories ADD COLUMN required_roles TEXT")
            logging.info("✓ Added required_roles field to forum_categories")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                logging.info("✓ Required_roles field already exists in forum_categories")
            else:
                raise e
        
        # Migration 3: Create indexes for better performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_forum_posts_summary ON forum_posts(summary)",
            "CREATE INDEX IF NOT EXISTS idx_forum_categories_roles ON forum_categories(required_roles)",
            "CREATE INDEX IF NOT EXISTS idx_forum_posts_updated ON forum_posts(updated_at)"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
            logging.info(f"✓ Created index: {index_sql.split('idx_')[1].split(' ON')[0]}")
        
        # Migration 4: Update forum_categories table structure if needed
        cursor.execute("PRAGMA table_info(forum_categories)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_by' not in columns:
            try:
                cursor.execute("ALTER TABLE forum_categories ADD COLUMN created_by INTEGER REFERENCES users(id)")
                logging.info("✓ Added created_by field to forum_categories")
            except sqlite3.OperationalError:
                pass
        
        # Migration 5: Ensure all required tables exist with updated schema
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS forum_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                required_roles TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS forum_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT,
                category_id INTEGER,
                author_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE SET NULL,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Commit all changes
        conn.commit()
        logging.info("✅ Forum database migration completed successfully!")
        
        # Verify migration
        cursor.execute("SELECT COUNT(*) FROM forum_posts")
        post_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM forum_categories")  
        category_count = cursor.fetchone()[0]
        
        logging.info(f"Database verified: {post_count} posts, {category_count} categories")
        
        return True
        
    except Exception as e:
        logging.error(f"Error during forum migration: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

def update_db_manager():
    """Updated create_forum_tables function for db_manager.py"""
    return ''
def create_forum_tables(db):
    
    try:
        # Forum categories table with role permissions
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                required_roles TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        ''')
        
        # Forum posts table with summary field
        db.execute('''
            CREATE TABLE IF NOT EXISTS forum_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT,
                category_id INTEGER,
                author_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE SET NULL,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Forum attachments table (unchanged)
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
        
        # Forum post reads table (unchanged) 
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
        
        # Forum comments table (unchanged)
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
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_posts_updated ON forum_posts(updated_at)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_posts_summary ON forum_posts(summary)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_categories_roles ON forum_categories(required_roles)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_attachments_post ON forum_attachments(post_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_reads_user ON forum_post_reads(user_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_reads_post ON forum_post_reads(post_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_author ON forum_comments(author_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_parent ON forum_comments(parent_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_forum_comments_created ON forum_comments(created_at)')
        
        # Insert default categories with role examples
        default_categories = [
            ('Allgemein', 'Allgemeine Diskussionen und Ankündigungen', None),
            ('Fragen & Antworten', 'Fragen und Support', None),
            ('Projekte', 'Projektbezogene Diskussionen', 'Management,Head Management,Projektleitung'),
            ('Finanzen', 'Finanzielle Diskussionen - nur für Projektleitung', 'Projektleitung'),
            ('Entwicklung', 'Technische Diskussionen', 'Developer,Head Management,Projektleitung'),
            ('Team-Intern', 'Interne Team-Diskussionen', 'Management,Head Management,Projektleitung')
        ]
        
        for name, description, roles in default_categories:
            db.execute('''
                INSERT OR IGNORE INTO forum_categories (name, description, required_roles)
                VALUES (?, ?, ?)
            ''', (name, description, roles))
        
        db.commit()
        logging.info("Forum database tables created/updated successfully")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating forum database tables: {e}")
        raise

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Run migration
    success = migrate_forum_database()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("\nNext steps:")
        print("1. Update your config.py with Grok API settings:")
        print("   GROK_API_URL = 'https://api.x.ai/v1/chat/completions'")
        print("   GROK_API_KEY = 'your-grok-api-key'")
        print("2. Install required packages: pip install markdown")
        print("3. Restart your Flask application")
    else:
        print("\n❌ Migration failed. Check logs for details.")