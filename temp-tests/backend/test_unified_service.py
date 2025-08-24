#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Minimal test to debug UnifiedService.confirm_and_send method
"""

import sys
import os

# Add the back directory to sys.path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'back'))

# Import Flask app and database
from app import create_app
from db.auto_init import db, Product, Part, ServiceAction, ServiceActionItem
from db.auto_init import ServiceActionType, ServiceActionStatus, ProductCategory, PartType
from services.unified_service import UnifiedService

def test_unified_service():
    """Test UnifiedService.confirm_and_send method directly"""
    print("🧪 Testing UnifiedService.confirm_and_send method directly...")
    
    # Create app
    app = create_app('testing')
    app_context = app.app_context()
    app_context.push()
    
    try:
        # Create all tables
        db.create_all()
        print("✅ Tables created successfully")
        
        # Create test product
        from db.auto_init import ProductCategory
        product = Product(
            sku='TEST-UNIFIED-001',
            name_ar='Test Product Unified',
            category=ProductCategory.HAND_BLENDER,
            current_stock=10,
            current_stock_damaged=1
        )
        db.session.add(product)
        db.session.commit()
        print(f"✅ Product created: {product.id}")
        
        # Create test part
        from db.auto_init import PartType
        part = Part(
            part_sku='TEST-UNIFIED-PART-001',
            part_name='Test Part Unified',
            part_type=PartType.MOTOR,
            product_id=product.id,
            current_stock=20,
            current_stock_damaged=2,
            cost_price=25.0,
            selling_price=30.0
        )
        db.session.add(part)
        db.session.commit()
        print(f"✅ Part created: {part.id}")
        
        # Create test service action
        service_action = ServiceAction(
            action_type=ServiceActionType.PART_REPLACE,
            customer_phone='+201155125743',
            original_tracking_number='68427300',
            status=ServiceActionStatus.CREATED
        )
        db.session.add(service_action)
        db.session.commit()
        print(f"✅ Service action created: {service_action.id}")
        
        # Create ServiceActionItem
        service_item = ServiceActionItem(
            service_action_id=service_action.id,
            item_type='part',
            item_id=part.id,
            quantity_to_send=2
        )
        db.session.add(service_item)
        db.session.commit()
        print(f"✅ Service action item created: {service_item.id}")
        
        # Test UnifiedService.confirm_and_send method
        print("\n🔍 Testing UnifiedService.confirm_and_send method...")
        try:
            success, data, error = UnifiedService.confirm_and_send(
                service_action_id=service_action.id,
                new_tracking_number='NEW-TRACKING-001',
                user_name='Test User'
            )
            
            if success:
                print(f"✅ UnifiedService.confirm_and_send succeeded: {data}")
            else:
                print(f"❌ UnifiedService.confirm_and_send failed: {error}")
                
        except Exception as e:
            print(f"💥 UnifiedService.confirm_and_send exception: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n✅ UnifiedService test completed!")
        
    except Exception as e:
        print(f"💥 Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up
        app_context.pop()

if __name__ == '__main__':
    test_unified_service()
