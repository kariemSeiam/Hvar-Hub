from flask import jsonify, request
from routes.api import api_bp
from services.unified_service import UnifiedService
from db.auto_init import ServiceActionType, ServiceActionStatus, ServiceAction


@api_bp.route('/services/create', methods=['POST'])
def create_service_action():
    try:
        body = request.get_json(silent=True) or {}
        action_type_str = (body.get('action_type') or '').strip()
        customer = body.get('customer') or {}
        original_tracking = (body.get('original_tracking') or '').strip()
        product_id = body.get('product_id')
        part_id = body.get('part_id')
        refund_amount = body.get('refund_amount')
        notes = body.get('notes', '')
        action_data = body.get('action_data') or {}

        try:
            action_type = ServiceActionType(action_type_str)
        except ValueError:
            return jsonify({ 'success': False, 'message': 'نوع إجراء الخدمة غير صحيح' }), 400

        ok, sa, err = UnifiedService.create_service_action(
            action_type,
            customer,
            original_tracking,
            product_id=product_id,
            part_id=part_id,
            refund_amount=refund_amount,
            notes=notes,
            action_data=action_data,
        )
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل إنشاء إجراء الخدمة' }), 400

        return jsonify({ 'success': True, 'data': sa.to_dict(), 'message': 'تم إنشاء إجراء الخدمة' }), 201
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services/<int:action_id>/confirm', methods=['POST'])
def confirm_service_action(action_id):
    try:
        body = request.get_json(silent=True) or {}
        new_tracking_number = (body.get('new_tracking_number') or '').strip()
        notes = body.get('notes', '')

        ok, sa, err = UnifiedService.confirm_service_action(action_id, new_tracking_number, notes)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل تأكيد إجراء الخدمة' }), 400
        return jsonify({ 'success': True, 'data': sa.to_dict(), 'message': 'تم تأكيد إجراء الخدمة' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services/<int:action_id>/pending-receive', methods=['POST'])
def move_to_pending_receive(action_id):
    try:
        body = request.get_json(silent=True) or {}
        notes = body.get('notes', '')
        ok, sa, err = UnifiedService.move_to_pending_receive(action_id, notes)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل تحديث الحالة' }), 400
        return jsonify({ 'success': True, 'data': sa.to_dict(), 'message': 'تم تحديث حالة إجراء الخدمة إلى جاهز للاستلام' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services', methods=['GET'])
def list_service_actions():
    try:
        status_str = (request.args.get('status') or '').strip()
        phone = (request.args.get('customer_phone') or '').strip()
        limit = min(int(request.args.get('limit', 50)), 100)
        page = max(int(request.args.get('page', 1)), 1)

        query = ServiceAction.query
        if status_str:
            try:
                status = ServiceActionStatus(status_str)
                query = query.filter_by(status=status)
            except ValueError:
                return jsonify({ 'success': False, 'message': 'حالة غير صحيحة' }), 400
        if phone:
            query = query.filter_by(customer_phone=phone)

        pagination = query.order_by(ServiceAction.updated_at.desc()).paginate(page=page, per_page=limit, error_out=False)
        items = [a.to_dict() for a in pagination.items]
        return jsonify({ 'success': True, 'data': { 'actions': items, 'pagination': { 'page': pagination.page, 'per_page': pagination.per_page, 'total': pagination.total, 'pages': pagination.pages } } }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services/pending-receive', methods=['GET'])
def list_pending_service_actions():
    try:
        limit = min(int(request.args.get('limit', 50)), 100)
        actions = UnifiedService.get_pending_receive_actions(limit=limit)
        return jsonify({ 'success': True, 'data': actions }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services/<int:action_id>', methods=['PUT'])
def update_service_action(action_id):
    try:
        body = request.get_json(silent=True) or {}
        
        # Find the service action
        service_action = ServiceAction.query.get(action_id)
        if not service_action:
            return jsonify({ 'success': False, 'message': 'إجراء الخدمة غير موجود' }), 404
        
        # Update fields
        if 'customer_name' in body:
            service_action.customer_name = body['customer_name'].strip()
        if 'customer_phone' in body:
            service_action.customer_phone = body['customer_phone'].strip()
        if 'return_reason' in body:
            service_action.return_reason = body['return_reason'].strip()
        if 'notes' in body:
            service_action.notes = body['notes'].strip()
        if 'cod_amount' in body:
            service_action.cod_amount = body['cod_amount']
        
        # Update address if provided
        if 'address' in body and body['address']:
            address = body['address']
            if 'street' in address:
                service_action.address_street = address['street'].strip()
            if 'city' in address:
                service_action.address_city = address['city'].strip()
            if 'state' in address:
                service_action.address_state = address['state'].strip()
            if 'postal_code' in address:
                service_action.address_postal_code = address['postal_code'].strip()
        
        # Save changes
        service_action.save()
        
        return jsonify({ 'success': True, 'data': service_action.to_dict(), 'message': 'تم تحديث إجراء الخدمة' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services/<int:action_id>/complete', methods=['POST'])
def complete_service_action(action_id):
    try:
        body = request.get_json(silent=True) or {}
        notes = body.get('notes', '')
        ok, sa, err = UnifiedService.complete_service_action(action_id, notes)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل إكمال إجراء الخدمة' }), 400
        return jsonify({ 'success': True, 'data': sa.to_dict(), 'message': 'تم إكمال إجراء الخدمة' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


@api_bp.route('/services/<int:action_id>/fail', methods=['POST'])
def fail_service_action(action_id):
    try:
        body = request.get_json(silent=True) or {}
        notes = body.get('notes', '')
        ok, sa, err = UnifiedService.fail_service_action(action_id, notes)
        if not ok:
            return jsonify({ 'success': False, 'message': err or 'فشل تسجيل فشل إجراء الخدمة' }), 400
        return jsonify({ 'success': True, 'data': sa.to_dict(), 'message': 'تم تسجيل فشل إجراء الخدمة' }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'خطأ في الخادم: {str(e)}' }), 500


