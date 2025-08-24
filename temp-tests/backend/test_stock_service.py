#!/usr/bin/env python3
"""
Comprehensive tests for StockService in HVAR Hub
Tests all four main stock operations and edge cases

Usage:
  python temp-tests/backend/test_stock_service.py
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
    StockMovement, ServiceActionItem, Product, Part, ServiceAction, Order,
    StockMovementType, ItemCondition, ServiceActionType, ServiceActionStatus,
    ProductCategory, PartType, OrderStatus
)
from services.stock_service import StockService
from utils.timezone import get_egypt_now


class TestStockService(unittest.TestCase):
    """Test cases for StockService operations"""
    
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
        
        # Create test product with stock
        self.test_product = Product(
            sku='TEST-PRODUCT-STOCK-001',
            name_ar='منتج اختبار المخزون',
            category=ProductCategory.HAND_BLENDER,
            current_stock=20,
            current_stock_damaged=3  # 17 valid, 3 damaged
        )
        db.session.add(self.test_product)
        db.session.flush()
        
        # Create test part with stock
        self.test_part = Part(
            part_sku='TEST-PART-STOCK-001',
            part_name='قطعة اختبار المخزون',
            part_type=PartType.MOTOR,
            product_id=self.test_product.id,
            current_stock=15,
            current_stock_damaged=2  # 13 valid, 2 damaged
        )
        db.session.add(self.test_part)
        db.session.flush()
        
        # Create test order for maintenance
        self.test_order = Order(
            tracking_number='TEST-ORDER-STOCK-001',
            customer_phone='+201155125743',
            status=OrderStatus.IN_MAINTENANCE
        )
        db.session.add(self.test_order)
        db.session.flush()
        
        # Create test service action
        self.test_service_action = ServiceAction(
            action_type=ServiceActionType.PART_REPLACE,
            customer_phone='+201155125743',
            original_tracking_number='TEST-SA-STOCK-001'
        )
        db.session.add(self.test_service_action)
        db.session.flush()
        
        # Create return service action
        self.test_return_action = ServiceAction(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            customer_phone='+201155125743',
            original_tracking_number='TEST-RETURN-STOCK-001',
            refund_amount=Decimal('150.00')
        )
        db.session.add(self.test_return_action)
        db.session.flush()
    
    def tearDown(self):
        """Clean up each test"""
        db.session.rollback()


class TestMaintenanceAdjustment(TestStockService):
    """Test maintenance_adjustment method"""
    
    def test_maintenance_use_valid_parts(self):
        """Test using valid parts during maintenance"""
        initial_stock = self.test_part.current_stock
        initial_damaged = self.test_part.current_stock_damaged
        
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=-3,  # Use 3 parts
            condition='valid',
            notes='استخدام في الإصلاح',
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertIsNone(error)
        self.assertIsNotNone(data)
        
        # Check stock changes
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, initial_stock - 3)
        self.assertEqual(self.test_part.current_stock_damaged, initial_damaged)
        self.assertEqual(self.test_part.get_valid_stock(), 10)  # 13 - 3 = 10
        
        # Check movement record created
        movement = StockMovement.query.filter_by(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id
        ).first()
        
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity_change, -3)
        self.assertEqual(movement.movement_type, StockMovementType.MAINTENANCE)
        self.assertEqual(movement.condition, ItemCondition.VALID)
        self.assertEqual(movement.notes, 'استخدام في الإصلاح')
    
    def test_maintenance_add_damaged_parts(self):
        """Test adding damaged parts during maintenance"""
        initial_stock = self.test_part.current_stock
        initial_damaged = self.test_part.current_stock_damaged
        
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=2,  # Add 2 damaged parts
            condition='damaged',
            notes='إضافة قطع تالفة مزالة'
        )
        
        self.assertTrue(success)
        self.assertIsNone(error)
        
        # Check stock changes
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, initial_stock + 2)
        self.assertEqual(self.test_part.current_stock_damaged, initial_damaged + 2)
        self.assertEqual(self.test_part.get_valid_stock(), 13)  # Still 13 valid
    
    def test_maintenance_insufficient_stock(self):
        """Test maintenance adjustment with insufficient stock"""
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=-30,  # Try to use more than available
            condition='valid'
        )
        
        self.assertFalse(success)
        self.assertIsNotNone(error)
        self.assertIn('لا يمكن تقليل المخزون أقل من الصفر', error)
    
    def test_maintenance_validation_errors(self):
        """Test validation errors in maintenance adjustment"""
        # Test zero quantity
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=0,  # Invalid
            condition='valid'
        )
        self.assertFalse(success)
        self.assertIn('تغيير الكمية يجب أن يكون غير صفر', error)
        
        # Test invalid item type
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='invalid',  # Invalid
            item_id=self.test_part.id,
            quantity_change=-1,
            condition='valid'
        )
        self.assertFalse(success)
        self.assertIn("نوع العنصر يجب أن يكون", error)
        
        # Test invalid condition
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=-1,
            condition='invalid'  # Invalid
        )
        self.assertFalse(success)
        self.assertIn("حالة العنصر يجب أن تكون", error)


class TestSendItems(TestStockService):
    """Test send_items method"""
    
    def test_send_single_item(self):
        """Test sending a single item to customer"""
        initial_stock = self.test_part.current_stock
        initial_valid = self.test_part.get_valid_stock()
        
        items_to_send = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 2}
        ]
        
        success, data, error = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=items_to_send,
            user_name='فني الاختبار'
        )
        
        self.assertTrue(success)
        self.assertIsNone(error)
        self.assertEqual(data['total_items'], 1)
        self.assertEqual(len(data['items_sent']), 1)
        
        # Check stock reduction
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, initial_stock - 2)
        self.assertEqual(self.test_part.get_valid_stock(), initial_valid - 2)
        
        # Check ServiceActionItem created
        service_item = ServiceActionItem.query.filter_by(
            service_action_id=self.test_service_action.id,
            item_type='part',
            item_id=self.test_part.id
        ).first()
        
        self.assertIsNotNone(service_item)
        self.assertEqual(service_item.quantity_to_send, 2)
        self.assertIsNotNone(service_item.sent_at)
        
        # Check stock movement created
        movement = StockMovement.query.filter_by(
            service_action_id=self.test_service_action.id,
            movement_type=StockMovementType.SEND
        ).first()
        
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity_change, -2)
        self.assertEqual(movement.condition, ItemCondition.VALID)
    
    def test_send_multiple_items(self):
        """Test sending multiple items to customer"""
        items_to_send = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1},
            {'item_type': 'product', 'item_id': self.test_product.id, 'quantity': 1}
        ]
        
        success, data, error = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=items_to_send
        )
        
        self.assertTrue(success)
        self.assertEqual(data['total_items'], 2)
        self.assertEqual(len(data['items_sent']), 2)
        
        # Check multiple ServiceActionItems created
        service_items = ServiceActionItem.query.filter_by(
            service_action_id=self.test_service_action.id
        ).all()
        
        self.assertEqual(len(service_items), 2)
    
    def test_send_insufficient_stock(self):
        """Test sending with insufficient stock"""
        items_to_send = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 20}  # More than available valid stock
        ]
        
        success, data, error = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=items_to_send
        )
        
        self.assertFalse(success)
        self.assertIsNotNone(error)
        self.assertIn('مخزون غير كافي', error)
    
    def test_send_validation_errors(self):
        """Test validation errors in send items"""
        # Test empty items list
        success, data, error = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=[]
        )
        self.assertFalse(success)
        self.assertIn('قائمة العناصر المراد إرسالها مطلوبة', error)
        
        # Test invalid item format
        success, data, error = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=[{'invalid': 'format'}]
        )
        self.assertFalse(success)
        self.assertIn('حقل مطلوب مفقود', error)


class TestReceiveItems(TestStockService):
    """Test receive_items method"""
    
    def test_receive_damaged_items(self):
        """Test receiving damaged items back from customer"""
        initial_stock = self.test_part.current_stock
        initial_damaged = self.test_part.current_stock_damaged
        
        items_received = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 2, 'condition': 'damaged'}
        ]
        
        success, data, error = StockService.receive_items(
            service_action_id=self.test_service_action.id,
            items_received=items_received
        )
        
        self.assertTrue(success)
        self.assertIsNone(error)
        
        # Check stock increase
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, initial_stock + 2)
        self.assertEqual(self.test_part.current_stock_damaged, initial_damaged + 2)
        
        # Check ServiceActionItem updated
        service_item = ServiceActionItem.query.filter_by(
            service_action_id=self.test_service_action.id,
            item_type='part',
            item_id=self.test_part.id
        ).first()
        
        self.assertIsNotNone(service_item)
        self.assertEqual(service_item.quantity_received, 2)
        self.assertEqual(service_item.condition_received, ItemCondition.DAMAGED)
        self.assertIsNotNone(service_item.received_at)
    
    def test_receive_valid_items(self):
        """Test receiving valid items back from customer"""
        initial_stock = self.test_part.current_stock
        initial_damaged = self.test_part.current_stock_damaged
        
        items_received = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1, 'condition': 'valid'}
        ]
        
        success, data, error = StockService.receive_items(
            service_action_id=self.test_service_action.id,
            items_received=items_received
        )
        
        self.assertTrue(success)
        
        # Check stock increase (only total, not damaged)
        db.session.refresh(self.test_part)
        self.assertEqual(self.test_part.current_stock, initial_stock + 1)
        self.assertEqual(self.test_part.current_stock_damaged, initial_damaged)
        self.assertEqual(self.test_part.get_valid_stock(), 14)  # 13 + 1 = 14
    
    def test_receive_mixed_conditions(self):
        """Test receiving items with mixed conditions"""
        items_received = [
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1, 'condition': 'valid'},
            {'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 2, 'condition': 'damaged'}
        ]
        
        success, data, error = StockService.receive_items(
            service_action_id=self.test_service_action.id,
            items_received=items_received
        )
        
        self.assertTrue(success)
        self.assertEqual(len(data['items_received']), 2)
        
        # Check stock movements created
        movements = StockMovement.query.filter_by(
            service_action_id=self.test_service_action.id,
            movement_type=StockMovementType.RECEIVE
        ).all()
        
        self.assertEqual(len(movements), 2)


class TestReceiveReturns(TestStockService):
    """Test receive_returns method"""
    
    def test_receive_customer_returns(self):
        """Test receiving returns from customer"""
        initial_stock = self.test_product.current_stock
        
        items_returned = [
            {'item_type': 'product', 'item_id': self.test_product.id, 'quantity': 1, 'condition': 'valid'}
        ]
        
        success, data, error = StockService.receive_returns(
            service_action_id=self.test_return_action.id,
            items_returned=items_returned
        )
        
        self.assertTrue(success)
        self.assertEqual(len(data['items_returned']), 1)
        
        # Check stock increase
        db.session.refresh(self.test_product)
        self.assertEqual(self.test_product.current_stock, initial_stock + 1)
        
        # Check stock movement with correct notes
        movement = StockMovement.query.filter_by(
            service_action_id=self.test_return_action.id,
            movement_type=StockMovementType.RECEIVE
        ).first()
        
        self.assertIsNotNone(movement)
        self.assertIn('استلام مرتجع من العميل', movement.notes)
    
    def test_receive_damaged_returns(self):
        """Test receiving damaged returns from customer"""
        initial_damaged = self.test_product.current_stock_damaged
        
        items_returned = [
            {'item_type': 'product', 'item_id': self.test_product.id, 'quantity': 2, 'condition': 'damaged'}
        ]
        
        success, data, error = StockService.receive_returns(
            service_action_id=self.test_return_action.id,
            items_returned=items_returned
        )
        
        self.assertTrue(success)
        
        # Check damaged stock increase
        db.session.refresh(self.test_product)
        self.assertEqual(self.test_product.current_stock_damaged, initial_damaged + 2)


class TestStockServiceHelpers(TestStockService):
    """Test helper methods and utilities"""
    
    def test_get_stock_summary(self):
        """Test get_stock_summary method"""
        summary = StockService.get_stock_summary('part', self.test_part.id)
        
        self.assertEqual(summary['item_type'], 'part')
        self.assertEqual(summary['item_id'], self.test_part.id)
        self.assertEqual(summary['total_stock'], 15)
        self.assertEqual(summary['damaged_stock'], 2)
        self.assertEqual(summary['valid_stock'], 13)
        self.assertIn('is_low_stock', summary)
    
    def test_get_stock_summary_nonexistent_item(self):
        """Test get_stock_summary for non-existent item"""
        summary = StockService.get_stock_summary('part', 99999)
        
        self.assertIn('error', summary)
        self.assertIn('العنصر غير موجود', summary['error'])
    
    def test_get_stock_movements(self):
        """Test get_stock_movements method"""
        # Create some movements first
        StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=-1,
            condition='valid',
            notes='اختبار'
        )
        
        # Get movements
        movements = StockService.get_stock_movements('part', self.test_part.id)
        
        self.assertGreater(len(movements), 0)
        self.assertEqual(movements[0]['item_type'], 'part')
        self.assertEqual(movements[0]['item_id'], self.test_part.id)
    
    def test_get_all_stock_movements(self):
        """Test getting all stock movements"""
        # Create movements for different items
        StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=-1,
            condition='valid'
        )
        
        StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='product',
            item_id=self.test_product.id,
            quantity_change=1,
            condition='damaged'
        )
        
        # Get all movements
        all_movements = StockService.get_stock_movements()
        
        self.assertGreaterEqual(len(all_movements), 2)


class TestStockServiceEdgeCases(TestStockService):
    """Test edge cases and error scenarios"""
    
    def test_nonexistent_service_action(self):
        """Test operations with non-existent service action"""
        success, data, error = StockService.send_items(
            service_action_id=99999,
            items_to_send=[{'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1}]
        )
        
        self.assertFalse(success)
        self.assertIn('خدمة العمليات غير موجودة', error)
    
    def test_nonexistent_item(self):
        """Test operations with non-existent item"""
        success, data, error = StockService.maintenance_adjustment(
            order_id=self.test_order.id,
            item_type='part',
            item_id=99999,  # Non-existent
            quantity_change=-1,
            condition='valid'
        )
        
        self.assertFalse(success)
        self.assertIn('العنصر غير موجود', error)
    
    def test_stock_consistency(self):
        """Test that stock operations maintain consistency"""
        initial_total = self.test_part.current_stock
        initial_damaged = self.test_part.current_stock_damaged
        initial_valid = self.test_part.get_valid_stock()
        
        # Send 2 items
        StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=[{'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 2}]
        )
        
        # Receive 1 damaged item back
        StockService.receive_items(
            service_action_id=self.test_service_action.id,
            items_received=[{'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1, 'condition': 'damaged'}]
        )
        
        db.session.refresh(self.test_part)
        
        # Final stock should be: initial - 2 + 1 = initial - 1
        self.assertEqual(self.test_part.current_stock, initial_total - 1)
        # Damaged should be: initial + 1
        self.assertEqual(self.test_part.current_stock_damaged, initial_damaged + 1)
        # Valid should be: initial - 2 (sent 2 valid, received 1 damaged)
        self.assertEqual(self.test_part.get_valid_stock(), initial_valid - 2)
    
    def test_concurrent_operations(self):
        """Test handling of concurrent stock operations"""
        # Simulate concurrent operations by calling methods in sequence
        # In real scenario, this would test transaction isolation
        
        items_to_send = [{'item_type': 'part', 'item_id': self.test_part.id, 'quantity': 1}]
        
        # Multiple send operations
        success1, _, _ = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=items_to_send
        )
        
        success2, _, _ = StockService.send_items(
            service_action_id=self.test_service_action.id,
            items_to_send=items_to_send
        )
        
        self.assertTrue(success1)
        self.assertTrue(success2)
        
        # Check that both operations were recorded
        movements = StockMovement.query.filter_by(
            service_action_id=self.test_service_action.id,
            movement_type=StockMovementType.SEND
        ).all()
        
        self.assertEqual(len(movements), 2)


def run_tests():
    """Run all tests and print results"""
    print("🧪 Running StockService Tests...")
    print("=" * 60)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestMaintenanceAdjustment,
        TestSendItems,
        TestReceiveItems,
        TestReceiveReturns,
        TestStockServiceHelpers,
        TestStockServiceEdgeCases
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 StockService Test Results Summary:")
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
        print("\n✅ All StockService tests passed successfully!")
        return True
    else:
        print("\n❌ Some StockService tests failed!")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
