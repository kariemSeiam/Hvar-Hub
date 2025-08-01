from flask import Blueprint

def register_blueprints(app):
    """Register all blueprints with the app"""
    
    # Import blueprints here
    from .api import api_bp
    from .api.orders import orders_bp
    from .main import main_bp
    
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    app.register_blueprint(orders_bp)  # Orders API
    
    return app 