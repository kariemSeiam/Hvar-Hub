# HVAR Hub - Service Action Cycle Refactoring Plan

## 📋 Project Overview
**Project**: HVAR Hub (Flask Backend + React Frontend)  
**Last Updated**: January 2025  
**Version**: Production Refactoring  
**Status**: Backend Refactoring Phase - Task 3 ✅ COMPLETED  
**Current Task**: Task 4 - Simple API Endpoints 🟡 READY  

---

## 🎯 Business Requirements
- **Service Action Types**: Maintenance, Part Replace, Full Replace, Return
- **Stock Integration**: Track products/parts with valid/damaged status  
- **Customer Workflow**: Phone/Tracking → Orders → Service Action → Maintenance Cycle
- **Inventory Management**: Real stock counts with condition tracking
- **Complete History**: Full audit trail from start to finish

---

## 🔄 BUSINESS WORKFLOW - SIMPLE & CLEAN

### **Three Main Business Flows**

#### **Flow 1: MAINTENANCE (Internal Stock Management)**
```
1. Customer brings product to hub
2. Scan/Create maintenance order  
3. During maintenance: Add/Remove parts from stock as needed
4. Stock adjustments linked to maintenance order
5. Complete maintenance and return to customer
```

#### **Flow 2: REPLACEMENT (Send/Receive Products)**
```
1. Create service action (Part Replace or Full Replace)
2. Select products/parts to SEND to customer
3. Confirm with new tracking number → Stock MINUS (items sent)
4. Customer ships back damaged items with new tracking
5. Scan received items on hub → Select what was RECEIVED
6. Stock adjustments: PLUS (received back), categorize as valid/damaged
```

#### **Flow 3: RETURN (Customer Returns + Refund)**
```
1. Create return service action 
2. Customer ships items back with new tracking
3. Scan received items on hub → Select what was RECEIVED
4. Stock adjustments: PLUS (add returned items), categorize as valid/damaged
5. Process refund to customer
6. Complete return service action
```

### **Stock Management Concept**
- **MAINTENANCE**: Internal stock adjustments during repair process
- **SEND**: Stock minus when sending replacement parts/products  
- **RECEIVE**: Stock plus when receiving back from customer (replacement or return)
- **CATEGORIZE**: Mark received items as valid or damaged
- **REFUND**: Process customer refund for returned items

---

## 🔄 CURRENT STATE ANALYSIS

### **What Exists ✅**
- [x] Basic ServiceAction model (single product only)
- [x] Basic service action API endpoints (create, confirm, pending-receive)
- [x] Product and Part models with basic stock fields  
- [x] Basic Bosta API integration for customer search
- [x] Basic maintenance cycle (scanning, status updates)
- [x] Frontend service action pages (basic implementation)

### **What Needs Implementation 🔧**
- [x] **MAINTENANCE service action type** - ✅ Handled via maintenance orders (3 types only)
- [x] **Stock integration** - ✅ StockMovement model created for complete tracking
- [x] **Multi-product support** - ✅ ServiceActionItem model supports multiple items
- [x] **Valid/Damaged parts tracking** - ✅ ItemCondition enum with validation
- [x] **Dynamic maintenance workflow** - ✅ StockService with 4 core operations
- [x] **Complete audit trail** - ✅ StockMovement provides full history
- [x] **Proper state transitions** - ✅ Complete UnifiedService workflow implemented

---

## 🧭 REFACTORING PRINCIPLES

### **Backend Guidelines**
- **Single Stock Service**: All stock updates through one service class
- **Clear Workflow**: Service actions integrate cleanly with maintenance cycle
- **Centralized Enums**: Define once in `auto_init.py`, use everywhere
- **No Duplication**: Reuse existing Bosta utilities and maintenance logic
- **Clean Database**: Proper relationships between service actions, products, and stock

### **Implementation Focus**
- **Practical Features**: Only implement what the business actually needs
- **Clean Integration**: Build on existing maintenance cycle, don't replace it
- **Simple API**: Clear, focused endpoints that match business workflow
- **Maintainable Code**: Easy to understand and modify for the team

## 🔧 BACKEND REFACTORING TASKS

### **Task 1: Database Models for Clean Stock Integration**
**Time**: 2-3 days  
**Priority**: Critical  
**Status**: ✅ COMPLETED  
**Completed**: January 2025  
**Cursor Rules**: `02-backend-db-models.mdc`, `15-unified-service-action-cycle.mdc`

#### **1.1: Simple Stock Movement Tracking**
**Business Need**: Track stock changes for maintenance and service actions  
**Solution**: One simple table for all stock movements  
**Files to Modify**: `back/db/auto_init.py`, `back/init_db.py`

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

```python
class StockMovement(BaseModel):
    __tablename__ = 'stock_movements'
    
    # What item changed
    item_type = db.Column(db.String(10))  # 'product' or 'part'
    item_id = db.Column(db.Integer, nullable=False)
    quantity_change = db.Column(db.Integer)  # +/- amount
    
    # Why it changed
    movement_type = db.Column(db.String(20))  # 'maintenance', 'send', 'receive'
    condition = db.Column(db.String(20))  # 'valid' or 'damaged'
    
    # What caused it
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)  # For maintenance
    service_action_id = db.Column(db.Integer, db.ForeignKey('service_actions.id'), nullable=True)  # For send/receive
    
    # Details
    notes = db.Column(db.String(255))
    created_by = db.Column(db.String(100), default='فني الصيانة')
```

**Implementation Steps**:
1. **Add to `back/db/auto_init.py`**: Create StockMovement class with BaseModel inheritance
2. **Add to `back/init_db.py`**: Create table creation SQL with proper indexes
3. **Add validation**: Ensure `quantity_change` is never 0, `condition` is valid enum
4. **Add relationships**: Link to Order and ServiceAction models

**Cursor Rules to Follow**:
- **`02-backend-db-models.mdc`**: Use BaseModel pattern, add proper indexes
- **`15-unified-service-action-cycle.mdc`**: Follow StockMovement schema rules exactly

**Detailed Implementation Guide**:
- **BaseModel Inheritance**: Follow pattern from `Order` and `Product` models in `back/db/auto_init.py`
- **Database Constraints**: Add CHECK constraints for `quantity_change != 0` and valid `condition` values
- **Indexes**: Create composite indexes on `(item_type, item_id)` and `(movement_type, created_at)` for performance
- **Foreign Keys**: Ensure proper cascade behavior for `order_id` and `service_action_id`
- **Validation**: Implement `__init__` method to validate data before creation
- **Serialization**: Extend `to_dict()` method to include all new fields with proper formatting

#### **1.2: Service Action Send/Receive Items**
**Business Need**: Track what we send and receive for replacements  
**Solution**: Simple items table for multi-product support  
**Files to Modify**: `back/db/auto_init.py`, `back/init_db.py`

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

```python
class ServiceActionItem(BaseModel):
    __tablename__ = 'service_action_items'
    
    service_action_id = db.Column(db.Integer, db.ForeignKey('service_actions.id'), nullable=False)
    item_type = db.Column(db.String(10))  # 'product' or 'part'
    item_id = db.Column(db.Integer, nullable=False)
    
    # For sending
    quantity_to_send = db.Column(db.Integer, default=0)
    sent_at = db.Column(db.DateTime)
    
    # For receiving
    quantity_received = db.Column(db.Integer, default=0)
    condition_received = db.Column(db.String(20))  # 'valid', 'damaged'
    received_at = db.Column(db.DateTime)
```

**Implementation Steps**:
1. **Add to `back/db/auto_init.py`**: Create ServiceActionItem class
2. **Add to `back/init_db.py`**: Create table with foreign key constraints
3. **Add indexes**: Index `service_action_id`, `item_type`, `item_id` for fast queries
4. **Add validation**: Non-negative quantities, valid conditions

**Cursor Rules to Follow**:
- **`02-backend-db-models.mdc`**: Follow ServiceActionItem table structure exactly
- **`15-unified-service-action-cycle.mdc`**: Implement required fields and validation

**Detailed Implementation Guide**:
- **Table Structure**: Follow exact schema from `15-unified-service-action-cycle.mdc` section "ServiceActionItem Table"
- **Foreign Key Constraints**: Use `ON DELETE CASCADE` for `service_action_id` to maintain data integrity
- **Index Strategy**: Create indexes on `(service_action_id, item_type)` for fast service action queries
- **DateTime Fields**: Use `get_egypt_now()` from `back/utils/timezone.py` for default timestamps
- **Validation Logic**: Implement `validate()` method to ensure business rules are enforced
- **Relationship Loading**: Add lazy loading for related `ServiceAction` and `Product`/`Part` data

#### **1.3: Service Action Types (3 Types)**
**Business Clarification**: Clear separation of responsibilities  
**Files to Modify**: `back/db/auto_init.py`

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

**Current Enum Update**:
```python
class ServiceActionType(db.Enum):
    PART_REPLACE = 'part_replace'           # Send replacement parts, receive damaged back
    FULL_REPLACE = 'full_replace'           # Send replacement product, receive damaged back  
    RETURN_FROM_CUSTOMER = 'return_from_customer'  # Customer returns items, we refund
    # REMOVE: MAINTENANCE - handled separately through maintenance orders
```

**Implementation Steps**:
1. **Update enum in `back/db/auto_init.py`**: Remove MAINTENANCE, keep only 3 types
2. **Update existing ServiceAction records**: Migrate any MAINTENANCE types to proper maintenance orders
3. **Add validation**: Ensure only valid types can be created

**Cursor Rules to Follow**:
- **`15-unified-service-action-cycle.mdc`**: Only 3 types allowed, MAINTENANCE handled separately
- **`02-backend-db-models.mdc`**: Use enums for constrained values

**Detailed Implementation Guide**:
- **Enum Update**: Follow pattern from existing enums in `back/db/auto_init.py` (OrderStatus, MaintenanceAction)
- **Data Migration**: Create migration script to handle existing MAINTENANCE service actions
- **Validation**: Add `@validates('action_type')` decorator to ensure only valid types are accepted
- **Business Logic**: Update `ServiceAction.can_transition_to()` method to handle new type restrictions
- **API Validation**: Ensure all API endpoints validate action_type against updated enum
- **Frontend Sync**: Update `STATUS_MAPPING` in `front/src/config/environment.js` to reflect changes

#### **1.4: Add Refund Tracking**
**For return service actions**  
**Files to Modify**: `back/db/auto_init.py` (update existing ServiceAction model)

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

```python
# In existing ServiceAction model, add/update these fields:
refund_amount = db.Column(db.Numeric(10, 2))  # For returns
refund_processed = db.Column(db.Boolean, default=False)  # Track refund status
refund_processed_at = db.Column(db.DateTime)  # When refund was processed
```

**Implementation Steps**:
1. **Update ServiceAction model**: Add refund tracking fields
2. **Add validation**: `refund_amount` must be positive for returns
3. **Add default values**: Set appropriate defaults for non-return actions

**Cursor Rules to Follow**:
- **`02-backend-db-models.mdc`**: Extend to_dict() carefully, include new fields
- **`15-unified-service-action-cycle.mdc`**: Follow refund tracking pattern exactly

**Detailed Implementation Guide**:
- **Field Addition**: Add fields exactly as specified in `15-unified-service-action-cycle.mdc` section "ServiceAction Updates"
- **Validation Logic**: Implement `@validates('refund_amount')` to ensure positive values for returns
- **Default Values**: Set `refund_amount = None` for non-return actions, `refund_processed = False` by default
- **DateTime Handling**: Use `get_egypt_now()` from `back/utils/timezone.py` for `refund_processed_at`
- **Serialization**: Update `to_dict()` method to include new fields with proper formatting
- **Business Rules**: Ensure refund fields are only populated for `RETURN_FROM_CUSTOMER` actions
- **API Integration**: Update service action creation endpoints to handle refund_amount parameter

#### **1.5: Product and Part Stock Fields Update**
**Business Need**: Track valid vs damaged stock separately  
**Files to Modify**: `back/db/auto_init.py` (update existing Product and Part models)

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

```python
# In Product model - add alongside existing current_stock
current_stock = db.Column(db.Integer, default=0)  # Total stock (keep existing)
current_stock_damaged = db.Column(db.Integer, default=0)  # Damaged count (NEW)

# In Part model - add alongside existing current_stock  
current_stock = db.Column(db.Integer, default=0)  # Total stock (keep existing)
current_stock_damaged = db.Column(db.Integer, default=0)  # Damaged count (NEW)
```

**Implementation Steps**:
1. **Update Product model**: Add `current_stock_damaged` field
2. **Update Part model**: Add `current_stock_damaged` field
3. **Add validation**: Ensure damaged count never exceeds total stock
4. **Update serialization**: Include both fields in `to_dict()` method

**Cursor Rules to Follow**:
- **`02-backend-db-models.mdc`**: Add stock fields to Product/Part models
- **`15-unified-service-action-cycle.mdc`**: Implement condition tracking correctly

**Detailed Implementation Guide**:
- **Field Addition**: Add `current_stock_damaged` field with default value 0 to both models
- **Validation Logic**: Implement `@validates('current_stock_damaged')` to ensure it never exceeds `current_stock`
- **Business Rules**: Ensure `current_stock_damaged` is always non-negative and ≤ `current_stock`
- **Database Constraints**: Add CHECK constraint `current_stock_damaged >= 0` and `current_stock_damaged <= current_stock`
- **Serialization**: Update `to_dict()` method to include both stock fields with proper formatting
- **Stock Calculations**: Add helper method `get_valid_stock()` that returns `current_stock - current_stock_damaged`
- **Migration Strategy**: Handle existing records by setting `current_stock_damaged = 0` for all existing items
- **API Updates**: Ensure all stock-related endpoints return both total and damaged stock counts

#### **1.6: Database Migration and Indexes**
**Performance and Data Integrity**  
**Files to Modify**: `back/init_db.py`

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

**Required Indexes**:
```sql
-- Stock Movement Indexes
CREATE INDEX IF NOT EXISTS idx_stock_movement_item ON stock_movements (item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON stock_movements (movement_type, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movement_order ON stock_movements (order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_service ON stock_movements (service_action_id);

-- Service Action Item Indexes  
CREATE INDEX IF NOT EXISTS idx_service_action_item_service ON service_action_items (service_action_id);
CREATE INDEX IF NOT EXISTS idx_service_action_item_type ON service_action_items (item_type, item_id);
```

**Implementation Steps**:
1. **Add to `back/init_db.py`**: Create all required indexes
2. **Test performance**: Verify fast queries on stock movements
3. **Add to `create_indexes()`**: Include in main index creation function

**Cursor Rules to Follow**:
- **`02-backend-db-models.mdc`**: Index common search fields and timestamp-based sorts
- **`15-unified-service-action-cycle.mdc`**: Follow indexing requirements exactly

**Detailed Implementation Guide**:
- **Index Creation**: Follow exact SQL from `15-unified-service-action-cycle.mdc` section "Stock Movement Indexes"
- **Performance Testing**: Use `EXPLAIN QUERY PLAN` to verify index usage on stock movement queries
- **Composite Indexes**: Create optimal composite indexes for common query patterns
- **Index Maintenance**: Add indexes to `create_indexes()` function in `back/init_db.py`
- **Query Optimization**: Ensure all stock movement queries use appropriate indexes
- **Monitoring**: Add logging to track query performance with and without indexes
- **Fallback Strategy**: Have plan for handling queries that don't use indexes efficiently

#### **1.7: Validation and Constraints**
**Data Integrity Rules**  
**Files to Modify**: `back/db/auto_init.py`

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

**Validation Rules**:
```python
# StockMovement validation
- quantity_change: Must be non-zero (positive or negative)
- condition: Must be 'valid' or 'damaged' only
- movement_type: Must be 'maintenance', 'send', or 'receive'
- item_type: Must be 'product' or 'part'

# ServiceActionItem validation  
- quantity_to_send: Must be non-negative
- quantity_received: Must be non-negative
- condition_received: Must be 'valid' or 'damaged' when received

# Product/Part validation
- current_stock_damaged: Must not exceed current_stock
- Both fields must be non-negative
```

**Implementation Steps**:
1. **Add validation methods**: Implement validation in model classes
2. **Add database constraints**: Use CHECK constraints where possible
3. **Add service-level validation**: Validate before saving

**Cursor Rules to Follow**:
- **`02-backend-db-models.mdc`**: Keep validation in services, models remain thin
- **`15-unified-service-action-cycle.mdc`**: Follow validation rules exactly

**Detailed Implementation Guide**:
- **Model Validation**: Use SQLAlchemy `@validates` decorators for field-level validation
- **Database Constraints**: Implement CHECK constraints for business rule enforcement
- **Service Validation**: Follow pattern from `OrderService.validate_action_data` in `back/services/order_service.py`
- **Error Messages**: Return Arabic error messages for validation failures (follow existing pattern)
- **Validation Order**: Validate at model level first, then service level, then API level
- **Custom Validators**: Create reusable validation functions for common business rules
- **Testing**: Ensure all validation rules are covered by unit tests
- **Documentation**: Document all validation rules in model docstrings

#### **1.8: Testing Requirements**
**Quality Assurance**  
**Files to Create**: `temp-tests/backend/test_database_models.py`

**Detailed Implementation Guide**:
- **Model Updates**: Follow existing patterns from `back/db/auto_init.py`
- **Table Creation**: Use proper SQL syntax for table creation in `back/init_db.py`
- **Index Creation**: Add all required indexes for performance optimization
- **Constraint Management**: Implement proper foreign key and check constraints
- **Migration Strategy**: Handle existing data during schema updates
- **Testing**: Test all database operations on development database first
- **Documentation**: Update model docstrings with field descriptions
- **Validation**: Ensure all database constraints are properly enforced

**Test Cases**:
```python
def test_stock_movement_creation():
    """Test StockMovement creation with all required fields"""
    
def test_service_action_item_validation():
    """Test ServiceActionItem validation rules"""
    
def test_product_part_stock_fields():
    """Test Product/Part stock field updates"""
    
def test_database_constraints():
    """Test database-level constraints and validation"""
    
def test_indexes_performance():
    """Test query performance with new indexes"""
```

**Implementation Steps**:
1. **Create test file**: Add comprehensive test cases
2. **Test validation**: Verify all business rules work correctly
3. **Test performance**: Ensure indexes improve query speed
4. **Test constraints**: Verify database-level validation

**Cursor Rules to Follow**:
- **`13-test-and-debug.mdc`**: Follow testing strategy for database models
- **`15-unified-service-action-cycle.mdc`**: Test all business flow requirements

**Detailed Implementation Guide**:
- **Test Structure**: Follow pattern from existing test files in `temp-tests/backend/`
- **Test Coverage**: Ensure 100% coverage of all validation rules and business logic
- **Performance Testing**: Use `timeit` or similar to measure query performance improvements
- **Constraint Testing**: Test database-level constraints by attempting invalid operations
- **Integration Testing**: Test complete workflow from model creation to stock updates
- **Error Testing**: Verify all validation errors return appropriate Arabic messages
- **Data Integrity**: Test foreign key relationships and cascade behaviors
- **Migration Testing**: Test database migration scripts on sample data

#### **Task 1 Completion Checklist**:
- [x] **StockMovement model** created with all required fields and validation
- [x] **ServiceActionItem model** created with send/receive tracking
- [x] **ServiceActionType enum** updated to only 3 types (no MAINTENANCE)
- [x] **Refund tracking fields** added to ServiceAction model
- [x] **Product/Part models** updated with damaged stock tracking
- [x] **Database indexes** created for performance optimization
- [x] **Validation rules** implemented for data integrity
- [x] **Test cases** created and passing for all models (20 tests - 100% success)
- [x] **Migration script** ready for production deployment

**✅ Task 1 - COMPLETED SUCCESSFULLY**

**What Was Accomplished**:
- ✅ **StockMovement Model**: Complete stock tracking for maintenance, send, receive operations
- ✅ **ServiceActionItem Model**: Multi-product support for service actions 
- ✅ **Enhanced ServiceAction**: Refund tracking fields for return processing
- ✅ **Updated Product/Part Models**: Damaged stock tracking with validation
- ✅ **Database Indexes**: 6 new indexes for optimal performance
- ✅ **Validation Rules**: Comprehensive @validates decorators for data integrity
- ✅ **Complete Testing**: 20 tests passing at 100% success rate

**New Database Entities Created**:
- `StockMovement` - Central table for all stock change tracking
- `ServiceActionItem` - Multi-product item tracking for service actions
- `StockMovementType` enum - maintenance, send, receive types
- `ItemCondition` enum - valid, damaged categorization

**Database Performance Improvements**:
- Composite indexes on (item_type, item_id) for fast item queries
- Timestamp indexes for efficient stock movement history queries  
- Service action indexes for quick multi-product lookups

**Next Task Dependency**: ✅ Task 1 completed - Ready to proceed with Task 2 (StockService)

### **Task 2: Simple Stock Service**
**Time**: 2-3 days  
**Priority**: Critical  
**Status**: ✅ COMPLETED  
**Completed**: January 2025  
**Cursor Rules**: `03-backend-services.mdc`, `15-unified-service-action-cycle.mdc`  
**Dependencies**: ✅ Task 1 (Database Models) completed

#### **2.1: StockService for Clean Business Operations**
**Purpose**: Handle four simple stock operations  
**Files to Create**: `back/services/stock_service.py`

**Detailed Implementation Guide**:
- **Service Pattern**: Follow existing service patterns from `back/services/order_service.py`
- **Static Methods**: Use `@staticmethod` decorators for all methods (no instance state)
- **Transaction Management**: Ensure all stock operations are wrapped in database transactions
- **Error Handling**: Return `(success, data, error)` tuples for consistent error handling
- **Logging**: Add comprehensive logging for all stock operations (audit trail)
- **Validation**: Validate all inputs before processing stock changes
- **Performance**: Use bulk operations where possible for multiple stock updates
- **Testing**: Create comprehensive unit tests for all StockService methods
```python
# In back/services/stock_service.py
class StockService:
    @staticmethod
    def maintenance_adjustment(order_id, item_type, item_id, quantity_change, condition, notes, user_name):
        """
        MAINTENANCE: Add/Remove parts during repair process
        Example: Used 2 motors for repair → quantity_change = -2
        """
        # Update stock
        # Create StockMovement with order_id, movement_type='maintenance'
        
    @staticmethod
    def send_items(service_action_id, items_to_send, user_name):
        """
        SEND: Reduce stock when sending replacement items to customer
        items_to_send = [{'item_type': 'part', 'item_id': 5, 'quantity': 2}]
        """
        # Reduce stock (minus)
        # Create StockMovement with service_action_id, movement_type='send'
        # Update ServiceActionItem.sent_at
        
    @staticmethod
    def receive_items(service_action_id, items_received, user_name):
        """
        RECEIVE: Add stock when receiving items back from customer (replacements)
        items_received = [{'item_type': 'part', 'item_id': 5, 'quantity': 1, 'condition': 'damaged'}]
        """
        # Add stock (plus)
        # Create StockMovement with service_action_id, movement_type='receive'
        # Update ServiceActionItem.received_at and condition
        
    @staticmethod
    def receive_returns(service_action_id, items_returned, user_name):
        """
        RECEIVE RETURNS: Add stock when customer returns items for refund
        items_returned = [{'item_type': 'product', 'item_id': 1, 'quantity': 1, 'condition': 'valid'}]
        """
        # Add stock (plus)
        # Create StockMovement with service_action_id, movement_type='receive'
        # Update ServiceActionItem.received_at and condition
        # Different from receive_items - this is for returns, not replacements
```

#### **2.2: Simple Stock Fields**
**Keep existing stock fields, add condition tracking**:
```python
# In Product model - keep existing
current_stock = db.Column(db.Integer, default=0)  # Total stock
current_stock_damaged = db.Column(db.Integer, default=0)  # Damaged count

# In Part model - keep existing  
current_stock = db.Column(db.Integer, default=0)  # Total stock
current_stock_damaged = db.Column(db.Integer, default=0)  # Damaged count
```

**Files Created**:
- `back/services/stock_service.py` ✅
- `temp-tests/backend/test_stock_service.py` ✅

**✅ Task 2 - COMPLETED SUCCESSFULLY**

**What Was Accomplished**:
- ✅ **StockService Class**: Complete implementation with 4 main methods
- ✅ **Maintenance Adjustment**: Internal stock changes during repair process  
- ✅ **Send Items**: Stock reduction when sending replacement items to customers
- ✅ **Receive Items**: Stock addition when receiving items back from customers
- ✅ **Receive Returns**: Customer return processing with condition tracking
- ✅ **Helper Methods**: Stock summary and movement history queries
- ✅ **Comprehensive Testing**: 21 tests passing at 100% success rate

**Four Core Stock Operations Implemented**:
1. `maintenance_adjustment()` - Add/remove parts during maintenance with order linking
2. `send_items()` - Reduce stock when sending replacements, create ServiceActionItem records  
3. `receive_items()` - Add stock when receiving replacements back, categorize condition
4. `receive_returns()` - Add stock for customer returns, prepare for refund processing

**Advanced Features**:
- ✅ **Multi-Item Support**: Handle multiple products/parts in single operation
- ✅ **Condition Tracking**: Separate valid/damaged stock management
- ✅ **Transaction Safety**: Proper error handling without database rollbacks
- ✅ **Audit Trail**: Complete StockMovement records for every operation  
- ✅ **Business Validation**: Comprehensive input validation with Arabic error messages
- ✅ **Performance Optimized**: Efficient bulk operations and database queries

**Integration Points**:
- ✅ **Database Models**: Seamless integration with StockMovement and ServiceActionItem
- ✅ **Product/Part Models**: Automatic stock level updates with condition tracking
- ✅ **Service Actions**: Complete workflow support for all 3 service action types
- ✅ **Maintenance Orders**: Stock adjustments linked to maintenance process

**Next Task Dependency**: ✅ Task 2 completed - Ready to proceed with Task 3 (Service Action Workflow)

**✅ Task 3 - COMPLETED SUCCESSFULLY**

**What Was Accomplished**:
- ✅ **Enhanced UnifiedService**: Complete workflow for all 3 service action types  
- ✅ **Multi-Product Support**: ServiceActionItem integration for complex service actions
- ✅ **Complete Workflows**: PART_REPLACE, FULL_REPLACE, RETURN_FROM_CUSTOMER flows
- ✅ **Stock Integration**: Full integration with StockService for all operations
- ✅ **OrderService Enhancement**: Maintenance stock adjustment functionality
- ✅ **Comprehensive Testing**: 8 workflow tests passing at 100% success rate

**Six Core Workflow Methods Implemented**:
1. `create_service_action()` - Create service actions with multi-product support and validation
2. `confirm_and_send()` - Confirm replacements and reduce stock when sending items
3. `confirm_return()` - Confirm returns and prepare for customer shipment back  
4. `receive_replacement_items()` - Receive damaged items back from replacements
5. `receive_return_items()` - Receive customer returns and prepare for refund
6. `process_refund_and_complete()` - Process refunds and complete return workflow

**Advanced Workflow Features**:
- ✅ **Business Logic Validation**: Type-specific validation for each workflow
- ✅ **Stock Movement Integration**: All workflows create proper StockMovement records
- ✅ **ServiceActionHistory**: Complete audit trail for every workflow step
- ✅ **Multi-Item Processing**: Handle multiple products/parts in single operation
- ✅ **Condition Tracking**: Valid/damaged categorization throughout workflows
- ✅ **Refund Processing**: Complete refund workflow for customer returns

**OrderService Integration**:
- ✅ **Maintenance Stock Adjustment**: `adjust_stock_for_maintenance()` method
- ✅ **Bulk Operations**: Process multiple stock adjustments in single call
- ✅ **StockService Integration**: Full integration with stock movement tracking

**Complete Workflow Coverage**:
- ✅ **PART_REPLACE Flow**: Create → Confirm/Send → Receive → Complete
- ✅ **FULL_REPLACE Flow**: Create → Confirm/Send → Receive → Complete  
- ✅ **RETURN_FROM_CUSTOMER Flow**: Create → Confirm → Receive → Process Refund → Complete
- ✅ **MAINTENANCE Flow**: Stock adjustments with complete audit trail

**Next Task Dependency**: ✅ Task 3 completed - Ready to proceed with Task 4 (API Endpoints)

### **Task 3: Simple Service Action Workflow**
**Time**: 3-4 days  
**Priority**: Critical  
**Status**: ✅ COMPLETED  
**Completed**: January 2025  
**Cursor Rules**: `03-backend-services.mdc`, `15-unified-service-action-cycle.mdc`  
**Dependencies**: ✅ Task 1 (Database Models) and ✅ Task 2 (StockService) completed

#### **3.1: Service Action Creation (3 Types)**
**Business Process**: Create Part Replace, Full Replace, or Return service action  
**Files to Modify**: `back/services/unified_service.py`

**Detailed Implementation Guide**:
- **Service Pattern**: Follow existing service patterns from `back/services/unified_service.py`
- **Static Methods**: Use `@staticmethod` decorators for all methods (no instance state)
- **Transaction Management**: Ensure all service action operations are wrapped in database transactions
- **Error Handling**: Return `(success, data, error)` tuples for consistent error handling
- **Logging**: Add comprehensive logging for all service action operations (audit trail)
- **Validation**: Validate all inputs before processing service actions
- **Performance**: Use bulk operations where possible for multiple service action updates
- **Testing**: Create comprehensive unit tests for all new methods
```python
# In back/services/unified_service.py
@staticmethod
def create_service_action(action_type, customer_data, original_tracking, items_to_send=None, refund_amount=None, notes=""):
    """
    Create service action
    action_type: 'part_replace', 'full_replace', or 'return_from_customer'
    
    For replacements:
    items_to_send = [
        {'item_type': 'part', 'item_id': 5, 'quantity': 2},
        {'item_type': 'product', 'item_id': 1, 'quantity': 1}
    ]
    
    For returns:
    refund_amount = 150.00  # Amount to refund customer
    """
    # Create ServiceAction with refund_amount if return
    # Create ServiceActionItem records for items to send (if replacement)
    # Return service action

@staticmethod
def confirm_and_send(service_action_id, new_tracking_number, user_name):
    """
    Confirm replacement service action and send items to customer
    (Only for part_replace and full_replace)
    """
    # Update service action with new tracking
    # Call StockService.send_items() to reduce stock
    # Update status to CONFIRMED

@staticmethod
def confirm_return(service_action_id, new_tracking_number, user_name):
    """
    Confirm return service action - customer will ship items back
    (Only for return_from_customer)
    """
    # Update service action with new tracking for customer return
    # Update status to CONFIRMED (waiting for customer to ship)
```

#### **3.2: Receive Items Back from Customer**
**Business Process**: When customer ships back items (replacements or returns)
```python
@staticmethod
def receive_replacement_items(service_action_id, items_received, user_name):
    """
    When scanning damaged items received back from replacement
    items_received = [
        {'item_type': 'part', 'item_id': 5, 'quantity': 1, 'condition': 'damaged'},
        {'item_type': 'product', 'item_id': 1, 'quantity': 1, 'condition': 'valid'}
    ]
    """
    # Call StockService.receive_items() to add stock back
    # Update ServiceActionItem with received quantities and conditions
    # Update status to COMPLETED

@staticmethod
def receive_return_items(service_action_id, items_received, user_name):
    """
    When scanning items received back from customer return
    items_received = [
        {'item_type': 'product', 'item_id': 1, 'quantity': 1, 'condition': 'valid'},
        {'item_type': 'part', 'item_id': 3, 'quantity': 2, 'condition': 'damaged'}
    ]
    """
    # Call StockService.receive_returns() to add stock back
    # Update ServiceActionItem with received quantities and conditions
    # Do NOT complete yet - need to process refund first

@staticmethod
def process_refund_and_complete(service_action_id, user_name):
    """
    Process refund for customer return and complete service action
    """
    # Mark refund as processed
    # Update refund_processed = True, refund_processed_at = now
    # Update status to COMPLETED
```

#### **3.3: Maintenance Order Stock Adjustments**
**Business Process**: During maintenance, add/remove parts from stock
```python
# In OrderService, add method for maintenance stock adjustments
@staticmethod
def adjust_stock_for_maintenance(order_id, adjustments, user_name):
    """
    During maintenance, adjust stock for parts used/added
    adjustments = [
        {'item_type': 'part', 'item_id': 5, 'quantity': -2, 'condition': 'valid', 'notes': 'Used for repair'},
        {'item_type': 'part', 'item_id': 3, 'quantity': 1, 'condition': 'damaged', 'notes': 'Removed damaged part'}
    ]
    """
    # Call StockService.maintenance_adjustment() for each item
```

**Files to Modify**:
- `back/services/unified_service.py` - Clean service action workflow
- `back/services/order_service.py` - Add maintenance stock adjustment method

**Detailed Implementation Guide**:
- **UnifiedService Updates**: Follow existing patterns from `back/services/unified_service.py`
- **Method Integration**: Ensure all methods call appropriate StockService methods
- **State Management**: Implement proper state transitions for service actions
- **Error Handling**: Return consistent error responses for all operations
- **Logging**: Add comprehensive logging for all service action operations
- **Validation**: Validate all inputs before processing service actions
- **Testing**: Create comprehensive unit tests for all new methods
- **Documentation**: Update service method docstrings with examples

### **Task 4: Simple API Endpoints**
**Time**: 2-3 days  
**Priority**: High  
**Status**: 🟡 READY TO START  
**Cursor Rules**: `04-backend-api-routes.mdc`, `15-unified-service-action-cycle.mdc`  
**Dependencies**: ✅ Task 1 (Database Models), ✅ Task 2 (StockService), and ✅ Task 3 (Workflow) completed

#### **4.1: Service Action Endpoints (3 Types)**
**Clean API for replacement and return workflows**  
**Files to Modify**: `back/routes/api/services.py`

**Detailed Implementation Guide**:
- **Route Patterns**: Follow existing patterns from `back/routes/api/orders.py`
- **Response Format**: Use consistent `{ success, data, message }` response format
- **Error Handling**: Implement blueprint-level error handlers for 400/404/500
- **Input Validation**: Validate all inputs before calling service methods
- **Authentication**: Ensure proper authentication for all stock operations
- **Logging**: Add request/response logging for debugging
- **Testing**: Create comprehensive API tests for all new endpoints
- **Documentation**: Add API documentation with examples
```python
# Create replacement service action with items to send
POST /api/v1/services/create
{
    "action_type": "part_replace",  # or "full_replace"
    "customer_phone": "+201155125743", 
    "original_tracking": "68427300",
    "items_to_send": [
        {"item_type": "part", "item_id": 5, "quantity": 2},
        {"item_type": "product", "item_id": 1, "quantity": 1}
    ],
    "notes": "Replacement for damaged parts"
}

# Create return service action
POST /api/v1/services/create
{
    "action_type": "return_from_customer",
    "customer_phone": "+201155125743", 
    "original_tracking": "68427300",
    "refund_amount": 150.00,
    "notes": "Customer return request"
}

# Confirm and send items (reduce stock) - for replacements only
POST /api/v1/services/{id}/confirm-send
{
    "new_tracking_number": "12345678",
    "notes": "Sent to customer"
}

# Confirm return - customer will ship back - for returns only
POST /api/v1/services/{id}/confirm-return
{
    "new_tracking_number": "12345678",
    "notes": "Customer will ship items back"
}

# Receive replacement items back (add stock)
POST /api/v1/services/{id}/receive-replacement
{
    "items_received": [
        {"item_type": "part", "item_id": 5, "quantity": 1, "condition": "damaged"},
        {"item_type": "product", "item_id": 1, "quantity": 1, "condition": "valid"}
    ],
    "notes": "Received damaged items back"
}

# Receive return items (add stock)
POST /api/v1/services/{id}/receive-return
{
    "items_received": [
        {"item_type": "product", "item_id": 1, "quantity": 1, "condition": "valid"}
    ],
    "notes": "Customer returned items"
}

# Process refund and complete return
POST /api/v1/services/{id}/process-refund
{
    "notes": "Refund processed to customer"
}
```

#### **4.2: Maintenance Stock Adjustment Endpoints**
**For maintenance orders only**:
```python
# Adjust stock during maintenance
POST /api/v1/orders/{id}/stock-adjustment
{
    "adjustments": [
        {"item_type": "part", "item_id": 5, "quantity": -2, "condition": "valid", "notes": "Used for repair"},
        {"item_type": "part", "item_id": 3, "quantity": 1, "condition": "damaged", "notes": "Removed damaged part"}
    ]
}

# View stock movements
GET /api/v1/stock/movements                 # All stock movements
GET /api/v1/stock/current                   # Current stock levels (total and damaged)
```

#### **4.3: Keep Existing Endpoints Simple**
**No changes needed for**:
- Existing maintenance order endpoints
- Existing product/part CRUD endpoints
- Existing Bosta search endpoints

**Files to Modify**:
- `back/routes/api/services.py` - Simple send/receive endpoints
- `back/routes/api/orders.py` - Add stock adjustment endpoint
- `back/routes/api/products.py` - Add stock movement viewing endpoints

**Detailed Implementation Guide**:
- **Route Patterns**: Follow existing patterns from `back/routes/api/orders.py`
- **Response Format**: Use consistent `{ success, data, message }` response format
- **Error Handling**: Implement blueprint-level error handlers for 400/404/500
- **Input Validation**: Validate all inputs before calling service methods
- **Authentication**: Ensure proper authentication for all stock operations
- **Logging**: Add request/response logging for debugging
- **Testing**: Create comprehensive API tests for all new endpoints
- **Documentation**: Add API documentation with examples

### **Task 5: Utilities and Helpers**
**Time**: 1-2 days  
**Priority**: Medium  
**Status**: 🔴 PENDING  
**Cursor Rules**: `02-backend-db-models.mdc`, `15-unified-service-action-cycle.mdc`  
**Dependencies**: Task 1 (Database Models) must be completed first, can be done in parallel with other tasks

#### **5.1: Create Stock Utilities**
**Purpose**: Helper functions for stock calculations  
**Files to Create**: `back/utils/stock_utils.py`

**Detailed Implementation Guide**:
- **Utility Pattern**: Follow existing patterns from `back/utils/` directory
- **Pure Functions**: Create pure functions that can be easily tested and reused
- **Performance**: Ensure stock calculations are optimized for large datasets
- **Error Handling**: Return meaningful error messages for invalid inputs
- **Documentation**: Add comprehensive docstrings for all utility functions
- **Testing**: Create unit tests for all utility functions in `temp-tests/backend/`
- **Integration**: Ensure utilities integrate seamlessly with StockService and UnifiedService
```python
# In back/utils/stock_utils.py
def calculate_total_stock(item_type, item_id):
    """Calculate total stock (valid + damaged) for item"""
    
def validate_parts_availability(parts_needed):
    """Check if required parts are in stock"""
    
def get_stock_summary(service_action_id):
    """Get stock impact summary for service action"""
```

#### **5.2: Service Action State Helpers**
**Purpose**: Validate state transitions and workflow rules  
**Files to Create**: `back/utils/service_utils.py`

**Detailed Implementation Guide**:
- **Utility Pattern**: Follow existing patterns from `back/utils/` directory
- **Pure Functions**: Create pure functions that can be easily tested and reused
- **Performance**: Ensure state validation is optimized for large datasets
- **Error Handling**: Return meaningful error messages for invalid inputs
- **Documentation**: Add comprehensive docstrings for all utility functions
- **Testing**: Create unit tests for all utility functions in `temp-tests/backend/`
- **Integration**: Ensure utilities integrate seamlessly with UnifiedService
```python
# In back/utils/service_utils.py
def can_transition_to(current_status, new_status):
    """Check if status transition is valid"""
    
def validate_service_action_items(items):
    """Validate service action items before creation"""
```

**Files to Create**:
- `back/utils/stock_utils.py`
- `back/utils/service_utils.py`

**Detailed Implementation Guide**:
- **Stock Utilities**: Follow pattern from existing utility files in `back/utils/`
- **Helper Functions**: Create pure functions that can be easily tested and reused
- **Performance**: Ensure stock calculations are optimized for large datasets
- **Error Handling**: Return meaningful error messages for invalid inputs
- **Documentation**: Add comprehensive docstrings for all utility functions
- **Testing**: Create unit tests for all utility functions in `temp-tests/backend/`
- **Integration**: Ensure utilities integrate seamlessly with StockService and UnifiedService

---

## 🔧 IMPLEMENTATION GUIDELINES

### **Database Migration Steps**
1. **Add new enum values** to ServiceActionType (add MAINTENANCE)
2. **Create ServiceActionItem table** for multi-product support
3. **Create StockMovement table** for stock tracking
4. **Add stock fields** to Product and Part models (valid/damaged counts)
5. **Update existing ServiceAction** relationships

### **Service Integration Order**
1. **StockService** first - foundation for all stock operations
2. **UnifiedService updates** - integrate with StockService
3. **API endpoints** - expose new functionality
4. **OrderService integration** - maintenance hub scanning

### **Testing Strategy**
1. **Unit tests** for StockService methods
2. **Integration tests** for complete workflow
3. **API tests** for all endpoints
4. **Manual testing** of complete cycle

---

## 🔧 FRONTEND UPDATES (After Backend Complete)

### **Frontend Requirements Summary**
**Note**: Frontend updates come after backend refactoring is complete

#### **Service Action Form Updates**
- **Multi-product support** - Allow multiple products/parts per service action
- **MAINTENANCE action type** - Add maintenance as service action option
- **Item condition tracking** - Mark received items as valid/damaged
- **Stock impact display** - Show how action affects inventory

#### **Stock Management Interface**
- **Stock overview** - Display valid/damaged stock counts
- **Movement history** - Show all stock changes from service actions
- **Low stock alerts** - Highlight parts needing reorder
- **Manual adjustments** - Allow stock corrections

#### **Maintenance Hub Integration**
- **Service action display** - Show pending service actions in maintenance hub
- **Scanning integration** - Handle service action tracking numbers
- **Workflow tracking** - Display complete service action history

#### **API Integration Updates**
- **Multi-product endpoints** - Update service action creation
- **Stock endpoints** - Integrate stock management API
- **Workflow endpoints** - Support receive/complete actions

### **Implementation Order (Frontend)**
1. **Update ServiceActionForm** for multi-product and MAINTENANCE type
2. **Add stock management** components and API integration
3. **Enhance maintenance hub** to show service actions
4. **Add workflow tracking** components for complete audit trail

---

## 📋 IMPLEMENTATION TIMELINE

### **Week 1: Database and Core Services**
- **Days 1-2**: ✅ Database models update (Task 1) - COMPLETED
- **Days 3-5**: ✅ StockService implementation (Task 2) - COMPLETED

### **Week 2: Workflow and API**
- **Days 1-3**: ✅ UnifiedService updates (Task 3) - COMPLETED
- **Days 4-5**: API endpoints update (Task 4)

### **Week 3: Testing and Integration**
- **Days 1-2**: Utilities and testing (Task 5)
- **Days 3-5**: Complete workflow testing and bug fixes

### **Week 4: Frontend Updates** (After backend complete)
- **Days 1-3**: Service action form and components updates
- **Days 4-5**: Stock management interface and testing

---

## 🧪 TESTING REQUIREMENTS

### **Backend Testing**
```python
# Test StockService
def test_receive_from_customer()
def test_use_for_replacement() 
def test_stock_movement_tracking()

# Test UnifiedService
def test_create_multi_product_service_action()
def test_receive_service_action_items()
def test_complete_service_action()

# Test API Integration
def test_service_action_create_multi_product()
def test_stock_endpoints()
def test_maintenance_integration()
```

### **Complete Workflow Testing**
1. **Customer search** → Load Bosta orders
2. **Service action creation** → Multi-product maintenance action
3. **Confirmation** → Add new tracking number
4. **Maintenance hub scanning** → Auto-integration
5. **Item receiving** → Mark as valid/damaged, update stock
6. **Maintenance process** → Use parts for replacement
7. **Completion** → Return items to customer, final stock update

---

## 📝 DEVELOPMENT NOTES

### **Key Implementation Points**
1. **Database First**: Start with models and relationships before services
2. **Stock Service Foundation**: All stock operations go through one service
3. **Clean Integration**: Build on existing maintenance cycle, don't replace it
4. **Simple API**: Focus on business workflow, avoid overengineering  
5. **Test Early**: Unit tests for each service as you build it

### **Common Pitfalls to Avoid**
- **Don't duplicate** existing Bosta utilities - reuse them
- **Don't break** existing maintenance cycle - extend it
- **Don't overengineer** - keep it simple and practical
- **Don't skip testing** - test each component as you build

### **Business Workflow Summary**
```
1. Customer calls/visits → Search by phone/tracking
2. Load customer's Bosta orders → Select specific order
3. Create service action → Choose type and products
4. Confirm with new tracking → Customer ships to us
5. Scan on maintenance hub → Auto-integrate with cycle
6. Receive and assess → Mark parts as valid/damaged
7. Perform maintenance → Use parts, update stock
8. Complete and return → Final stock updates
```

---

## 🎯 SUMMARY

This refactoring plan focuses on **clean business workflow** without overengineering:

### **Three Clear Business Flows**
1. **MAINTENANCE**: Internal stock adjustments during repair process
2. **REPLACEMENTS**: Send items to customer, receive back damaged items
3. **RETURNS**: Customer returns items, we add to stock and process refund

### **What Gets Added**
- **Stock movement tracking** for all operations
- **Send/Receive workflow** for replacement service actions 
- **Return processing workflow** with refund tracking
- **Maintenance stock adjustments** during repair
- **Valid/Damaged categorization** for all items

### **What Stays Simple**
- **Existing maintenance cycle** (just add stock adjustments)
- **Current service actions** (just add send/receive)
- **Basic stock fields** (just track damaged separately)
- **Current endpoints** (just add stock operations)

### **Clean Integration**
- **Maintenance orders** can adjust stock during repair
- **Replacement service actions** handle send/receive with customers
- **Return service actions** handle customer returns with refund processing
- **All stock changes** tracked in one simple table
- **Complete audit trail** without complexity

---

*This plan provides a clear, practical path to implement the unified service action cycle without overengineering or breaking existing functionality.*

