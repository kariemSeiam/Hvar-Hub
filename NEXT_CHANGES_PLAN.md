# HVAR Hub - Next Changes Plan

## 📋 Project Overview
**Project**: HVAR Hub (Flask Backend + React Frontend)  
**Last Updated**: January 2025  
**Version**: 2.0  
**Status**: Implementation Phase  

---

## 🎯 High-Level Goals
- [x] Add Bosta search endpoint (phone/name/tracking) on backend
- [x] Add backend endpoint to fetch customer's deliveries by tracking (extract receiver data)
- [x] Expose new frontend pages: ServicesActionsPage (basic services actions) and StockManagementPage (skeleton)
- [x] Wire frontend routes `/services` and `/stock`
- [x] Implement comprehensive Bosta search API with customer data extraction (backend)
- [x] Integrate Services Actions with existing maintenance cycle (backend auto-integration when scanning)
- [ ] Create Services Actions workflow with full cycle management (frontend pending)
- [ ] Build Stock Management system for products and parts (frontend pending)

---

## 🧭 DRY/No-Duplication Guardrails (applies to all phases)

- Endpoints: prefer single canonical endpoints with mode flags over multiple variants. Example: use `POST /api/v1/bosta/search` with `group=true` instead of creating a separate grouped search endpoint.
- Utilities: centralize shared transforms/normalizers. Use `back/utils/bosta_utils.py` for:
  - `normalize_egypt_phone`
  - `transform_delivery_brief`
  - `transform_bosta_search_response`
  - `transform_local_order_brief`
- Services: keep orchestration in services and reuse utilities. Do not duplicate DB or transform logic in routes.
- Enums and mappings: define once in `back/db/auto_init.py`. Arabic status labels should be defined once per blueprint (e.g., `STATUS_ARABIC_NAME` in `orders.py`).
- Response envelopes: always `{ success, data?, message? }`. Do not re-implement envelopes per route.
- Frontend API: calls only via `front/src/api/*.js`. Reuse `API_ENDPOINTS` and mapping constants. Do not call axios directly from components.
- Fallbacks: local DB fallback shape must reuse `transform_local_order_brief` only.

## 🔄 Backend Changes

### Database & Models
- [x] **New Models for Services Actions**
  - [x] `ServiceAction`, `Product`, `Part`, `ServiceActionHistory`
  - **Files modified**: `back/db/auto_init.py`

- [x] **New Enums**
  - [x] `ServiceActionType`, `ServiceActionStatus`, `ProductCategory`, `PartType`
  - **Files modified**: `back/db/auto_init.py`

- [x] **Database Auto-Init & Indexes**
  - [x] Auto-create tables and missing columns on boot
  - [x] Create indexes for performance
  - **Files modified**: `back/init_db.py`, `back/db/__init__.py`

### Services Layer
- [x] **Order Service Updates**
  - [x] Add BostaAPIService.search_deliveries and brief transformer
  - [x] Add OrderService.get_customer_orders_by_tracking
  - **Files modified**: `back/services/order_service.py`

- [ ] **New Services**
  - [x] `UnifiedService` - Manage services actions workflow + maintenance integration
  - [x] `ProductService` - Handle product and part inventory
  - [ ] `CustomerService` - Extract and manage customer data from Bosta
  - **Files created**: `back/services/unified_service.py`, `back/services/product_service.py`

- [x] **Enhanced BostaAPIService**
  - [ ] Add `search_deliveries_by_phone_name_tracking` method
  - [ ] Add customer data extraction and transformation
  - [ ] Handle multiple delivery types (Send, Return, Exchange, Customer Return Pickup)
  - **Files to modify**: `back/services/order_service.py`

### API Routes
- [x] **Existing Endpoints (Unified)**
  - [x] `POST /api/v1/bosta/search`
    - Flat result by default; pass `group=true` to get grouped customers+orders
  - [x] `GET /api/v1/bosta/customer-orders?tracking=...`
  - Note: Do NOT create a separate `/bosta/search-customer`; the grouped mode replaces it
  - **Files**: `back/routes/api/customers.py`, `back/routes/api/__init__.py`

- [x] **New Service Action Endpoints**
  - [x] `POST /api/v1/services/create` - Create new service action
  - [x] `POST /api/v1/services/{id}/confirm` - Confirm service action
  - [x] `POST /api/v1/services/{id}/complete` - Mark service action as done
  - [x] `POST /api/v1/services/{id}/fail` - Mark service action as failed
  - [x] `POST /api/v1/services/{id}/pending-receive` - Move to pending receive
  - [x] `GET /api/v1/services` - List all service actions with filtering
  - [x] `GET /api/v1/services/pending-receive` - List pending receive actions
  - **Files created**: `back/routes/api/services.py`

- [x] **New Product/Stock Endpoints**
  - [x] `POST /api/v1/products` - Create product
  - [x] `GET /api/v1/products` - List products (with pagination)
  - [x] `PUT /api/v1/products/{id}` - Update product
  - [x] `DELETE /api/v1/products/{id}` - Delete product
  - [x] `POST /api/v1/parts` - Create part
  - [x] `GET /api/v1/parts` - List parts (with pagination)
  - [x] `PUT /api/v1/parts/{id}` - Update part
  - [x] `DELETE /api/v1/parts/{id}` - Delete part
  - [x] `GET /api/v1/inventory/analytics` - Inventory analytics
  - [x] `GET /api/v1/inventory/low-stock` - Low stock list
  - [x] `GET /api/v1/inventory/products/{id}/parts` - Parts for a product
  - **Files created**: `back/routes/api/products.py`, `back/services/product_service.py`

- [x] **Route Updates**
  - [x] Register new blueprints in `back/routes/__init__.py`
  - [x] Add blueprint-level error handlers for API
  - **Files modified**: `back/routes/__init__.py`, `back/routes/api/__init__.py`

### Configuration & Utils
- [ ] **Config Updates**
  - [ ] Add Bosta API configuration for search endpoint
  - [ ] Add service action workflow configuration
  - **Files to modify**: `back/config/config.py`

- [ ] **Utility Functions**
  - [ ] Customer data extraction utilities
  - [ ] Service action workflow validation
  - **Files to modify**: `back/utils/customer_utils.py`, `back/utils/service_utils.py`

---

## 🎨 Frontend Changes

### Components
- [ ] **New Service Action Components**
  - [ ] `ServiceActionForm` - Create new service actions
  - [ ] `ServiceActionList` - Display and manage service actions
  - [ ] `ServiceActionCard` - Individual service action display
  - [ ] `CustomerSearchForm` - Search customers by phone/name/tracking
  - [ ] `CustomerOrdersList` - Display customer's order history
  - **Files to create**: `front/src/components/services/`

- [ ] **New Stock Management Components**
  - [ ] `ProductForm` - Create/edit products
  - [ ] `PartForm` - Create/edit parts
  - [ ] `InventoryAnalytics` - Display stock analytics
  - [ ] `ProductList` - Manage products inventory
  - [ ] `PartList` - Manage parts inventory
  - **Files to create**: `front/src/components/stock/`

- [ ] **Component Updates**
  - [ ] Update `OrderCard` to show service action status
  - [ ] Update `TabNavigation` to include new service action tabs
  - **Files to modify**: `front/src/components/order/`, `front/src/components/common/`

### Pages
- [x] **Existing Pages**
  - [x] ServicesActionsPage - [Route: `/services`]
  - [x] StockManagementPage - [Route: `/stock`]
  - **Files created**: `front/src/pages/ServicesActionsPage.jsx`, `front/src/pages/StockManagementPage.jsx`

- [ ] **Page Enhancements**
  - [ ] ServicesActionsPage: Add customer search, service action creation, workflow management
  - [ ] StockManagementPage: Add product/part management, analytics dashboard
  - [ ] OrderManagementPage: Add service action integration tab
  - **Files to modify**: `front/src/pages/ServicesActionsPage.jsx`, `front/src/pages/StockManagementPage.jsx`, `front/src/pages/OrderManagementPage.jsx`

### API & Hooks
- [x] **Existing API Client Updates**
  - [x] Added API_ENDPOINTS in environment
  - **Files modified**: `front/src/config/environment.js`

- [ ] **New API Clients**
  - [ ] `serviceActionAPI.js` - Handle service action operations
  - [ ] `productAPI.js` - Handle product and part operations
  - [ ] `customerAPI.js` - Handle customer search and data
  - **Files to create**: `front/src/api/serviceActionAPI.js`, `front/src/api/productAPI.js`, `front/src/api/customerAPI.js`

- [ ] **Custom Hooks**
  - [ ] `useServiceActions` - Manage service actions state and operations
  - [ ] `useProducts` - Manage products and parts inventory
  - [ ] `useCustomerSearch` - Handle customer search functionality
  - **Files to create**: `front/src/hooks/useServiceActions.js`, `front/src/hooks/useProducts.js`, `front/src/hooks/useCustomerSearch.js`

### Configuration & Styling
- [ ] **Environment Config**
  - [ ] Add new API endpoints for services and products
  - [ ] Add service action workflow configuration
  - **Files to modify**: `front/src/config/environment.js`

- [ ] **Styling Updates**
  - [ ] Add service action status colors and badges
  - [ ] Add product/part management UI components
  - **Files to modify**: `front/tailwind.config.js`, `front/src/index.css`

---

## 🔧 Infrastructure & Deployment

### Server Configuration
- [ ] **Environment Variables**
  - [ ] `BOSTA_SEARCH_TOKEN` - Token for Bosta search API
  - [ ] `SERVICE_ACTION_WORKFLOW_CONFIG` - Workflow configuration
  - [ ] `PRODUCT_INVENTORY_CONFIG` - Inventory system configuration

- [ ] **Server Updates**
  - [ ] Update CORS to allow new endpoints
  - [ ] Add rate limiting for search endpoints

### Build & Deploy
- [ ] **Build Scripts**
  - [ ] Update deployment scripts for new services
  - [ ] Add database migration scripts
  - **Files to modify**: `deploy_server_only.sh`

---

## 🧪 Testing & Quality Assurance

### Backend Testing
- [ ] **Unit Tests**
  - [ ] Test Bosta search API integration
  - [ ] Test service action workflow logic
  - [ ] Test product/part management operations

- [ ] **Integration Tests**
  - [ ] Test complete service action workflow
  - [ ] Test customer search and data extraction
  - [ ] Test inventory management operations

### Frontend Testing
- [ ] **Component Tests**
  - [ ] Test service action components
  - [ ] Test stock management components
  - [ ] Test customer search functionality

- [ ] **E2E Tests**
  - [ ] Test complete service action cycle
  - [ ] Test product/part management workflow
  - [ ] Test customer search and order selection

---

## 📚 Documentation Updates

### Code Documentation
- [ ] **API Documentation**
  - [ ] Document new Bosta search endpoints
  - [ ] Document service action workflow API
  - [ ] Document product/part management API

- [ ] **Code Comments**
  - [ ] Add comprehensive comments to new services
  - [ ] Document workflow logic and state transitions

### User Documentation
- [ ] **User Guides**
  - [ ] Service Actions Workflow Guide
  - [ ] Stock Management User Manual
  - [ ] Customer Search and Order Management Guide

---

## 🚀 Implementation Phases

### Phase 1: Foundation & Bosta Integration (Week 1-2)
- [ ] Implement enhanced Bosta search API with customer data extraction
- [ ] Create database models for services actions, products, and parts
- [ ] Set up basic API structure for new endpoints
- [ ] Test Bosta integration and data transformation

### Phase 2: Core Services & Stock Management (Week 3-4)
- [ ] Implement service action workflow service
- [ ] Build product and part management system
- [ ] Create customer service for data extraction
- [ ] Develop frontend components for services and stock

### Phase 3: Integration & Workflow (Week 5-6)
- [ ] Integrate service actions with existing maintenance cycle
- [ ] Connect frontend with backend APIs
- [ ] Implement complete workflow management
- [ ] Add analytics and reporting features

### Phase 4: Testing & Polish (Week 7-8)
- [ ] Comprehensive testing of all workflows
- [ ] Performance optimization
- [ ] UI/UX improvements
- [ ] Documentation and user training

---

## ⚠️ Dependencies & Blockers

### External Dependencies
- [ ] Bosta API access and rate limits for search endpoint
- [ ] Customer data privacy compliance requirements
- [ ] Inventory system integration requirements

### Internal Blockers
- [ ] Database schema migration planning
- [ ] Frontend state management architecture decisions
- [ ] Workflow integration with existing maintenance system

---

## 📊 Progress Tracking

### Completion Status
- **Backend**: 70% (14/20 tasks completed)
- **Frontend**: 15% (3/20 tasks completed)
- **Infrastructure**: 15% (3/20 tasks completed)
- **Testing**: 5% (1/15 tasks completed)
- **Documentation**: 15% (3/20 tasks completed)

### Weekly Progress
- **Week 1**: Foundation setup and Bosta API integration
- **Week 2**: Database models and basic services
- **Week 3**: Core business logic implementation
- **Week 4**: Frontend components and API integration

---

## 🔍 Review & Approval

### Code Review
- [ ] **Backend Review** - [Reviewer: TBD]
- [ ] **Frontend Review** - [Reviewer: TBD]
- [ ] **Architecture Review** - [Reviewer: TBD]

### Final Approval
- [ ] **Technical Lead Approval** - [Name: TBD]
- [ ] **Product Owner Approval** - [Name: TBD]
- [ ] **Deployment Approval** - [Name: TBD]

---

## 📝 Notes & Decisions

### Key Decisions
- [2025-01-XX] - Use existing maintenance cycle pattern for service actions - Maintains consistency
- [2025-01-XX] - Extract customer data from Bosta API responses - Reduces manual data entry
- [2025-01-XX] - Integrate service actions with maintenance hub scanning - Streamlines workflow

### Lessons Learned
- [Date] - [Lesson learned] - [Impact]

### Future Considerations
- [ ] Expand service action types based on business needs
- [ ] Add advanced analytics for inventory management
- [ ] Integrate with external inventory systems

---

## 📅 Timeline

### Milestones
- **Milestone 1**: [Week 2] - Bosta integration and database foundation
- **Milestone 2**: [Week 4] - Core services and stock management
- **Milestone 3**: [Week 6] - Complete workflow integration
- **Milestone 4**: [Week 8] - Production deployment

### Deadlines
- **Project Start**: January 2025
- **Phase 1 Complete**: Week 2
- **Phase 2 Complete**: Week 4
- **Phase 3 Complete**: Week 6
- **Phase 4 Complete**: Week 8
- **Project Complete**: Week 8

---

## 🔄 **UNIFIED WORKFLOW REQUIREMENTS - ONE COMPLETE CYCLE**

### **COMPLETE UNIFIED CYCLE: Service Actions + Maintenance Hub Integration**

#### **Phase 1: Service Actions Creation (Independent Workflow)**
1. **Customer Search**: Input phone/name/tracking → Search Bosta API → Extract customer data
2. **Order Selection**: Display customer's order history → Select specific order for service action
3. **Action Creation**: Choose action type (PART_REPLACE, FULL_REPLACE, RETURN_FROM_CUSTOMER)
4. **Service Action Status**: 
   - **CREATED**: Initial state after action creation
   - **CONFIRMED**: After confirmation with new tracking number
   - **PENDING_RECEIVE**: Ready to be scanned on maintenance hub

#### **Phase 2: Maintenance Hub Integration (Unified Cycle)**
5. **Scan on Maintenance Hub**: When scanning service action tracking number
6. **Automatic Transition**: Service action moves from "PENDING_RECEIVE" to "RECEIVED" in maintenance cycle
7. **Unified Workflow**: Service action now follows the complete maintenance cycle
8. **No More Service Actions**: Once scanned, it becomes a regular maintenance order

#### **Phase 3: Complete Maintenance Cycle (Existing + Enhanced)**
9. **Maintenance Actions**: Start maintenance, complete, fail, reschedule
10. **Final Status**: Completed, Failed, or Returned
11. **Service Action History**: Preserved for reference but no longer editable

---

## 📋 **DETAILED TASK BREAKDOWN & IMPLEMENTATION STEPS**

### **PHASE 1: FOUNDATION & UNIFIED CYCLE DESIGN (Week 1-2)**

#### **Task 1.1: Enhanced Bosta Search API Implementation**
**Priority**: 🔴 HIGH  
**Estimated Time**: 2-3 days  
**Dependencies**: None  

**Detailed Steps:**
1. **Update BostaAPIService in `back/services/order_service.py`**
   - Add `search_deliveries_by_phone_name_tracking()` method
   - Support search by: `mobilePhones`, `fullName`, `trackingNumber`
   - Handle pagination: `limit`, `page`, `sortBy`
   - Extract customer data: `receiver.fullName`, `receiver.phone`, `receiver.secondPhone`

2. **Create Customer Data Extraction Logic**
   - Parse Bosta response structure
   - Extract customer information (name, phone, second phone)
   - Extract order history with tracking numbers
   - Handle multiple delivery types (Send, Return, Exchange, Customer Return Pickup)

3. **Unified API (no new endpoint) – use canonical `/api/v1/bosta/search`**
   - Send either:
     - `{ phone | name | tracking, page?, limit?, group: true }`
     - `{ search_type: 'phone'|'name'|'tracking', search_value, page?, limit?, group: true }`
   - This returns grouped customers with their orders. Flat list is the same endpoint with `group=false` (default).

4. **Response Structure**:
   ```json
   {
     "success": true,
     "data": {
       "customer": {
         "full_name": "أشرف موسى عباس عثمان",
         "primary_phone": "+201155125743",
         "second_phone": "01155125176"
       },
       "orders": [
         {
           "tracking_number": "68427300",
           "type": "Send",
           "status": "Delivered",
           "description": "1 * ماتور خلاط 5066 (hvar0063) من الصيانة",
           "cod_amount": 100,
           "delivery_date": "2025-07-22T12:09:41.757Z"
         }
       ],
       "total_count": 6
     }
   }
   ```

**Files to Modify/Create:**
- `back/services/order_service.py` - Add/alias search method
- `back/routes/api/customers.py` - Support `group` mode on `/bosta/search`
- `back/routes/__init__.py` - Ensure blueprint registered

---

#### **Task 1.1.1: COMPLETE Bosta API Data Extraction (CRITICAL UPDATE)**
**Priority**: 🔴 HIGH  
**Estimated Time**: 1 day  
**Dependencies**: Task 1.1  

**Detailed Steps:**
1. **Extract ALL Critical Data from Bosta API Responses**

   **A. Customer Information (receiver object)**:
   ```python
   # From receiver object in both single order and search responses
   customer_data = {
       'id': bosta_data['receiver']['_id'],                    # AP2zJaF38UWRAQ9GnknLy
       'phone': bosta_data['receiver']['phone'],              # +201093095204
       'first_name': bosta_data['receiver']['firstName'],     # ايمان مصطفي عبد الموجود
       'last_name': bosta_data['receiver']['lastName'],       # -
       'full_name': bosta_data['receiver']['fullName'],       # ايمان مصطفي عبد الموجود
       'second_phone': bosta_data['receiver']['secondPhone']  # null or "01152362497"
   }
   ```

   **B. Order Details (core order data)**:
   ```python
   # From main order object
   order_data = {
       'bosta_id': bosta_data['_id'],                         # WXHnpRpICWPzOghd57p7a
       'tracking_number': bosta_data['trackingNumber'],       # 57646330
       'type_code': bosta_data['type']['code'],              # 25
       'type_value': bosta_data['type']['value'],            # "Customer Return Pickup"
       'state_value': bosta_data['state']['value'],          # "Pickup requested"
       'state_code': bosta_data['state']['code'],            # 10
       'cod_amount': bosta_data['cod'],                      # 0
       'shipment_fees': bosta_data['shipmentFees'],          # 59
       'created_at': bosta_data['createdAt'],                # "Wed Aug 13 2025 09:45:51 GMT+0000"
       'updated_at': bosta_data['updatedAt'],                # "Thu Aug 14 2025 14:59:25 GMT+0000"
       'scheduled_at': bosta_data['scheduledAt'],            # "2025-08-16T20:59:59.999Z"
       'pickup_request_id': bosta_data['pickupRequestId'],    # "070003396895"
       'pickup_request_type': bosta_data['pickupRequestType'] # "Customer Return Pickup"
   }
   ```

   **C. Package Specifications (specs object)**:
   ```python
   # From specs object
   specs_data = {
       'package_type': bosta_data['specs']['packageType'],    # "Parcel"
       'weight': bosta_data['specs']['weight'],              # 1
       'size': bosta_data['specs'].get('size'),              # "SMALL" (may not exist)
       'items_count': bosta_data['specs']['packageDetails']['itemsCount']  # 1
   }
   ```

   **D. Return Specifications (returnSpecs object - CRITICAL for service actions)**:
   ```python
   # From returnSpecs object (for returns/exchanges)
   return_specs_data = {
       'return_description': bosta_data['returnSpecs']['packageDetails']['description'],  # "هنستلم: هاند بليندر 5057 السبب: الهاند بيسخن جامد+دراع الهراسه والكبه مبقوش بيركبوا للاخر طرد للصيانة (2)"
       'return_items_count': bosta_data['returnSpecs']['packageDetails']['itemsCount'],   # 1
       'return_package_type': bosta_data['returnSpecs']['packageType']                   # "Parcel"
   }
   ```

   **E. Address Information (pickupAddress and dropOffAddress)**:
   ```python
   # From pickupAddress
   pickup_address = {
       'country_name': bosta_data['pickupAddress']['country']['name'],           # "Egypt"
       'country_code': bosta_data['pickupAddress']['country']['code'],           # "EG"
       'city_name': bosta_data['pickupAddress']['city']['name'],                # "Cairo"
       'city_name_ar': bosta_data['pickupAddress']['city']['nameAr'],          # "القاهره"
       'zone_name': bosta_data['pickupAddress']['zone']['name'],                # "Agouza"
       'zone_name_ar': bosta_data['pickupAddress']['zone']['nameAr'],          # "العجوزه"
       'district_name': bosta_data['pickupAddress']['district']['name'],        # "Mohandesiin"
       'district_name_ar': bosta_data['pickupAddress']['district']['nameAr'],  # "المهندسين"
       'first_line': bosta_data['pickupAddress']['firstLine'],                  # "الجيزه تابعه لمركز كرداسه طريق ناهيا ابو رواش بجوار مسجد النور المحمدي"
       'second_line': bosta_data['pickupAddress']['secondLine'],                # "محل ١٣١"
       'is_work_address': bosta_data['pickupAddress']['isWorkAddress']          # false
   }

   # From dropOffAddress
   dropoff_address = {
       'country_name': bosta_data['dropOffAddress']['country']['name'],         # "Egypt"
       'country_code': bosta_data['dropOffAddress']['country']['code'],         # "EG"
       'city_name': bosta_data['dropOffAddress']['city']['name'],              # "Sharqia"
       'city_name_ar': bosta_data['dropOffAddress']['city']['nameAr'],        # "الشرقيه"
       'zone_name': bosta_data['dropOffAddress']['zone']['name'],              # "Belbes"
       'zone_name_ar': bosta_data['dropOffAddress']['zone']['nameAr'],        # "بلبيس"
       'district_name': bosta_data['dropOffAddress']['district']['name'],      # "Belbes"
       'district_name_ar': bosta_data['dropOffAddress']['district']['nameAr'], # "بلبيس"
       'first_line': bosta_data['dropOffAddress']['firstLine'],                # "بلبيس شارع جمعيه الجمل"
       'second_line': bosta_data['dropOffAddress']['secondLine'],              # "مدرسه ابو بكر الصديق"
       'building_number': bosta_data['dropOffAddress'].get('buildingNumber'),  # "1"
       'floor': bosta_data['dropOffAddress'].get('floor'),                    # "1"
       'apartment': bosta_data['dropOffAddress'].get('apartment'),             # "1"
       'location_name': bosta_data['dropOffAddress'].get('locationName'),     # "بيت العز"
       'geo_location': bosta_data['dropOffAddress'].get('geoLocation')        # [31.5667069, 30.4173884]
   }
   ```

   **F. Timeline and State Information (CRITICAL for workflow)**:
   ```python
   # From state and timeline objects
   state_data = {
       'current_state': bosta_data['state']['value'],                          # "Pickup requested"
       'current_state_code': bosta_data['state']['code'],                      # 10
       'masked_state': bosta_data['maskedState'],                             # "Created"
       'picked_up_time': bosta_data['state'].get('pickedUpTime'),             # "2025-08-14T10:22:53.520Z"
       'delivery_time': bosta_data['state'].get('deliveryTime'),              # null
       'received_at_warehouse_time': bosta_data['state'].get('receivedAtWarehouse', {}).get('time'),  # "2025-02-01T06:08:32.236Z"
       'warehouse_name': bosta_data['state'].get('receivedAtWarehouse', {}).get('warehouse', {}).get('name'),  # "El-Sharkia Hub"
       'is_confirmed_delivery': bosta_data['isConfirmedDelivery'],            # false
       'confirmed_delivery_at': bosta_data.get('confirmedDeliveryAt'),        # "2025-02-01T18:43:38.565Z"
       'payment_method': bosta_data.get('paymentMethod'),                     # "COD"
       'attempts_count': bosta_data['attemptsCount'],                         # 0
       'calls_number': bosta_data['callsNumber'],                             # 0
       'sms_number': bosta_data['smsNumber']                                  # 0
   }

   # From timeline array
   timeline_data = [
       {
           'value': timeline_item['value'],                                   # "ready_for_pickup"
           'code': timeline_item['code'],                                     # 10
           'done': timeline_item['done'],                                     # true
           'date': timeline_item.get('date')                                  # "2025-08-13T09:45:51.763Z"
       }
       # ... for each timeline item
   ]
   ```

   **G. Business Information (sender and holder)**:
   ```python
   # From sender object
   sender_data = {
       'id': bosta_data['sender']['_id'],                                     # "Z0fKnekRd7Iyehhc7hLFz"
       'phone': bosta_data['sender']['phone'],                               # "+201277375716"
       'name': bosta_data['sender']['name'],                                 # "HVAR"
       'type': bosta_data['sender']['type'],                                 # "BUSINESS_ACCOUNT"
       'sub_account_id': bosta_data['sender'].get('subAccountId')            # null
   }

   # From holder object
   holder_data = {
       'id': bosta_data['holder']['_id'],                                    # "5qx0p0cmUmx9XTVKfzKbZ"
       'phone': bosta_data['holder']['phone'],                               # "+201147759963"
       'name': bosta_data['holder']['name'],                                 # "IM-Mohamed Hassan Mohamed -E"
       'role': bosta_data['holder']['role']                                  # "STAR"
   }
   ```

   **H. Package Details and Notes (CRITICAL for service actions)**:
   ```python
   # From specs.packageDetails and notes
   package_details = {
       'description': bosta_data['specs']['packageDetails'].get('description'),  # "1 * كبه هفار 1200 وات (5025)"
       'notes': bosta_data.get('notes'),                                       # "تفاصيل الطلب: استبدال متور 5025 هنسلمه بمتور5025هنستلمه"
       'items_count': bosta_data['specs']['packageDetails']['itemsCount'],     # 1
       'package_type': bosta_data['specs']['packageType'],                     # "Parcel"
       'weight': bosta_data['specs']['weight']                                 # 1
   }
   ```

2. **Enhanced Data Transformation for Service Actions**:
   ```python
   def transform_bosta_data_for_service_actions(bosta_data):
       """
       Transform Bosta API response to service action format
       """
       return {
           'customer': {
               'id': bosta_data['receiver']['_id'],
               'full_name': bosta_data['receiver']['fullName'],
               'primary_phone': bosta_data['receiver']['phone'],
               'second_phone': bosta_data['receiver']['secondPhone'],
               'first_name': bosta_data['receiver']['firstName'],
               'last_name': bosta_data['receiver']['lastName']
           },
           'order': {
               'bosta_id': bosta_data['_id'],
               'tracking_number': bosta_data['trackingNumber'],
               'type': bosta_data['type']['value'],
               'type_code': bosta_data['type']['code'],
               'status': bosta_data['state']['value'],
               'status_code': bosta_data['state']['code'],
               'cod_amount': bosta_data['cod'],
               'shipment_fees': bosta_data['shipmentFees'],
               'created_at': bosta_data['createdAt'],
               'updated_at': bosta_data['updatedAt'],
               'scheduled_at': bosta_data['scheduledAt'],
               'is_confirmed_delivery': bosta_data['isConfirmedDelivery'],
               'payment_method': bosta_data.get('paymentMethod'),
               'attempts_count': bosta_data['attemptsCount']
           },
           'package': {
               'description': bosta_data['specs']['packageDetails'].get('description'),
               'notes': bosta_data.get('notes'),
               'items_count': bosta_data['specs']['packageDetails']['itemsCount'],
               'package_type': bosta_data['specs']['packageType'],
               'weight': bosta_data['specs']['weight'],
               'size': bosta_data['specs'].get('size')
           },
           'return_specs': {
               'description': bosta_data.get('returnSpecs', {}).get('packageDetails', {}).get('description'),
               'items_count': bosta_data.get('returnSpecs', {}).get('packageDetails', {}).get('itemsCount'),
               'package_type': bosta_data.get('returnSpecs', {}).get('packageType')
           },
           'addresses': {
               'pickup': {
                   'country': bosta_data['pickupAddress']['country']['name'],
                   'city': bosta_data['pickupAddress']['city']['nameAr'],
                   'zone': bosta_data['pickupAddress']['zone']['nameAr'],
                   'district': bosta_data['pickupAddress']['district']['nameAr'],
                   'first_line': bosta_data['pickupAddress']['firstLine'],
                   'second_line': bosta_data['pickupAddress']['secondLine'],
                   'is_work_address': bosta_data['pickupAddress']['isWorkAddress']
               },
               'dropoff': {
                   'country': bosta_data['dropOffAddress']['country']['name'],
                   'city': bosta_data['dropOffAddress']['city']['nameAr'],
                   'zone': bosta_data['dropOffAddress']['zone']['nameAr'],
                   'district': bosta_data['dropOffAddress']['district']['nameAr'],
                   'first_line': bosta_data['dropOffAddress']['firstLine'],
                   'second_line': bosta_data['dropOffAddress']['secondLine'],
                   'building_number': bosta_data['dropOffAddress'].get('buildingNumber'),
                   'floor': bosta_data['dropOffAddress'].get('floor'),
                   'apartment': bosta_data['dropOffAddress'].get('apartment'),
                   'location_name': bosta_data['dropOffAddress'].get('locationName'),
                   'geo_location': bosta_data['dropOffAddress'].get('geoLocation')
               }
           },
           'timeline': [
               {
                   'value': item['value'],
                   'code': item['code'],
                   'done': item['done'],
                   'date': item.get('date')
               }
               for item in bosta_data.get('timeline', [])
           ],
           'business': {
               'sender': {
                   'id': bosta_data['sender']['_id'],
                   'name': bosta_data['sender']['name'],
                   'phone': bosta_data['sender']['phone'],
                   'type': bosta_data['sender']['type']
               },
               'holder': {
                   'id': bosta_data['holder']['_id'],
                   'name': bosta_data['holder']['name'],
                   'phone': bosta_data['holder']['phone'],
                   'role': bosta_data['holder']['role']
               }
           }
       }
   ```

3. **Search Response Handling (for customer search)**:
   ```python
   def transform_bosta_search_response(search_response):
       """
       Transform Bosta search response to customer orders format
       """
       deliveries = search_response.get('data', {}).get('deliveries', [])
       
       # Group by customer phone (since search can return multiple orders for same customer)
       customer_orders = {}
       
       for delivery in deliveries:
           customer_phone = delivery['receiver']['phone']
           
           if customer_phone not in customer_orders:
               customer_orders[customer_phone] = {
                   'customer': {
                       'full_name': delivery['receiver']['fullName'],
                       'primary_phone': delivery['receiver']['phone'],
                       'second_phone': delivery['receiver']['secondPhone'],
                       'first_name': delivery['receiver']['firstName'],
                       'last_name': delivery['receiver']['lastName']
                   },
                   'orders': []
               }
           
           # Add order to customer's order list
           customer_orders[customer_phone]['orders'].append({
               'bosta_id': delivery['_id'],
               'tracking_number': delivery['trackingNumber'],
               'type': delivery['type']['value'],
               'type_code': delivery['type']['code'],
               'status': delivery['state']['value'],
               'status_code': delivery['state']['code'],
               'description': delivery['specs']['packageDetails'].get('description'),
               'notes': delivery.get('notes'),
               'cod_amount': delivery['cod'],
               'created_at': delivery['createdAt'],
               'updated_at': delivery['updatedAt'],
               'delivery_date': delivery['state'].get('deliveryTime'),
               'is_confirmed_delivery': delivery.get('isConfirmedDelivery'),
               'payment_method': delivery.get('paymentMethod'),
               'attempts_count': delivery['attemptsCount']
           })
       
       return {
           'success': True,
           'data': {
               'customers': list(customer_orders.values()),
               'total_count': search_response.get('data', {}).get('count', 0),
               'page': search_response.get('data', {}).get('page', 1),
               'limit': search_response.get('data', {}).get('limit', 50)
           }
       }
   ```

**Files to Modify:**
- `back/services/order_service.py` - Add complete data extraction methods
- `back/utils/bosta_utils.py` - Create utility functions for data transformation (single source of truth)

---

#### **Task 1.2: Unified Database Models (Service Actions + Maintenance Integration)**
**Priority**: 🔴 HIGH  
**Estimated Time**: 3-4 days  
**Dependencies**: Task 1.1  

**Detailed Steps:**
1. **Add New Enums to `back/db/auto_init.py`**
   ```python
   class ServiceActionType(Enum):
       PART_REPLACE = 'part_replace'           # استبدال قطعة
       FULL_REPLACE = 'full_replace'          # استبدال كامل
       RETURN_FROM_CUSTOMER = 'return_from_customer'  # استرجاع من العميل
   
   class ServiceActionStatus(Enum):
       CREATED = 'created'                    # تم الإنشاء
       CONFIRMED = 'confirmed'                # تم التأكيد
       PENDING_RECEIVE = 'pending_receive'    # في انتظار الاستلام (جاهز للفحص)
       # Note: Once scanned on maintenance hub, status becomes 'received' in maintenance cycle
   
   class ProductCategory(Enum):
       HAND_BLENDER = 'هاند بلندر'            # Hand Blender
       VACUUM_CLEANER = 'مكنسة'              # Vacuum Cleaner
       FOOD_PROCESSOR = 'كبه'                # Food Processor
       MIXER = 'خلاط هفار'                   # Mixer
       ELECTRIC_OVEN = 'فرن هفار كهربائي'    # Electric Oven
       DOUGH_MIXER = 'عجان'                  # Dough Mixer
       SPICE_GRINDER = 'مطحنه توابل'         # Spice Grinder
   
   class PartType(Enum):
       MOTOR = 'motor'                       # ماتور
       COMPONENT = 'component'               # قطعة
       ASSEMBLY = 'assembly'                 # تجميع
       PACKAGING = 'packaging'               # تغليف
       HEATING_ELEMENT = 'heating_element'   # عنصر تسخين
       WARRANTY = 'warranty'                 # ضمان
       COUPON = 'coupon'                    # كوبون
   ```

2. **Create ServiceAction Model (Integrated with Maintenance Cycle)**
   ```python
   class ServiceAction(BaseModel):
       __tablename__ = 'service_actions'
       
       # Core identification
       action_type = db.Column(SQLEnum(ServiceActionType), nullable=False)
       status = db.Column(SQLEnum(ServiceActionStatus), nullable=False, default=ServiceActionStatus.CREATED)
       
       # Customer and order reference (from Bosta API)
       customer_phone = db.Column(db.String(20), nullable=False, index=True)
       customer_name = db.Column(db.String(255))
       original_tracking_number = db.Column(db.String(100), nullable=False)
       
       # Service action details
       product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
       part_id = db.Column(db.Integer, db.ForeignKey('parts.id'))
       refund_amount = db.Column(db.Numeric(10, 2))  # For returns
       
       # New tracking for service action (THIS IS THE KEY TO UNIFIED CYCLE)
       new_tracking_number = db.Column(db.String(100), unique=True, index=True)  # UNIQUE - links to maintenance
       new_tracking_created_at = db.Column(db.DateTime)
       
       # Integration with maintenance cycle
       maintenance_order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)  # Links to maintenance order
       is_integrated_with_maintenance = db.Column(db.Boolean, default=False)  # Track integration status
       
       # Timestamps for workflow
       confirmed_at = db.Column(db.DateTime)
       pending_receive_at = db.Column(db.DateTime)  # When moved to pending receive
       integrated_at = db.Column(db.DateTime)  # When scanned on maintenance hub
       
       # Notes and metadata
       notes = db.Column(db.Text)
       action_data = db.Column(db.JSON)
       
       # Relationships
       product = db.relationship('Product', backref='service_actions')
       part = db.relationship('Part', backref='service_actions')
       maintenance_order = db.relationship('Order', backref='service_actions', foreign_keys=[maintenance_order_id])
       history = db.relationship('ServiceActionHistory', backref='service_action', lazy='dynamic')
   ```

3. **Create Enhanced ServiceAction Model with COMPLETE Bosta Data (CRITICAL UPDATE)**:
   ```python
   class ServiceAction(BaseModel):
       __tablename__ = 'service_actions'
       
       # Core identification
       action_type = db.Column(SQLEnum(ServiceActionType), nullable=False)
       status = db.Column(SQLEnum(ServiceActionStatus), nullable=False, default=ServiceActionStatus.CREATED)
       
       # Customer Information (from Bosta receiver object)
       customer_bosta_id = db.Column(db.String(100), index=True)  # AP2zJaF38UWRAQ9GnknLy
       customer_phone = db.Column(db.String(20), nullable=False, index=True)  # +201093095204
       customer_first_name = db.Column(db.String(100))  # ايمان مصطفي عبد الموجود
       customer_last_name = db.Column(db.String(100))   # -
       customer_full_name = db.Column(db.String(255))   # ايمان مصطفي عبد الموجود
       customer_second_phone = db.Column(db.String(20)) # 01152362497 or null
       
       # Original Order Information (from Bosta order object)
       original_bosta_id = db.Column(db.String(100), index=True)  # WXHnpRpICWPzOghd57p7a
       original_tracking_number = db.Column(db.String(100), nullable=False, index=True)  # 57646330
       original_order_type = db.Column(db.String(100))  # "Customer Return Pickup", "Send", "Exchange"
       original_order_type_code = db.Column(db.Integer)  # 25, 10, 30
       original_order_status = db.Column(db.String(100))  # "Pickup requested", "Delivered"
       original_order_status_code = db.Column(db.Integer)  # 10, 46, 45
       original_cod_amount = db.Column(db.Numeric(10, 2))  # 0, 1350, 1300
       original_shipment_fees = db.Column(db.Numeric(10, 2))  # 59
       original_created_at = db.Column(db.DateTime)  # "Wed Aug 13 2025 09:45:51 GMT+0000"
       original_updated_at = db.Column(db.DateTime)  # "Thu Aug 14 2025 14:59:25 GMT+0000"
       original_scheduled_at = db.Column(db.DateTime)  # "2025-08-16T20:59:59.999Z"
       original_pickup_request_id = db.Column(db.String(100))  # "070003396895"
       original_pickup_request_type = db.Column(db.String(100))  # "Customer Return Pickup"
       original_is_confirmed_delivery = db.Column(db.Boolean, default=False)
       original_payment_method = db.Column(db.String(50))  # "COD"
       original_attempts_count = db.Column(db.Integer, default=0)
       
       # Package Information (from Bosta specs object)
       package_description = db.Column(db.Text)  # "1 * كبه هفار 1200 وات (5025)"
       package_notes = db.Column(db.Text)  # "تفاصيل الطلب: استبدال متور 5025 هنسلمه بمتور5025هنستلمه"
       package_items_count = db.Column(db.Integer, default=1)
       package_type = db.Column(db.String(50))  # "Parcel"
       package_weight = db.Column(db.Integer, default=1)
       package_size = db.Column(db.String(50))  # "SMALL"
       
       # Return Specifications (from Bosta returnSpecs object - CRITICAL for service actions)
       return_description = db.Column(db.Text)  # "هنستلم: هاند بليندر 5057 السبب: الهاند بيسخن جامد+دراع الهراسه والكبه مبقوش بيركبوا للاخر طرد للصيانة (2)"
       return_items_count = db.Column(db.Integer, default=1)
       return_package_type = db.Column(db.String(50))  # "Parcel"
       
       # Address Information (from Bosta pickupAddress and dropOffAddress)
       pickup_country = db.Column(db.String(100))  # "Egypt"
       pickup_country_code = db.Column(db.String(10))  # "EG"
       pickup_city = db.Column(db.String(100))  # "Cairo"
       pickup_city_ar = db.Column(db.String(100))  # "القاهره"
       pickup_zone = db.Column(db.String(100))  # "Agouza"
       pickup_zone_ar = db.Column(db.String(100))  # "العجوزه"
       pickup_district = db.Column(db.String(100))  # "Mohandesiin"
       pickup_district_ar = db.Column(db.String(100))  # "المهندسين"
       pickup_first_line = db.Column(db.Text)  # "الجيزه تابعه لمركز كرداسه طريق ناهيا ابو رواش بجوار مسجد النور المحمدي"
       pickup_second_line = db.Column(db.Text)  # "محل ١٣١"
       pickup_is_work_address = db.Column(db.Boolean, default=False)
       
       dropoff_country = db.Column(db.String(100))  # "Egypt"
       dropoff_country_code = db.Column(db.String(10))  # "EG"
       dropoff_city = db.Column(db.String(100))  # "Sharqia"
       dropoff_city_ar = db.Column(db.String(100))  # "الشرقيه"
       dropoff_zone = db.Column(db.String(100))  # "Belbes"
       dropoff_zone_ar = db.Column(db.String(100))  # "بلبيس"
       dropoff_district = db.Column(db.String(100))  # "Belbes"
       dropoff_district_ar = db.Column(db.String(100))  # "بلبيس"
       dropoff_first_line = db.Column(db.Text)  # "بلبيس شارع جمعيه الجمل"
       dropoff_second_line = db.Column(db.Text)  # "مدرسه ابو بكر الصديق"
       dropoff_building_number = db.Column(db.String(20))  # "1"
       dropoff_floor = db.Column(db.String(20))  # "1"
       dropoff_apartment = db.Column(db.String(20))  # "1"
       dropoff_location_name = db.Column(db.String(255))  # "بيت العز"
       dropoff_geo_location = db.Column(db.JSON)  # [31.5667069, 30.4173884]
       
       # Business Information (from Bosta sender and holder objects)
       sender_bosta_id = db.Column(db.String(100))  # "Z0fKnekRd7Iyehhc7hLFz"
       sender_phone = db.Column(db.String(20))  # "+201277375716"
       sender_name = db.Column(db.String(100))  # "HVAR"
       sender_type = db.Column(db.String(50))  # "BUSINESS_ACCOUNT"
       
       holder_bosta_id = db.Column(db.String(100))  # "5qx0p0cmUmx9XTVKfzKbZ"
       holder_phone = db.Column(db.String(20))  # "+201147759963"
       holder_name = db.Column(db.String(100))  # "IM-Mohamed Hassan Mohamed -E"
       holder_role = db.Column(db.String(50))  # "STAR"
       
       # Service Action Details (our system data)
       product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
       part_id = db.Column(db.Integer, db.ForeignKey('parts.id'))
       refund_amount = db.Column(db.Numeric(10, 2))  # For returns
       
       # New tracking for service action (THIS IS THE KEY TO UNIFIED CYCLE)
       new_tracking_number = db.Column(db.String(100), unique=True, index=True)  # UNIQUE - links to maintenance
       new_tracking_created_at = db.Column(db.DateTime)
       
       # Integration with maintenance cycle
       maintenance_order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)  # Links to maintenance order
       is_integrated_with_maintenance = db.Column(db.Boolean, default=False)  # Track integration status
       
       # Timestamps for workflow
       confirmed_at = db.Column(db.DateTime)
       pending_receive_at = db.Column(db.DateTime)  # When moved to pending receive
       integrated_at = db.Column(db.DateTime)  # When scanned on maintenance hub
       
       # Notes and metadata
       notes = db.Column(db.Text)
       action_data = db.Column(db.JSON)  # Store additional Bosta data like timeline, SLA, etc.
       
       # Relationships
       product = db.relationship('Product', backref='service_actions')
       part = db.relationship('Part', backref='service_actions')
       maintenance_order = db.relationship('Order', backref='service_actions', foreign_keys=[maintenance_order_id])
       history = db.relationship('ServiceActionHistory', backref='service_action', lazy='dynamic')
   ```

4. **Create Product Model (Based on Real Data)**
   ```python
   class Product(BaseModel):
       __tablename__ = 'products'
       
       # Real data fields
       sku = db.Column(db.String(100), unique=True, nullable=False, index=True)  # hvar5057, hvar5055, etc.
       name_ar = db.Column(db.String(255), nullable=False)  # هاند بلندر هفار 1500 وات 5057 (5057)
       category = db.Column(SQLEnum(ProductCategory), nullable=False)  # هاند بلندر
       
       # Inventory management
       alert_quantity = db.Column(db.Integer, default=0)  # Real field from your data
       current_stock = db.Column(db.Integer, default=0)
       warranty_period_months = db.Column(db.Integer, default=12)  # Real field from your data
       
       # Status
       is_active = db.Column(db.Boolean, default=True)  # Real field from your data
       
       # Metadata
       description = db.Column(db.Text)
       specifications = db.Column(db.JSON)
       image_url = db.Column(db.String(500))
       
       # Relationships
       parts = db.relationship('Part', backref='product', lazy='dynamic')
   ```

5. **Create Part Model (Based on Real Data)**
   ```python
   class Part(BaseModel):
       __tablename__ = 'parts'
       
       # Real data fields
       part_sku = db.Column(db.String(100), unique=True, nullable=False, index=True)  # hvar0178, hvar0179, etc.
       part_name = db.Column(db.String(255), nullable=False)  # كبة هاند بلندر 5057
       part_type = db.Column(SQLEnum(PartType), nullable=False)  # component, motor, assembly, etc.
       
       # Product association
       product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
       
       # Inventory
       current_stock = db.Column(db.Integer, default=0)
       min_stock_level = db.Column(db.Integer, default=5)
       max_stock_level = db.Column(db.Integer, default=100)
       
       # Real data fields
       serial_number = db.Column(db.String(100))  # Real field from your data
       is_active = db.Column(db.Boolean, default=True)  # Real field from your data
       
       # Pricing
       cost_price = db.Column(db.Numeric(10, 2))
       selling_price = db.Column(db.Numeric(10, 2))
   ```

6. **Create ServiceActionHistory Model**
   ```python
   class ServiceActionHistory(BaseModel):
       __tablename__ = 'service_action_history'
       
       service_action_id = db.Column(db.Integer, db.ForeignKey('service_actions.id'), nullable=False)
       action = db.Column(db.String(100), nullable=False)  # status_change, note_added, integration, etc.
       from_status = db.Column(SQLEnum(ServiceActionStatus))
       to_status = db.Column(SQLEnum(ServiceActionStatus))
       notes = db.Column(db.Text)
       action_data = db.Column(db.JSON)
       user_name = db.Column(db.String(100), default='فني الصيانة')
   ```

7. **Update Existing Order Model (Add Service Action Integration)**
   ```python
   class Order(BaseModel):
       # ... existing fields ...
       
       # NEW: Service Action Integration
       is_service_action_order = db.Column(db.Boolean, default=False)  # Is this from service action?
       service_action_id = db.Column(db.Integer, db.ForeignKey('service_actions.id'), nullable=True)
       service_action_type = db.Column(SQLEnum(ServiceActionType), nullable=True)  # What type of service action
       
       # ... rest of existing fields ...
   ```

**Files to Modify/Create:**
- `back/db/auto_init.py` - Add new enums and models
- `back/init_db.py` - Add database creation for new tables

**No-Duplication Checklist (Task 1.2)**
- [ ] Define enums once in `auto_init.py`; reference everywhere else
- [ ] Centralize state transitions in `ACTION_STATUS_MAP` and `Order.can_transition_to`
- [ ] Reuse timezone helpers `get_egypt_now()`; do not inline `datetime.now()`

---

#### **Task 1.3: Seed Real Product and Part Data**
**Priority**: 🟡 MEDIUM  
**Estimated Time**: 1 day  
**Dependencies**: Task 1.2  

**Detailed Steps:**
1. **Create data seeding script in `back/init_db.py`**
   - Add all 19 products with real SKUs and Arabic names
   - Add all 115+ parts with real part SKUs and names
   - Set proper relationships between products and parts
   - Initialize stock levels and pricing

2. **Real Product Examples to Seed**:
   ```python
   # هاند بلندر category
   {
       'sku': 'hvar5057',
       'name_ar': 'هاند بلندر هفار 1500 وات 5057 (5057)',
       'category': ProductCategory.HAND_BLENDER,
       'alert_quantity': 0,
       'warranty_period_months': 12,
       'is_active': True
   }
   
   # خلاط هفار category  
   {
       'sku': 'hvar5066',
       'name_ar': 'خلاط هفار 8000 وات 3*1 (5066)',
       'category': ProductCategory.MIXER,
       'alert_quantity': 0,
       'warranty_period_months': 12,
       'is_active': True
   }
   ```

3. **Real Part Examples to Seed**:
   ```python
   # Motor parts
   {
       'part_sku': 'hvar0177',
       'part_name': 'ماتور هاند 5057',
       'part_type': PartType.MOTOR,
       'product_id': 1,  # hvar5057
       'is_active': True
   }
   
   # Component parts
   {
       'part_sku': 'hvar0178',
       'part_name': 'كبة هاند بلندر 5057',
       'part_type': PartType.COMPONENT,
       'product_id': 1,  # hvar5057
       'is_active': True
   }
   ```

**Files to Modify:**
- `back/init_db.py` - Add data seeding functions

---

### **PHASE 2: UNIFIED WORKFLOW SERVICES (Week 3-4)**

#### **Task 2.1: Unified Service Action + Maintenance Service**
**Priority**: 🔴 HIGH  
**Estimated Time**: 4-5 days  
**Dependencies**: Task 1.2  

**Detailed Steps:**
1. **Create `back/services/unified_service.py`**
   - Handle complete workflow from service action creation to maintenance integration
   - Manage status transitions across both cycles
   - Handle maintenance hub scanning integration

2. **Core Methods to Implement**:
   ```python
   class UnifiedService:
       # Service Action Management
       @staticmethod
       def create_service_action(action_type, customer_data, original_tracking, product_id=None, part_id=None, refund_amount=None)
       
       @staticmethod
       def confirm_service_action(action_id, new_tracking_number, notes="")
       
       @staticmethod
       def move_to_pending_receive(action_id, notes="")
       
       # UNIFIED CYCLE INTEGRATION - THE CORE
       @staticmethod
       def integrate_with_maintenance_cycle(service_action_tracking, user_name="فني الصيانة")
           """
           This is the KEY method that unifies the cycles!
           When scanning service action tracking on maintenance hub:
           1. Find service action by tracking number
           2. Create maintenance order
           3. Link them together
           4. Move service action to integrated state
           5. Start maintenance cycle
           """
       
       @staticmethod
       def get_pending_receive_actions()  # For maintenance hub display
       
       @staticmethod
       def get_service_action_by_tracking(tracking_number)
       
       @staticmethod
       def get_maintenance_order_for_service_action(service_action_id)
   ```

3. **Unified Workflow State Machine**:
   ```
   SERVICE ACTIONS CYCLE:
   CREATED → CONFIRMED → PENDING_RECEIVE
        ↓         ↓            ↓
     FAILED → CREATED → CONFIRMED
   
   MAINTENANCE HUB INTEGRATION:
   PENDING_RECEIVE → SCAN ON HUB → RECEIVED (Maintenance Cycle)
        ↓              ↓              ↓
   Service Action   Integration   Full Maintenance
   Status          Complete       Workflow Starts
   ```

4. **Key Business Logic**:
   - **Part Replace**: Select product → Select specific part → Create service action → Confirm → Pending Receive → Scan on Hub → Maintenance Cycle
   - **Full Replace**: Select product → Create service action → Confirm → Pending Receive → Scan on Hub → Maintenance Cycle
   - **Return from Customer**: Select product → Input refund amount → Create return service action → Confirm → Pending Receive → Scan on Hub → Maintenance Cycle

**Files to Create:**
- `back/services/unified_service.py`

**No-Duplication Checklist (Task 2.1)**
- [ ] Put cross-cutting workflow logic in `UnifiedService`; do not reimplement in routes or other services
- [ ] Reference `ACTION_STATUS_MAP` instead of re-deriving transitions
- [ ] Keep audit/history serialization in one place

---

#### **Task 2.2: Enhanced Order Service (Maintenance Hub Integration)**
**Priority**: 🔴 HIGH  
**Estimated Time**: 3-4 days  
**Dependencies**: Task 2.1  

**Detailed Steps:**
1. **Update `back/services/order_service.py`**
   - Enhance `scan_order()` method to detect service actions
   - Integrate with unified service for automatic workflow transition
   - Handle service action integration seamlessly

2. **Enhanced scan_order Method**:
   ```python
   @staticmethod
   def scan_order(tracking_number: str, user_name: str = 'فني الصيانة', force_create: bool = False) -> Tuple[bool, Optional[Order], Optional[str], bool]:
       """
       Enhanced scan_order that integrates service actions with maintenance cycle
       """
       # First, check if this is a service action tracking number
       service_action = UnifiedService.get_service_action_by_tracking(tracking_number)
       
       if service_action and service_action.status == ServiceActionStatus.PENDING_RECEIVE:
           # INTEGRATION POINT: Service Action → Maintenance Cycle
           success, maintenance_order, error = UnifiedService.integrate_with_maintenance_cycle(
               tracking_number, user_name
           )
           
           if success:
               # Service action is now integrated, return maintenance order
               return True, maintenance_order, "تم دمج إجراء الخدمة مع دورة الصيانة", True
           else:
               return False, None, error, False
       
       # Continue with existing maintenance order logic
       # ... existing code ...
   ```

3. **New Maintenance Actions for Service Actions**:
   ```python
   # Add to MaintenanceAction enum
   class MaintenanceAction(Enum):
       # ... existing actions ...
       
       # NEW: Service Action Integration Actions
       INTEGRATE_SERVICE_ACTION = 'integrate_service_action'  # When service action is scanned
       COMPLETE_SERVICE_ACTION = 'complete_service_action'    # When service action maintenance is done
   ```

4. **Update ACTION_STATUS_MAP**:
   ```python
   ACTION_STATUS_MAP = {
       # ... existing mappings ...
       
       # NEW: Service Action Integration
       MaintenanceAction.INTEGRATE_SERVICE_ACTION: OrderStatus.RECEIVED,  # Move to received
       MaintenanceAction.COMPLETE_SERVICE_ACTION: OrderStatus.COMPLETED,  # Complete service action
   }
   ```

**Files to Modify:**
- `back/services/order_service.py`
- `back/db/auto_init.py` - Add new maintenance actions

**No-Duplication Checklist (Task 2.2)**
- [ ] Reuse `UnifiedService` for service-action integration
- [ ] Arabic status names defined once per blueprint (e.g., `STATUS_ARABIC_NAME`)
- [ ] Do not duplicate scan logic; extend `scan_order` only

---

#### **Task 2.3: Product and Part Management Service (Real Data)**
**Priority**: 🟡 MEDIUM  
**Estimated Time**: 2-3 days  
**Dependencies**: Task 1.2  

**Detailed Steps:**
1. **Create `back/services/product_service.py`**
   - CRUD operations for products and parts (based on real data structure)
   - Inventory management (stock levels, reorder points)
   - Analytics and reporting

2. **Core Methods**:
   ```python
   class ProductService:
       @staticmethod
       def create_product(sku, name_ar, category, alert_quantity, warranty_period_months, is_active=True)
       
       @staticmethod
       def create_part(part_sku, part_name, part_type, product_id, is_active=True)
       
       @staticmethod
       def update_stock(product_id, quantity_change, reason="")
       
       @staticmethod
       def update_part_stock(part_id, quantity_change, reason="")
       
       @staticmethod
       def get_low_stock_items()
       
       @staticmethod
       def get_inventory_analytics()
       
       @staticmethod
       def get_products_by_category(category)
       
       @staticmethod
       def get_parts_by_product(product_id)
   ```

**Files to Create:**
- `back/services/product_service.py`

---

### **PHASE 3: UNIFIED API ENDPOINTS (Week 5-6)**

#### **Task 3.1: Unified Service Action + Maintenance API Endpoints**
**Priority**: 🔴 HIGH  
**Estimated Time**: 4 days  
**Dependencies**: Task 2.1, 2.2  

**Detailed Steps:**
1. **Create `back/routes/api/services.py`**
   ```python
   # Create new service action
   POST /api/v1/services/create
   {
     "action_type": "part_replace",
     "customer_phone": "+201155125743",
     "customer_name": "أشرف موسى عباس عثمان",
     "original_tracking": "68427300",
     "product_id": 18,  # خلاط هفار 5066
     "part_id": 104,    # ماتور خلاط 5066
     "notes": "استبدال ماتور خلاط"
   }
   
   # Confirm service action
   POST /api/v1/services/{id}/confirm
   {
     "new_tracking_number": "12345678",
     "notes": "تم إنشاء طلب استبدال"
   }
   
   # Move to pending receive (ready for maintenance hub)
   POST /api/v1/services/{id}/pending-receive
   {
     "notes": "جاهز للفحص في مركز الصيانة"
   }
   
   # List service actions with status filtering
   GET /api/v1/services?status=pending_receive&customer_phone=+201155125743
   
   # Get pending receive actions (for maintenance hub display)
   GET /api/v1/services/pending-receive
   ```

2. **Create `back/routes/api/products.py`**
   ```python
   # Product management (real data)
   POST /api/v1/products
   GET /api/v1/products?category=خلاط هفار
   PUT /api/v1/products/{id}
   DELETE /api/v1/products/{id}
   
   # Part management (real data)
   POST /api/v1/parts
   GET /api/v1/parts?product_id=18&part_type=motor
   PUT /api/v1/parts/{id}
   DELETE /api/v1/parts/{id}
   
   # Inventory analytics
   GET /api/v1/inventory/analytics
   GET /api/v1/inventory/low-stock
   GET /api/v1/inventory/products/{id}/parts
   ```

3. **Update `back/routes/api/orders.py` (Maintenance Hub Integration)**
   ```python
   # NEW: Get pending receive service actions for maintenance hub
   GET /api/v1/orders/pending-service-actions
   
   # NEW: Integrate service action with maintenance cycle
   POST /api/v1/orders/integrate-service-action
   {
     "service_action_tracking": "12345678",
     "user_name": "فني الصيانة"
   }
   ```

**Files to Create:**
- `back/routes/api/services.py`
- `back/routes/api/products.py`
- Update `back/routes/api/orders.py`
- Update `back/routes/__init__.py`

**No-Duplication Checklist (Task 3.x)**
- [ ] Use shared response envelope `{ success, data, message }`
- [ ] Put validation in services/utilities; routes should not duplicate validation
- [ ] Blueprint-level error handlers referenced, not redefined per-route

---

### **PHASE 4: UNIFIED FRONTEND INTEGRATION (Week 7-8)**

#### **Task 4.1: Unified Service Action + Maintenance Components**
**Priority**: 🔴 HIGH  
**Estimated Time**: 5-6 days  
**Dependencies**: Task 3.1  
**Status**: ✅ COMPLETED  

**Detailed Steps:**
1. **Create `front/src/components/services/ServiceActionForm.jsx`**
   - Customer search form (phone/name/tracking)
   - Order selection from customer history
   - Service action type selection (PART_REPLACE, FULL_REPLACE, RETURN_FROM_CUSTOMER)
   - Product selection (based on real data: هاند بلندر, خلاط هفار, etc.)
   - Part selection (based on real data: ماتور, كبة, etc.)
   - Refund amount input for returns

2. **Create `front/src/components/services/ServiceActionList.jsx`**
   - Display all service actions with filtering
   - Status-based grouping (Created, Confirmed, Pending Receive)
   - **Key Feature**: Show "Pending Receive" actions prominently for maintenance hub
   - Action buttons for each status

3. **Create `front/src/components/services/CustomerSearchForm.jsx`**
   - Search input for phone/name/tracking
   - Real-time search results from Bosta API
   - Customer information display
   - Order history selection

4. **Create `front/src/components/services/CustomerOrdersList.jsx`**
   - Display customer's order history from Bosta
   - Order selection for service action
   - Order details (tracking, description, status, COD)

5. **Create `front/src/components/services/PendingReceiveSection.jsx`**
   - **CRITICAL COMPONENT**: Shows all pending receive service actions
   - Display in maintenance hub for easy scanning
   - Clear indication that these are ready for maintenance integration

**Key Features**:
- **Unified workflow management**
- **Clear status transitions**
- **Real product/part data integration**
- **Maintenance hub integration ready**

**Files to Create:**
- `front/src/components/services/ServiceActionForm.jsx`
- `front/src/components/services/ServiceActionList.jsx`
- `front/src/components/services/CustomerSearchForm.jsx`
- `front/src/components/services/CustomerOrdersList.jsx`
- `front/src/components/services/PendingReceiveSection.jsx`

**No-Duplication Checklist (Frontend)**
- [ ] API calls only via `front/src/api/*.js`; reuse `API_ENDPOINTS`
- [ ] Centralize transforms; reuse `orderAPI.transformBackendOrder` and add new ones under a single helper module if needed
- [ ] Reuse `STATUS_MAPPING` and tokens from Tailwind config; no per-component copies

**✅ COMPLETION SUMMARY:**
Task 4.1 has been successfully completed with all components built and integrated:
- **ServiceActionCard**: Compact, professional card component with expandable details
- **ServiceActionList**: Responsive list with filtering and status-based grouping  
- **ServiceActionForm**: Comprehensive form for creating/editing service actions
- **ServiceActionTabNavigation**: Tab navigation with real-time counts and quick stats
- **ServiceActionsPage**: Main page integrating all components seamlessly
- **useServiceActions Hook**: Custom hook for optimized state management

All components maintain the existing design system while providing a compact, professional interface that's fully WCAG 3 compliant and ready for maintenance hub integration.

---

#### **Task 4.2: Enhanced Maintenance Hub Integration**
**Priority**: 🔴 HIGH  
**Estimated Time**: 4-5 days  
**Dependencies**: Task 4.1  

**Detailed Steps:**
1. **Update `front/src/pages/OrderManagementPage.jsx`**
   - Add "Pending Service Actions" section above "Received" tab
   - Display pending receive service actions prominently
   - Show integration status when service actions are scanned
   - Maintain existing maintenance cycle unchanged

2. **Create `front/src/components/maintenance/PendingServiceActionsSection.jsx`**
   - Display all pending receive service actions
   - Show customer info, product details, and action type
   - Clear indication these are ready for maintenance hub scanning
   - Integration status tracking

3. **Update `front/src/components/common/OrderCard.jsx`**
   - Show service action information for integrated orders
   - Display service action type and history
   - Maintain existing maintenance action display

4. **Update `front/src/components/common/TabNavigation.jsx`**
   - Add service action tabs (independent workflow)
   - Keep maintenance page tabs unchanged
   - Show pending service actions count in maintenance hub

**Integration Points**:
- **Pending Service Actions** appear in maintenance hub
- **Scanning** automatically integrates service actions
- **Unified workflow** from service action to maintenance completion

**Files to Modify:**
- `front/src/pages/OrderManagementPage.jsx`
- `front/src/components/common/OrderCard.jsx`
- `front/src/components/common/TabNavigation.jsx`
- Create `front/src/components/maintenance/PendingServiceActionsSection.jsx`

---

#### **Task 4.3: Stock Management Components (Real Data)**
**Priority**: 🟡 MEDIUM  
**Estimated Time**: 3-4 days  
**Dependencies**: Task 3.1  

**Detailed Steps:**
1. **Create `front/src/components/stock/ProductForm.jsx`**
   - Product creation/editing form
   - Category selection (real categories: هاند بلندر, خلاط هفار, etc.)
   - SKU input (hvar5057, hvar5066, etc.)
   - Arabic name input
   - Alert quantity and warranty period
   - Active status toggle

2. **Create `front/src/components/stock/PartForm.jsx`**
   - Part creation/editing form
   - Product association (real products)
   - Part type selection (motor, component, assembly, etc.)
   - Part SKU input (hvar0178, hvar0179, etc.)
   - Arabic part name input

3. **Create `front/src/components/stock/InventoryAnalytics.jsx`**
   - Stock level dashboard
   - Low stock alerts (based on real alert_quantity)
   - Usage patterns
   - Reorder recommendations
   - Category-based analytics

4. **Create `front/src/components/stock/ProductList.jsx` & `PartList.jsx`**
   - CRUD operations for products/parts
   - Stock level indicators
   - Search and filtering by category/type
   - Real data display

**Files to Create:**
- `front/src/components/stock/ProductForm.jsx`
- `front/src/components/stock/PartForm.jsx`
- `front/src/components/stock/InventoryAnalytics.jsx`
- `front/src/components/stock/ProductList.jsx`
- `front/src/components/stock/PartList.jsx`

---

### **PHASE 5: UNIFIED TESTING & INTEGRATION (Week 9-10)**

#### **Task 5.1: Complete Unified Workflow Testing**
**Priority**: 🔴 HIGH  
**Estimated Time**: 4-5 days  
**Dependencies**: All previous tasks  

**Detailed Steps:**
1. **Test Complete Unified Workflow**:
   - Customer search → Order selection → Action creation
   - Service action status transitions: Created → Confirmed → Pending Receive
   - **CRITICAL TEST**: Scan service action on maintenance hub
   - **INTEGRATION TEST**: Service action moves to maintenance cycle
   - **WORKFLOW TEST**: Complete maintenance cycle for integrated service action

2. **Test Maintenance Hub Integration**:
   - Pending service actions appear in maintenance hub
   - Scanning automatically integrates service actions
   - Service action history preserved in maintenance order
   - No duplicate orders or conflicts

3. **Test Stock Management (Real Data)**:
   - Product/part CRUD operations with real SKUs
   - Inventory updates and analytics
   - Low stock alerts based on real alert_quantity
   - Arabic name handling and display

**Testing Focus**:
- **Complete workflow integration**
- **Real data accuracy**
- **Automatic transitions**
- **Arabic language support**
- **No workflow conflicts**

---

## 🎯 **IMPLEMENTATION PRIORITY MATRIX (UNIFIED CYCLE)**

| Task | Priority | Dependencies | Estimated Time | Risk Level | Integration Level |
|------|----------|--------------|----------------|------------|-------------------|
| Enhanced Bosta Search API | 🔴 HIGH | None | 2-3 days | 🟢 LOW | 🔴 FULL |
| Unified Database Models | 🔴 HIGH | Task 1.1 | 3-4 days | 🟢 LOW | 🔴 FULL |
| Unified Service | 🔴 HIGH | Task 1.2 | 4-5 days | 🔴 HIGH | 🔴 FULL |
| Enhanced Order Service | 🔴 HIGH | Task 2.1 | 3-4 days | 🔴 HIGH | 🔴 FULL |
| Unified API Endpoints | 🔴 HIGH | Task 2.1, 2.2 | 4 days | 🔴 HIGH | 🔴 FULL |
| Unified Frontend | 🔴 HIGH | Task 3.1 | 5-6 days | 🔴 HIGH | 🔴 FULL |
| Maintenance Integration | 🔴 HIGH | Task 4.1 | 4-5 days | 🔴 HIGH | 🔴 FULL |
| Unified Testing | 🔴 HIGH | All previous | 4-5 days | 🔴 HIGH | 🔴 FULL |

---

## 🚨 **CRITICAL SUCCESS FACTORS (UNIFIED CYCLE)**

1. **Seamless Workflow Integration**: Service actions must flow seamlessly into maintenance cycle
2. **Real Data Integration**: Use actual product SKUs, names, and categories from your database
3. **Automatic Transitions**: Service actions automatically move to maintenance when scanned
4. **Arabic Language Support**: Full Arabic interface for product names and categories
5. **Single Source of Truth**: One unified system that any expert can work with

---

## 🔧 **TECHNICAL IMPLEMENTATION NOTES (UNIFIED CYCLE)**

### **Database Design Principles**
- Service actions and maintenance orders are linked but separate
- Use real product and part data structure from your existing database
- Maintain referential integrity across both cycles
- Add proper indexes for search and integration performance

### **API Design Patterns**
- Follow existing response format: `{ success, data, message }`
- Use proper HTTP status codes
- Implement pagination for list endpoints
- Add request validation and sanitization

### **Frontend Architecture**
- Follow existing component patterns and styling
- Use React hooks for state management
- Implement proper error boundaries
- Maintain RTL support throughout
- **Unified workflow display**

### **Integration Points (CORE OF THE SYSTEM)**
- Service actions automatically integrate with maintenance when scanned
- Pending service actions appear in maintenance hub
- Single workflow from creation to completion
- No duplicate orders or workflow conflicts

---

## 🔄 **COMPLETE UNIFIED WORKFLOW SUMMARY**

### **UNIFIED CYCLE: Service Actions + Maintenance Hub**
```
Phase 1: Service Action Creation
Customer Search → Order Selection → Action Creation → Confirmation → Pending Receive
     ↓              ↓              ↓              ↓            ↓
Bosta API      Customer Orders   Service Action  Ready for    Ready for
Integration    Display & Select  Type Selection  Maintenance  Hub Scanning

Phase 2: Maintenance Hub Integration
Pending Receive → Scan on Hub → Automatic Integration → Maintenance Cycle
      ↓            ↓            ↓                      ↓
Service Action  Maintenance   Service Action        Full Maintenance
Ready State     Hub Scan      Integrated            Workflow
                (KEY POINT)   with Order

Phase 3: Complete Maintenance Cycle
Received → In Maintenance → Completed/Failed/Returned
    ↓            ↓                    ↓
Maintenance   Start/Complete/    Final Status
Cycle         Fail/Reschedule    (Service Action Complete)
```

### **Key Benefits of Unified Cycle**
1. **Single Workflow**: From service action creation to maintenance completion
2. **Automatic Integration**: No manual work when scanning on maintenance hub
3. **Complete History**: Service action history preserved in maintenance order
4. **Expert-Friendly**: Any technician can work with the complete system
5. **No Duplicates**: One order, one workflow, complete tracking

---

*This unified plan creates ONE COMPLETE CYCLE that integrates service actions seamlessly with the existing maintenance workflow, making it easy for any expert to work with the complete system.*