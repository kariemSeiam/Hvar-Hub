#!/usr/bin/env python3
"""
Test script for product synchronization functionality.
This script tests the new auto-sync endpoints and service methods.
"""

import sys
import os
import json
import requests
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'back'))

def test_sync_endpoints():
    """Test the new sync endpoints"""
    base_url = "http://localhost:5000/api/v1"
    
    print("🧪 Testing Product Synchronization Endpoints")
    print("=" * 50)
    
    # Test 1: Get sync status
    print("\n1. Testing GET /sync/status...")
    try:
        response = requests.get(f"{base_url}/sync/status")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Database: {data['data']['database']}")
            print(f"   JSON File: {data['data']['json_file']}")
            print(f"   Sync Needed: {data['data']['sync_needed']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 2: Sync products from JSON
    print("\n2. Testing POST /sync/products...")
    try:
        response = requests.post(f"{base_url}/sync/products")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Products Created: {data['data']['products_created']}")
            print(f"   Products Updated: {data['data']['products_updated']}")
            print(f"   Parts Created: {data['data']['parts_created']}")
            print(f"   Parts Updated: {data['data']['parts_updated']}")
            if data['data']['errors']:
                print(f"   Errors: {len(data['data']['errors'])}")
                for error in data['data']['errors'][:3]:  # Show first 3 errors
                    print(f"     - {error}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 3: Get sync status after sync
    print("\n3. Testing GET /sync/status after sync...")
    try:
        response = requests.get(f"{base_url}/sync/status")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Database: {data['data']['database']}")
            print(f"   JSON File: {data['data']['json_file']}")
            print(f"   Sync Needed: {data['data']['sync_needed']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 4: List products to verify they were created
    print("\n4. Testing GET /products to verify sync...")
    try:
        response = requests.get(f"{base_url}/products?limit=5")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: Found {len(data['data']['products'])} products")
            for product in data['data']['products'][:3]:  # Show first 3 products
                print(f"   - {product['sku']}: {product['name_ar']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_service_methods():
    """Test the service methods directly"""
    print("\n🔧 Testing Service Methods Directly")
    print("=" * 50)
    
    try:
        from services.product_service import ProductService
        
        # Test sync status
        print("\n1. Testing get_sync_status()...")
        status = ProductService.get_sync_status()
        if 'error' not in status:
            print(f"✅ Success: Database has {status['database']['products_count']} products and {status['database']['parts_count']} parts")
            print(f"   JSON file has {status['json_file']['products_count']} products and {status['json_file']['parts_count']} parts")
            print(f"   Sync needed: {status['sync_needed']}")
        else:
            print(f"❌ Error: {status['error']}")
        
        # Test sync from JSON
        print("\n2. Testing sync_products_from_json()...")
        success, results, error = ProductService.sync_products_from_json()
        if success:
            print(f"✅ Success: {results['products_created']} products created, {results['parts_created']} parts created")
            if results['errors']:
                print(f"   Errors: {len(results['errors'])}")
                for error in results['errors'][:3]:
                    print(f"     - {error}")
        else:
            print(f"❌ Error: {error}")
            
    except ImportError as e:
        print(f"❌ Import Error: {str(e)}")
        print("   Make sure you're running this from the correct directory")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Product Synchronization Test Suite")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Test endpoints (requires running Flask app)
    test_sync_endpoints()
    
    # Test service methods directly
    test_service_methods()
    
    print("\n" + "=" * 60)
    print("🏁 Test suite completed!")

if __name__ == "__main__":
    main()
