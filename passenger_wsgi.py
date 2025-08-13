#!/usr/bin/env python3
"""
WSGI entrypoint for production.

Designed to work with a reverse proxy (e.g., OpenLiteSpeed/CyberPanel)
that forwards requests to a WSGI server listening on 127.0.0.1:5001
such as:

    gunicorn -w 2 -b 127.0.0.1:5001 passenger_wsgi:application

This file must expose a module-level variable named `application`.
Environment variables (e.g., MySQL credentials) should be provided by the
server environment; they are NOT hardcoded here.
"""

import os
import sys
import logging

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resolve project paths and ensure backend is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, 'back')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Ensure production environment unless explicitly overridden
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('FLASK_APP', 'app.py')

try:
    from app import create_app

    # Create the Flask WSGI application
    application = create_app('production')
    logger.info('Flask application initialized successfully (production)')

except Exception as e:
    logger.exception('Failed to initialize Flask app')

    # Fallback WSGI application to surface initialization errors
    def application(environ, start_response):  # type: ignore
        status = '500 Internal Server Error'
        headers = [('Content-type', 'text/plain; charset=utf-8')]
        start_response(status, headers)
        return [f'Application failed to initialize: {str(e)}'.encode('utf-8')]

if __name__ == '__main__':
    # For local ad-hoc debugging only. In production, run via gunicorn/uwsgi.
    from werkzeug.serving import run_simple
    run_simple('127.0.0.1', 5001, application, use_reloader=False, use_debugger=False)