"""Unified Service layer connecting Service Actions with the Maintenance cycle.

Implements creation and lifecycle of service actions and integrates them with
the maintenance orders when scanned on the maintenance hub.
"""

from typing import Dict, Optional, Tuple, List

from db import db
from db.auto_init import (
    Order,
    MaintenanceHistory,
    OrderStatus,
    MaintenanceAction,
    ServiceAction,
    ServiceActionHistory,
    ServiceActionStatus,
    ServiceActionType,
    ServiceActionItem,
    Product,
    Part,
)
from utils.timezone import get_egypt_now
from services.stock_service import StockService


class UnifiedService:
    """Service that manages ServiceAction lifecycle and maintenance integration."""

    # -----------------------------
    # Service Action Management
    # -----------------------------
    @staticmethod
    def create_service_action(
        action_type: ServiceActionType,
        customer_data: Dict,
        original_tracking: str,
        *,
        product_id: Optional[int] = None,
        part_id: Optional[int] = None,
        items_to_send: Optional[List[Dict]] = None,
        refund_amount: Optional[float] = None,
        notes: str = "",
        action_data: Optional[Dict] = None,
    ) -> Tuple[bool, Optional[ServiceAction], Optional[str]]:
        try:
            if not original_tracking:
                return False, None, "رقم التتبع الأصلي مطلوب"

            # Validate inputs based on action type
            if action_type in [ServiceActionType.PART_REPLACE, ServiceActionType.FULL_REPLACE]:
                if not items_to_send:
                    return False, None, "عناصر الإرسال مطلوبة لعمليات الاستبدال"
                
                # Validate items exist
                for item in items_to_send:
                    if item['item_type'] == 'product':
                        if not Product.query.get(item['item_id']):
                            return False, None, f"المنتج غير موجود: {item['item_id']}"
                    elif item['item_type'] == 'part':
                        if not Part.query.get(item['item_id']):
                            return False, None, f"القطعة غير موجودة: {item['item_id']}"
                    else:
                        return False, None, f"نوع عنصر غير صحيح: {item['item_type']}"
            
            elif action_type == ServiceActionType.RETURN_FROM_CUSTOMER:
                if not refund_amount or refund_amount <= 0:
                    return False, None, "مبلغ الاسترداد مطلوب ويجب أن يكون أكبر من صفر للمرتجعات"

            service_action = ServiceAction(
                action_type=action_type,
                status=ServiceActionStatus.CREATED,
                customer_bosta_id=customer_data.get('id'),
                customer_phone=customer_data.get('phone') or customer_data.get('primary_phone'),
                customer_first_name=customer_data.get('first_name'),
                customer_last_name=customer_data.get('last_name'),
                customer_full_name=customer_data.get('full_name') or customer_data.get('name'),
                customer_second_phone=customer_data.get('second_phone'),
                original_bosta_id=customer_data.get('bosta_id'),
                original_tracking_number=original_tracking.strip(),
                product_id=product_id,
                part_id=part_id,
                refund_amount=refund_amount,
                notes=notes.strip() if notes else None,
                action_data=action_data or {},
            ).save()

            # Create ServiceActionItem records for replacement actions
            if action_type in [ServiceActionType.PART_REPLACE, ServiceActionType.FULL_REPLACE] and items_to_send:
                for item in items_to_send:
                    service_item = ServiceActionItem(
                        service_action_id=service_action.id,
                        item_type=item['item_type'],
                        item_id=item['item_id'],
                        quantity_to_send=item['quantity']
                    )
                    db.session.add(service_item)
                
                db.session.flush()  # Get IDs

            return True, service_action, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في إنشاء إجراء الخدمة: {str(e)}"

    @staticmethod
    def confirm_service_action(
        action_id: int,
        new_tracking_number: str,
        notes: str = "",
    ) -> Tuple[bool, Optional[ServiceAction], Optional[str]]:
        try:
            service_action: ServiceAction = ServiceAction.get_by_id(action_id)
            if not service_action:
                return False, None, "إجراء الخدمة غير موجود"

            if not new_tracking_number or len(new_tracking_number.strip()) < 3:
                return False, None, "رقم التتبع الجديد غير صحيح"

            service_action.status = ServiceActionStatus.CONFIRMED
            service_action.new_tracking_number = new_tracking_number.strip()
            service_action.new_tracking_created_at = get_egypt_now()
            if notes:
                service_action.notes = (service_action.notes or "") + f"\n{notes.strip()}"
            service_action.save()

            # History entry
            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='status_change',
                from_status=None,
                to_status=ServiceActionStatus.CONFIRMED,
                notes=notes.strip() if notes else '',
                action_data={'new_tracking_number': service_action.new_tracking_number},
                user_name='خدمة العملاء',
            )
            history.save()

            return True, service_action, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في تأكيد إجراء الخدمة: {str(e)}"

    @staticmethod
    def move_to_pending_receive(action_id: int, notes: str = "") -> Tuple[bool, Optional[ServiceAction], Optional[str]]:
        try:
            service_action: ServiceAction = ServiceAction.get_by_id(action_id)
            if not service_action:
                return False, None, "إجراء الخدمة غير موجود"

            service_action.status = ServiceActionStatus.PENDING_RECEIVE
            service_action.pending_receive_at = get_egypt_now()
            if notes:
                service_action.notes = (service_action.notes or "") + f"\n{notes.strip()}"
            service_action.save()

            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='status_change',
                from_status=ServiceActionStatus.CONFIRMED,
                to_status=ServiceActionStatus.PENDING_RECEIVE,
                notes=notes.strip() if notes else '',
                action_data={},
                user_name='خدمة العملاء',
            )
            history.save()

            return True, service_action, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في تحديث حالة إجراء الخدمة: {str(e)}"

    # --------------------------------------
    # Maintenance Cycle Integration (CORE)
    # --------------------------------------
    @staticmethod
    def integrate_with_maintenance_cycle(
        service_action_tracking: str,
        user_name: str = 'فني الصيانة'
    ) -> Tuple[bool, Optional[Order], Optional[str]]:
        try:
            if not service_action_tracking:
                return False, None, "رقم تتبع إجراء الخدمة مطلوب"

            sa: ServiceAction = ServiceAction.query.filter_by(new_tracking_number=service_action_tracking).first()
            if not sa:
                return False, None, "لا يوجد إجراء خدمة مطابق لهذا الرقم"

            if sa.status != ServiceActionStatus.PENDING_RECEIVE:
                return False, None, "إجراء الخدمة ليس في حالة جاهز للاستلام"

            # Create a maintenance Order linked to this service action
            now = get_egypt_now()
            order = Order(
                tracking_number=service_action_tracking,
                status=OrderStatus.RECEIVED,
                is_service_action_order=True,
                service_action_id=sa.id,
                service_action_type=sa.action_type,
                customer_name=sa.customer_full_name,
                customer_phone=sa.customer_phone,
                customer_second_phone=sa.customer_second_phone,
                scanned_at=now,
                received_at=now,
            ).save()

            # Add maintenance history entry (use RECEIVED to avoid adding new enum members)
            history = MaintenanceHistory(
                order_id=order.id,
                action=MaintenanceAction.RECEIVED,
                notes='تم دمج إجراء الخدمة مع دورة الصيانة',
                user_name=user_name,
                action_data={'service_action_id': sa.id, 'new_tracking_number': sa.new_tracking_number},
                timestamp=now,
            )
            history.save()

            # Update service action to integrated
            sa.is_integrated_with_maintenance = True
            sa.integrated_at = now
            sa.maintenance_order_id = order.id
            sa.save()

            return True, order, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في دمج إجراء الخدمة: {str(e)}"

    # -----------------------------
    # Queries and helpers
    # -----------------------------
    @staticmethod
    def get_pending_receive_actions(limit: int = 50) -> List[Dict]:
        try:
            actions = ServiceAction.query.filter_by(status=ServiceActionStatus.PENDING_RECEIVE).order_by(ServiceAction.updated_at.desc()).limit(limit).all()
            return [a.to_dict() for a in actions]
        except Exception:
            return []

    @staticmethod
    def get_service_action_by_tracking(tracking_number: str) -> Optional[ServiceAction]:
        if not tracking_number:
            return None
        sa = ServiceAction.query.filter_by(new_tracking_number=tracking_number).first()
        if sa:
            return sa
        return ServiceAction.query.filter_by(original_tracking_number=tracking_number).first()

    @staticmethod
    def get_maintenance_order_for_service_action(service_action_id: int) -> Optional[Order]:
        sa = ServiceAction.get_by_id(service_action_id)
        if not sa or not sa.maintenance_order_id:
            return None
        return Order.get_by_id(sa.maintenance_order_id)

    # -----------------------------
    # Finalization helpers (manual)
    # -----------------------------
    @staticmethod
    def complete_service_action(action_id: int, notes: str = "") -> Tuple[bool, Optional[ServiceAction], Optional[str]]:
        try:
            sa = ServiceAction.get_by_id(action_id)
            if not sa:
                return False, None, "إجراء الخدمة غير موجود"
            # Record in history; keep status as-is (final state is tracked in history/action_data)
            history = ServiceActionHistory(
                service_action_id=sa.id,
                action='complete',
                from_status=sa.status,
                to_status=sa.status,
                notes=notes.strip() if notes else '',
                action_data={'final_status': 'completed'},
                user_name='نظام'
            )
            history.save()
            # Update action_data flag
            action_data = sa.action_data or {}
            action_data['final_status'] = 'completed'
            sa.action_data = action_data
            sa.save()
            return True, sa, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في إكمال إجراء الخدمة: {str(e)}"

    @staticmethod
    def fail_service_action(action_id: int, notes: str = "") -> Tuple[bool, Optional[ServiceAction], Optional[str]]:
        try:
            sa = ServiceAction.get_by_id(action_id)
            if not sa:
                return False, None, "إجراء الخدمة غير موجود"
            history = ServiceActionHistory(
                service_action_id=sa.id,
                action='fail',
                from_status=sa.status,
                to_status=sa.status,
                notes=notes.strip() if notes else '',
                action_data={'final_status': 'failed'},
                user_name='نظام'
            )
            history.save()
            action_data = sa.action_data or {}
            action_data['final_status'] = 'failed'
            sa.action_data = action_data
            sa.save()
            return True, sa, None
        except Exception as e:
            db.session.rollback()
            return False, None, f"خطأ في فشل إجراء الخدمة: {str(e)}"

    # -----------------------------
    # Enhanced Workflow Management
    # -----------------------------
    @staticmethod
    def get_service_actions_by_status(status: ServiceActionStatus, limit: int = 100) -> List[Dict]:
        """Get service actions by status with enhanced data"""
        try:
            actions = ServiceAction.query.filter_by(status=status).order_by(ServiceAction.updated_at.desc()).limit(limit).all()
            return [UnifiedService._enhance_service_action_data(a) for a in actions]
        except Exception:
            return []

    @staticmethod
    def get_service_actions_by_customer_phone(phone: str, limit: int = 50) -> List[Dict]:
        """Get all service actions for a customer phone number"""
        try:
            actions = ServiceAction.query.filter_by(customer_phone=phone).order_by(ServiceAction.updated_at.desc()).limit(limit).all()
            return [UnifiedService._enhance_service_action_data(a) for a in actions]
        except Exception:
            return []

    @staticmethod
    def get_service_action_with_history(action_id: int) -> Optional[Dict]:
        """Get service action with complete history"""
        try:
            sa = ServiceAction.get_by_id(action_id)
            if not sa:
                return None

            history = ServiceActionHistory.query.filter_by(service_action_id=action_id).order_by(ServiceActionHistory.created_at.asc()).all()

            return {
                'service_action': UnifiedService._enhance_service_action_data(sa),
                'history': [h.to_dict() for h in history]
            }
        except Exception:
            return None

    @staticmethod
    def _enhance_service_action_data(sa: ServiceAction) -> Dict:
        """Enhance service action data with related information"""
        try:
            data = sa.to_dict()

            # Add product information if available
            if sa.product:
                data['product'] = {
                    'id': sa.product.id,
                    'sku': sa.product.sku,
                    'name_ar': sa.product.name_ar,
                    'category': sa.product.category.value if sa.product.category else None
                }

            # Add part information if available
            if sa.part:
                data['part'] = {
                    'id': sa.part.id,
                    'part_sku': sa.part.part_sku,
                    'part_name': sa.part.part_name,
                    'part_type': sa.part.part_type.value if sa.part.part_type else None
                }

            # Add maintenance order information if integrated
            if sa.maintenance_order:
                data['maintenance_order'] = {
                    'id': sa.maintenance_order.id,
                    'tracking_number': sa.maintenance_order.tracking_number,
                    'status': sa.maintenance_order.status.value if sa.maintenance_order.status else None,
                    'customer_name': sa.maintenance_order.customer_name,
                    'customer_phone': sa.maintenance_order.customer_phone
                }

            return data
        except Exception:
            return sa.to_dict()

    @staticmethod
    def get_workflow_statistics() -> Dict:
        """Get comprehensive workflow statistics"""
        try:
            total_actions = ServiceAction.query.count()
            status_counts = {}
            for status in ServiceActionStatus:
                count = ServiceAction.query.filter_by(status=status).count()
                status_counts[status.value] = count

            integrated_count = ServiceAction.query.filter_by(is_integrated_with_maintenance=True).count()
            pending_receive_count = ServiceAction.query.filter_by(status=ServiceActionStatus.PENDING_RECEIVE).count()

            return {
                'total_service_actions': total_actions,
                'status_breakdown': status_counts,
                'integrated_with_maintenance': integrated_count,
                'pending_receive_count': pending_receive_count,
                'pending_integration_count': pending_receive_count
            }
        except Exception:
            return {
                'total_service_actions': 0,
                'status_breakdown': {},
                'integrated_with_maintenance': 0,
                'pending_receive_count': 0,
                'pending_integration_count': 0
            }

    @staticmethod
    def validate_service_action_workflow(action_id: int) -> Tuple[bool, Optional[str]]:
        """Validate that a service action workflow is complete and consistent"""
        try:
            sa = ServiceAction.get_by_id(action_id)
            if not sa:
                return False, "إجراء الخدمة غير موجود"

            issues = []

            # Check required fields based on action type
            if sa.action_type == ServiceActionType.PART_REPLACE:
                if not sa.product_id:
                    issues.append("إجراء استبدال قطعة يتطلب اختيار منتج")
                if not sa.part_id:
                    issues.append("إجراء استبدال قطعة يتطلب اختيار قطعة")

            elif sa.action_type == ServiceActionType.FULL_REPLACE:
                if not sa.product_id:
                    issues.append("إجراء استبدال كامل يتطلب اختيار منتج")

            elif sa.action_type == ServiceActionType.RETURN_FROM_CUSTOMER:
                if sa.refund_amount is None or sa.refund_amount <= 0:
                    issues.append("إجراء الإرجاع يتطلب تحديد مبلغ الاسترداد")

            # Check workflow consistency
            if sa.status == ServiceActionStatus.CONFIRMED and not sa.new_tracking_number:
                issues.append("الإجراء مؤكد ولكن لا يوجد رقم تتبع جديد")

            if sa.status == ServiceActionStatus.PENDING_RECEIVE and not sa.new_tracking_number:
                issues.append("الإجراء في انتظار الاستلام ولكن لا يوجد رقم تتبع جديد")

            if sa.is_integrated_with_maintenance and not sa.maintenance_order_id:
                issues.append("الإجراء مُدمج مع الصيانة ولكن لا يوجد طلب صيانة مرتبط")

            return len(issues) == 0, "; ".join(issues) if issues else None

        except Exception as e:
            return False, f"خطأ في التحقق من صحة سير العمل: {str(e)}"

    # -----------------------------
    # Enhanced Service Action Workflow (Task 3)
    # -----------------------------
    
    @staticmethod
    def confirm_and_send(
        service_action_id: int,
        new_tracking_number: str,
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Confirm replacement service action and send items to customer
        (Only for part_replace and full_replace)
        """
        try:
            # Get service action
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate action type
            if service_action.action_type not in [ServiceActionType.PART_REPLACE, ServiceActionType.FULL_REPLACE]:
                return False, None, "هذه العملية متاحة فقط لعمليات الاستبدال"
            
            # Validate tracking number
            if not new_tracking_number or len(new_tracking_number.strip()) < 3:
                return False, None, "رقم التتبع الجديد غير صحيح"
            
            # Get items to send
            service_items = ServiceActionItem.query.filter_by(service_action_id=service_action_id).all()
            if not service_items:
                return False, None, "لا توجد عناصر للإرسال في هذا الإجراء"
            
            # Prepare items for StockService
            items_to_send = []
            for item in service_items:
                items_to_send.append({
                    'item_type': item.item_type,
                    'item_id': item.item_id,
                    'quantity': item.quantity_to_send
                })
            
            # Call StockService to reduce stock and create movement records
            stock_success, stock_data, stock_error = StockService.send_items(
                service_action_id=service_action_id,
                items_to_send=items_to_send,
                user_name=user_name
            )
            
            if not stock_success:
                return False, None, f"خطأ في تحديث المخزون: {stock_error}"
            
            # Update service action
            service_action.status = ServiceActionStatus.CONFIRMED
            service_action.new_tracking_number = new_tracking_number.strip()
            service_action.new_tracking_created_at = get_egypt_now()
            db.session.add(service_action)
            
            # Create history record
            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='confirm_and_send',
                from_status=ServiceActionStatus.CREATED,
                to_status=ServiceActionStatus.CONFIRMED,
                notes=f'تم إرسال العناصر للعميل - رقم التتبع: {new_tracking_number}',
                action_data={
                    'new_tracking_number': new_tracking_number,
                    'items_sent': stock_data.get('items_sent', []),
                    'total_items': stock_data.get('total_items', 0)
                },
                user_name=user_name,
            )
            db.session.add(history)
            
            db.session.flush()
            
            return True, {
                'service_action_id': service_action_id,
                'new_tracking_number': new_tracking_number,
                'stock_data': stock_data,
                'status': ServiceActionStatus.CONFIRMED.value
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في تأكيد وإرسال الإجراء: {str(e)}"
            print(f"UnifiedService.confirm_and_send error: {e}")
            return False, None, error_msg

    @staticmethod
    def confirm_return(
        service_action_id: int,
        new_tracking_number: str,
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Confirm return service action - customer will ship items back
        (Only for return_from_customer)
        """
        try:
            # Get service action
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate action type
            if service_action.action_type != ServiceActionType.RETURN_FROM_CUSTOMER:
                return False, None, "هذه العملية متاحة فقط لعمليات الإرجاع من العميل"
            
            # Validate tracking number
            if not new_tracking_number or len(new_tracking_number.strip()) < 3:
                return False, None, "رقم التتبع الجديد غير صحيح"
            
            # Update service action
            service_action.status = ServiceActionStatus.CONFIRMED
            service_action.new_tracking_number = new_tracking_number.strip()
            service_action.new_tracking_created_at = get_egypt_now()
            db.session.add(service_action)
            
            # Create history record
            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='confirm_return',
                from_status=ServiceActionStatus.CREATED,
                to_status=ServiceActionStatus.CONFIRMED,
                notes=f'تم تأكيد الإرجاع - العميل سيرسل العناصر برقم التتبع: {new_tracking_number}',
                action_data={
                    'new_tracking_number': new_tracking_number,
                    'refund_amount': float(service_action.refund_amount) if service_action.refund_amount else 0
                },
                user_name=user_name,
            )
            db.session.add(history)
            
            db.session.flush()
            
            return True, {
                'service_action_id': service_action_id,
                'new_tracking_number': new_tracking_number,
                'refund_amount': float(service_action.refund_amount) if service_action.refund_amount else 0,
                'status': ServiceActionStatus.CONFIRMED.value
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في تأكيد الإرجاع: {str(e)}"
            print(f"UnifiedService.confirm_return error: {e}")
            return False, None, error_msg

    @staticmethod
    def receive_replacement_items(
        service_action_id: int,
        items_received: List[Dict],
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        When scanning damaged items received back from replacement
        items_received = [
            {'item_type': 'part', 'item_id': 5, 'quantity': 1, 'condition': 'damaged'},
            {'item_type': 'product', 'item_id': 1, 'quantity': 1, 'condition': 'valid'}
        ]
        """
        try:
            # Get service action
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate action type
            if service_action.action_type not in [ServiceActionType.PART_REPLACE, ServiceActionType.FULL_REPLACE]:
                return False, None, "هذه العملية متاحة فقط لعمليات الاستبدال"
            
            # Call StockService to add stock back
            stock_success, stock_data, stock_error = StockService.receive_items(
                service_action_id=service_action_id,
                items_received=items_received,
                user_name=user_name
            )
            
            if not stock_success:
                return False, None, f"خطأ في تحديث المخزون: {stock_error}"
            
            # Update service action status
            service_action.status = ServiceActionStatus.PENDING_RECEIVE
            db.session.add(service_action)
            
            # Create history record
            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='receive_replacement',
                from_status=ServiceActionStatus.CONFIRMED,
                to_status=ServiceActionStatus.PENDING_RECEIVE,
                notes=f'تم استلام العناصر المستبدلة من العميل',
                action_data={
                    'items_received': stock_data.get('items_received', []),
                    'total_items': stock_data.get('total_items', 0)
                },
                user_name=user_name,
            )
            db.session.add(history)
            
            db.session.flush()
            
            return True, {
                'service_action_id': service_action_id,
                'stock_data': stock_data,
                'status': ServiceActionStatus.PENDING_RECEIVE.value
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في استلام العناصر المستبدلة: {str(e)}"
            print(f"UnifiedService.receive_replacement_items error: {e}")
            return False, None, error_msg

    @staticmethod
    def receive_return_items(
        service_action_id: int,
        items_received: List[Dict],
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        When scanning items received back from customer return
        items_received = [
            {'item_type': 'product', 'item_id': 1, 'quantity': 1, 'condition': 'valid'},
            {'item_type': 'part', 'item_id': 3, 'quantity': 2, 'condition': 'damaged'}
        ]
        """
        try:
            # Get service action
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate action type
            if service_action.action_type != ServiceActionType.RETURN_FROM_CUSTOMER:
                return False, None, "هذه العملية متاحة فقط لعمليات الإرجاع من العميل"
            
            # Call StockService to add stock back
            stock_success, stock_data, stock_error = StockService.receive_returns(
                service_action_id=service_action_id,
                items_returned=items_received,
                user_name=user_name
            )
            
            if not stock_success:
                return False, None, f"خطأ في تحديث المخزون: {stock_error}"
            
            # Update service action (do NOT complete yet - need to process refund first)
            service_action.status = ServiceActionStatus.PENDING_RECEIVE
            db.session.add(service_action)
            
            # Create history record
            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='receive_return',
                from_status=ServiceActionStatus.CONFIRMED,
                to_status=ServiceActionStatus.PENDING_RECEIVE,
                notes=f'تم استلام العناصر المرتجعة من العميل - في انتظار معالجة الاسترداد',
                action_data={
                    'items_returned': stock_data.get('items_returned', []),
                    'total_items': stock_data.get('total_items', 0),
                    'refund_amount': float(service_action.refund_amount) if service_action.refund_amount else 0
                },
                user_name=user_name,
            )
            db.session.add(history)
            
            db.session.flush()
            
            return True, {
                'service_action_id': service_action_id,
                'stock_data': stock_data,
                'refund_amount': float(service_action.refund_amount) if service_action.refund_amount else 0,
                'status': ServiceActionStatus.PENDING_RECEIVE.value,
                'next_step': 'process_refund_required'
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في استلام المرتجعات: {str(e)}"
            print(f"UnifiedService.receive_return_items error: {e}")
            return False, None, error_msg

    @staticmethod
    def process_refund_and_complete(
        service_action_id: int,
        user_name: str = "فني الصيانة"
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Process refund for customer return and complete service action
        """
        try:
            # Get service action
            service_action = ServiceAction.query.get(service_action_id)
            if not service_action:
                return False, None, f"خدمة العمليات غير موجودة: #{service_action_id}"
            
            # Validate action type
            if service_action.action_type != ServiceActionType.RETURN_FROM_CUSTOMER:
                return False, None, "هذه العملية متاحة فقط لعمليات الإرجاع من العميل"
            
            # Validate refund amount
            if not service_action.refund_amount or service_action.refund_amount <= 0:
                return False, None, "مبلغ الاسترداد غير محدد أو غير صحيح"
            
            # Mark refund as processed
            service_action.refund_processed = True
            service_action.refund_processed_at = get_egypt_now()
            
            # Update action_data to mark as completed
            action_data = service_action.action_data or {}
            action_data['final_status'] = 'completed'
            action_data['refund_processed'] = True
            service_action.action_data = action_data
            
            db.session.add(service_action)
            
            # Create history record
            history = ServiceActionHistory(
                service_action_id=service_action.id,
                action='process_refund_complete',
                from_status=ServiceActionStatus.PENDING_RECEIVE,
                to_status=ServiceActionStatus.PENDING_RECEIVE,  # Status remains, but marked complete in action_data
                notes=f'تم معالجة الاسترداد وإكمال العملية - المبلغ: {service_action.refund_amount}',
                action_data={
                    'final_status': 'completed',
                    'refund_amount': float(service_action.refund_amount),
                    'refund_processed': True,
                    'refund_processed_at': service_action.refund_processed_at.isoformat()
                },
                user_name=user_name,
            )
            db.session.add(history)
            
            db.session.flush()
            
            return True, {
                'service_action_id': service_action_id,
                'refund_amount': float(service_action.refund_amount),
                'refund_processed': True,
                'refund_processed_at': service_action.refund_processed_at.isoformat(),
                'final_status': 'completed'
            }, None
            
        except Exception as e:
            error_msg = f"خطأ في معالجة الاسترداد: {str(e)}"
            print(f"UnifiedService.process_refund_and_complete error: {e}")
            return False, None, error_msg


