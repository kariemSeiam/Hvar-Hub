from flask import jsonify
from routes.api import api_bp
from db import db

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    return jsonify({
        'status': 'healthy',
        'message': 'HVAR Hub API is running',
        'database': db_status,
        'version': '1.0.0'
    }), 200 