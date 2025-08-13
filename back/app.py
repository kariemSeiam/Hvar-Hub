import os
from flask import Flask
from flask_cors import CORS
from config import config
from db import init_db
from routes import register_blueprints

def create_app(config_name=None):
    """Application factory pattern"""
    
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions - allow production domain
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "https://mcrm.hvarstore.com",
        "http://mcrm.hvarstore.com"
    ]
    
    CORS(app, supports_credentials=True, origins=allowed_origins)
    
    # Initialize database with auto-initialization
    init_db(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors by serving frontend index.html for SPA routing"""
        frontend_dist = os.path.join(app.root_path, '..', 'front', 'dist')
        if os.path.exists(os.path.join(frontend_dist, 'index.html')):
            from flask import send_from_directory
            return send_from_directory(frontend_dist, 'index.html')
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        return {'error': 'Internal server error'}, 500
    
    return app 