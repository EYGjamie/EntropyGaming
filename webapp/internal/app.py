from flask import Flask
from config import Config
from database.db_manager import init_db
from utils.helpers import setup_logging

def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Setup logging
    setup_logging(app)
    
    # Initialize database
    init_db(app)
    
    # Register blueprints
    from blueprints.auth import auth_bp
    from blueprints.dashboard import dashboard_bp
    from blueprints.teams import teams_bp
    from blueprints.admin import admin_bp
    from blueprints.api import api_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)
    
    # Register template filters and globals
    from utils.template_helpers import register_template_helpers
    register_template_helpers(app)
    
    # Error handlers
    from utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)