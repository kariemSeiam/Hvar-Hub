from flask import jsonify, request
from routes.api import api_bp
from services.product_service import ProductService
from services.stock_service import StockService


# -----------------
# Product endpoints
# -----------------
@api_bp.route('/products', methods=['POST'])
def create_product():
    try:
        payload = request.get_json(silent=True) or {}
        ok, product, err = ProductService.create_product(payload)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل إنشاء المنتج' }), 400
        return jsonify({ 'success': True, 'data': product.to_dict(), 'message': 'تم إنشاء المنتج' }), 201
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/products', methods=['GET'])
def list_products():
    try:
        category = (request.args.get('category') or '').strip()
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        result = ProductService.list_products(category if category else None, page, limit)
        if 'error' in result:
            return jsonify({ 'success': False, 'message': result['error'] }), 400
        return jsonify({ 'success': True, 'data': result }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        payload = request.get_json(silent=True) or {}
        ok, product, err = ProductService.update_product(product_id, payload)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل تحديث المنتج' }), 400
        return jsonify({ 'success': True, 'data': product.to_dict(), 'message': 'تم تحديث المنتج' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        ok, err = ProductService.delete_product(product_id)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل حذف المنتج' }), 400
        return jsonify({ 'success': True, 'message': 'تم حذف المنتج' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


# -------------
# Part endpoints
# -------------
@api_bp.route('/parts', methods=['POST'])
def create_part():
    try:
        payload = request.get_json(silent=True) or {}
        ok, part, err = ProductService.create_part(payload)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل إنشاء القطعة' }), 400
        return jsonify({ 'success': True, 'data': part.to_dict(), 'message': 'تم إنشاء القطعة' }), 201
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/parts', methods=['GET'])
def list_parts():
    try:
        product_id = request.args.get('product_id')
        if product_id is not None:
            try:
                product_id = int(product_id)
            except ValueError:
                return jsonify({ 'success': False, 'message': 'product_id غير صحيح' }), 400
        part_type = (request.args.get('part_type') or '').strip()
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        result = ProductService.list_parts(product_id, part_type if part_type else None, page, limit)
        if 'error' in result:
            return jsonify({ 'success': False, 'message': result['error'] }), 400
        return jsonify({ 'success': True, 'data': result }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/parts/<int:part_id>', methods=['PUT'])
def update_part(part_id):
    try:
        payload = request.get_json(silent=True) or {}
        ok, part, err = ProductService.update_part(part_id, payload)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل تحديث القطعة' }), 400
        return jsonify({ 'success': True, 'data': part.to_dict(), 'message': 'تم تحديث القطعة' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


# -----------------
# Stock Management endpoints
# -----------------
@api_bp.route('/stock/movements', methods=['GET'])
def get_stock_movements():
    """Get stock movements with optional filtering"""
    try:
        # Query parameters
        item_type = request.args.get('item_type')  # 'product' or 'part'
        item_id = request.args.get('item_id')
        movement_type = request.args.get('movement_type')  # 'maintenance', 'send', 'receive'
        order_id = request.args.get('order_id')
        service_action_id = request.args.get('service_action_id')
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        
        # Convert item_id to int if provided
        if item_id:
            try:
                item_id = int(item_id)
            except ValueError:
                return jsonify({ 'success': False, 'message': 'item_id غير صحيح' }), 400
        
        # Convert order_id to int if provided
        if order_id:
            try:
                order_id = int(order_id)
            except ValueError:
                return jsonify({ 'success': False, 'message': 'order_id غير صحيح' }), 400
        
        # Convert service_action_id to int if provided
        if service_action_id:
            try:
                service_action_id = int(service_action_id)
            except ValueError:
                return jsonify({ 'success': False, 'message': 'service_action_id غير صحيح' }), 400
        
        success, movements, error = StockService.get_stock_movements(
            item_type=item_type,
            item_id=item_id,
            movement_type=movement_type,
            order_id=order_id,
            service_action_id=service_action_id,
            page=page,
            limit=limit
        )
        
        if not success:
            return jsonify({ 'success': False, 'message': error or 'فشل جلب حركات المخزون' }), 400
        
        return jsonify({
            'success': True,
            'data': movements,
            'message': 'تم جلب حركات المخزون بنجاح'
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in get_stock_movements: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@api_bp.route('/stock/current', methods=['GET'])
def get_current_stock():
    """Get current stock levels for all products and parts"""
    try:
        success, stock_data, error = StockService.get_current_stock()
        
        if not success:
            return jsonify({ 'success': False, 'message': error or 'فشل جلب مستويات المخزون الحالية' }), 400
        
        return jsonify({
            'success': True,
            'data': stock_data,
            'message': 'تم جلب مستويات المخزون الحالية بنجاح'
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in get_current_stock: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@api_bp.route('/stock/dashboard', methods=['GET'])
def get_stock_dashboard():
    """Get stock dashboard overview with summary statistics"""
    try:
        success, dashboard_data, error = StockService.get_stock_dashboard()
        
        if not success:
            return jsonify({ 'success': False, 'message': error or 'فشل جلب لوحة تحكم المخزون' }), 400
        
        return jsonify({
            'success': True,
            'data': dashboard_data,
            'message': 'تم جلب لوحة تحكم المخزون بنجاح'
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in get_stock_dashboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


@api_bp.route('/stock/items/<item_type>/<int:item_id>', methods=['GET'])
def get_item_stock_details(item_type, item_id):
    """Get detailed stock information for a specific item"""
    try:
        if item_type not in ['product', 'part']:
            return jsonify({ 'success': False, 'message': 'نوع العنصر يجب أن يكون product أو part' }), 400
        
        success, stock_details, error = StockService.get_item_stock_details(item_type, item_id)
        
        if not success:
            return jsonify({ 'success': False, 'message': error or 'فشل جلب تفاصيل المخزون' }), 400
        
        return jsonify({
            'success': True,
            'data': stock_details,
            'message': 'تم جلب تفاصيل المخزون بنجاح'
        }), 200
        
    except Exception as e:
        print(f"Unexpected error in get_item_stock_details: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'خطأ في الخادم: {str(e)}'
        }), 500


# -------------------
# Inventory analytics
# -------------------
@api_bp.route('/inventory/analytics', methods=['GET'])
def inventory_analytics():
    try:
        data = ProductService.get_inventory_analytics()
        if 'error' in data:
            return jsonify({ 'success': False, 'message': data['error'] }), 400
        return jsonify({ 'success': True, 'data': data }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/inventory/low-stock', methods=['GET'])
def inventory_low_stock():
    try:
        data = ProductService.get_low_stock_items(limit=min(int(request.args.get('limit', 50)), 200))
        if isinstance(data, dict) and 'error' in data:
            return jsonify({ 'success': False, 'message': data['error'] }), 400
        return jsonify({ 'success': True, 'data': data }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/inventory/products/<int:product_id>/parts', methods=['GET'])
def inventory_product_parts(product_id):
    try:
        data = ProductService.get_parts_by_product(product_id)
        if isinstance(data, dict) and 'error' in data:
            return jsonify({ 'success': False, 'message': data['error'] }), 400
        return jsonify({ 'success': True, 'data': data }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


# -------------------
# Auto-sync endpoints
# -------------------
@api_bp.route('/sync/products', methods=['POST'])
def sync_products_from_json():
    """
    Automatically sync products and parts from products.json file to database.
    Creates products and parts if they don't exist, updates if they do.
    """
    try:
        # Get optional custom file path from request
        payload = request.get_json(silent=True) or {}
        custom_file_path = payload.get('json_file_path')
        
        # Perform sync
        success, sync_results, error_message = ProductService.sync_products_from_json(custom_file_path)
        
        if not success:
            return jsonify({ 
                'success': False, 
                'message': error_message or 'فشل في مزامنة المنتجات' 
            }), 400
        
        # Return sync results
        return jsonify({
            'success': True,
            'data': sync_results,
            'message': f'تمت المزامنة بنجاح: {sync_results["products_created"]} منتج جديد، {sync_results["parts_created"]} قطعة جديدة'
        }), 200
        
    except Exception as e:
        return jsonify({ 
            'success': False, 
            'message': f'خطأ في الخادم: {str(e)}' 
        }), 500


@api_bp.route('/sync/status', methods=['GET'])
def get_sync_status():
    """
    Get current sync status by comparing database with JSON file.
    Shows if sync is needed and provides counts.
    """
    try:
        sync_status = ProductService.get_sync_status()
        
        if 'error' in sync_status:
            return jsonify({ 
                'success': False, 
                'message': sync_status['error'] 
            }), 400
        
        return jsonify({
            'success': True,
            'data': sync_status,
            'message': 'تم جلب حالة المزامنة بنجاح'
        }), 200
        
    except Exception as e:
        return jsonify({ 
            'success': False, 
            'message': f'خطأ في الخادم: {str(e)}' 
        }), 500


@api_bp.route('/sync/force', methods=['POST'])
def force_sync_products():
    """
    Force sync products from JSON file, overwriting existing data.
    This is a more aggressive sync that can be used for complete data refresh.
    """
    try:
        # Get optional custom file path from request
        payload = request.get_json(silent=True) or {}
        custom_file_path = payload.get('json_file_path')
        
        # For force sync, we'll use the same method but with a flag
        # In a real implementation, you might want a separate force sync method
        success, sync_results, error_message = ProductService.sync_products_from_json(custom_file_path)
        
        if not success:
            return jsonify({ 
                'success': False, 
                'message': error_message or 'فشل في المزامنة القسرية للمنتجات' 
            }), 400
        
        # Return sync results
        return jsonify({
            'success': True,
            'data': sync_results,
            'message': f'تمت المزامنة القسرية بنجاح: {sync_results["products_updated"]} منتج محدث، {sync_results["parts_updated"]} قطعة محدثة'
        }), 200
        
    except Exception as e:
        return jsonify({ 
            'success': False, 
            'message': f'خطأ في الخادم: {str(e)}' 
        }), 500


# Stock Management endpoints moved to dedicated stock.py file


