#!/usr/bin/env python3
"""
Passenger WSGI file for CyberPanel deployment
This file tells Passenger how to run your Flask application
"""

import os
import sys
import logging

# Set up logging for production debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'back')
sys.path.insert(0, backend_dir)

# Set environment variables for production
os.environ['FLASK_ENV'] = 'production'
os.environ['FLASK_APP'] = 'app.py'

# Production database settings (update these with your actual values)
os.environ['MYSQL_HOST'] = 'localhost'
os.environ['MYSQL_USER'] = 'mcrmh4534_hvar'  # Update with your actual username
os.environ['MYSQL_PASSWORD'] = ''  # Update with your actual password
os.environ['MYSQL_DATABASE'] = 'mcrmh4534_hvar_hub'  # Update with your actual database name

try:
    # Import and create the Flask app
    from app import create_app
    
    # Create the application instance
    application = create_app('production')
    
    logger.info("Flask application initialized successfully")
    
    # Serve pre-built frontend files
    @application.route('/', defaults={'path': ''})
    @application.route('/<path:path>')
    def serve_frontend(path):
        """Serve pre-built frontend files or index.html for SPA routing"""
        from flask import send_from_directory, send_file
        
        # Skip API routes - let them be handled by Flask
        if path.startswith('api/'):
            return None
        
        # Construct the path to the frontend dist directory
        frontend_dist = os.path.join(current_dir, 'front', 'dist')
        
        # If specific file requested and exists, serve it
        if path and os.path.exists(os.path.join(frontend_dist, path)):
            return send_from_directory(frontend_dist, path)
        
        # For SPA routing, always return index.html for non-API routes
        index_path = os.path.join(frontend_dist, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
        else:
            return {'error': 'Frontend dist files not found. Make sure frontend is built.'}, 404

except Exception as e:
    logger.error(f"Failed to initialize Flask app: {e}")
    # Create a simple error application
    def application(environ, start_response):
        status = '500 Internal Server Error'
        headers = [('Content-type', 'text/plain')]
        start_response(status, headers)
        return [f'Application failed to initialize: {str(e)}'.encode()]

# For debugging (optional)
if __name__ == '__main__':
    application.run(debug=False) 