"""Order management API routes"""
from flask import Blueprint, request, jsonify
from datetime import datetime

from db.auto_init import Order, OrderStatus, MaintenanceAction
from services.order_service import OrderService

orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')


@orders_bp.route('/scan', methods=['POST'])
def scan_order():
    """Scan and process an order"""
    try:
        data = request.get_json()
        tracking_number = data.get('tracking_number', '').strip()
        user_name = data.get('user_name', 'فني الصيانة')
        force_create = data.get('force_create', False)
        
        print(f"Scanning order: {tracking_number}, user: {user_name}, force_create: {force_create}")
        
        if not tracking_number:
            return jsonify({
                'success': False,
                'message': 'رقم التتبع مطلوب'
            }), 400
        
        success, order, error, is_existing = OrderService.scan_order(
            tracking_number, user_name, force_create
        )
        
        if success:
            print(f"Scan successful for {tracking_number}, is_existing: {is_existing}")
            return jsonify({
                'success': True,
                'data': {
                    'order': order.to_dict(),
                    'is_existing': is_existing,
                    'bosta_data': order.bosta_data
                },
                'message': 'تم معالجة الطلب بنجاح' if not is_existing else 'تم العثور على الطلب'
            }), 200
        else:
            print(f"Scan failed for {tracking_number}: {error}")
            return jsonify({
                'success': False,
                'message': error
            }), 400
            
    except Exception as e:
        print(f"Unexpected error in scan_order: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@orders_bp.route('', methods=['GET'])
def get_orders():
    """Get orders with optional filtering"""
    try:
        # Query parameters
        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('limit', 20)), 100)  # Max 100 per page
        search = request.args.get('search', '').strip()
        
        if search:
            # Search functionality
            status_enum = OrderStatus(status) if status else None
            orders = OrderService.search_orders(search, status_enum)
            return jsonify({
                'success': True,
                'data': {
                    'orders': orders,
                    'total': len(orders)
                }
            }), 200
        
        if status:
            # Filter by status
            try:
                status_enum = OrderStatus(status)
                result = OrderService.get_orders_by_status(status_enum, page, per_page)
                
                if 'error' in result:
                    return jsonify({
                        'success': False,
                        'message': result['error']
                    }), 400
                
                return jsonify({
                    'success': True,
                    'data': result
                }), 200
                
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'حالة الطلب غير صحيحة'
                }), 400
        else:
            # Get all orders
            result = OrderService.get_orders_by_status(None, page, per_page)
            return jsonify({
                'success': True,
                'data': result
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@orders_bp.route('/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    """Get order details by ID"""
    try:
        success, data, error = OrderService.get_order_details(order_id)
        
        if success:
            return jsonify({
                'success': True,
                'data': data
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': error
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@orders_bp.route('/<int:order_id>/action', methods=['POST'])
def perform_order_action(order_id):
    """Perform maintenance action on order"""
    try:
        data = request.get_json()
        action_str = data.get('action', '').strip()
        notes = data.get('notes', '')
        user_name = data.get('user_name', 'فني الصيانة')
        action_data = data.get('action_data', {})
        
        if not action_str:
            return jsonify({
                'success': False,
                'message': 'نوع الإجراء مطلوب'
            }), 400
        
        try:
            action = MaintenanceAction(action_str)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'نوع الإجراء غير صحيح'
            }), 400
        
        success, order, error = OrderService.perform_action(
            order_id, action, notes, user_name, action_data
        )
        
        if success:
            return jsonify({
                'success': True,
                'data': {
                    'order': order.to_dict(),
                    'history_entry': order.get_latest_action().to_dict() if order.get_latest_action() else None
                },
                'message': 'تم تحديث حالة الطلب بنجاح'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': error
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@orders_bp.route('/summary', methods=['GET'])
def get_orders_summary():
    """Get orders count summary by status"""
    try:
        summary = OrderService.get_orders_summary()
        
        if 'error' in summary:
            return jsonify({
                'success': False,
                'message': summary['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': summary
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@orders_bp.route('/recent-scans', methods=['GET'])
def get_recent_scans():
    """Get recent scanned orders"""
    try:
        limit = min(int(request.args.get('limit', 10)), 50)  # Max 50
        scans = OrderService.get_recent_scans(limit)
        
        return jsonify({
            'success': True,
            'data': scans
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@orders_bp.route('/tracking/<tracking_number>', methods=['GET'])
def get_order_by_tracking(tracking_number):
    """Get order by tracking number"""
    try:
        print(f"Looking for order with tracking number: {tracking_number}")
        order = Order.get_by_tracking_number(tracking_number)
        
        if order:
            print(f"Found order: {order.id}, status: {order.status}")
            try:
                order_dict = order.to_dict()
                print(f"Successfully serialized order {order.id}")
                return jsonify({
                    'success': True,
                    'data': order_dict
                }), 200
            except Exception as serialization_error:
                print(f"Serialization error for order {tracking_number}: {str(serialization_error)}")
                import traceback
                traceback.print_exc()
                return jsonify({
                    'success': False,
                    'message': f'خطأ في تحويل البيانات: {str(serialization_error)}'
                }), 500
        else:
            print(f"Order not found in database for tracking number: {tracking_number}")
            print(f"Attempting to fetch from Bosta API...")
            
            # Try to fetch from Bosta API
            success, order, error, is_existing = OrderService.scan_order(
                tracking_number, 'فني الصيانة', False
            )
            
            if success:
                print(f"Successfully fetched order from Bosta API")
                return jsonify({
                    'success': True,
                    'data': order.to_dict(),
                    'message': 'تم جلب الطلب من Bosta بنجاح'
                }), 200
            else:
                print(f"Failed to fetch from Bosta API: {error}")
                return jsonify({
                    'success': False,
                    'message': f'الطلب غير موجود في قاعدة البيانات ولا يمكن جلبه من Bosta: {error}'
                }), 404
            
    except Exception as e:
        print(f"Error in get_order_by_tracking for {tracking_number}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


# Error handlers for the blueprint
@orders_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'message': 'طلب غير صحيح'
    }), 400


@orders_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'المورد غير موجود'
    }), 404


@orders_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'خطأ داخلي في الخادم'
    }), 500