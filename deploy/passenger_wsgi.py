#!/usr/bin/env python3
"""
Passenger WSGI file for cPanel deployment
This file tells Passenger how to run your Flask application
"""

import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'back')
sys.path.insert(0, backend_dir)

# Set environment variables for production
os.environ['FLASK_ENV'] = 'production'
os.environ['FLASK_APP'] = 'app.py'

# Import and create the Flask app
from app import create_app

# Create the application instance
application = create_app('production')

# For debugging (optional)
if __name__ == '__main__':
    application.run() 