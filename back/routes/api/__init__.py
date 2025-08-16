from flask import Blueprint, jsonify

# Create API blueprint
api_bp = Blueprint('api', __name__)

# Import API routes
from . import health
from . import customers
from . import services
from . import products
# from . import users
# from . import auth

# Blueprint-level error handlers to keep response envelope consistent
@api_bp.errorhandler(400)
def api_bad_request(error):
    return jsonify({ 'success': False, 'message': 'طلب غير صحيح' }), 400


@api_bp.errorhandler(404)
def api_not_found(error):
    return jsonify({ 'success': False, 'message': 'المورد غير موجود' }), 404


@api_bp.errorhandler(500)
def api_internal_error(error):
    return jsonify({ 'success': False, 'message': 'خطأ داخلي في الخادم' }), 500

# Add your API route imports here as you create them 