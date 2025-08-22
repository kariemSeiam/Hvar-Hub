from flask import jsonify, request
from routes.api import api_bp
from services.order_service import OrderService


@api_bp.route('/bosta/test', methods=['GET'])
def test_bosta_api():
    """
    Test endpoint to verify Bosta API connectivity
    """
    try:
        from services.order_service import BostaAPIService
        
        # Test with a simple search
        print("🧪 Testing Bosta API connectivity...")
        ok, data, err = BostaAPIService.search_deliveries(phone="+201155125743", limit=1)
        
        if ok:
            return jsonify({ 
                'success': True, 
                'message': 'Bosta API is working correctly',
                'data': {
                    'test_phone': '+201155125743',
                    'found_deliveries': len((data or {}).get('deliveries', [])),
                    'api_response': data
                }
            }), 200
        else:
            return jsonify({ 
                'success': False, 
                'message': f'Bosta API test failed: {err}',
                'error': err
            }), 400
            
    except Exception as e:
        print(f"💥 Exception in Bosta API test: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({ 'success': False, 'message': f'خطأ في اختبار API: {str(e)}' }), 500


@api_bp.route('/bosta/search', methods=['POST'])
def search_bosta_deliveries():
    """
    Canonical Bosta search endpoint.
    Body supports either:
    - { phone?: string, name?: string, tracking?: string, page?: number, limit?: number, group?: boolean }
    - { search_type: 'phone'|'name'|'tracking', search_value: string, page?: number, limit?: number, group?: boolean }

    When group=true, returns grouped customers with their orders; otherwise a flat deliveries list.
    """
    try:
        body = request.get_json(silent=True) or {}
        # Normalize inputs
        search_type = (body.get('search_type') or '').strip()
        search_value = (body.get('search_value') or '').strip()
        phone = (body.get('phone') or '').strip()
        name = (body.get('name') or '').strip()
        tracking = (body.get('tracking') or '').strip()
        group = bool(body.get('group', False))
        page = int(body.get('page', 1))
        limit = min(int(body.get('limit', 50)), 100)

        # Map search_type/search_value if provided
        if search_type and search_value and not any([phone, name, tracking]):
            if search_type == 'phone':
                phone = search_value
            elif search_type == 'name':
                name = search_value
            elif search_type == 'tracking':
                tracking = search_value

        if not any([phone, name, tracking]):
            return jsonify({ 'success': False, 'message': 'يرجى إدخال رقم هاتف أو اسم أو رقم تتبع' }), 400

        # ENHANCED: Grouped response path using enhanced search_deliveries with complete data extraction
        if group:
            # Use the enhanced BostaAPIService.search_deliveries with group=True
            from services.order_service import BostaAPIService
            ok, grouped_data, err = BostaAPIService.search_deliveries(
                phone=phone or None,
                name=name or None,
                tracking=tracking or None,
                page=page,
                limit=limit,
                group=True  # This enables the enhanced customer grouping
            )
            if ok:
                return jsonify({ 'success': True, 'data': grouped_data, 'message': 'تم الجلب بنجاح' }), 200

            # ENHANCED: Improved fallback to local when searching by phone
            if phone:
                try:
                    from utils.bosta_utils import transform_local_order_brief
                    local_orders = OrderService.search_orders_by_phone(phone, page=page, limit=limit)
                    if local_orders:
                        deliveries = [transform_local_order_brief(o, preferred_phone=phone) for o in local_orders]
                        grouped_local = {
                            'customers': [{
                                'customer': {
                                    'full_name': deliveries[0]['receiver']['full_name'] if deliveries else 'Unknown',
                                    'primary_phone': phone,
                                    'second_phone': deliveries[0]['receiver'].get('second_phone') if deliveries else None,
                                    'first_name': deliveries[0]['receiver'].get('full_name', '').split(' ')[0] if deliveries else None,
                                    'last_name': ' '.join(deliveries[0]['receiver'].get('full_name', '').split(' ')[1:]) if deliveries and len(deliveries[0]['receiver'].get('full_name', '').split(' ')) > 1 else None,
                                },
                                'orders': deliveries
                            }],
                            'total_count': len(deliveries),
                            'page': page,
                            'limit': limit
                        }
                        return jsonify({ 'success': True, 'data': grouped_local, 'message': 'تم الجلب من قاعدة البيانات المحلية (Bosta API غير متاح)' }), 200
                except Exception as fallback_error:
                    print(f"❌ Enhanced grouped fallback failed: {fallback_error}")
            return jsonify({ 'success': False, 'message': err or 'فشل في جلب النتائج' }), 400

        # Flat deliveries response path
        from services.order_service import BostaAPIService
        ok, data, err = BostaAPIService.search_deliveries(phone=phone or None, name=name or None, tracking=tracking or None, page=page, limit=limit)
        if not ok:
            print(f"❌ Bosta search failed: {err}")
            # Fallback: try to search local orders if Bosta API fails
            if phone:
                print(f"🔄 Attempting fallback search in local orders for phone: {phone}")
                try:
                    from utils.bosta_utils import transform_local_order_brief
                    local_orders = OrderService.search_orders_by_phone(phone, page=page, limit=limit)
                    if local_orders:
                        print(f"✅ Found {len(local_orders)} local orders as fallback")
                        fallback_deliveries = [transform_local_order_brief(o, preferred_phone=phone) for o in local_orders]
                        result = {
                            'count': len(fallback_deliveries),
                            'page': page,
                            'limit': limit,
                            'deliveries': fallback_deliveries,
                            'source': 'local_fallback'
                        }
                        return jsonify({ 'success': True, 'data': result, 'message': 'تم الجلب من قاعدة البيانات المحلية (Bosta API غير متاح)' }), 200
                except Exception as fallback_error:
                    print(f"❌ Fallback search also failed: {fallback_error}")
            return jsonify({ 'success': False, 'message': err or 'فشل في جلب النتائج' }), 400

        deliveries = (data or {}).get('deliveries', [])
        brief = [BostaAPIService.transform_delivery_brief(d) for d in deliveries]
        result = {
            'count': (data or {}).get('count'),
            'page': (data or {}).get('page'),
            'limit': (data or {}).get('limit'),
            'deliveries': brief,
            'source': 'bosta_api'
        }
        return jsonify({ 'success': True, 'data': result, 'message': 'تم الجلب بنجاح' }), 200
    except Exception as e:
        print(f"💥 Exception in Bosta search: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/bosta/customer-orders', methods=['GET'])
def get_customer_orders_from_tracking():
    """
    Given ?tracking=, fetch receiver phone/name and return all his deliveries (brief),
    including second phone presence.
    Response: { success, data: { customer, deliveries, raw }, message }
    """
    try:
        tracking = (request.args.get('tracking') or '').strip()
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)

        if not tracking:
            return jsonify({ 'success': False, 'message': 'رقم التتبع مطلوب' }), 400

        ok, data, err = OrderService.get_customer_orders_by_tracking(tracking, page=page, limit=limit)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل في جلب طلبات العميل' }), 400

        return jsonify({ 'success': True, 'data': data }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


# Note: Deprecated /bosta/search-customer merged into /bosta/search with group=true


@api_bp.route('/bosta/service-payload', methods=['GET'])
def get_service_payload_by_tracking():
    """
    ENHANCED: Given ?tracking=, return a comprehensive Bosta payload tailored for service actions
    using COMPLETE data extraction as specified in Task 1.1.1.
    This endpoint provides ALL customer and order data needed for service action creation.
    Response: { success, data, message }
    """
    try:
        tracking = (request.args.get('tracking') or '').strip()
        if not tracking:
            return jsonify({ 'success': False, 'message': 'رقم التتبع مطلوب' }), 400

        # ENHANCED: Use the comprehensive data extraction function
        from services.order_service import BostaAPIService
        from utils.bosta_utils import transform_bosta_data_for_service_actions_complete

        print(f"🔍 Getting comprehensive service payload for tracking: {tracking}")

        # First try to get the delivery data from Bosta API
        ok, delivery_data, err = BostaAPIService.fetch_order_data(tracking)
        if not ok:
            print(f"❌ Failed to fetch delivery data: {err}")
            return jsonify({ 'success': False, 'message': err or 'فشل في جلب بيانات الطلب' }), 400

        # Transform using the comprehensive data extraction function
        try:
            comprehensive_payload = transform_bosta_data_for_service_actions_complete(delivery_data)
            print(f"✅ Successfully extracted comprehensive data for service action creation")

            return jsonify({
                'success': True,
                'data': comprehensive_payload,
                'message': 'تم جلب البيانات الشاملة بنجاح'
            }), 200

        except Exception as transform_error:
            print(f"❌ Error in comprehensive data transformation: {transform_error}")
            # Fallback to the original method if transformation fails
            ok, data, err = OrderService.get_service_action_payload_by_tracking(tracking)
            if not ok:
                return jsonify({ 'success': False, 'message': err or 'فشل في جلب البيانات' }), 400
            return jsonify({ 'success': True, 'data': data }), 200

    except Exception as e:
        print(f"💥 Exception in comprehensive service payload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500

