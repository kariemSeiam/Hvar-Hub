#!/usr/bin/env python3
"""
Comprehensive tests for new database models in HVAR Hub
Tests for StockMovement, ServiceActionItem, and updated Product/Part models

Usage:
  python temp-tests/backend/test_database_models.py
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
    StockMovement, ServiceActionItem, Product, Part, ServiceAction,
    StockMovementType, ItemCondition, ServiceActionType, ServiceActionStatus,
    ProductCategory, PartType
)
from utils.timezone import get_egypt_now


class TestDatabaseModels(unittest.TestCase):
    """Test cases for new database models and validation rules"""
    
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
        
        # Create test product
        self.test_product = Product(
            sku='TEST-PRODUCT-001',
            name_ar='منتج اختبار',
            category=ProductCategory.HAND_BLENDER,
            current_stock=10,
            current_stock_damaged=2
        )
        db.session.add(self.test_product)
        db.session.flush()  # Get ID without committing
        
        # Create test part
        self.test_part = Part(
            part_sku='TEST-PART-001',
            part_name='قطعة اختبار',
            part_type=PartType.MOTOR,
            product_id=self.test_product.id,
            current_stock=5,
            current_stock_damaged=1
        )
        db.session.add(self.test_part)
        db.session.flush()
        
        # Create test service action
        self.test_service_action = ServiceAction(
            action_type=ServiceActionType.PART_REPLACE,
            customer_phone='+201155125743',
            original_tracking_number='TEST123456'
        )
        db.session.add(self.test_service_action)
        db.session.flush()
    
    def tearDown(self):
        """Clean up each test"""
        db.session.rollback()


class TestStockMovement(TestDatabaseModels):
    """Test StockMovement model"""
    
    def test_stock_movement_creation(self):
        """Test creating a stock movement record"""
        movement = StockMovement(
            item_type='product',
            item_id=self.test_product.id,
            quantity_change=-2,
            movement_type=StockMovementType.MAINTENANCE,
            condition=ItemCondition.VALID,
            notes='استخدام في الصيانة'
        )
        db.session.add(movement)
        db.session.flush()
        
        self.assertEqual(movement.item_type, 'product')
        self.assertEqual(movement.quantity_change, -2)
        self.assertEqual(movement.movement_type, StockMovementType.MAINTENANCE)
        self.assertEqual(movement.condition, ItemCondition.VALID)
        self.assertIsNotNone(movement.created_at)
    
    def test_stock_movement_validation_zero_quantity(self):
        """Test that quantity_change cannot be zero"""
        with self.assertRaises(ValueError) as context:
            movement = StockMovement(
                item_type='product',
                item_id=self.test_product.id,
                quantity_change=0,  # This should fail
                movement_type=StockMovementType.MAINTENANCE,
                condition=ItemCondition.VALID
            )
            db.session.add(movement)
            db.session.flush()
        
        self.assertIn('quantity_change must be non-zero', str(context.exception))
    
    def test_stock_movement_validation_invalid_item_type(self):
        """Test that item_type must be 'product' or 'part'"""
        with self.assertRaises(ValueError) as context:
            movement = StockMovement(
                item_type='invalid_type',  # This should fail
                item_id=self.test_product.id,
                quantity_change=-1,
                movement_type=StockMovementType.MAINTENANCE,
                condition=ItemCondition.VALID
            )
            db.session.add(movement)
            db.session.flush()
        
        self.assertIn("item_type must be 'product' or 'part'", str(context.exception))
    
    def test_stock_movement_to_dict(self):
        """Test StockMovement to_dict serialization"""
        movement = StockMovement(
            item_type='part',
            item_id=self.test_part.id,
            quantity_change=3,
            movement_type=StockMovementType.RECEIVE,
            condition=ItemCondition.DAMAGED,
            notes='استلام قطع تالفة'
        )
        db.session.add(movement)
        db.session.flush()
        
        result = movement.to_dict()
        
        self.assertEqual(result['item_type'], 'part')
        self.assertEqual(result['quantity_change'], 3)
        self.assertEqual(result['movement_type'], 'receive')
        self.assertEqual(result['condition'], 'damaged')
        self.assertEqual(result['notes'], 'استلام قطع تالفة')
        self.assertIn('created_at', result)
    
    def test_stock_movement_class_methods(self):
        """Test StockMovement class methods"""
        # Create test movements
        movement1 = StockMovement(
            item_type='product',
            item_id=self.test_product.id,
            quantity_change=-1,
            movement_type=StockMovementType.SEND,
            condition=ItemCondition.VALID,
            service_action_id=self.test_service_action.id
        )
        movement2 = StockMovement(
            item_type='product',
            item_id=self.test_product.id,
            quantity_change=1,
            movement_type=StockMovementType.RECEIVE,
            condition=ItemCondition.DAMAGED
        )
        
        db.session.add_all([movement1, movement2])
        db.session.flush()
        
        # Test get_by_item
        item_movements = StockMovement.get_by_item('product', self.test_product.id)
        self.assertEqual(len(item_movements), 2)
        
        # Test get_by_service_action
        service_movements = StockMovement.get_by_service_action(self.test_service_action.id)
        self.assertEqual(len(service_movements), 1)
        self.assertEqual(service_movements[0].id, movement1.id)


class TestServiceActionItem(TestDatabaseModels):
    """Test ServiceActionItem model"""
    
    def test_service_action_item_creation(self):
        """Test creating a service action item"""
        item = ServiceActionItem(
            service_action_id=self.test_service_action.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_to_send=2
        )
        db.session.add(item)
        db.session.flush()
        
        self.assertEqual(item.service_action_id, self.test_service_action.id)
        self.assertEqual(item.item_type, 'part')
        self.assertEqual(item.quantity_to_send, 2)
        self.assertEqual(item.quantity_received, 0)  # Default value
    
    def test_service_action_item_validation_negative_quantities(self):
        """Test that quantities cannot be negative"""
        # Test negative quantity_to_send
        with self.assertRaises(ValueError) as context:
            item = ServiceActionItem(
                service_action_id=self.test_service_action.id,
                item_type='part',
                item_id=self.test_part.id,
                quantity_to_send=-1  # This should fail
            )
            db.session.add(item)
            db.session.flush()
        
        self.assertIn('quantity_to_send must be non-negative', str(context.exception))
        
        # Test negative quantity_received
        with self.assertRaises(ValueError) as context:
            item = ServiceActionItem(
                service_action_id=self.test_service_action.id,
                item_type='part',
                item_id=self.test_part.id,
                quantity_received=-1  # This should fail
            )
            db.session.add(item)
            db.session.flush()
        
        self.assertIn('quantity_received must be non-negative', str(context.exception))
    
    def test_service_action_item_workflow(self):
        """Test complete send/receive workflow"""
        item = ServiceActionItem(
            service_action_id=self.test_service_action.id,
            item_type='product',
            item_id=self.test_product.id,
            quantity_to_send=1
        )
        db.session.add(item)
        db.session.flush()
        
        # Initially not sent
        self.assertIsNone(item.sent_at)
        self.assertIsNone(item.received_at)
        self.assertFalse(item.is_fully_received())
        
        # Mark as sent
        item.sent_at = get_egypt_now()
        self.assertIsNotNone(item.sent_at)
        
        # Receive back
        item.quantity_received = 1
        item.condition_received = ItemCondition.DAMAGED
        item.received_at = get_egypt_now()
        
        self.assertTrue(item.is_fully_received())
        self.assertEqual(item.condition_received, ItemCondition.DAMAGED)
    
    def test_service_action_item_to_dict(self):
        """Test ServiceActionItem to_dict serialization"""
        item = ServiceActionItem(
            service_action_id=self.test_service_action.id,
            item_type='part',
            item_id=self.test_part.id,
            quantity_to_send=3,
            quantity_received=2,
            condition_received=ItemCondition.VALID
        )
        db.session.add(item)
        db.session.flush()
        
        result = item.to_dict()
        
        self.assertEqual(result['service_action_id'], self.test_service_action.id)
        self.assertEqual(result['item_type'], 'part')
        self.assertEqual(result['quantity_to_send'], 3)
        self.assertEqual(result['quantity_received'], 2)
        self.assertEqual(result['condition_received'], 'valid')


class TestProductPartStockFields(TestDatabaseModels):
    """Test updated Product and Part models with stock fields"""
    
    def test_product_stock_validation(self):
        """Test product stock validation rules"""
        # Test negative current_stock
        with self.assertRaises(ValueError) as context:
            product = Product(
                sku='TEST-INVALID-001',
                name_ar='منتج خطأ',
                category=ProductCategory.MIXER,
                current_stock=-1  # This should fail
            )
            db.session.add(product)
            db.session.flush()
        
        self.assertIn('current_stock must be non-negative', str(context.exception))
        
        # Test damaged stock exceeding total stock
        with self.assertRaises(ValueError) as context:
            product = Product(
                sku='TEST-INVALID-002',
                name_ar='منتج خطأ',
                category=ProductCategory.MIXER,
                current_stock=5,
                current_stock_damaged=10  # This should fail
            )
            db.session.add(product)
            db.session.flush()
        
        self.assertIn('current_stock_damaged cannot exceed current_stock', str(context.exception))
    
    def test_product_stock_methods(self):
        """Test product stock helper methods"""
        # Test get_valid_stock
        valid_stock = self.test_product.get_valid_stock()
        self.assertEqual(valid_stock, 8)  # 10 - 2 = 8
        
        # Test is_low_stock
        self.test_product.alert_quantity = 10
        self.assertTrue(self.test_product.is_low_stock())  # 8 <= 10
        
        self.test_product.alert_quantity = 5
        self.assertFalse(self.test_product.is_low_stock())  # 8 > 5
    
    def test_part_stock_validation(self):
        """Test part stock validation rules"""
        # Test negative current_stock_damaged
        with self.assertRaises(ValueError) as context:
            part = Part(
                part_sku='TEST-INVALID-PART-001',
                part_name='قطعة خطأ',
                part_type=PartType.COMPONENT,
                product_id=self.test_product.id,
                current_stock=5,
                current_stock_damaged=-1  # This should fail
            )
            db.session.add(part)
            db.session.flush()
        
        self.assertIn('current_stock_damaged must be non-negative', str(context.exception))
    
    def test_part_stock_methods(self):
        """Test part stock helper methods"""
        # Test get_valid_stock
        valid_stock = self.test_part.get_valid_stock()
        self.assertEqual(valid_stock, 4)  # 5 - 1 = 4
        
        # Test is_low_stock
        self.test_part.min_stock_level = 5
        self.assertTrue(self.test_part.is_low_stock())  # 4 <= 5
        
        self.test_part.min_stock_level = 3
        self.assertFalse(self.test_part.is_low_stock())  # 4 > 3
    
    def test_product_to_dict_with_stock_fields(self):
        """Test product serialization includes new stock fields"""
        result = self.test_product.to_dict()
        
        self.assertEqual(result['current_stock'], 10)
        self.assertEqual(result['current_stock_damaged'], 2)
        self.assertEqual(result['valid_stock'], 8)
        self.assertIn('is_low_stock', result)
    
    def test_part_to_dict_with_stock_fields(self):
        """Test part serialization includes new stock fields"""
        result = self.test_part.to_dict()
        
        self.assertEqual(result['current_stock'], 5)
        self.assertEqual(result['current_stock_damaged'], 1)
        self.assertEqual(result['valid_stock'], 4)
        self.assertIn('is_low_stock', result)


class TestServiceActionRefundTracking(TestDatabaseModels):
    """Test ServiceAction refund tracking fields"""
    
    def test_service_action_refund_validation(self):
        """Test refund amount validation"""
        # Test negative refund amount
        with self.assertRaises(ValueError) as context:
            action = ServiceAction(
                action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
                customer_phone='+201155125743',
                original_tracking_number='TEST-REFUND-001',
                refund_amount=Decimal('-50.00')  # This should fail
            )
            db.session.add(action)
            db.session.flush()
        
        self.assertIn('refund_amount must be positive', str(context.exception))
    
    def test_service_action_refund_workflow(self):
        """Test complete refund workflow"""
        return_action = ServiceAction(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            customer_phone='+201155125743',
            original_tracking_number='TEST-RETURN-001',
            refund_amount=Decimal('150.00')
        )
        db.session.add(return_action)
        db.session.flush()
        
        # Initially not processed
        self.assertFalse(return_action.refund_processed)
        self.assertIsNone(return_action.refund_processed_at)
        
        # Process refund
        return_action.refund_processed = True
        return_action.refund_processed_at = get_egypt_now()
        
        self.assertTrue(return_action.refund_processed)
        self.assertIsNotNone(return_action.refund_processed_at)
    
    def test_service_action_to_dict_includes_refund_fields(self):
        """Test ServiceAction serialization includes refund fields"""
        return_action = ServiceAction(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            customer_phone='+201155125743',
            original_tracking_number='TEST-RETURN-002',
            refund_amount=Decimal('200.00'),
            refund_processed=True
        )
        db.session.add(return_action)
        db.session.flush()
        
        result = return_action.to_dict()
        
        self.assertEqual(result['refund_amount'], 200.0)
        self.assertTrue(result['refund_processed'])
        self.assertIn('refund_processed_at', result)


class TestDatabaseIndexes(TestDatabaseModels):
    """Test database performance with indexes"""
    
    def test_stock_movement_queries_performance(self):
        """Test stock movement queries use indexes efficiently"""
        # Create multiple stock movements
        movements = []
        for i in range(10):
            movement = StockMovement(
                item_type='product',
                item_id=self.test_product.id,
                quantity_change=(-1 if i % 2 else 1),
                movement_type=StockMovementType.MAINTENANCE,
                condition=ItemCondition.VALID,
                notes=f'Test movement {i}'
            )
            movements.append(movement)
        
        db.session.add_all(movements)
        db.session.flush()
        
        # Test indexed queries
        item_movements = StockMovement.get_by_item('product', self.test_product.id)
        self.assertEqual(len(item_movements), 10)
        
        # Query by movement_type should be fast with index
        maintenance_movements = StockMovement.query.filter_by(
            movement_type=StockMovementType.MAINTENANCE
        ).all()
        self.assertEqual(len(maintenance_movements), 10)
    
    def test_service_action_item_queries_performance(self):
        """Test service action item queries use indexes efficiently"""
        # Create multiple service action items
        items = []
        for i in range(5):
            item = ServiceActionItem(
                service_action_id=self.test_service_action.id,
                item_type='part',
                item_id=self.test_part.id,
                quantity_to_send=i + 1
            )
            items.append(item)
        
        db.session.add_all(items)
        db.session.flush()
        
        # Test indexed queries
        service_items = ServiceActionItem.get_by_service_action(self.test_service_action.id)
        self.assertEqual(len(service_items), 5)
        
        # Query by item should be fast with composite index
        part_items = ServiceActionItem.query.filter_by(
            item_type='part',
            item_id=self.test_part.id
        ).all()
        self.assertEqual(len(part_items), 5)


def run_tests():
    """Run all tests and print results"""
    print("🧪 Running Database Models Tests...")
    print("=" * 60)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestStockMovement,
        TestServiceActionItem,
        TestProductPartStockFields,
        TestServiceActionRefundTracking,
        TestDatabaseIndexes
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Results Summary:")
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
        print("\n✅ All tests passed successfully!")
        return True
    else:
        print("\n❌ Some tests failed!")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
