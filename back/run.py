#!/usr/bin/env python3
"""
Simple script to run the Flask application.
"""

from app import create_app

if __name__ == '__main__':
    app = create_app('development')
    print("🚀 Starting HVAR Hub Flask Application...")
    print("📍 API endpoints available at: http://localhost:5000/api/v1/")
    print("📍 Products API: http://localhost:5000/api/v1/products")
    print("📍 Sync API: http://localhost:5000/api/v1/sync/status")
    print("📍 Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False  # Disable reloader to avoid duplicate processes
    )
