// 🏪 HVAR Hub Inventory Management Mock Data
// Comprehensive mock data for inventory management system

import { formatGregorianDate } from '../utils/dateUtils';

// ============================================================================
// 📊 ENUMS & CONSTANTS
// ============================================================================

export const ReplacementType = {
  FULL_REPLACEMENT: 'full_replacement',
  PARTIAL_REPLACEMENT: 'partial_replacement',
  WARRANTY_REPLACEMENT: 'warranty_replacement',
  PAID_REPLACEMENT: 'paid_replacement'
};

export const ReplacementStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

export const StockMovementType = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  DAMAGED: 'damaged',
  EXPIRED: 'expired'
};

export const ProductCategory = {
  ELECTRONICS: 'electronics',
  APPLIANCES: 'appliances',
  MOBILE_PHONES: 'mobile_phones',
  COMPUTERS: 'computers',
  ACCESSORIES: 'accessories',
  SPARE_PARTS: 'spare_parts'
};

export const PartCategory = {
  SCREEN: 'screen',
  BATTERY: 'battery',
  CHARGER: 'charger',
  MOTHERBOARD: 'motherboard',
  PROCESSOR: 'processor',
  MEMORY: 'memory',
  STORAGE: 'storage',
  CAMERA: 'camera',
  SPEAKER: 'speaker',
  BUTTON: 'button',
  CASE: 'case',
  OTHER: 'other'
};

// ============================================================================
// 🏭 PRODUCTS MOCK DATA
// ============================================================================

export const mockProducts = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    name_ar: "آيفون 14 برو",
    sku: "IPHONE-14-PRO-128",
    category: ProductCategory.MOBILE_PHONES,
    brand: "Apple",
    model: "iPhone 14 Pro",
    description: "Latest iPhone with advanced camera system and A16 Bionic chip",
    specifications: {
      storage: "128GB",
      color: "Space Black",
      screen: "6.1 inch",
      processor: "A16 Bionic",
      camera: "48MP Main Camera"
    },
    warranty_period: 365,
    weight: 206,
    dimensions: { length: 147.5, width: 71.5, height: 7.85 },
    cost_price: 3500,
    selling_price: 4200,
    replacement_cost: 3800,
    current_stock: 15,
    min_stock_level: 5,
    max_stock_level: 50,
    reorder_point: 8,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-03-20T14:45:00Z"
  },
  {
    id: 2,
    name: "Samsung Galaxy S24",
    name_ar: "سامسونج جالكسي إس 24",
    sku: "SAMSUNG-S24-256",
    category: ProductCategory.MOBILE_PHONES,
    brand: "Samsung",
    model: "Galaxy S24",
    description: "Premium Android smartphone with AI features",
    specifications: {
      storage: "256GB",
      color: "Phantom Black",
      screen: "6.2 inch",
      processor: "Snapdragon 8 Gen 3",
      camera: "50MP Main Camera"
    },
    warranty_period: 365,
    weight: 168,
    dimensions: { length: 147, width: 70.6, height: 7.6 },
    cost_price: 3200,
    selling_price: 3800,
    replacement_cost: 3500,
    current_stock: 12,
    min_stock_level: 5,
    max_stock_level: 40,
    reorder_point: 8,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-01-20T09:15:00Z",
    updated_at: "2024-03-18T16:30:00Z"
  },
  {
    id: 3,
    name: "MacBook Pro 14",
    name_ar: "ماك بوك برو 14",
    sku: "MACBOOK-PRO-14-512",
    category: ProductCategory.COMPUTERS,
    brand: "Apple",
    model: "MacBook Pro 14",
    description: "Professional laptop with M3 Pro chip",
    specifications: {
      storage: "512GB",
      memory: "16GB",
      processor: "M3 Pro",
      screen: "14.2 inch Liquid Retina XDR"
    },
    warranty_period: 730,
    weight: 1600,
    dimensions: { length: 312.6, width: 221.2, height: 15.5 },
    cost_price: 8500,
    selling_price: 9500,
    replacement_cost: 9000,
    current_stock: 8,
    min_stock_level: 3,
    max_stock_level: 20,
    reorder_point: 5,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-02-01T11:00:00Z",
    updated_at: "2024-03-19T13:20:00Z"
  },
  {
    id: 4,
    name: "Dell XPS 13",
    name_ar: "ديل إكس بي إس 13",
    sku: "DELL-XPS-13-512",
    category: ProductCategory.COMPUTERS,
    brand: "Dell",
    model: "XPS 13",
    description: "Ultrabook with Intel Core i7 processor",
    specifications: {
      storage: "512GB",
      memory: "16GB",
      processor: "Intel Core i7-1250U",
      screen: "13.4 inch 4K OLED"
    },
    warranty_period: 730,
    weight: 1200,
    dimensions: { length: 295.7, width: 199.5, height: 14.8 },
    cost_price: 6000,
    selling_price: 7200,
    replacement_cost: 6500,
    current_stock: 6,
    min_stock_level: 2,
    max_stock_level: 15,
    reorder_point: 4,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-02-10T14:30:00Z",
    updated_at: "2024-03-17T10:45:00Z"
  },
  {
    id: 5,
    name: "Sony WH-1000XM5",
    name_ar: "سوني دبليو إتش 1000 إكس إم 5",
    sku: "SONY-WH1000XM5",
    category: ProductCategory.ACCESSORIES,
    brand: "Sony",
    model: "WH-1000XM5",
    description: "Premium noise-cancelling headphones",
    specifications: {
      type: "Over-ear",
      connectivity: "Bluetooth 5.2",
      battery: "30 hours",
      features: "Active Noise Cancellation"
    },
    warranty_period: 365,
    weight: 250,
    dimensions: { length: 200, width: 150, height: 80 },
    cost_price: 1200,
    selling_price: 1500,
    replacement_cost: 1300,
    current_stock: 25,
    min_stock_level: 10,
    max_stock_level: 100,
    reorder_point: 15,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-01-25T16:20:00Z",
    updated_at: "2024-03-16T09:10:00Z"
  }
];

// ============================================================================
// 🔧 PARTS MOCK DATA
// ============================================================================

export const mockParts = [
  {
    id: 1,
    name: "iPhone 14 Pro Screen",
    name_ar: "شاشة آيفون 14 برو",
    sku: "PART-IPHONE14-SCREEN",
    part_number: "IP14P-SCR-001",
    category: PartCategory.SCREEN,
    product_id: 1,
    is_compatible_with: [1],
    description: "Original replacement screen for iPhone 14 Pro",
    specifications: {
      size: "6.1 inch",
      resolution: "2556 x 1179",
      technology: "OLED",
      protection: "Ceramic Shield"
    },
    warranty_period: 90,
    weight: 45,
    cost_price: 800,
    selling_price: 1200,
    replacement_cost: 1000,
    current_stock: 8,
    min_stock_level: 3,
    max_stock_level: 20,
    reorder_point: 5,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-03-20T14:45:00Z"
  },
  {
    id: 2,
    name: "iPhone 14 Pro Battery",
    name_ar: "بطارية آيفون 14 برو",
    sku: "PART-IPHONE14-BATTERY",
    part_number: "IP14P-BAT-001",
    category: PartCategory.BATTERY,
    product_id: 1,
    is_compatible_with: [1],
    description: "High-quality replacement battery for iPhone 14 Pro",
    specifications: {
      capacity: "3200mAh",
      voltage: "3.7V",
      chemistry: "Lithium-ion",
      cycles: "500+"
    },
    warranty_period: 180,
    weight: 25,
    cost_price: 150,
    selling_price: 250,
    replacement_cost: 200,
    current_stock: 15,
    min_stock_level: 5,
    max_stock_level: 50,
    reorder_point: 8,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-03-19T11:20:00Z"
  },
  {
    id: 3,
    name: "Samsung S24 Screen",
    name_ar: "شاشة سامسونج إس 24",
    sku: "PART-SAMSUNG-S24-SCREEN",
    part_number: "SS24-SCR-001",
    category: PartCategory.SCREEN,
    product_id: 2,
    is_compatible_with: [2],
    description: "Original replacement screen for Samsung Galaxy S24",
    specifications: {
      size: "6.2 inch",
      resolution: "2340 x 1080",
      technology: "Dynamic AMOLED 2X",
      protection: "Gorilla Glass Victus 2"
    },
    warranty_period: 90,
    weight: 42,
    cost_price: 750,
    selling_price: 1100,
    replacement_cost: 950,
    current_stock: 6,
    min_stock_level: 3,
    max_stock_level: 15,
    reorder_point: 5,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-01-20T09:15:00Z",
    updated_at: "2024-03-18T16:30:00Z"
  },
  {
    id: 4,
    name: "MacBook Pro 14 Battery",
    name_ar: "بطارية ماك بوك برو 14",
    sku: "PART-MACBOOK-14-BATTERY",
    part_number: "MBP14-BAT-001",
    category: PartCategory.BATTERY,
    product_id: 3,
    is_compatible_with: [3],
    description: "Replacement battery for MacBook Pro 14",
    specifications: {
      capacity: "72.4Wh",
      voltage: "11.47V",
      chemistry: "Lithium-ion",
      cycles: "1000+"
    },
    warranty_period: 365,
    weight: 180,
    cost_price: 400,
    selling_price: 600,
    replacement_cost: 500,
    current_stock: 4,
    min_stock_level: 2,
    max_stock_level: 10,
    reorder_point: 3,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-02-01T11:00:00Z",
    updated_at: "2024-03-19T13:20:00Z"
  },
  {
    id: 5,
    name: "Dell XPS 13 Motherboard",
    name_ar: "لوحة أم ديل إكس بي إس 13",
    sku: "PART-DELL-XPS13-MB",
    part_number: "DXPS13-MB-001",
    category: PartCategory.MOTHERBOARD,
    product_id: 4,
    is_compatible_with: [4],
    description: "Replacement motherboard for Dell XPS 13",
    specifications: {
      chipset: "Intel 600 Series",
      socket: "LGA 1700",
      memory: "DDR4/DDR5",
      expansion: "PCIe 4.0"
    },
    warranty_period: 365,
    weight: 250,
    cost_price: 1200,
    selling_price: 1800,
    replacement_cost: 1500,
    current_stock: 2,
    min_stock_level: 1,
    max_stock_level: 5,
    reorder_point: 2,
    is_active: true,
    is_available_for_replacement: true,
    created_at: "2024-02-10T14:30:00Z",
    updated_at: "2024-03-17T10:45:00Z"
  }
];

// ============================================================================
// 🔄 REPLACEMENTS MOCK DATA
// ============================================================================

export const mockReplacements = [
  {
    id: 1,
    order_id: 1001,
    replacement_type: ReplacementType.FULL_REPLACEMENT,
    replacement_reason: "Device completely damaged during shipping",
    product_id: 1,
    part_id: null,
    quantity: 1,
    unit_cost: 3800,
    total_cost: 3800,
    status: ReplacementStatus.COMPLETED,
    is_warranty_covered: true,
    technician_name: "أحمد محمد",
    replacement_notes: "Customer received new iPhone 14 Pro as replacement",
    requested_at: "2024-03-15T09:30:00Z",
    approved_at: "2024-03-15T10:00:00Z",
    completed_at: "2024-03-15T14:30:00Z",
    created_at: "2024-03-15T09:30:00Z",
    updated_at: "2024-03-15T14:30:00Z"
  },
  {
    id: 2,
    order_id: 1002,
    replacement_type: ReplacementType.PARTIAL_REPLACEMENT,
    replacement_reason: "Screen cracked, battery needs replacement",
    product_id: 1,
    part_id: 1,
    quantity: 1,
    unit_cost: 1000,
    total_cost: 1000,
    status: ReplacementStatus.IN_PROGRESS,
    is_warranty_covered: false,
    technician_name: "محمد علي",
    replacement_notes: "Screen replacement in progress, waiting for battery",
    requested_at: "2024-03-18T11:00:00Z",
    approved_at: "2024-03-18T11:30:00Z",
    completed_at: null,
    created_at: "2024-03-18T11:00:00Z",
    updated_at: "2024-03-18T11:30:00Z"
  },
  {
    id: 3,
    order_id: 1003,
    replacement_type: ReplacementType.PARTIAL_REPLACEMENT,
    replacement_reason: "Battery replacement needed",
    product_id: 2,
    part_id: 3,
    quantity: 1,
    unit_cost: 950,
    total_cost: 950,
    status: ReplacementStatus.APPROVED,
    is_warranty_covered: true,
    technician_name: "فاطمة أحمد",
    replacement_notes: "Approved for warranty replacement",
    requested_at: "2024-03-19T08:15:00Z",
    approved_at: "2024-03-19T08:45:00Z",
    completed_at: null,
    created_at: "2024-03-19T08:15:00Z",
    updated_at: "2024-03-19T08:45:00Z"
  },
  {
    id: 4,
    order_id: 1004,
    replacement_type: ReplacementType.FULL_REPLACEMENT,
    replacement_reason: "Device not working after repair attempts",
    product_id: 3,
    part_id: null,
    quantity: 1,
    unit_cost: 9000,
    total_cost: 9000,
    status: ReplacementStatus.PENDING,
    is_warranty_covered: true,
    technician_name: "علي حسن",
    replacement_notes: "Pending approval from management",
    requested_at: "2024-03-20T14:00:00Z",
    approved_at: null,
    completed_at: null,
    created_at: "2024-03-20T14:00:00Z",
    updated_at: "2024-03-20T14:00:00Z"
  },
  {
    id: 5,
    order_id: 1005,
    replacement_type: ReplacementType.PARTIAL_REPLACEMENT,
    replacement_reason: "Motherboard failure",
    product_id: 4,
    part_id: 5,
    quantity: 1,
    unit_cost: 1500,
    total_cost: 1500,
    status: ReplacementStatus.COMPLETED,
    is_warranty_covered: false,
    technician_name: "حسن محمد",
    replacement_notes: "Motherboard replaced successfully",
    requested_at: "2024-03-16T10:30:00Z",
    approved_at: "2024-03-16T11:00:00Z",
    completed_at: "2024-03-16T16:00:00Z",
    created_at: "2024-03-16T10:30:00Z",
    updated_at: "2024-03-16T16:00:00Z"
  }
];

// ============================================================================
// 📦 STOCK MOVEMENTS MOCK DATA
// ============================================================================

export const mockStockMovements = [
  {
    id: 1,
    movement_type: StockMovementType.OUTBOUND,
    product_id: 1,
    part_id: null,
    order_id: 1001,
    replacement_id: 1,
    quantity: 1,
    unit_cost: 3800,
    total_cost: 3800,
    previous_stock: 15,
    new_stock: 14,
    reference_number: "REP-001",
    reference_type: "replacement",
    user_name: "أحمد محمد",
    notes: "Full replacement for order 1001",
    created_at: "2024-03-15T14:30:00Z"
  },
  {
    id: 2,
    movement_type: StockMovementType.OUTBOUND,
    product_id: null,
    part_id: 1,
    order_id: 1002,
    replacement_id: 2,
    quantity: 1,
    unit_cost: 1000,
    total_cost: 1000,
    previous_stock: 8,
    new_stock: 7,
    reference_number: "REP-002",
    reference_type: "replacement",
    user_name: "محمد علي",
    notes: "Screen replacement for order 1002",
    created_at: "2024-03-18T11:30:00Z"
  },
  {
    id: 3,
    movement_type: StockMovementType.INBOUND,
    product_id: 1,
    part_id: null,
    order_id: null,
    replacement_id: null,
    quantity: 5,
    unit_cost: 3500,
    total_cost: 17500,
    previous_stock: 14,
    new_stock: 19,
    reference_number: "PUR-001",
    reference_type: "purchase",
    user_name: "مدير المخزن",
    notes: "New stock purchase",
    created_at: "2024-03-17T09:00:00Z"
  },
  {
    id: 4,
    movement_type: StockMovementType.ADJUSTMENT,
    product_id: null,
    part_id: 2,
    order_id: null,
    replacement_id: null,
    quantity: -2,
    unit_cost: 150,
    total_cost: -300,
    previous_stock: 15,
    new_stock: 13,
    reference_number: "ADJ-001",
    reference_type: "adjustment",
    user_name: "مدير المخزن",
    notes: "Damaged items removed",
    created_at: "2024-03-16T16:00:00Z"
  },
  {
    id: 5,
    movement_type: StockMovementType.OUTBOUND,
    product_id: null,
    part_id: 4,
    order_id: 1005,
    replacement_id: 5,
    quantity: 1,
    unit_cost: 500,
    total_cost: 500,
    previous_stock: 4,
    new_stock: 3,
    reference_number: "REP-005",
    reference_type: "replacement",
    user_name: "حسن محمد",
    notes: "Battery replacement for order 1005",
    created_at: "2024-03-16T16:00:00Z"
  }
];

// ============================================================================
// 📊 ANALYTICS MOCK DATA
// ============================================================================

export const mockInventoryAnalytics = {
  summary: {
    total_products: 5,
    total_parts: 5,
    total_stock_value: 125000,
    low_stock_items: 3,
    out_of_stock_items: 0,
    total_replacements: 15,
    warranty_replacements: 8,
    paid_replacements: 7,
    monthly_turnover: 0.25,
    average_stock_level: 0.65
  },
  
  replacement_analytics: {
    by_type: {
      full_replacement: 6,
      partial_replacement: 8,
      warranty_replacement: 8,
      paid_replacement: 7
    },
    by_status: {
      pending: 2,
      approved: 3,
      in_progress: 2,
      completed: 6,
      cancelled: 1,
      failed: 1
    },
    by_month: [
      { month: "يناير", count: 3, cost: 8500 },
      { month: "فبراير", count: 4, cost: 12000 },
      { month: "مارس", count: 8, cost: 18500 }
    ],
    top_replaced_products: [
      { product_id: 1, name: "iPhone 14 Pro", count: 5, cost: 12000 },
      { product_id: 2, name: "Samsung Galaxy S24", count: 3, cost: 8000 },
      { product_id: 3, name: "MacBook Pro 14", count: 2, cost: 15000 }
    ]
  },
  
  stock_usage_analytics: {
    most_used_parts: [
      { part_id: 1, name: "iPhone 14 Pro Screen", usage_count: 8, total_cost: 8000 },
      { part_id: 2, name: "iPhone 14 Pro Battery", usage_count: 12, total_cost: 2400 },
      { part_id: 3, name: "Samsung S24 Screen", usage_count: 5, total_cost: 4750 }
    ],
    stock_turnover: [
      { product_id: 1, name: "iPhone 14 Pro", turnover_rate: 0.4 },
      { product_id: 2, name: "Samsung Galaxy S24", turnover_rate: 0.3 },
      { product_id: 3, name: "MacBook Pro 14", turnover_rate: 0.2 }
    ],
    reorder_suggestions: [
      { product_id: 4, name: "Dell XPS 13", current_stock: 6, suggested_order: 4 },
      { product_id: 5, name: "Sony WH-1000XM5", current_stock: 25, suggested_order: 15 }
    ]
  },
  
  maintenance_impact: {
    total_maintenance_orders: 45,
    orders_with_replacements: 15,
    replacement_rate: 0.33,
    average_replacement_cost: 1850,
    warranty_coverage_rate: 0.53,
    most_common_issues: [
      { issue: "Screen Damage", count: 8, percentage: 0.53 },
      { issue: "Battery Failure", count: 4, percentage: 0.27 },
      { issue: "Motherboard Issues", count: 2, percentage: 0.13 },
      { issue: "Other", count: 1, percentage: 0.07 }
    ]
  },
  
  forecasting_data: {
    next_month_predictions: {
      expected_replacements: 12,
      expected_cost: 22000,
      stock_needed: {
        products: [
          { product_id: 1, quantity: 3 },
          { product_id: 2, quantity: 2 }
        ],
        parts: [
          { part_id: 1, quantity: 5 },
          { part_id: 2, quantity: 8 }
        ]
      }
    },
    seasonal_trends: [
      { month: "يناير", replacements: 3, cost: 8500 },
      { month: "فبراير", replacements: 4, cost: 12000 },
      { month: "مارس", replacements: 8, cost: 18500 },
      { month: "أبريل", predicted_replacements: 10, predicted_cost: 20000 }
    ]
  },
  
  cost_analytics: {
    total_inventory_value: 125000,
    monthly_replacement_costs: [
      { month: "يناير", cost: 8500 },
      { month: "فبراير", cost: 12000 },
      { month: "مارس", cost: 18500 }
    ],
    cost_by_category: {
      full_replacements: 45000,
      partial_replacements: 15000,
      warranty_costs: 32000,
      paid_costs: 28000
    },
    profitability_metrics: {
      gross_margin: 0.25,
      net_margin: 0.15,
      roi: 0.35
    }
  }
};

// ============================================================================
// 📋 ENHANCED ORDERS WITH INVENTORY INTEGRATION
// ============================================================================

export const mockOrdersWithInventory = [
  {
    id: 1001,
    tracking_number: "BOSTA-001-2024",
    status: "completed",
    customer_name: "أحمد محمد علي",
    customer_phone: "+201234567890",
    customer_second_phone: "+201098765432",
    pickup_address: "شارع النيل، القاهرة",
    dropoff_address: "شارع التحرير، القاهرة",
    city: "القاهرة",
    zone: "وسط البلد",
    cod_amount: 4200,
    package_description: "iPhone 14 Pro - Screen damaged",
    package_weight: 0.206,
    items_count: 1,
    order_type: "Return",
    shipping_state: "Returned",
    masked_state: "Returned",
    scanned_at: "2024-03-15T09:00:00Z",
    received_at: "2024-03-15T09:30:00Z",
    maintenance_started_at: "2024-03-15T10:00:00Z",
    maintenance_completed_at: "2024-03-15T14:30:00Z",
    is_return_order: true,
    is_refund_or_replace: true,
    new_tracking_number: "BOSTA-002-2024",
    new_cod_amount: 4200,
    requires_replacement: true,
    replacement_type: ReplacementType.FULL_REPLACEMENT,
    total_replacement_cost: 3800,
    warranty_coverage: true,
    maintenance_history: [
      {
        id: 1,
        action: "RECEIVED",
        notes: "Order received with damaged screen",
        user_name: "فني الصيانة",
        action_data: { replacement_required: true },
        created_at: "2024-03-15T09:30:00Z"
      },
      {
        id: 2,
        action: "REQUEST_REPLACEMENT",
        notes: "Full replacement requested due to severe damage",
        user_name: "أحمد محمد",
        action_data: { 
          replacement_type: "full_replacement",
          product_id: 1,
          estimated_cost: 3800
        },
        created_at: "2024-03-15T10:00:00Z"
      },
      {
        id: 3,
        action: "APPROVE_REPLACEMENT",
        notes: "Replacement approved by management",
        user_name: "مدير الصيانة",
        action_data: { approved_by: "مدير الصيانة" },
        created_at: "2024-03-15T10:30:00Z"
      },
      {
        id: 4,
        action: "COMPLETE_REPLACEMENT",
        notes: "New iPhone 14 Pro provided to customer",
        user_name: "أحمد محمد",
        action_data: { 
          replacement_id: 1,
          final_cost: 3800,
          warranty_covered: true
        },
        created_at: "2024-03-15T14:30:00Z"
      }
    ],
    replacements: [mockReplacements[0]],
    bosta_data: {
      originalData: {
        _id: "bosta_001",
        trackingNumber: "BOSTA-001-2024",
        maskedState: "Returned",
        receiver: {
          fullName: "أحمد محمد علي",
          phone: "+201234567890"
        },
        dropOffAddress: {
          firstLine: "شارع التحرير",
          secondLine: "مبنى رقم 15",
          zone: { nameAr: "وسط البلد" },
          city: { nameAr: "القاهرة" }
        },
        cod: 4200,
        specs: {
          weight: 0.206,
          packageDetails: {
            itemsCount: 1,
            description: "iPhone 14 Pro - Screen damaged"
          }
        }
      }
    }
  },
  {
    id: 1002,
    tracking_number: "BOSTA-003-2024",
    status: "in_maintenance",
    customer_name: "فاطمة أحمد حسن",
    customer_phone: "+201112223334",
    customer_second_phone: "+201443332221",
    pickup_address: "شارع المعادي، القاهرة",
    dropoff_address: "شارع مصر الجديدة، القاهرة",
    city: "القاهرة",
    zone: "مصر الجديدة",
    cod_amount: 3800,
    package_description: "Samsung Galaxy S24 - Battery and screen issues",
    package_weight: 0.168,
    items_count: 1,
    order_type: "Return",
    shipping_state: "In Transit",
    masked_state: "In Transit",
    scanned_at: "2024-03-18T08:00:00Z",
    received_at: "2024-03-18T08:30:00Z",
    maintenance_started_at: "2024-03-18T09:00:00Z",
    is_return_order: true,
    is_refund_or_replace: true,
    requires_replacement: true,
    replacement_type: ReplacementType.PARTIAL_REPLACEMENT,
    total_replacement_cost: 1950,
    warranty_coverage: false,
    maintenance_history: [
      {
        id: 5,
        action: "RECEIVED",
        notes: "Order received with battery and screen issues",
        user_name: "فني الصيانة",
        action_data: { replacement_required: true },
        created_at: "2024-03-18T08:30:00Z"
      },
      {
        id: 6,
        action: "REQUEST_REPLACEMENT",
        notes: "Partial replacement requested for screen and battery",
        user_name: "محمد علي",
        action_data: { 
          replacement_type: "partial_replacement",
          parts_needed: [1, 2],
          estimated_cost: 1950
        },
        created_at: "2024-03-18T09:00:00Z"
      },
      {
        id: 7,
        action: "APPROVE_REPLACEMENT",
        notes: "Replacement approved",
        user_name: "مدير الصيانة",
        action_data: { approved_by: "مدير الصيانة" },
        created_at: "2024-03-18T09:30:00Z"
      }
    ],
    replacements: [mockReplacements[1]],
    bosta_data: {
      originalData: {
        _id: "bosta_003",
        trackingNumber: "BOSTA-003-2024",
        maskedState: "In Transit",
        receiver: {
          fullName: "فاطمة أحمد حسن",
          phone: "+201112223334"
        },
        dropOffAddress: {
          firstLine: "شارع مصر الجديدة",
          secondLine: "مبنى رقم 8",
          zone: { nameAr: "مصر الجديدة" },
          city: { nameAr: "القاهرة" }
        },
        cod: 3800,
        specs: {
          weight: 0.168,
          packageDetails: {
            itemsCount: 1,
            description: "Samsung Galaxy S24 - Battery and screen issues"
          }
        }
      }
    }
  }
];

// ============================================================================
// 🎯 UTILITY FUNCTIONS
// ============================================================================

export const getInventorySummary = () => {
  const totalProducts = mockProducts.length;
  const totalParts = mockParts.length;
  const totalStockValue = mockProducts.reduce((sum, product) => 
    sum + (product.current_stock * product.cost_price), 0) +
    mockParts.reduce((sum, part) => 
    sum + (part.current_stock * part.cost_price), 0);
  
  const lowStockItems = mockProducts.filter(p => p.current_stock <= p.reorder_point).length +
                       mockParts.filter(p => p.current_stock <= p.reorder_point).length;
  
  const outOfStockItems = mockProducts.filter(p => p.current_stock === 0).length +
                         mockParts.filter(p => p.current_stock === 0).length;
  
  return {
    total_products: totalProducts,
    total_parts: totalParts,
    total_stock_value: totalStockValue,
    low_stock_items: lowStockItems,
    out_of_stock_items: outOfStockItems
  };
};

export const getLowStockItems = () => {
  const lowStockProducts = mockProducts.filter(p => p.current_stock <= p.reorder_point);
  const lowStockParts = mockParts.filter(p => p.current_stock <= p.reorder_point);
  
  return {
    products: lowStockProducts.map(p => ({
      id: p.id,
      name: p.name,
      name_ar: p.name_ar,
      current_stock: p.current_stock,
      reorder_point: p.reorder_point,
      suggested_order: p.max_stock_level - p.current_stock
    })),
    parts: lowStockParts.map(p => ({
      id: p.id,
      name: p.name,
      name_ar: p.name_ar,
      current_stock: p.current_stock,
      reorder_point: p.reorder_point,
      suggested_order: p.max_stock_level - p.current_stock
    }))
  };
};

export const getStockMovements = (filters = {}) => {
  let movements = [...mockStockMovements];
  
  if (filters.movement_type) {
    movements = movements.filter(m => m.movement_type === filters.movement_type);
  }
  
  if (filters.product_id) {
    movements = movements.filter(m => m.product_id === filters.product_id);
  }
  
  if (filters.part_id) {
    movements = movements.filter(m => m.part_id === filters.part_id);
  }
  
  if (filters.start_date) {
    movements = movements.filter(m => new Date(m.created_at) >= new Date(filters.start_date));
  }
  
  if (filters.end_date) {
    movements = movements.filter(m => new Date(m.created_at) <= new Date(filters.end_date));
  }
  
  return movements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getReplacementsByOrder = (orderId) => {
  return mockReplacements.filter(r => r.order_id === orderId);
};

export const getProductById = (id) => {
  return mockProducts.find(p => p.id === id);
};

export const getPartById = (id) => {
  return mockParts.find(p => p.id === id);
};

export const getReplacementById = (id) => {
  return mockReplacements.find(r => r.id === id);
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(amount);
};

export const formatDate = (dateString) => {
  return formatGregorianDate(dateString, true);
};

// ============================================================================
// 📊 EXPORT ALL MOCK DATA
// ============================================================================

export default {
  // Core Data
  products: mockProducts,
  parts: mockParts,
  replacements: mockReplacements,
  stockMovements: mockStockMovements,
  ordersWithInventory: mockOrdersWithInventory,
  
  // Analytics
  analytics: mockInventoryAnalytics,
  
  // Enums
  ReplacementType,
  ReplacementStatus,
  StockMovementType,
  ProductCategory,
  PartCategory,
  
  // Utility Functions
  getInventorySummary,
  getLowStockItems,
  getStockMovements,
  getReplacementsByOrder,
  getProductById,
  getPartById,
  getReplacementById,
  formatCurrency,
  formatDate
}; 