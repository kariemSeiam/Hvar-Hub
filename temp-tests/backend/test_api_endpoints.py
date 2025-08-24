#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API Endpoints Test Suite for Task 4 - Simple API Endpoints

Tests all new API endpoints for:
- Service Action Workflow endpoints
- Stock Adjustment endpoints for maintenance
- Stock Management and viewing endpoints

This comprehensive test suite verifies the complete API layer for the 
Unified Service Action Cycle implementation.
"""

import unittest
import sys
import os
import json
from datetime import datetime

# Add the back directory to sys.path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'back'))

# Import Flask app and database
from app import create_app
from db import db
from services.stock_service import StockService
from services.unified_service import UnifiedService
from services.order_service import OrderService


class APIEndpointsTestCase(unittest.TestCase):
    """Test all new API endpoints for Task 4"""
    
    def setUp(self):
        """Set up test environment"""
        # Force testing configuration and clear any MySQL environment variables
        os.environ['FLASK_ENV'] = 'testing'
        os.environ['MYSQL_HOST'] = ''
        os.environ['MYSQL_USER'] = ''
        os.environ['MYSQL_DATABASE'] = ''
        
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

        # Import models globally to make them available to all test methods
        global Product, Part, Order, ServiceAction, StockMovement, ServiceActionItem
        global OrderStatus, ServiceActionType, ServiceActionStatus, StockMovementType, ItemCondition
        global ProductCategory, PartType
        
        from db.auto_init import (
            Product, Part, Order, ServiceAction, StockMovement, ServiceActionItem,
            OrderStatus, ServiceActionType, ServiceActionStatus, StockMovementType, ItemCondition,
            ProductCategory, PartType
        )

        # Create all tables
        db.create_all()

        # Create test data with unique identifiers
        timestamp = str(int(datetime.now().timestamp() * 1000))
        
        # Create test product
        self.test_product = Product(
            sku=f'TEST-API-PRODUCT-{timestamp}',
            name_ar=f'Test Product API {timestamp}',
            category=ProductCategory.HAND_BLENDER,
            description='Test product for API endpoints testing',
            current_stock=15,
            current_stock_damaged=2
        )
        db.session.add(self.test_product)
        db.session.commit()  # Commit to get product ID
        
        # Create test part
        self.test_part = Part(
            part_sku=f'TEST-API-PART-{timestamp}',
            part_name=f'Test Part API {timestamp}',
            part_type=PartType.MOTOR,
            product_id=self.test_product.id,  # Use actual product ID
            current_stock=20,
            current_stock_damaged=3,
            cost_price=25.0,
            selling_price=30.0
        )
        db.session.add(self.test_part)
        
        # Create test order
        self.test_order = Order(
            tracking_number=f'TEST-API-ORDER-{timestamp}',
            status=OrderStatus.IN_MAINTENANCE,
            customer_phone='+201155125999',
            customer_name='Test Customer API',
            cod_amount=150.0,  # Use cod_amount instead of total_amount
            bosta_data={'test': 'api_data'}
        )
        db.session.add(self.test_order)
        
        db.session.commit()
        
        # Store IDs for tests
        self.product_id = self.test_product.id
        self.part_id = self.test_part.id
        self.order_id = self.test_order.id
        
    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        
    def test_create_service_action_part_replace(self):
        """Test creating a part replace service action with multi-product support"""
        data = {
            'action_type': 'part_replace',
            'customer_phone': '+201155125999',
            'original_tracking': 'ORIGINAL-123456',
            'items_to_send': [
                {'item_type': 'part', 'item_id': self.part_id, 'quantity': 2},
                {'item_type': 'product', 'item_id': self.product_id, 'quantity': 1}
            ],
            'notes': 'Test part replacement with multiple items'
        }
        
        response = self.client.post('/api/v1/services/create', 
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        self.assertIn('data', response_data)
        
        # Verify service action was created
        service_action = ServiceAction.query.get(response_data['data']['id'])
        self.assertIsNotNone(service_action)
        self.assertEqual(service_action.action_type, ServiceActionType.PART_REPLACE)
        
        # Verify service action items were created
        items = ServiceActionItem.query.filter_by(service_action_id=service_action.id).all()
        self.assertEqual(len(items), 2)
        
    def test_create_service_action_return_from_customer(self):
        """Test creating a return from customer service action"""
        data = {
            'action_type': 'return_from_customer',
            'customer_phone': '+201155125999',
            'original_tracking': 'RETURN-123456',
            'refund_amount': 125.50,
            'notes': 'Customer return request'
        }
        
        response = self.client.post('/api/v1/services/create', 
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Verify service action was created with refund amount
        service_action = ServiceAction.query.get(response_data['data']['id'])
        self.assertIsNotNone(service_action)
        self.assertEqual(service_action.action_type, ServiceActionType.RETURN_FROM_CUSTOMER)
        self.assertEqual(float(service_action.refund_amount), 125.50)
        
    def test_confirm_and_send_workflow(self):
        """Test complete confirm and send workflow"""
        # First create a service action
        service_action = ServiceAction(
            action_type=ServiceActionType.PART_REPLACE,
            status=ServiceActionStatus.CREATED,
            customer_phone='+201155125999',
            original_tracking_number='TEST-CONFIRM-123',
            notes='Test confirm and send'
        ).save()
        
        # Create service action items
        item1 = ServiceActionItem(
            service_action_id=service_action.id,
            item_type='part',
            item_id=self.part_id,
            quantity_to_send=2
        )
        item2 = ServiceActionItem(
            service_action_id=service_action.id,
            item_type='product',
            item_id=self.product_id,
            quantity_to_send=1
        )
        db.session.add(item1)
        db.session.add(item2)
        db.session.commit()
        
        # Test confirm and send
        data = {
            'new_tracking_number': 'NEW-TRACKING-456',
            'user_name': 'Test User',
            'notes': 'Confirmed and sent to customer'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action.id}/confirm-send',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Verify stock was reduced
        updated_part = Part.query.get(self.part_id)
        updated_product = Product.query.get(self.product_id)
        
        self.assertEqual(updated_part.current_stock, 18)  # 20 - 2
        self.assertEqual(updated_product.current_stock, 14)  # 15 - 1
        
        # Verify service action status updated
        updated_service_action = ServiceAction.query.get(service_action.id)
        self.assertEqual(updated_service_action.status, ServiceActionStatus.CONFIRMED)
        self.assertEqual(updated_service_action.new_tracking_number, 'NEW-TRACKING-456')
        
    def test_receive_replacement_items(self):
        """Test receiving replacement items back from customer"""
        # First create and confirm a service action
        service_action = ServiceAction(
            action_type=ServiceActionType.FULL_REPLACE,
            status=ServiceActionStatus.CONFIRMED,
            customer_phone='+201155125999',
            original_tracking_number='TEST-RECEIVE-123',
            new_tracking_number='SENT-TRACKING-789'
        ).save()
        
        # Test receive replacement items
        data = {
            'items_received': [
                {'item_type': 'part', 'item_id': self.part_id, 'quantity': 1, 'condition': 'damaged'},
                {'item_type': 'product', 'item_id': self.product_id, 'quantity': 1, 'condition': 'valid'}
            ],
            'user_name': 'Test Receiver',
            'notes': 'Received damaged and valid items'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action.id}/receive-replacement',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Verify stock was updated correctly
        updated_part = Part.query.get(self.part_id)
        updated_product = Product.query.get(self.product_id)
        
        # Part: damaged condition increases damaged stock
        self.assertEqual(updated_part.current_stock_damaged, 4)  # 3 + 1
        
        # Product: valid condition increases total stock but not damaged
        self.assertEqual(updated_product.current_stock, 16)  # 15 + 1
        self.assertEqual(updated_product.current_stock_damaged, 2)  # unchanged
        
    def test_confirm_return_workflow(self):
        """Test confirm return workflow for customer returns"""
        # Create return service action
        service_action = ServiceAction(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            status=ServiceActionStatus.CREATED,
            customer_phone='+201155125999',
            original_tracking_number='RETURN-TRACKING-123',
            refund_amount=75.0
        ).save()
        
        data = {
            'new_tracking_number': 'CUSTOMER-RETURN-456',
            'user_name': 'Test Return Handler',
            'notes': 'Customer will ship items back'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action.id}/confirm-return',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Verify service action updated
        updated_service_action = ServiceAction.query.get(service_action.id)
        self.assertEqual(updated_service_action.status, ServiceActionStatus.CONFIRMED)
        self.assertEqual(updated_service_action.new_tracking_number, 'CUSTOMER-RETURN-456')
        
    def test_receive_return_items(self):
        """Test receiving return items from customer"""
        service_action = ServiceAction(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            status=ServiceActionStatus.CONFIRMED,
            customer_phone='+201155125999',
            original_tracking_number='RETURN-123',
            new_tracking_number='CUSTOMER-RETURN-789',
            refund_amount=100.0
        ).save()
        
        data = {
            'items_received': [
                {'item_type': 'product', 'item_id': self.product_id, 'quantity': 1, 'condition': 'valid'}
            ],
            'user_name': 'Test Return Receiver',
            'notes': 'Customer returned valid product'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action.id}/receive-return',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Verify stock increased
        updated_product = Product.query.get(self.product_id)
        self.assertEqual(updated_product.current_stock, 16)  # 15 + 1
        
    def test_process_refund_and_complete(self):
        """Test processing refund and completing return"""
        service_action = ServiceAction(
            action_type=ServiceActionType.RETURN_FROM_CUSTOMER,
            status=ServiceActionStatus.PENDING_RECEIVE,
            customer_phone='+201155125999',
            original_tracking_number='RETURN-TEST-123',
            refund_amount=150.0,
            refund_processed=False
        ).save()
        
        data = {
            'user_name': 'Test Refund Processor',
            'notes': 'Refund processed successfully'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action.id}/process-refund',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Verify refund was processed
        updated_service_action = ServiceAction.query.get(service_action.id)
        self.assertTrue(updated_service_action.refund_processed)
        self.assertIsNotNone(updated_service_action.refund_processed_at)
        
    def test_maintenance_stock_adjustment(self):
        """Test stock adjustment during maintenance"""
        data = {
            'adjustments': [
                {'item_type': 'part', 'item_id': self.part_id, 'quantity': -3, 'condition': 'valid', 'notes': 'Used for repair'},
                {'item_type': 'part', 'item_id': self.part_id, 'quantity': 1, 'condition': 'damaged', 'notes': 'Removed damaged part'},
                {'item_type': 'product', 'item_id': self.product_id, 'quantity': -1, 'condition': 'valid', 'notes': 'Used as replacement'}
            ],
            'user_name': 'Test Maintenance Tech'
        }
        
        response = self.client.post(f'/api/orders/{self.order_id}/stock-adjustment',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        self.assertEqual(response_data['data']['total_adjustments'], 3)
        
        # Verify stock changes
        updated_part = Part.query.get(self.part_id)
        updated_product = Product.query.get(self.product_id)
        
        # Part: -3 valid (reduces total), +1 damaged (increases damaged)
        self.assertEqual(updated_part.current_stock, 18)  # 20 - 3 + 1
        self.assertEqual(updated_part.current_stock_damaged, 4)  # 3 + 1
        
        # Product: -1 valid
        self.assertEqual(updated_product.current_stock, 14)  # 15 - 1
        
        # Verify stock movements were created
        movements = StockMovement.query.filter_by(order_id=self.order_id).all()
        self.assertEqual(len(movements), 3)
        
    def test_get_stock_movements(self):
        """Test getting stock movements with filtering"""
        # Create some stock movements first
        StockService.maintenance_adjustment(
            self.order_id, 'part', self.part_id, -2, 'valid', 'Test movement', 'Test User'
        )
        db.session.commit()
        
        # Test getting all movements
        response = self.client.get('/api/v1/stock/movements')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Test filtering by item type
        response = self.client.get('/api/v1/stock/movements?item_type=part')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Test filtering by order
        response = self.client.get(f'/api/v1/stock/movements?order_id={self.order_id}')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
    def test_get_current_stock(self):
        """Test getting current stock levels"""
        response = self.client.get('/api/v1/stock/current')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        self.assertIn('data', response_data)
        
        # Test filtering by item type
        response = self.client.get('/api/v1/stock/current?item_type=product')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
    def test_get_item_stock_details(self):
        """Test getting detailed stock information for specific item"""
        response = self.client.get(f'/api/v1/stock/item/product/{self.product_id}')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        response = self.client.get(f'/api/v1/stock/item/part/{self.part_id}')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        
        # Test invalid item type
        response = self.client.get(f'/api/v1/stock/item/invalid/{self.product_id}')
        self.assertEqual(response.status_code, 400)
        
    def test_get_stock_dashboard(self):
        """Test getting stock dashboard overview"""
        response = self.client.get('/api/v1/stock/dashboard')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data['success'])
        self.assertIn('data', response_data)
        
    def test_api_error_handling(self):
        """Test API error handling for invalid requests"""
        # Test invalid service action type
        data = {
            'action_type': 'invalid_type',
            'customer_phone': '+201155125999',
            'original_tracking': 'ERROR-TEST-123'
        }
        
        response = self.client.post('/api/v1/services/create',
                                  data=json.dumps(data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 400)
        
        # Test missing required fields for replacement
        data = {
            'action_type': 'part_replace',
            'customer_phone': '+201155125999',
            'original_tracking': 'ERROR-TEST-456'
            # Missing items_to_send
        }
        
        response = self.client.post('/api/v1/services/create',
                                  data=json.dumps(data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 400)
        
        # Test missing refund amount for return
        data = {
            'action_type': 'return_from_customer',
            'customer_phone': '+201155125999',
            'original_tracking': 'ERROR-TEST-789'
            # Missing refund_amount
        }
        
        response = self.client.post('/api/v1/services/create',
                                  data=json.dumps(data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 400)
        
    def test_complete_api_workflow_integration(self):
        """Test complete API workflow from start to finish"""
        # 1. Create a part replace service action
        create_data = {
            'action_type': 'part_replace',
            'customer_phone': '+201155125999',
            'original_tracking': 'WORKFLOW-TEST-123',
            'items_to_send': [
                {'item_type': 'part', 'item_id': self.part_id, 'quantity': 2}
            ],
            'notes': 'Complete workflow test'
        }
        
        response = self.client.post('/api/v1/services/create',
                                  data=json.dumps(create_data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 201)
        service_action_id = json.loads(response.data)['data']['id']
        
        # 2. Confirm and send (reduce stock)
        confirm_data = {
            'new_tracking_number': 'SENT-WORKFLOW-456',
            'notes': 'Sent to customer'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action_id}/confirm-send',
                                  data=json.dumps(confirm_data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # 3. Receive replacement items back (add stock)
        receive_data = {
            'items_received': [
                {'item_type': 'part', 'item_id': self.part_id, 'quantity': 2, 'condition': 'damaged'}
            ],
            'notes': 'Received damaged parts back'
        }
        
        response = self.client.post(f'/api/v1/services/{service_action_id}/receive-replacement',
                                  data=json.dumps(receive_data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # 4. Verify final stock state
        final_part = Part.query.get(self.part_id)
        self.assertEqual(final_part.current_stock, 20)  # Back to original (20 - 2 + 2)
        self.assertEqual(final_part.current_stock_damaged, 5)  # Increased by 2 (3 + 2)
        
        # 5. Verify stock movements were created
        movements = StockMovement.query.filter_by(service_action_id=service_action_id).all()
        self.assertEqual(len(movements), 2)  # Send and receive movements
        
        # 6. Test stock endpoints with the updated data
        response = self.client.get('/api/v1/stock/current')
        self.assertEqual(response.status_code, 200)
        
        response = self.client.get(f'/api/v1/stock/item/part/{self.part_id}')
        self.assertEqual(response.status_code, 200)
        

if __name__ == '__main__':
    print("🧪 Running API Endpoints Test Suite...")
    print("=" * 60)
    
    # Create test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(APIEndpointsTestCase)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"🔍 Tests Run: {result.testsRun}")
    print(f"✅ Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"❌ Failures: {len(result.failures)}")
    print(f"💥 Errors: {len(result.errors)}")
    
    if result.failures:
        print(f"\n🚨 FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback}")
    
    if result.errors:
        print(f"\n💥 ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback}")
    
    if result.wasSuccessful():
        print(f"\n🎉 All API endpoint tests passed! Task 4 endpoints are working correctly.")
    else:
        print(f"\n⚠️  Some tests failed. Please check the implementation.")
        
    print("=" * 60)
