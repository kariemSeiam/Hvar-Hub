"""
Stock Service for HVAR Hub - Unified Service Action Cycle
Handles all stock operations: maintenance, send, receive, and returns
"""

from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
from datetime import datetime

from db.auto_init import (
    db, StockMovement, ServiceActionItem, Product, Part,
    StockMovementType, ItemCondition, ServiceAction
)
from utils.timezone import get_egypt_now


class StockService:
    """
    Central service for all stock operations in HVAR Hub.
    
    Handles four main business operations:
    1. maintenance_adjustment() - Internal stock changes during maintenance
    2. send_items() - Reduce stock when sending replacement items to customer
    3. receive_items() - Add stock when receiving items back from customer (replacements)
    4. receive_returns() - Add stock when customer returns items for refund
    """
    
    @staticmethod
    def maintenance_adjustment(
        order_id: int,
        item_type: str,
        item_id: int,
        quantity_change: int,
        condition: str,
        notes: str = "",
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        MAINTENANCE: Add/Remove parts during repair process
        
        Args:
            order_id: ID of the maintenance order
            item_type: 'product' or 'part'
            item_id: ID of the product or part
            quantity_change: +/- amount (negative for usage, positive for addition)
            condition: 'valid' or 'damaged'
            notes: Description of the adjustment
            user_name: User performing the action
            
        Returns:
            (success, data, error_message)
            
        Example:
            Used 2 motors for repair → quantity_change = -2
            Added 1 damaged part removed → quantity_change = 1, condition = 'damaged'
        """
        try:
            # Validate inputs
            validation_result = StockService._validate_maintenance_inputs(
                order_id, item_type, item_id, quantity_change, condition
            )
            if not validation_result[0]:
                return validation_result
            
            # Get the item (product or part)
            item = StockService._get_item(item_type, item_id)
            if not item:
                return False, None, f"العنصر غير موجود: {item_type} #{item_id}"
            
            # Update stock levels
            update_result = StockService._update_item_stock(item, item_type, quantity_change, condition)
            if not update_result[0]:
                return update_result
            
            # Create stock movement record
            movement = StockMovement(
                item_type=item_type,
                item_id=item_id,
                quantity_change=quantity_change,
                movement_type=StockMovementType.MAINTENANCE,
                condition=ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED,
                order_id=order_id,
                notes=notes,
                created_by=user_name
            )
            
            db.session.add(movement)
            db.session.flush()  # Get ID without committing
            
            return True, {
                'movement_id': movement.id,
                'item_type': item_type,
                'item_id': item_id,
                'quantity_change': quantity_change,
                'condition': condition,
                'new_total_stock': item.current_stock,
                'new_damaged_stock': item.current_stock_damaged,
                'new_valid_stock': item.get_valid_stock()
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في تعديل المخزون للصيانة: {str(e)}"
            print(f"StockService.maintenance_adjustment error: {e}")
            return False, None, error_msg
    
    @staticmethod
    def send_items(
        service_action_id: int,
        items_to_send: List[Dict[str, Any]],
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        SEND: Reduce stock when sending replacement items to customer
        
        Args:
            service_action_id: ID of the service action
            items_to_send: List of items with format:
                [{'item_type': 'part', 'item_id': 5, 'quantity': 2}]
            user_name: User performing the action
            
        Returns:
            (success, data, error_message)
        """
        try:
            # Validate service action exists
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate inputs
            validation_result = StockService._validate_send_inputs(items_to_send)
            if not validation_result[0]:
                return validation_result
            
            movements_created = []
            items_updated = []
            
            for item_data in items_to_send:
                item_type = item_data['item_type']
                item_id = item_data['item_id']
                quantity = item_data['quantity']
                
                # Get the item
                item = StockService._get_item(item_type, item_id)
                if not item:
                    return False, None, f"العنصر غير موجود: {item_type} #{item_id}"
                
                # Check if enough valid stock available
                valid_stock = item.get_valid_stock()
                if valid_stock < quantity:
                    return False, None, f"مخزون غير كافي للعنصر {item_type} #{item_id}. متوفر: {valid_stock}, مطلوب: {quantity}"
                
                # Reduce stock (negative quantity change)
                update_result = StockService._update_item_stock(item, item_type, -quantity, 'valid')
                if not update_result[0]:
                    return update_result
                
                # Create stock movement record
                movement = StockMovement(
                    item_type=item_type,
                    item_id=item_id,
                    quantity_change=-quantity,
                    movement_type=StockMovementType.SEND,
                    condition=ItemCondition.VALID,
                    service_action_id=service_action_id,
                    notes=f"إرسال للعميل - خدمة #{service_action_id}",
                    created_by=user_name
                )
                
                db.session.add(movement)
                movements_created.append(movement)
                
                # Update or create ServiceActionItem record
                service_item = ServiceActionItem.query.filter_by(
                    service_action_id=service_action_id,
                    item_type=item_type,
                    item_id=item_id
                ).first()
                
                if service_item:
                    service_item.quantity_to_send = quantity
                    service_item.sent_at = get_egypt_now()
                else:
                    service_item = ServiceActionItem(
                        service_action_id=service_action_id,
                        item_type=item_type,
                        item_id=item_id,
                        quantity_to_send=quantity,
                        sent_at=get_egypt_now()
                    )
                    db.session.add(service_item)
                
                items_updated.append({
                    'item_type': item_type,
                    'item_id': item_id,
                    'quantity_sent': quantity,
                    'new_stock': item.current_stock,
                    'new_valid_stock': item.get_valid_stock()
                })
            
            db.session.flush()  # Get IDs
            
            return True, {
                'service_action_id': service_action_id,
                'movements_created': len(movements_created),
                'items_sent': items_updated,
                'total_items': len(items_to_send)
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في إرسال العناصر: {str(e)}"
            print(f"StockService.send_items error: {e}")
            return False, None, error_msg
    
    @staticmethod
    def receive_items(
        service_action_id: int,
        items_received: List[Dict[str, Any]],
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        RECEIVE: Add stock when receiving items back from customer (replacements)
        
        Args:
            service_action_id: ID of the service action
            items_received: List of items with format:
                [{'item_type': 'part', 'item_id': 5, 'quantity': 1, 'condition': 'damaged'}]
            user_name: User performing the action
            
        Returns:
            (success, data, error_message)
        """
        try:
            # Validate service action exists
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate inputs
            validation_result = StockService._validate_receive_inputs(items_received)
            if not validation_result[0]:
                return validation_result
            
            movements_created = []
            items_updated = []
            
            for item_data in items_received:
                item_type = item_data['item_type']
                item_id = item_data['item_id']
                quantity = item_data['quantity']
                condition = item_data['condition']
                
                # Get the item
                item = StockService._get_item(item_type, item_id)
                if not item:
        
                    return False, None, f"العنصر غير موجود: {item_type} #{item_id}"
                
                # Add stock (positive quantity change)
                update_result = StockService._update_item_stock(item, item_type, quantity, condition)
                if not update_result[0]:
        
                    return update_result
                
                # Create stock movement record
                movement = StockMovement(
                    item_type=item_type,
                    item_id=item_id,
                    quantity_change=quantity,
                    movement_type=StockMovementType.RECEIVE,
                    condition=ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED,
                    service_action_id=service_action_id,
                    notes=f"استلام من العميل - استبدال #{service_action_id}",
                    created_by=user_name
                )
                
                db.session.add(movement)
                movements_created.append(movement)
                
                # Update ServiceActionItem record
                service_item = ServiceActionItem.query.filter_by(
                    service_action_id=service_action_id,
                    item_type=item_type,
                    item_id=item_id
                ).first()
                
                if service_item:
                    service_item.quantity_received = quantity
                    service_item.condition_received = ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED
                    service_item.received_at = get_egypt_now()
                else:
                    # Create new record if it doesn't exist
                    service_item = ServiceActionItem(
                        service_action_id=service_action_id,
                        item_type=item_type,
                        item_id=item_id,
                        quantity_received=quantity,
                        condition_received=ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED,
                        received_at=get_egypt_now()
                    )
                    db.session.add(service_item)
                
                items_updated.append({
                    'item_type': item_type,
                    'item_id': item_id,
                    'quantity_received': quantity,
                    'condition': condition,
                    'new_stock': item.current_stock,
                    'new_valid_stock': item.get_valid_stock()
                })
            
            db.session.flush()  # Get IDs

            
            return True, {
                'service_action_id': service_action_id,
                'movements_created': len(movements_created),
                'items_received': items_updated,
                'total_items': len(items_received)
            }, None
            
        except Exception as e:

            error_msg = f"خطأ في استلام العناصر: {str(e)}"
            print(f"StockService.receive_items error: {e}")
            return False, None, error_msg
    
    @staticmethod
    def receive_returns(
        service_action_id: int,
        items_returned: List[Dict[str, Any]],
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        RECEIVE RETURNS: Add stock when customer returns items for refund
        
        Args:
            service_action_id: ID of the service action
            items_returned: List of items with format:
                [{'item_type': 'product', 'item_id': 1, 'quantity': 1, 'condition': 'valid'}]
            user_name: User performing the action
            
        Returns:
            (success, data, error_message)
        """
        try:
            
            # Validate service action exists and is return type
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # This method is specifically for RETURN_FROM_CUSTOMER actions
            # Note: We'll add this validation when ServiceActionType is available
            
            # Validate inputs
            validation_result = StockService._validate_receive_inputs(items_returned)
            if not validation_result[0]:
                return validation_result
            
            movements_created = []
            items_updated = []
            
            for item_data in items_returned:
                item_type = item_data['item_type']
                item_id = item_data['item_id']
                quantity = item_data['quantity']
                condition = item_data['condition']
                
                # Get the item
                item = StockService._get_item(item_type, item_id)
                if not item:
        
                    return False, None, f"العنصر غير موجود: {item_type} #{item_id}"
                
                # Add stock (positive quantity change)
                update_result = StockService._update_item_stock(item, item_type, quantity, condition)
                if not update_result[0]:
        
                    return update_result
                
                # Create stock movement record
                movement = StockMovement(
                    item_type=item_type,
                    item_id=item_id,
                    quantity_change=quantity,
                    movement_type=StockMovementType.RECEIVE,
                    condition=ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED,
                    service_action_id=service_action_id,
                    notes=f"استلام مرتجع من العميل - رقم #{service_action_id}",
                    created_by=user_name
                )
                
                db.session.add(movement)
                movements_created.append(movement)
                
                # Update or create ServiceActionItem record
                service_item = ServiceActionItem.query.filter_by(
                    service_action_id=service_action_id,
                    item_type=item_type,
                    item_id=item_id
                ).first()
                
                if service_item:
                    service_item.quantity_received = quantity
                    service_item.condition_received = ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED
                    service_item.received_at = get_egypt_now()
                else:
                    # Create new record for return
                    service_item = ServiceActionItem(
                        service_action_id=service_action_id,
                        item_type=item_type,
                        item_id=item_id,
                        quantity_received=quantity,
                        condition_received=ItemCondition.VALID if condition == 'valid' else ItemCondition.DAMAGED,
                        received_at=get_egypt_now()
                    )
                    db.session.add(service_item)
                
                items_updated.append({
                    'item_type': item_type,
                    'item_id': item_id,
                    'quantity_returned': quantity,
                    'condition': condition,
                    'new_stock': item.current_stock,
                    'new_valid_stock': item.get_valid_stock()
                })
            
            db.session.flush()  # Get IDs

            
            return True, {
                'service_action_id': service_action_id,
                'movements_created': len(movements_created),
                'items_returned': items_updated,
                'total_items': len(items_returned)
            }, None
            
        except Exception as e:

            error_msg = f"خطأ في استلام المرتجعات: {str(e)}"
            print(f"StockService.receive_returns error: {e}")
            return False, None, error_msg
    
    # Helper methods for validation and stock updates
    
    @staticmethod
    def _validate_maintenance_inputs(
        order_id: int, item_type: str, item_id: int, quantity_change: int, condition: str
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Validate maintenance adjustment inputs"""
        
        if quantity_change == 0:
            return False, None, "تغيير الكمية يجب أن يكون غير صفر"
        
        if item_type not in ['product', 'part']:
            return False, None, "نوع العنصر يجب أن يكون 'product' أو 'part'"
        
        if condition not in ['valid', 'damaged']:
            return False, None, "حالة العنصر يجب أن تكون 'valid' أو 'damaged'"
        
        if not isinstance(order_id, int) or order_id <= 0:
            return False, None, "رقم الطلب غير صحيح"
        
        if not isinstance(item_id, int) or item_id <= 0:
            return False, None, "رقم العنصر غير صحيح"
        
        return True, None, None
    
    @staticmethod
    def _validate_send_inputs(items_to_send: List[Dict]) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Validate send items inputs"""
        
        if not items_to_send or not isinstance(items_to_send, list):
            return False, None, "قائمة العناصر المراد إرسالها مطلوبة"
        
        for item in items_to_send:
            if not isinstance(item, dict):
                return False, None, "تنسيق العنصر غير صحيح"
            
            required_fields = ['item_type', 'item_id', 'quantity']
            for field in required_fields:
                if field not in item:
                    return False, None, f"حقل مطلوب مفقود: {field}"
            
            if item['item_type'] not in ['product', 'part']:
                return False, None, f"نوع العنصر غير صحيح: {item['item_type']}"
            
            if not isinstance(item['quantity'], int) or item['quantity'] <= 0:
                return False, None, f"كمية غير صحيحة: {item['quantity']}"
        
        return True, None, None
    
    @staticmethod
    def _validate_receive_inputs(items_received: List[Dict]) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Validate receive items inputs"""
        
        if not items_received or not isinstance(items_received, list):
            return False, None, "قائمة العناصر المستلمة مطلوبة"
        
        for item in items_received:
            if not isinstance(item, dict):
                return False, None, "تنسيق العنصر غير صحيح"
            
            required_fields = ['item_type', 'item_id', 'quantity', 'condition']
            for field in required_fields:
                if field not in item:
                    return False, None, f"حقل مطلوب مفقود: {field}"
            
            if item['item_type'] not in ['product', 'part']:
                return False, None, f"نوع العنصر غير صحيح: {item['item_type']}"
            
            if not isinstance(item['quantity'], int) or item['quantity'] <= 0:
                return False, None, f"كمية غير صحيحة: {item['quantity']}"
            
            if item['condition'] not in ['valid', 'damaged']:
                return False, None, f"حالة العنصر غير صحيحة: {item['condition']}"
        
        return True, None, None
    
    @staticmethod
    def _get_item(item_type: str, item_id: int):
        """Get product or part by type and ID"""
        if item_type == 'product':
            return Product.query.get(item_id)
        elif item_type == 'part':
            return Part.query.get(item_id)
        return None
    
    @staticmethod
    def _update_item_stock(item, item_type: str, quantity_change: int, condition: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Update stock levels for an item"""
        try:
            if condition == 'valid':
                # For valid items, update total stock
                new_total_stock = item.current_stock + quantity_change
                if new_total_stock < 0:
                    return False, None, f"لا يمكن تقليل المخزون أقل من الصفر للعنصر {item_type} #{item.id}"
                item.current_stock = new_total_stock
                
            elif condition == 'damaged':
                if quantity_change > 0:
                    # Adding damaged items - increase both total and damaged
                    item.current_stock += quantity_change
                    item.current_stock_damaged += quantity_change
                else:
                    # Removing damaged items - decrease both total and damaged
                    if item.current_stock_damaged + quantity_change < 0:
                        return False, None, f"لا يمكن تقليل المخزون التالف أقل من الصفر للعنصر {item_type} #{item.id}"
                    item.current_stock += quantity_change
                    item.current_stock_damaged += quantity_change
            
            # Ensure damaged stock never exceeds total stock
            if item.current_stock_damaged > item.current_stock:
                return False, None, f"المخزون التالف لا يمكن أن يتجاوز المخزون الإجمالي للعنصر {item_type} #{item.id}"
            
            return True, None, None
            
        except Exception as e:
            return False, None, f"خطأ في تحديث المخزون: {str(e)}"
    
    @staticmethod
    def get_item_stock_summary(item_type: str, item_id: int) -> Dict[str, Any]:
        """Get current stock summary for an item"""
        item = StockService._get_item(item_type, item_id)
        if not item:
            return {'error': f'العنصر غير موجود: {item_type} #{item_id}'}
        
        return {
            'item_type': item_type,
            'item_id': item_id,
            'sku': item.sku if item_type == 'product' else item.part_sku,
            'total_stock': item.current_stock,
            'damaged_stock': item.current_stock_damaged,
            'valid_stock': item.get_valid_stock(),
            'is_low_stock': item.is_low_stock()
        }
    
    @staticmethod
    def get_stock_movements(filters=None, limit=100, page=1):
        """
        Get stock movements with filtering and pagination
        """
        try:
            query = StockMovement.query
            
            if filters:
                if 'item_type' in filters:
                    query = query.filter_by(item_type=filters['item_type'])
                if 'item_id' in filters:
                    query = query.filter_by(item_id=filters['item_id'])
                if 'movement_type' in filters:
                    query = query.filter_by(movement_type=filters['movement_type'])
                if 'order_id' in filters:
                    query = query.filter_by(order_id=filters['order_id'])
                if 'service_action_id' in filters:
                    query = query.filter_by(service_action_id=filters['service_action_id'])
            
            # Apply pagination
            offset = (page - 1) * limit
            movements = query.order_by(StockMovement.created_at.desc()).offset(offset).limit(limit).all()
            
            return True, {
                'movements': [movement.to_dict() for movement in movements],
                'total_count': query.count(),
                'page': page,
                'limit': limit
            }, None
            
        except Exception as e:
            return False, None, f"خطأ في جلب حركات المخزون: {str(e)}"
    
    @staticmethod
    def get_stock_summary(item_type=None, low_stock_only=False, limit=100):
        """
        Get current stock summary for products and parts
        """
        try:
            summary = {'products': [], 'parts': []}
            
            if not item_type or item_type == 'product':
                products = Product.query.limit(limit).all()
                for product in products:
                    valid_stock = product.get_valid_stock()
                    if low_stock_only and valid_stock >= 10:  # Arbitrary low stock threshold
                        continue
                    
                    summary['products'].append({
                        'id': product.id,
                        'sku': product.sku,
                        'name': product.name_ar,
                        'total_stock': product.current_stock,
                        'damaged_stock': product.current_stock_damaged,
                        'valid_stock': valid_stock,
                        'price': 0.0  # Product model doesn't have price field
                    })
            
            if not item_type or item_type == 'part':
                parts = Part.query.limit(limit).all()
                for part in parts:
                    valid_stock = part.get_valid_stock()
                    if low_stock_only and valid_stock >= 10:  # Arbitrary low stock threshold
                        continue
                    
                    summary['parts'].append({
                        'id': part.id,
                        'sku': part.part_sku,
                        'name': part.part_name,
                        'total_stock': part.current_stock,
                        'damaged_stock': part.current_stock_damaged,
                        'valid_stock': valid_stock,
                        'price': float(part.selling_price) if part.selling_price else 0.0
                    })
            
            return True, summary, None
            
        except Exception as e:
            return False, None, f"خطأ في جلب ملخص المخزون: {str(e)}"
    
    @staticmethod
    def get_item_stock_details(item_type, item_id):
        """
        Get detailed stock information for a specific item
        """
        try:
            item = StockService._get_item(item_type, item_id)
            if not item:
                return False, None, f"العنصر غير موجود: {item_type} #{item_id}"
            
            # Get recent stock movements for this item
            movements = StockMovement.query.filter_by(
                item_type=item_type, 
                item_id=item_id
            ).order_by(StockMovement.created_at.desc()).limit(20).all()
            
            details = {
                'item': {
                    'id': item.id,
                    'sku': item.sku if item_type == 'product' else item.part_sku,
                    'name': item.name_ar if item_type == 'product' else item.part_name,
                    'type': item_type,
                    'total_stock': item.current_stock,
                    'damaged_stock': item.current_stock_damaged,
                    'valid_stock': item.get_valid_stock(),
                    'price': 0.0 if item_type == 'product' else (float(item.selling_price) if item.selling_price else 0.0)
                },
                'recent_movements': [movement.to_dict() for movement in movements],
                'movement_count': len(movements)
            }
            
            return True, details, None
            
        except Exception as e:
            return False, None, f"خطأ في جلب تفاصيل المخزون: {str(e)}"
    
    @staticmethod
    def get_dashboard_overview():
        """
        Get stock dashboard overview with statistics
        """
        try:
            # Get total counts
            total_products = Product.query.count()
            total_parts = Part.query.count()
            
            # Get low stock items (assuming < 10 is low stock)
            low_stock_products = Product.query.filter(
                (Product.current_stock - Product.current_stock_damaged) < 10
            ).count()
            
            low_stock_parts = Part.query.filter(
                (Part.current_stock - Part.current_stock_damaged) < 10
            ).count()
            
            # Get recent movements
            recent_movements = StockMovement.query.order_by(
                StockMovement.created_at.desc()
            ).limit(10).all()
            
            # Calculate total stock value (simplified)
            products = Product.query.all()
            parts = Part.query.all()
            
            total_value = 0
            for product in products:
                # Product model doesn't have price field, skip for now
                pass
            
            for part in parts:
                if part.selling_price:
                    total_value += float(part.selling_price) * part.get_valid_stock()
            
            dashboard = {
                'overview': {
                    'total_products': total_products,
                    'total_parts': total_parts,
                    'low_stock_products': low_stock_products,
                    'low_stock_parts': low_stock_parts,
                    'total_stock_value': round(total_value, 2)
                },
                'recent_movements': [movement.to_dict() for movement in recent_movements],
                'alerts': {
                    'low_stock_items': low_stock_products + low_stock_parts,
                    'needs_attention': low_stock_products + low_stock_parts > 0
                }
            }
            
            return True, dashboard, None
            
        except Exception as e:
            return False, None, f"خطأ في جلب لوحة معلومات المخزون: {str(e)}"
