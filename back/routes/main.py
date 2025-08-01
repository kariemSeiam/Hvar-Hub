import os
from flask import Blueprint, send_from_directory, current_app

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Serve the frontend index.html"""
    frontend_dist = os.path.join(current_app.root_path, '..', 'front', 'dist')
    return send_from_directory(frontend_dist, 'index.html')

@main_bp.route('/<path:path>')
def static_files(path):
    """Serve static files from frontend dist"""
    frontend_dist = os.path.join(current_app.root_path, '..', 'front', 'dist')
    
    # Check if file exists, otherwise serve index.html for SPA routing
    file_path = os.path.join(frontend_dist, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(frontend_dist, path)
    else:
        return send_from_directory(frontend_dist, 'index.html') 