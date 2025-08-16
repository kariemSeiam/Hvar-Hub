#!/usr/bin/env python3
"""
Simple test script to check products API endpoints and database connection.
"""

import sys
import os
import requests
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'back'))

def test_database_connection():
    """Test if we can connect to the database and access products"""
    print("🔧 Testing Database Connection...")
    print("=" * 50)
    
    try:
        from db import db
        from db.auto_init import Product, Part
        
        # Try to count products
        products_count = Product.query.count()
        parts_count = Part.query.count()
        
        print(f"✅ Database connection successful!")
        print(f"   Products in database: {products_count}")
        print(f"   Parts in database: {parts_count}")
        
        if products_count == 0:
            print("   ⚠️  No products found in database - sync needed")
        else:
            print("   ✅ Products found in database")
            
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def test_service_methods():
    """Test the ProductService methods directly"""
    print("\n🔧 Testing ProductService Methods...")
    print("=" * 50)
    
    try:
        from services.product_service import ProductService
        
        # Test sync status
        print("1. Testing get_sync_status()...")
        status = ProductService.get_sync_status()
        if 'error' not in status:
            print(f"✅ Success: Database has {status['database']['products_count']} products and {status['database']['parts_count']} parts")
            print(f"   JSON file has {status['json_file']['products_count']} products and {status['json_file']['parts_count']} parts")
            print(f"   Sync needed: {status['sync_needed']}")
            
            if status['sync_needed']:
                print("   🔄 Sync is needed - products will be created from JSON")
            else:
                print("   ✅ Database is up to date")
        else:
            print(f"❌ Error: {status['error']}")
            return False
        
        # Test sync from JSON if needed
        if status.get('sync_needed', False):
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
                return False
        
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {str(e)}")
        print("   Make sure you're running this from the correct directory")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_api_endpoints():
    """Test the API endpoints if Flask app is running"""
    print("\n🌐 Testing API Endpoints...")
    print("=" * 50)
    
    base_url = "http://localhost:5000/api/v1"
    
    # Test 1: List products
    print("1. Testing GET /products...")
    try:
        response = requests.get(f"{base_url}/products?limit=5", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: Found {len(data['data']['products'])} products")
            for product in data['data']['products'][:3]:
                print(f"   - {product['sku']}: {product['name_ar']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Flask app not running")
        print("   Start the Flask app with: python run.py")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 2: Sync status
    print("\n2. Testing GET /sync/status...")
    try:
        response = requests.get(f"{base_url}/sync/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Database: {data['data']['database']}")
            print(f"   JSON File: {data['data']['json_file']}")
            print(f"   Sync Needed: {data['data']['sync_needed']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Flask app not running")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Products API Test Suite")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Test database connection
    db_ok = test_database_connection()
    
    if db_ok:
        # Test service methods
        service_ok = test_service_methods()
        
        if service_ok:
            print("\n✅ All backend tests passed!")
        else:
            print("\n❌ Service tests failed!")
    else:
        print("\n❌ Database connection failed!")
    
    # Test API endpoints (requires running Flask app)
    test_api_endpoints()
    
    print("\n" + "=" * 60)
    print("🏁 Test suite completed!")
    
    if not db_ok:
        print("\n💡 Next steps:")
        print("   1. Check database configuration in config/config.py")
        print("   2. Ensure database file exists and is accessible")
        print("   3. Run: python init_db.py")
        print("   4. Start Flask app: python run.py")

if __name__ == "__main__":
    main()
