# Product Synchronization System

## Overview

This system automatically synchronizes products and parts from the `products.json` file to the database. It creates new products/parts if they don't exist and updates existing ones with the latest data.

## Features

- **Automatic Sync**: Syncs all products and parts from JSON to database
- **Smart Updates**: Only updates what's changed, creates what's new
- **Error Handling**: Comprehensive error reporting for failed syncs
- **Status Monitoring**: Check if sync is needed and view current counts
- **Flexible Paths**: Support for custom JSON file paths

## API Endpoints

### 1. Sync Products from JSON
```http
POST /api/v1/sync/products
```

**Request Body (Optional):**
```json
{
  "json_file_path": "/custom/path/products.json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products_created": 5,
    "products_updated": 2,
    "parts_created": 25,
    "parts_updated": 10,
    "errors": []
  },
  "message": "تمت المزامنة بنجاح: 5 منتج جديد، 25 قطعة جديدة"
}
```

### 2. Get Sync Status
```http
GET /api/v1/sync/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "products_count": 19,
      "parts_count": 115
    },
    "json_file": {
      "file_exists": true,
      "last_modified": 1706364000.0,
      "products_count": 19,
      "parts_count": 115
    },
    "sync_needed": false
  },
  "message": "تم جلب حالة المزامنة بنجاح"
}
```

### 3. Force Sync (Overwrite)
```http
POST /api/v1/sync/force
```

Similar to regular sync but can be used for complete data refresh.

## Frontend Usage

### Using the API Client

```javascript
import { productAPI } from '../api/productAPI';

// Check sync status
const syncStatus = await productAPI.getSyncStatus();
if (syncStatus.success) {
  console.log('Database:', syncStatus.data.database);
  console.log('JSON File:', syncStatus.data.json_file);
  console.log('Sync needed:', syncStatus.data.sync_needed);
}

// Sync products from JSON
const syncResult = await productAPI.syncProductsFromJSON();
if (syncResult.success) {
  console.log('Sync completed:', syncResult.data);
  console.log('Message:', syncResult.message);
}

// Force sync (overwrite existing data)
const forceSyncResult = await productAPI.forceSyncProducts();
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { productAPI } from '../api/productAPI';

const useProductSync = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const checkSyncStatus = async () => {
    const result = await productAPI.getSyncStatus();
    if (result.success) {
      setSyncStatus(result.data);
    }
  };

  const syncProducts = async () => {
    setIsSyncing(true);
    try {
      const result = await productAPI.syncProductsFromJSON();
      if (result.success) {
        setLastSync(new Date());
        await checkSyncStatus(); // Refresh status
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkSyncStatus();
  }, []);

  return {
    syncStatus,
    isSyncing,
    lastSync,
    checkSyncStatus,
    syncProducts
  };
};
```

## Data Mapping

### Product Fields
- `sku` → `Product.sku` (unique identifier)
- `name_ar` → `Product.name_ar` (Arabic name)
- `category` → `Product.category` (validated enum)
- `alert_quantity` → `Product.alert_quantity`
- `warranty_period_months` → `Product.warranty_period_months`
- `is_active` → `Product.is_active`
- `features`, `power_watts`, `capacity_liters`, `color`, `speeds_count` → `Product.specifications` (JSON)

### Part Fields
- `part_sku` → `Part.part_sku` (unique identifier)
- `part_name` → `Part.part_name`
- `part_type` → `Part.part_type` (validated enum)
- `product_id` → `Part.product_id` (auto-linked to product)

## Error Handling

The system provides detailed error reporting:

```json
{
  "success": false,
  "data": {
    "products_created": 0,
    "products_updated": 0,
    "parts_created": 0,
    "parts_updated": 0,
    "errors": [
      "بيانات المنتج غير مكتملة: hvar123",
      "فئة المنتج غير صحيحة: فئة غير موجودة للـ SKU: hvar456",
      "نوع القطعة غير صحيح: نوع غير صحيح للـ SKU: hvar789"
    ]
  }
}
```

## Validation Rules

1. **Product Validation**:
   - SKU must be unique
   - Name must not be empty
   - Category must be a valid enum value

2. **Part Validation**:
   - Part SKU must be unique
   - Part name must not be empty
   - Part type must be a valid enum value
   - Product must exist

3. **Enum Values**:
   - **Product Categories**: `هاند بلندر`, `مكنسة`, `كبه`, `خلاط هفار`, `فرن هفار كهربائي`, `عجان`, `مطحنه توابل`
   - **Part Types**: `motor`, `component`, `assembly`, `packaging`, `heating_element`, `warranty`, `coupon`

## Testing

Run the test script to verify functionality:

```bash
cd temp-tests/backend
python test_product_sync.py
```

## Integration Points

- **Service Actions**: Products and parts are now available for service action creation
- **Inventory Management**: Real-time stock tracking and analytics
- **Maintenance Workflow**: Parts can be linked to maintenance orders
- **Customer Service**: Product catalog for customer inquiries

## Security Notes

- All endpoints follow existing authentication patterns
- Input validation prevents injection attacks
- File path validation prevents directory traversal
- Error messages don't expose internal system details
