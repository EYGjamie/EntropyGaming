# webapp/internal/config.py
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
    MAX_CONTENT_LENGTH = 512 * 1024 * 1024  # 512MB max file size
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
    MAX_CONTENT_LENGTH = 512 * 1024 * 1024  # 16MB max file size
    FORUM_ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xlsx', 'pptx', 'zip', 'rar'}
    
    # Grok AI API configuration for Forum Summary Generation
    GROK_API_URL = os.getenv('GROK_API_URL', 'https://api.x.ai/v1/chat/completions')
    GROK_API_KEY = os.getenv('GROK_API_KEY')
    GROK_MODEL = os.getenv('GROK_MODEL', 'grok-beta')
    
    # AI Features Configuration
    AI_SUMMARY_ENABLED = os.getenv('AI_SUMMARY_ENABLED', 'True').lower() == 'true' and bool(os.getenv('GROK_API_KEY'))
    AI_SUMMARY_MAX_LENGTH = int(os.getenv('AI_SUMMARY_MAX_LENGTH', '150'))
    AI_SUMMARY_TIMEOUT = int(os.getenv('AI_SUMMARY_TIMEOUT', '10'))
    
    # Forum Feature Flags
    FORUM_MARKDOWN_ENABLED = os.getenv('FORUM_MARKDOWN_ENABLED', 'True').lower() == 'true'
    FORUM_ATTACHMENTS_ENABLED = os.getenv('FORUM_ATTACHMENTS_ENABLED', 'True').lower() == 'true'
    FORUM_COMMENTS_ENABLED = os.getenv('FORUM_COMMENTS_ENABLED', 'True').lower() == 'true'
    FORUM_CATEGORIES_ENABLED = os.getenv('FORUM_CATEGORIES_ENABLED', 'True').lower() == 'true'
    FORUM_ROLE_PERMISSIONS_ENABLED = os.getenv('FORUM_ROLE_PERMISSIONS_ENABLED', 'True').lower() == 'true'
    
    # Rate Limiting Configuration
    FORUM_POST_RATE_LIMIT = int(os.getenv('FORUM_POST_RATE_LIMIT', '100'))  # Posts per hour
    FORUM_COMMENT_RATE_LIMIT = int(os.getenv('FORUM_COMMENT_RATE_LIMIT', '3000'))  # Comments per hour
    
    # Content Moderation
    FORUM_AUTO_MODERATION_ENABLED = os.getenv('FORUM_AUTO_MODERATION_ENABLED', 'False').lower() == 'true'
    FORUM_PROFANITY_FILTER_ENABLED = os.getenv('FORUM_PROFANITY_FILTER_ENABLED', 'False').lower() == 'true'
    
    # Notification Settings
    FORUM_EMAIL_NOTIFICATIONS = os.getenv('FORUM_EMAIL_NOTIFICATIONS', 'False').lower() == 'true'
    FORUM_DISCORD_NOTIFICATIONS = os.getenv('FORUM_DISCORD_NOTIFICATIONS', 'False').lower() == 'true'
    
    @classmethod
    def get_grok_headers(cls):
        """Get headers for Grok API requests"""
        if not cls.GROK_API_KEY:
            return None
        
        return {
            'Authorization': f'Bearer {cls.GROK_API_KEY}',
            'Content-Type': 'application/json'
        }
    
    @classmethod
    def get_grok_payload(cls, content, max_tokens=50):
        """Get payload for Grok API summary generation"""
        return {
            'model': cls.GROK_MODEL,
            'messages': [
                {
                    'role': 'system',
                    'content': f'Du bist ein Assistent, der prägnante und aussagekräftige Zusammenfassungen erstellt. Erstelle eine Kurzzusammenfassung (max. {cls.AI_SUMMARY_MAX_LENGTH} Zeichen) des folgenden Textes auf Deutsch. Die Zusammenfassung soll die wichtigsten Punkte erfassen und als Vorschau für den Post dienen.'
                },
                {
                    'role': 'user',
                    'content': content[:4000]  # Limit input to avoid API limits
                }
            ],
            'max_tokens': max_tokens,
            'temperature': 0.3,  # Lower temperature for more consistent summaries
            'stream': False
        }
    
    @classmethod
    def is_feature_enabled(cls, feature):
        """Check if a forum feature is enabled"""
        feature_map = {
            'markdown': cls.FORUM_MARKDOWN_ENABLED,
            'attachments': cls.FORUM_ATTACHMENTS_ENABLED,
            'comments': cls.FORUM_COMMENTS_ENABLED,
            'categories': cls.FORUM_CATEGORIES_ENABLED,
            'role_permissions': cls.FORUM_ROLE_PERMISSIONS_ENABLED,
            'ai_summary': cls.AI_SUMMARY_ENABLED,
            'auto_moderation': cls.FORUM_AUTO_MODERATION_ENABLED,
            'profanity_filter': cls.FORUM_PROFANITY_FILTER_ENABLED,
        }
        return feature_map.get(feature, False)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    # Development-specific overrides
    SESSION_COOKIE_SECURE = False
    WTF_CSRF_ENABLED = False  # Disable CSRF for easier development
    
    # More verbose logging in development
    FORUM_EMAIL_NOTIFICATIONS = False
    FORUM_DISCORD_NOTIFICATIONS = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Production security settings
    SESSION_COOKIE_SECURE = True
    WTF_CSRF_ENABLED = True
    
    # Enhanced security for production
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour in production
    
    # Stricter rate limits in production
    FORUM_POST_RATE_LIMIT = 3  # Posts per hour
    FORUM_COMMENT_RATE_LIMIT = 20  # Comments per hour

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    
    # Use in-memory database for testing
    DATABASE_PATH = ':memory:'
    
    # Disable external API calls during testing
    AI_SUMMARY_ENABLED = False
    FORUM_EMAIL_NOTIFICATIONS = False
    FORUM_DISCORD_NOTIFICATIONS = False
    BOT_API_ENABLED = False
    
    # Disable rate limiting for testing
    FORUM_POST_RATE_LIMIT = 1000
    FORUM_COMMENT_RATE_LIMIT = 1000
    
    # Disable CSRF for easier testing
    WTF_CSRF_ENABLED = False

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])