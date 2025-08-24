#!/usr/bin/env python3
"""
Comprehensive tests for Service Action Workflow in HVAR Hub
Tests complete workflow from creation to completion for all 3 types

Usage:
  python temp-tests/backend/test_service_action_workflow.py
"""

import sys
import os
import unittest
from decimal import Decimal
from datetime import datetime

# Add the back directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'back'))

from app import create_app
from db import db
from db.auto_init import (
    ServiceAction, ServiceActionItem, ServiceActionHistory, StockMovement, 
    Product, Part, Order, OrderStatus,
    ServiceActionType, ServiceActionStatus, StockMovementType, ItemCondition,
    ProductCategory, PartType
)
from services.unified_service import UnifiedService
from services.order_service import OrderService
from services.stock_service import StockService
from utils.timezone import get_egypt_now


class TestServiceActionWorkflow(unittest.TestCase):
    """Test cases for complete Service Action workflows"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        cls.app = create_app('testing')  # Use testing configuration
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        
        # Create tables
        db.create_all()
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        cls.app_context.pop()
    
    def setUp(self):
        """Set up each test"""
        db.session.begin()
        
        # Create test products and parts with stock
        import time
        timestamp = str(int(time.time() * 1000))  # Unique timestamp
        self.test_product = Product(
            sku=f'TEST-WORKFLOW-PRODUCT-{timestamp}',
            name_ar='منتج اختبار سير العمل',
            category=ProductCategory.HAND_BLENDER,
            current_stock=10,
            current_stock_damaged=1  # 9 valid, 1 damaged
        )
        db.session.add(self.test_product)
        db.session.flush()
        
        self.test_part = Part(
            part_sku=f'TEST-WORKFLOW-PART-{timestamp}',
            part_name='قطعة اختبار سير العمل',
            part_type=PartType.MOTOR,
            product_id=self.test_product.id,
            current_stock=20,
            current_stock_damaged=2  # 18 valid, 2 damaged
        )
        db.session.add(self.test_part)
        db.session.flush()
        
        # Create test maintenance order
        self.test_order = Order(
            tracking_number=f'TEST-WORKFLOW-ORDER-{timestamp}',
            customer_phone='+201155125743',
            status=OrderStatus.IN_MAINTENANCE
        )
        db.session.add(self.test_order)
        db.session.flush()
        
        # Customer data for service actions
        self.customer_data = {
            'phone': '+201155125743',
            'full_name': 'عميل اختبار سير العمل',
            'first_name': 'عميل',
            'last_name': 'الاختبار'
        }
    
    def tearDown(self):
        """Clean up each test"""
        db.session.rollback()


class TestPartReplaceWorkflow(TestServiceActionWorkflow):
    """Test PART_REPLACE workflow from start to finish"""
    
    def test_complete_part_replace_workflow(self):
        """Test complete part replacement workflow"""
        
        # Step 1: Create part replace service action
        items_to_send = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 2}
        ]
        
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.PART_REPLACE,
            customer_data=self.customer_data,
            original_tracking='ORIGINAL-12345',
            items_to_send=items_to_send,
            notes='استبدال قطع تالفة'
        )
        
        self.assertTrue(success)
        self.assertIsNotNone(service_action)
        self.assertEqual(service_action.action_type, ServiceActionType.PART_REPLACE)
        self.assertEqual(service_action.status, ServiceActionStatus.CREATED)
        
        # Verify ServiceActionItem was created
        service_items = ServiceActionItem.query.filter_by(service_action_id=service_action.id).all()
        self.assertEqual(len(service_items), 1)
        self.assertEqual(service_items[0].quantity_to_send, 2)
        
        # Step 2: Confirm and send items (reduce stock)
        success, data, error = UnifiedService.confirm_and_send(
            service_action_id=service_action.id,
            new_tracking_number='NEW-TRACK-123',
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertEqual(data['new_tracking_number'], 'NEW-TRACK-123')
        self.assertEqual(data['status'], ServiceActionStatus.CONFIRMED.value)
        
        # Verify stock was reduced
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, 18)  # 20 - 2 = 18
        self.assertEqual(self.test_part.get_valid_stock(), 16)  # 18 - 2 = 16
        
        # Verify stock movement was created
        movements = StockMovement.query.filter_by(
            service_action_id=service_action.id,
            movement_type=StockMovementType.SEND
        ).all()
        self.assertEqual(len(movements), 1)
        self.assertEqual(movements[0].quantity_change, -2)
        
        # Step 3: Receive damaged items back from customer
        items_received = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 2, 'condition': 'damaged'}
        ]
        
        success, data, error = UnifiedService.receive_replacement_items(
            service_action_id=service_action.id,
            items_received=items_received,
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertEqual(data['status'], ServiceActionStatus.PENDING_RECEIVE.value)
        
        # Verify stock was increased (damaged)
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, 20)  # 18 + 2 = 20
        self.assertEqual(self.test_part.current_stock_damaged, 4)  # 2 + 2 = 4
        self.assertEqual(self.test_part.get_valid_stock(), 16)  # Still 16 valid
        
        # Verify receive movement was created
        receive_movements = StockMovement.query.filter_by(
            service_action_id=service_action.id,
            movement_type=StockMovementType.RECEIVE
        ).all()
        self.assertEqual(len(receive_movements), 1)
        self.assertEqual(receive_movements[0].quantity_change, 2)
        self.assertEqual(receive_movements[0].condition, ItemCondition.DAMAGED)
        
        # Verify ServiceActionItem was updated
        db.session.refresh(service_items[0])
        self.assertEqual(service_items[0].quantity_received, 2)
        self.assertEqual(service_items[0].condition_received, ItemCondition.DAMAGED)
        self.assertIsNotNone(service_items[0].received_at)
        
        # Check workflow history
        history = ServiceActionHistory.query.filter_by(service_action_id=service_action.id).all()
        self.assertEqual(len(history), 2)  # confirm_and_send + receive_replacement
        
        actions = [h.action for h in history]
        self.assertIn('confirm_and_send', actions)
        self.assertIn('receive_replacement', actions)


class TestFullReplaceWorkflow(TestServiceActionWorkflow):
    """Test FULL_REPLACE workflow from start to finish"""
    
    def test_complete_full_replace_workflow(self):
        """Test complete full product replacement workflow"""
        
        # Step 1: Create full replace service action
        items_to_send = [
            {'item_type': 'product', 'item_id': self.test_product.id, 'quantity': 1}
        ]
        
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.FULL_REPLACE,
            customer_data=self.customer_data,
            original_tracking='ORIGINAL-FULL-123',
            items_to_send=items_to_send,
            notes='استبدال منتج كامل'
        )
        
        self.assertTrue(success)
        self.assertEqual(service_action.action_type, ServiceActionType.FULL_REPLACE)
        
        # Step 2: Confirm and send
        success, data, error = UnifiedService.confirm_and_send(
            service_action_id=service_action.id,
            new_tracking_number='FULL-TRACK-456',
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        
        # Verify product stock reduced
        db.session.refresh(self.test_product)
        self.assertEqual(self.test_product.current_stock, 9)  # 10 - 1 = 9
        self.assertEqual(self.test_product.get_valid_stock(), 8)  # 9 - 1 = 8
        
        # Step 3: Receive valid product back
        items_received = [
            {'item_type': 'product', 'item_id': self.test_product.id, 'quantity': 1, 'condition': 'valid'}
        ]
        
        success, data, error = UnifiedService.receive_replacement_items(
            service_action_id=service_action.id,
            items_received=items_received,
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        
        # Verify product stock increased (valid)
        db.session.refresh(self.test_product)
        self.assertEqual(self.test_product.current_stock, 10)  # 9 + 1 = 10
        self.assertEqual(self.test_product.current_stock_damaged, 1)  # Still 1 damaged
        self.assertEqual(self.test_product.get_valid_stock(), 9)  # 8 + 1 = 9


class TestReturnWorkflow(TestServiceActionWorkflow):
    """Test RETURN_FROM_CUSTOMER workflow from start to finish"""
    
    def test_complete_return_workflow(self):
        """Test complete customer return workflow with refund"""
        
        # Step 1: Create return service action
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            customer_data=self.customer_data,
            original_tracking='RETURN-ORIGINAL-789',
            refund_amount=Decimal('150.00'),
            notes='طلب إرجاع من العميل'
        )
        
        self.assertTrue(success)
        self.assertEqual(service_action.action_type, ServiceActionType.RETURN_FROM_CUSTOMER)
        self.assertEqual(service_action.refund_amount, Decimal('150.00'))
        
        # Step 2: Confirm return (customer will ship back)
        success, data, error = UnifiedService.confirm_return(
            service_action_id=service_action.id,
            new_tracking_number='RETURN-TRACK-789',
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertEqual(data['new_tracking_number'], 'RETURN-TRACK-789')
        self.assertEqual(data['refund_amount'], 150.0)
        
        # Step 3: Receive return items from customer
        items_returned = [
            {'item_type': 'product', 'item_id': self.test_product.id, 'quantity': 1, 'condition': 'valid'}
        ]
        
        success, data, error = UnifiedService.receive_return_items(
            service_action_id=service_action.id,
            items_received=items_returned,
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertEqual(data['next_step'], 'process_refund_required')
        
        # Verify stock increased
        db.session.refresh(self.test_product)
        self.assertEqual(self.test_product.current_stock, 11)  # 10 + 1 = 11
        self.assertEqual(self.test_product.get_valid_stock(), 10)  # 9 + 1 = 10
        
        # Step 4: Process refund and complete
        success, data, error = UnifiedService.process_refund_and_complete(
            service_action_id=service_action.id,
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertEqual(data['refund_amount'], 150.0)
        self.assertTrue(data['refund_processed'])
        self.assertEqual(data['final_status'], 'completed')
        
        # Verify service action is marked as refund processed
        db.session.refresh(service_action)
        self.assertTrue(service_action.refund_processed)
        self.assertIsNotNone(service_action.refund_processed_at)
        self.assertEqual(service_action.action_data['final_status'], 'completed')
        
        # Check complete workflow history
        history = ServiceActionHistory.query.filter_by(service_action_id=service_action.id).all()
        self.assertEqual(len(history), 3)  # confirm_return + receive_return + process_refund_complete
        
        actions = [h.action for h in history]
        self.assertIn('confirm_return', actions)
        self.assertIn('receive_return', actions)
        self.assertIn('process_refund_complete', actions)


class TestMaintenanceStockAdjustment(TestServiceActionWorkflow):
    """Test maintenance stock adjustment workflow"""
    
    def test_maintenance_stock_adjustment(self):
        """Test stock adjustments during maintenance"""
        
        initial_part_stock = self.test_part.current_stock
        initial_part_damaged = self.test_part.current_stock_damaged
        
        # Create stock adjustments for maintenance
        adjustments = [
            {
                'item_type': 'part',
                'item_id': self.test_part.id,
                'quantity': -3,  # Use 3 parts
                'condition': 'valid',
                'notes': 'استخدام في الإصلاح'
            },
            {
                'item_type': 'part',
                'item_id': self.test_part.id,
                'quantity': 1,  # Add 1 damaged part removed
                'condition': 'damaged',
                'notes': 'إزالة قطعة تالفة'
            }
        ]
        
        success, data, error = OrderService.adjust_stock_for_maintenance(
            order_id=self.test_order.id,
            adjustments=adjustments,
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertEqual(data['total_adjustments'], 2)
        self.assertEqual(len(data['adjustments_processed']), 2)
        
        # Verify stock changes
        db.session.refresh(self.test_part)
        # Net change: -3 valid + 1 damaged = -2 total, +1 damaged
        self.assertEqual(self.test_part.current_stock, initial_part_stock - 2)  # 20 - 2 = 18
        self.assertEqual(self.test_part.current_stock_damaged, initial_part_damaged + 1)  # 2 + 1 = 3
        self.assertEqual(self.test_part.get_valid_stock(), 15)  # 18 - 3 = 15
        
        # Verify stock movements were created
        movements = StockMovement.query.filter_by(
            order_id=self.test_order.id,
            movement_type=StockMovementType.MAINTENANCE
        ).all()
        
        self.assertEqual(len(movements), 2)
        
        # Check individual movements
        use_movement = next(m for m in movements if m.quantity_change == -3)
        add_movement = next(m for m in movements if m.quantity_change == 1)
        
        self.assertEqual(use_movement.condition, ItemCondition.VALID)
        self.assertEqual(add_movement.condition, ItemCondition.DAMAGED)
        self.assertIn('استخدام في الإصلاح', use_movement.notes)
        self.assertIn('إزالة قطعة تالفة', add_movement.notes)


class TestWorkflowValidation(TestServiceActionWorkflow):
    """Test workflow validation and error handling"""
    
    def test_create_service_action_validation(self):
        """Test validation during service action creation"""
        
        # Test missing items for replacement
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.PART_REPLACE,
            customer_data=self.customer_data,
            original_tracking='TEST-VALIDATION',
            items_to_send=None  # Missing items
        )
        
        self.assertFalse(success)
        self.assertIn('عناصر الإرسال مطلوبة', error)
        
        # Test missing refund amount for return
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            customer_data=self.customer_data,
            original_tracking='TEST-VALIDATION',
            refund_amount=None  # Missing refund amount
        )
        
        self.assertFalse(success)
        self.assertIn('مبلغ الاسترداد مطلوب', error)
        
        # Test non-existent item
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.PART_REPLACE,
            customer_data=self.customer_data,
            original_tracking='TEST-VALIDATION',
            items_to_send=[{'item_type': 'part', 'item_id': 99999, 'quantity': 1}]
        )
        
        self.assertFalse(success)
        self.assertIn('القطعة غير موجودة', error)
    
    def test_insufficient_stock_validation(self):
        """Test insufficient stock validation"""
        
        # Create service action with more items than available
        items_to_send = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 25}  # More than 18 valid stock
        ]
        
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.PART_REPLACE,
            customer_data=self.customer_data,
            original_tracking='TEST-INSUFFICIENT',
            items_to_send=items_to_send
        )
        
        self.assertTrue(success)  # Creation should succeed
        
        # Confirm and send should fail due to insufficient stock
        success, data, error = UnifiedService.confirm_and_send(
            service_action_id=service_action.id,
            new_tracking_number='TEST-TRACK',
            user_name='فني الاختبار'
        )
        
        self.assertFalse(success)
        self.assertIn('مخزون غير كافي', error)
    
    def test_wrong_action_type_validation(self):
        """Test action type validation for workflow methods"""
        
        # Create return service action
        success, return_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            customer_data=self.customer_data,
            original_tracking='TEST-WRONG-TYPE',
            refund_amount=Decimal('100.00')
        )
        
        self.assertTrue(success)
        
        # Try to use replacement method on return action
        success, data, error = UnifiedService.confirm_and_send(
            service_action_id=return_action.id,
            new_tracking_number='TEST-TRACK',
            user_name='فني الاختبار'
        )
        
        self.assertFalse(success)
        self.assertIn('هذه العملية متاحة فقط لعمليات الاستبدال', error)


class TestWorkflowIntegration(TestServiceActionWorkflow):
    """Test integration between different workflow components"""
    
    def test_stock_movement_audit_trail(self):
        """Test complete audit trail through stock movements"""
        
        # Create and complete a part replace workflow
        items_to_send = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1}
        ]
        
        # Create service action
        success, service_action, error = UnifiedService.create_service_action(
            action_type=ServiceActionType.PART_REPLACE,
            customer_data=self.customer_data,
            original_tracking='AUDIT-TEST',
            items_to_send=items_to_send
        )
        self.assertTrue(success)
        
        # Confirm and send
        success, data, error = UnifiedService.confirm_and_send(
            service_action_id=service_action.id,
            new_tracking_number='AUDIT-TRACK',
            user_name='فني الاختبار'
        )
        self.assertTrue(success)
        
        # Receive back
        items_received = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1, 'condition': 'damaged'}
        ]
        
        success, data, error = UnifiedService.receive_replacement_items(
            service_action_id=service_action.id,
            items_received=items_received,
            user_name='فني الاختبار'
        )
        self.assertTrue(success)
        
        # Verify complete audit trail
        all_movements = StockMovement.query.filter_by(service_action_id=service_action.id).order_by(StockMovement.created_at).all()
        self.assertEqual(len(all_movements), 2)
        
        send_movement = all_movements[0]
        receive_movement = all_movements[1]
        
        # Send movement
        self.assertEqual(send_movement.movement_type, StockMovementType.SEND)
        self.assertEqual(send_movement.quantity_change, -1)
        self.assertEqual(send_movement.condition, ItemCondition.VALID)
        
        # Receive movement
        self.assertEqual(receive_movement.movement_type, StockMovementType.RECEIVE)
        self.assertEqual(receive_movement.quantity_change, 1)
        self.assertEqual(receive_movement.condition, ItemCondition.DAMAGED)
        
        # Verify ServiceActionItem tracking
        service_item = ServiceActionItem.query.filter_by(service_action_id=service_action.id).first()
        self.assertEqual(service_item.quantity_to_send, 1)
        self.assertEqual(service_item.quantity_received, 1)
        self.assertEqual(service_item.condition_received, ItemCondition.DAMAGED)
        self.assertIsNotNone(service_item.sent_at)
        self.assertIsNotNone(service_item.received_at)


def run_tests():
    """Run all tests and print results"""
    print("🧪 Running Service Action Workflow Tests...")
    print("=" * 60)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestPartReplaceWorkflow,
        TestFullReplaceWorkflow,
        TestReturnWorkflow,
        TestMaintenanceStockAdjustment,
        TestWorkflowValidation,
        TestWorkflowIntegration
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Service Action Workflow Test Results Summary:")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\n❌ Failures:")
        for test, failure in result.failures:
            print(f"  - {test}: {failure}")
    
    if result.errors:
        print(f"\n💥 Errors:")
        for test, error in result.errors:
            print(f"  - {test}: {error}")
    
    if result.wasSuccessful():
        print("\n✅ All Service Action Workflow tests passed successfully!")
        return True
    else:
        print("\n❌ Some Service Action Workflow tests failed!")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
