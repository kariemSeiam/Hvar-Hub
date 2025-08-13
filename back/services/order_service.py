"""Order service for business logic and operations"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import requests
import json

from db.auto_init import Order, MaintenanceHistory, OrderStatus, MaintenanceAction, ACTION_STATUS_MAP, ReturnCondition
from db import db
from utils.timezone import get_egypt_now
from sqlalchemy import text, or_
from sqlalchemy.exc import OperationalError


class BostaAPIService:
    """Service for Bosta API integration"""
    
    BASE_URL = 'https://app.bosta.co/api/v2'
    TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IkxDMDk1RFUzYVd6czhnOEpqTjM3UyIsInJvbGVzIjpbIkJVU0lORVNTX0FETUlOIl0sImJ1c2luZXNzQWRtaW5JbmZvIjp7ImJ1c2luZXNzSWQiOiJaMGZLbmVrUmQ3SXllaGhjN2hMRnoiLCJidXNpbmVzc05hbWUiOiJIVkFSIn0sImNvdW50cnkiOnsiX2lkIjoiNjBlNDQ4MmM3Y2I3ZDRiYzQ4NDljNGQ1IiwibmFtZSI6IkVneXB0IiwibmFtZUFyIjoi2YXYtdixIiwiY29kZSI6IkVHIn0sImVtYWlsIjoia2FyaWVtc2VpYW1AZ21haWwuY29tIiwicGhvbmUiOiIrMjAxMDMzOTM5ODI4IiwiZ3JvdXAiOnsiX2lkIjoiWGFxbENGQSIsIm5hbWUiOiJCVVNJTkVTU19GVUxMX0FDQ0VTUyIsImNvZGUiOjExNX0sInRva2VuVHlwZSI6IkFDQ0VTUyIsInRva2VuVmVyc2lvbiI6IlYyIiwic2Vzc2lvbklkIjoiMDFLMVIxRFpSUkRaNTI1UEUyNUczWDEySkgiLCJpYXQiOjE3NTQyMjcyMTIsImV4cCI6MTc1NTQzNjgxMn0.L3E4X84JcRr898L5gvC8IhxHckhQHpdR4W3qh6gba98'
    
    @classmethod
    def get_headers(cls):
        return {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ar',
            'Authorization': f'Bearer {cls.TOKEN}',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    @classmethod
    def fetch_order_data(cls, tracking_number: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Fetch order data from Bosta API
        Returns: (success, data, error_message)
        """
        try:
            url = f"{cls.BASE_URL}/deliveries/business/{tracking_number}"
            response = requests.get(url, headers=cls.get_headers(), timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return True, data.get('data', data), None
            elif response.status_code == 404:
                return False, None, "لم يتم العثور على الطلب بهذا الرقم"
            elif response.status_code == 401:
                return False, None, "خطأ في المصادقة - تحقق من إعدادات API"
            else:
                return False, None, f"خطأ في الخادم: {response.status_code}"
                
        except requests.RequestException as e:
            return False, None, f"خطأ في الشبكة: {str(e)}"
    
    @classmethod
    def transform_bosta_data(cls, bosta_data: Dict) -> Dict:
        """Transform Bosta data to internal order format"""
        if not bosta_data:
            return {}
            
        # Extract receiver information
        receiver = bosta_data.get('receiver', {}) or {}
        
        # Extract address information  
        pickup_addr = bosta_data.get('pickupAddress', {}) or {}
        dropoff_addr = bosta_data.get('dropOffAddress', {}) or {}
        
        # Extract package specs with priority for returnSpecs in Customer Return orders
        specs = bosta_data.get('specs', {}) or {}
        return_specs = bosta_data.get('returnSpecs', {}) or {}
        
        # For Customer Return Pickup orders, prioritize returnSpecs description
        order_type = bosta_data.get('type', {}) or {}
        is_customer_return = order_type.get('value') == 'Customer Return Pickup'
        
        if is_customer_return and return_specs.get('packageDetails'):
            # Use returnSpecs for Customer Return orders
            package_details = return_specs.get('packageDetails', {})
        else:
            # Use specs for regular orders, fallback to returnSpecs
            package_details = specs.get('packageDetails', {}) or return_specs.get('packageDetails', {}) or {}
        
        # Extract nested objects with null checks  
        state = bosta_data.get('state', {}) or {}
        wallet = bosta_data.get('wallet', {}) or {}
        cash_cycle = wallet.get('cashCycle', {}) or {}
        
        # Extract city and zone with Arabic names
        pickup_city = pickup_addr.get('city', {}) or {}
        pickup_zone = pickup_addr.get('zone', {}) or {}
        dropoff_city = dropoff_addr.get('city', {}) or {}
        dropoff_zone = dropoff_addr.get('zone', {}) or {}
        
        # Determine if this is a return order based on actual data
        is_return = (
            order_type.get('value') == 'Customer Return Pickup' or
            order_type.get('value') == 'Exchange' or
            bosta_data.get('maskedState') == 'Fulfilled' or
            'return' in bosta_data.get('maskedState', '').lower()
        )
        
        # Extract timeline data
        timeline = bosta_data.get('timeline', []) or []
        
        # Extract proof images if available
        proof_images = bosta_data.get('starProofOfReturnedPackages', []) or []
        
        return {
            'tracking_number': bosta_data.get('trackingNumber'),
            'bosta_id': bosta_data.get('_id'),
            'customer_name': receiver.get('fullName', ''),
            'customer_phone': receiver.get('phone', ''),
            'customer_second_phone': receiver.get('secondPhone', ''),
            'pickup_address': cls._format_address(pickup_addr),
            'dropoff_address': cls._format_address(dropoff_addr),
            'city': dropoff_city.get('nameAr', dropoff_city.get('name', '')),
            'zone': dropoff_zone.get('nameAr', dropoff_zone.get('name', '')),
            'building_number': dropoff_addr.get('buildingNumber', ''),
            'floor': dropoff_addr.get('floor', ''),
            'apartment': dropoff_addr.get('apartment', ''),
            'cod_amount': bosta_data.get('cod', 0),
            'bosta_fees': float(cash_cycle.get('bosta_fees', 0)),
            'package_description': package_details.get('description', ''),
            'package_weight': specs.get('weight', 0),
            'items_count': package_details.get('itemsCount', 1),
            'order_type': order_type.get('value', ''),
            'shipping_state': state.get('value', ''),
            'masked_state': bosta_data.get('maskedState', ''),
            'is_return_order': is_return,
            'return_specs_data': return_specs,  # Store complete returnSpecs
            'bosta_data': bosta_data,
            'timeline_data': timeline,
            'bosta_proof_images': proof_images
        }
    
    @staticmethod
    def _format_address(address_dict: Dict) -> str:
        """Format address dictionary to string"""
        if not address_dict:
            return ''
            
        parts = []
        
        # Add first and second lines
        if address_dict.get('firstLine'):
            parts.append(address_dict['firstLine'].strip())
        if address_dict.get('secondLine'):
            parts.append(address_dict['secondLine'].strip())
        
        # Handle nested objects with null checks - prioritize Arabic names
        zone = address_dict.get('zone', {}) or {}
        city = address_dict.get('city', {}) or {}
        district = address_dict.get('district', {}) or {}
        
        # Add zone (prioritize Arabic name)
        zone_name = zone.get('nameAr', zone.get('name', ''))
        if zone_name:
            parts.append(zone_name.strip())
            
        # Add city (prioritize Arabic name)
        city_name = city.get('nameAr', city.get('name', ''))
        if city_name:
            parts.append(city_name.strip())
            
        # Add district (prioritize Arabic name)
        district_name = district.get('nameAr', district.get('name', ''))
        if district_name:
            parts.append(district_name.strip())
            
        return ' - '.join(parts)


class OrderService:
    """Service for order management operations"""
    
    @staticmethod
    def scan_order(tracking_number: str, user_name: str = 'فني الصيانة', force_create: bool = False) -> Tuple[bool, Optional[Order], Optional[str], bool]:
        """
        Scan and process an order
        Returns: (success, order, error_message, is_existing)
        """
        try:
            # Check if order already exists
            existing_order = Order.get_by_tracking_number(tracking_number)
            if existing_order and not force_create:
                return True, existing_order, None, True
            
            # Fetch data from Bosta API
            success, bosta_data, error = BostaAPIService.fetch_order_data(tracking_number)
            if not success:
                print(f"Bosta API error for {tracking_number}: {error}")
                return False, None, error, False
            
            # Transform Bosta data
            try:
                order_data = BostaAPIService.transform_bosta_data(bosta_data)
                if not order_data:
                    return False, None, "فشل في تحويل بيانات الطلب", False
            except Exception as transform_error:
                print(f"Transform error for {tracking_number}: {str(transform_error)}")
                return False, None, f"خطأ في تحويل البيانات: {str(transform_error)}", False
            
            # Create new order
            try:
                order = Order(**order_data)
                order.scanned_at = get_egypt_now()
                order.save()
                
                # Add initial maintenance history entry
                history = MaintenanceHistory(
                    order_id=order.id,
                    action=MaintenanceAction.RECEIVED,
                    notes='تم استلام الطلب بنجاح',
                    user_name=user_name,
                    timestamp=get_egypt_now()
                )
                history.save()
                
                return True, order, None, False
                
            except Exception as e:
                db.session.rollback()
                print(f"Database error for {tracking_number}: {str(e)}")
                return False, None, f"خطأ في حفظ البيانات: {str(e)}", False
                
        except Exception as e:
            print(f"Unexpected error in scan_order for {tracking_number}: {str(e)}")
            return False, None, f"خطأ غير متوقع: {str(e)}", False
    
    @staticmethod
    def perform_action(order_id: int, action: MaintenanceAction, notes: str = '', 
                      user_name: str = 'فني الصيانة', action_data: Dict = None) -> Tuple[bool, Optional[Order], Optional[str]]:
        """
        Perform maintenance action on order with optimized workflow handling
        Returns: (success, updated_order, error_message)
        """
        try:
            # Get order with validation
            order = Order.get_by_id(order_id)
            if not order:
                return False, None, "الطلب غير موجود"
            
            # Special case: setting return condition does not change status
            if action == MaintenanceAction.SET_RETURN_CONDITION:
                if not order.status == OrderStatus.RETURNED:
                    return False, None, "يمكن تعيين حالة المرتجع فقط للطلبات في قائمة المرتجعات"
                # Validate action data (must include return_condition)
                is_valid, validation_error = OrderService.validate_action_data(action, action_data or {})
                if not is_valid:
                    return False, None, validation_error
                rc = (action_data or {}).get('return_condition')
                order.return_condition = ReturnCondition.VALID if rc == 'valid' else ReturnCondition.DAMAGED
                now = get_egypt_now()
                history = MaintenanceHistory(
                    order_id=order.id,
                    action=action,
                    notes=notes.strip() if notes else '',
                    user_name=user_name,
                    action_data=action_data,
                    timestamp=now
                )
                order.save()
                history.save()
                return True, order, None

            # Get new status from action mapping
            new_status = ACTION_STATUS_MAP.get(action)
            if not new_status:
                return False, None, "إجراء غير صحيح"
            
            # Validate state transition
            if not order.can_transition_to(new_status):
                return False, None, f"لا يمكن الانتقال من {order.status.value} إلى {new_status.value}"
            
            # Validate action data
            is_valid, validation_error = OrderService.validate_action_data(action, action_data or {})
            if not is_valid:
                return False, None, validation_error
            
            # Update order status and timestamps
            now = get_egypt_now()
            order.status = new_status
            
            # Handle timestamp updates based on action
            timestamp_updates = {
                MaintenanceAction.START_MAINTENANCE: 'maintenance_started_at',
                MaintenanceAction.COMPLETE_MAINTENANCE: 'maintenance_completed_at',
                MaintenanceAction.FAIL_MAINTENANCE: 'maintenance_failed_at',
                MaintenanceAction.SEND_ORDER: 'sent_at',
                MaintenanceAction.RESCHEDULE: 'rescheduled_at',
                MaintenanceAction.RETURN_ORDER: 'returned_at',
                MaintenanceAction.MOVE_TO_RETURNS: 'returned_at'
            }
            
            if action in timestamp_updates:
                setattr(order, timestamp_updates[action], now)
            
            # Handle action-specific data storage
            if action_data:
                # Store new tracking number and COD for relevant actions
                if action in [MaintenanceAction.SEND_ORDER, MaintenanceAction.REFUND_OR_REPLACE]:
                    if action_data.get('new_tracking_number'):
                        order.new_tracking_number = action_data['new_tracking_number'].strip()
                    if action_data.get('new_cod'):
                        order.new_cod_amount = float(action_data['new_cod'])
                
                # When moving to returns or returning to customer, capture return condition
                if action in [MaintenanceAction.MOVE_TO_RETURNS, MaintenanceAction.RETURN_ORDER]:
                    rc = action_data.get('return_condition')
                    if rc in ['valid', 'damaged']:
                        order.return_condition = ReturnCondition.VALID if rc == 'valid' else ReturnCondition.DAMAGED

                # Handle refund/replace specific logic
                if action == MaintenanceAction.REFUND_OR_REPLACE:
                    order.is_refund_or_replace = True
                    order.is_action_completed = True
                
                # Handle send order completion
                if action == MaintenanceAction.SEND_ORDER:
                    order.is_action_completed = True
            
            # Create maintenance history entry
            history = MaintenanceHistory(
                order_id=order.id,
                action=action,
                notes=notes.strip() if notes else '',
                user_name=user_name,
                action_data=action_data,
                timestamp=now
            )
            
            # Save changes in single transaction
            order.save()
            history.save()
            
            return True, order, None
            
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في تحديث الطلب: {str(e)}"
    
    @staticmethod
    def validate_action_data(action: MaintenanceAction, action_data: Dict) -> Tuple[bool, Optional[str]]:
        """
        Validate action data based on action type
        Returns: (is_valid, error_message)
        """
        if not action_data:
            # For return-related actions, require action_data to include return_condition
            if action in [MaintenanceAction.MOVE_TO_RETURNS, MaintenanceAction.RETURN_ORDER, MaintenanceAction.SET_RETURN_CONDITION]:
                return False, "يجب تحديد حالة المرتجع (صالح/تالف)"
            return True, None
        
        # Validate tracking number format
        if action_data.get('new_tracking_number'):
            tracking_number = action_data['new_tracking_number'].strip()
            if len(tracking_number) < 3 or len(tracking_number) > 50:
                return False, "رقم التتبع يجب أن يكون بين 3 و 50 حرف"
        
        # Validate COD amount
        if action_data.get('new_cod'):
            try:
                cod_amount = float(action_data['new_cod'])
                if cod_amount < 0:
                    return False, "مبلغ COD يجب أن يكون موجب"
            except (ValueError, TypeError):
                return False, "مبلغ COD غير صحيح"
        
        # Validate notes length
        if action_data.get('notes'):
            notes = action_data['notes'].strip()
            if len(notes) > 1000:
                return False, "الملاحظات يجب أن تكون أقل من 1000 حرف"

        # Validate return_condition for related actions
        if action in [MaintenanceAction.MOVE_TO_RETURNS, MaintenanceAction.RETURN_ORDER, MaintenanceAction.SET_RETURN_CONDITION]:
            rc = action_data.get('return_condition')
            if rc not in ['valid', 'damaged']:
                return False, "حالة المرتجع غير صحيحة (اختر صالح أو تالف)"
        
        return True, None
    
    @staticmethod
    def get_orders_by_status(status: Optional[OrderStatus], page: int = 1, per_page: int = 20, return_condition: Optional[str] = None) -> Dict:
        """Get orders by status with pagination and optimized performance. Supports filtering returned orders by return_condition.
        If status is None, returns all orders without status filter (ignores return_condition)."""
        try:
            print(f"Fetching orders for status: {status.value if status else 'ALL'}, page: {page}, per_page: {per_page}, return_condition={return_condition}")
            
            # Build base query
            query = Order.query
            if status is not None:
                query = query.filter_by(status=status)
            if status == OrderStatus.RETURNED and return_condition in ['valid', 'damaged']:
                rc_enum = ReturnCondition.VALID if return_condition == 'valid' else ReturnCondition.DAMAGED
                # Treat NULL return_condition as 'valid' to avoid hiding legacy/unspecified returns
                if rc_enum == ReturnCondition.VALID:
                    query = query.filter(
                        or_(
                            Order.return_condition == ReturnCondition.VALID,
                            Order.return_condition.is_(None)
                        )
                    )
                else:
                    query = query.filter(Order.return_condition == ReturnCondition.DAMAGED)

            # Use direct query to avoid relationship loading issues
            try:
                pagination = query\
                    .order_by(Order.updated_at.desc())\
                    .paginate(page=page, per_page=per_page, error_out=False)
            except OperationalError as oe:
                # Attempt to self-heal if the new column is missing in existing SQLite DB
                if 'no such column: orders.return_condition' in str(oe):
                    try:
                        with db.engine.connect() as connection:
                            connection.execute(text("ALTER TABLE orders ADD COLUMN return_condition VARCHAR(20)"))
                            connection.commit()
                            print("✅ Added missing column via self-heal: orders.return_condition")
                        # Retry after adding column
                        pagination = query\
                            .order_by(Order.updated_at.desc())\
                            .paginate(page=page, per_page=per_page, error_out=False)
                    except Exception as e2:
                        raise oe
                else:
                    raise
            
            print(f"Found {len(pagination.items)} orders")
            
            orders_data = []
            for order in pagination.items:
                try:
                    # Manually load relationships to avoid issues
                    maintenance_history = order.maintenance_history.order_by(MaintenanceHistory.timestamp.desc()).all()
                    proof_images = order.proof_images.all()
                    
                    # Helper: map backend status to UI tab id
                    def _status_to_ui_tab(status_value: str) -> str:
                        if not status_value:
                            return status_value
                        if status_value == 'in_maintenance':
                            return 'inMaintenance'
                        if status_value == 'returned':
                            return 'returns'
                        return status_value

                    # Create order dict manually
                    order_dict = {
                        'id': order.id,
                        'tracking_number': order.tracking_number,
                        'bosta_id': order.bosta_id,
                        'status': order.status.value if order.status else None,
                        'return_condition': order.return_condition.value if order.return_condition else None,
                        'ui_status': _status_to_ui_tab(order.status.value if order.status else None),
                        'customer_name': order.customer_name,
                        'customer_phone': order.customer_phone,
                        'customer_second_phone': order.customer_second_phone,
                        'pickup_address': order.pickup_address,
                        'dropoff_address': order.dropoff_address,
                        'city': order.city,
                        'zone': order.zone,
                        'building_number': order.building_number,
                        'floor': order.floor,
                        'apartment': order.apartment,
                        'cod_amount': float(order.cod_amount) if order.cod_amount else 0,
                        'bosta_fees': float(order.bosta_fees) if order.bosta_fees else 0,
                        'new_cod_amount': float(order.new_cod_amount) if order.new_cod_amount else None,
                        'package_description': order.package_description,
                        'package_weight': float(order.package_weight) if order.package_weight else None,
                        'items_count': order.items_count,
                        'order_type': order.order_type,
                        'shipping_state': order.shipping_state,
                        'masked_state': order.masked_state,
                        'scanned_at': order.scanned_at.isoformat() if order.scanned_at else None,
                        'received_at': order.received_at.isoformat() if order.received_at else None,
                        'maintenance_started_at': order.maintenance_started_at.isoformat() if order.maintenance_started_at else None,
                        'maintenance_completed_at': order.maintenance_completed_at.isoformat() if order.maintenance_completed_at else None,
                        'maintenance_failed_at': order.maintenance_failed_at.isoformat() if order.maintenance_failed_at else None,
                        'sent_at': order.sent_at.isoformat() if order.sent_at else None,
                        'rescheduled_at': order.rescheduled_at.isoformat() if order.rescheduled_at else None,
                        'returned_at': order.returned_at.isoformat() if order.returned_at else None,
                        'bosta_data': order.bosta_data or {},
                        'timeline_data': order.timeline_data or [],
                        'bosta_proof_images': order.bosta_proof_images or [],
                        'new_tracking_number': order.new_tracking_number,
                        'is_refund_or_replace': order.is_refund_or_replace,
                        'is_action_completed': order.is_action_completed,
                        'created_at': order.created_at.isoformat() if order.created_at else None,
                        'updated_at': order.updated_at.isoformat() if order.updated_at else None,
                        'maintenance_history': [history.to_dict() for history in maintenance_history],
                        'proof_images': [image.to_dict() for image in proof_images],
                    }
                    orders_data.append(order_dict)
                except Exception as e:
                    print(f"Error serializing order {order.id}: {str(e)}")
                    # Add a minimal order dict to avoid complete failure
                    orders_data.append({
                        'id': order.id,
                        'tracking_number': order.tracking_number,
                        'status': order.status.value if order.status else None,
                        'error': f'Serialization error: {str(e)}'
                    })
            
            return {
                'orders': orders_data,
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }
        except Exception as e:
            print(f"Error in get_orders_by_status: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'error': f"خطأ في جلب البيانات: {str(e)}"}
    
    @staticmethod
    def get_order_details(order_id: int) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Get complete order details"""
        try:
            order = Order.get_by_id(order_id)
            if not order:
                return False, None, "الطلب غير موجود"
            
            return True, order.to_dict(), None
            
        except Exception as e:
            return False, None, f"خطأ في جلب البيانات: {str(e)}"
    
    @staticmethod
    def get_recent_scans(limit: int = 10) -> List[Dict]:
        """Get recent scanned orders with proper data structure"""
        try:
            print(f"Fetching recent scans with limit: {limit}")
            
            orders = Order.query.filter(Order.scanned_at.isnot(None)).order_by(
                Order.scanned_at.desc()
            ).limit(limit).all()
            
            print(f"Found {len(orders)} orders with scanned_at")
            
            scans = []
            for order in orders:
                print(f"Processing order {order.id}: tracking={order.tracking_number}, customer={order.customer_name}, scanned_at={order.scanned_at}")
                
                # Create scan data with proper structure matching frontend expectations
                scan_data = {
                    '_id': order.id,
                    'trackingNumber': order.tracking_number,
                    'scannedAt': order.scanned_at.isoformat() if order.scanned_at else None,
                    'status': order.status.value if order.status else None,
                    'receiver': {
                        'fullName': order.customer_name or 'غير محدد'
                    },
                    'specs': {
                        'packageDetails': {
                            'description': order.package_description or ''
                        }
                    }
                }
                print(f"Created scan data: {scan_data}")
                scans.append(scan_data)
            
            print(f"Returning {len(scans)} scans")
            return scans
            
        except Exception as e:
            print(f"Error in get_recent_scans: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def search_orders(query: str, status: Optional[OrderStatus] = None) -> List[Dict]:
        """Search orders by tracking number or customer name"""
        try:
            base_query = Order.query
            
            if status:
                base_query = base_query.filter_by(status=status)
            
            # Search in tracking number and customer name
            search_filter = db.or_(
                Order.tracking_number.ilike(f'%{query}%'),
                Order.customer_name.ilike(f'%{query}%'),
                Order.customer_phone.ilike(f'%{query}%')
            )
            
            orders = base_query.filter(search_filter).order_by(
                Order.updated_at.desc()
            ).limit(50).all()
            
            return [order.to_dict() for order in orders]
            
        except Exception as e:
            return []
    
    @staticmethod
    def get_orders_summary() -> Dict:
        """Get orders count summary by status with optimized performance"""
        try:
            from sqlalchemy import func
            
            # Use single query with grouping for better performance
            summary_query = db.session.query(
                Order.status,
                func.count(Order.id).label('count')
            ).group_by(Order.status).all()
            
            # Initialize result with all statuses
            result = {status.value: 0 for status in OrderStatus}
            
            # Update with actual counts
            for status, count in summary_query:
                result[status.value] = count
            
            # Calculate total
            result['total'] = sum(result.values())
            
            return result
            
        except Exception as e:
            return {'error': f"خطأ في جلب ملخص البيانات: {str(e)}"}

    @staticmethod
    def refresh_from_bosta(tracking_number: str) -> Tuple[bool, Optional[Order], Optional[str]]:
        """Refresh an existing order's data from Bosta (including proof images URLs)."""
        try:
            order = Order.get_by_tracking_number(tracking_number)
            if not order:
                return False, None, "الطلب غير موجود"

            success, bosta_data, error = BostaAPIService.fetch_order_data(tracking_number)
            if not success:
                return False, None, error

            # Transform and update only relevant fields
            transformed = BostaAPIService.transform_bosta_data(bosta_data)

            # Safely update fields if present in transformed payload
            def maybe_set(attr: str, key: str):
                if key in transformed and transformed[key] is not None:
                    setattr(order, attr, transformed[key])

            maybe_set('customer_name', 'customer_name')
            maybe_set('customer_phone', 'customer_phone')
            maybe_set('customer_second_phone', 'customer_second_phone')
            maybe_set('pickup_address', 'pickup_address')
            maybe_set('dropoff_address', 'dropoff_address')
            maybe_set('city', 'city')
            maybe_set('zone', 'zone')
            maybe_set('building_number', 'building_number')
            maybe_set('floor', 'floor')
            maybe_set('apartment', 'apartment')
            maybe_set('cod_amount', 'cod_amount')
            maybe_set('bosta_fees', 'bosta_fees')
            maybe_set('package_description', 'package_description')
            maybe_set('package_weight', 'package_weight')
            maybe_set('items_count', 'items_count')
            maybe_set('order_type', 'order_type')
            maybe_set('shipping_state', 'shipping_state')
            maybe_set('masked_state', 'masked_state')
            maybe_set('timeline_data', 'timeline_data')
            maybe_set('bosta_proof_images', 'bosta_proof_images')

            # Always store fresh raw bosta_data (full object)
            order.bosta_data = bosta_data

            order.save()
            return True, order, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في تحديث البيانات من Bosta: {str(e)}"