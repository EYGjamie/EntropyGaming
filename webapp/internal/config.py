import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    DATABASE_PATH = os.getenv('DATABASE_PATH', 'db/data/entropy.db')
    TRANSCRIPTS_DIR = os.getenv('TRANSCRIPTS_DIR', '../../bot/transcripts')
    BOT_CONFIG_DIR = os.getenv('BOT_CONFIG_DIR', '../../bot/config')
    ORGCHART_DATA_FILE = os.getenv('ORGCHART_DATA_FILE', 'data/orgchart.json')
    
    # Flask configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Upload configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'static/uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'doc', 'docx'}
    
    # Pagination
    ITEMS_PER_PAGE = 20
    
    # Bot API configuration
    BOT_API_URL = os.getenv('BOT_API_URL', 'http://localhost:8080')
    BOT_API_ENABLED = os.getenv('BOT_API_ENABLED', 'False').lower() == 'true'
    
    # Discord configuration
    DISCORD_GUILD_ID = os.getenv('DISCORD_GUILD_ID')
    DISCORD_GUILD_NAME = os.getenv('DISCORD_GUILD_NAME', 'Entropy Gaming')
    
    # Discord OAuth configuration
    DISCORD_CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')
    DISCORD_CLIENT_SECRET = os.getenv('DISCORD_CLIENT_SECRET')
    DISCORD_REDIRECT_URI = os.getenv('DISCORD_REDIRECT_URI', 'http://localhost:5000/auth/discord/callback')
    DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
    DISCORD_REQUIRED_ROLES = os.getenv('DISCORD_REQUIRED_ROLES', 'role_management,role_head_management,role_developer').split(',')
    
    # Security
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600

    # Forum-specific configuration
    FORUM_UPLOAD_FOLDER = os.path.join('static', 'uploads', 'forum')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    FORUM_ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xlsx', 'pptx'}
    
    # Forum pagination
    FORUM_POSTS_PER_PAGE = 20
    FORUM_SEARCH_MIN_LENGTH = 3
    
    # Forum file handling
    FORUM_MAX_FILES_PER_POST = 10
    FORUM_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB per file
    
    @staticmethod
    def init_app(app):
        # Create upload directories if they don't exist
        upload_dir = os.path.join(app.static_folder, 'uploads', 'forum')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Set up other forum-related initialization
        pass

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_PATH = ':memory:'
    WTF_CSRF_ENABLED = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}