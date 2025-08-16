#!/usr/bin/env python3
"""
Test script for service action API endpoints.
"""

import requests
import json

def test_create_service_action():
    """Test creating a service action with correct data format."""
    
    # Test data matching backend expectations
    test_data = {
        "action_type": "part_replace",
        "customer": {
            "phone": "123456789",
            "primary_phone": "123456789",
            "first_name": "Test",
            "last_name": "Customer",
            "full_name": "Test Customer",
            "name": "Test Customer"
        },
        "original_tracking": "TEST123",
        "product_id": None,
        "part_id": None,
        "refund_amount": None,
        "notes": "Test service action creation",
        "action_data": {
            "priority": "normal",
            "replacement_product_id": None,
            "selected_order_id": "test_order_123"
        }
    }
    
    try:
        # Test the create endpoint
        response = requests.post(
            "http://127.0.0.1:5001/api/v1/services/create",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            print("✅ Service action created successfully!")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ Failed to create service action. Status: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Flask app not running")
    except requests.exceptions.Timeout:
        print("❌ Request timeout")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_list_service_actions():
    """Test listing service actions."""
    
    try:
        response = requests.get(
            "http://127.0.0.1:5001/api/v1/services",
            timeout=10
        )
        
        print(f"\n📋 List Service Actions:")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('success')}")
            print(f"Total Actions: {data.get('data', {}).get('pagination', {}).get('total', 0)}")
        else:
            print(f"❌ Failed to list service actions")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Flask app not running")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Testing Service Action API Endpoints...")
    print("=" * 50)
    
    test_create_service_action()
    test_list_service_actions()
    
    print("\n�� Test completed!")
