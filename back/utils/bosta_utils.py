"""Utility helpers for Bosta data normalization and transformations.

Centralizes logic to avoid duplication across services and routes.
"""

from typing import Dict, List, Tuple


def normalize_egypt_phone(phone: str) -> str:
    """Normalize Egyptian phone numbers to +2XXXXXXXXXXX format.

    - Strips spaces
    - Removes leading 0
    - Ensures +2 country code prefix
    """
    if not phone:
        return phone
    clean_phone = phone.strip()
    if clean_phone.startswith('0'):
        clean_phone = clean_phone[1:]
    if not clean_phone.startswith('+2'):
        clean_phone = f"+2{clean_phone}"
    return clean_phone


def transform_delivery_brief(delivery: Dict) -> Dict:
    """Transform a Bosta delivery object to a brief normalized dict.

    Expected fields present in Bosta payloads are accessed defensively.
    """
    if not delivery:
        return {}
    receiver = (delivery.get('receiver') or {})
    state = (delivery.get('state') or {})
    order_type = (delivery.get('type') or {})
    specs = (delivery.get('specs') or {})
    package_details = (specs.get('packageDetails') or {})
    return {
        'tracking_number': delivery.get('trackingNumber'),
        'masked_state': delivery.get('maskedState') or state.get('value'),
        'state': state,
        'order_type': order_type.get('value'),
        'type_code': order_type.get('code'),
        'status_code': state.get('code'),
        'cod_amount': delivery.get('cod', 0),
        'shipment_fees': delivery.get('shipmentFees'),
        'description': package_details.get('description'),
        'notes': delivery.get('notes'),
        'receiver': {
            'full_name': receiver.get('fullName'),
            'phone': receiver.get('phone'),
            'second_phone': receiver.get('secondPhone'),
            'has_second_phone': bool(receiver.get('secondPhone')),
        },
        'created_at': delivery.get('createdAt'),
        'updated_at': delivery.get('updatedAt'),
        'delivery_date': state.get('deliveryTime'),
        'is_confirmed_delivery': delivery.get('isConfirmedDelivery'),
        'payment_method': delivery.get('paymentMethod'),
        'attempts_count': delivery.get('attemptsCount'),
    }


def transform_bosta_search_response(search_response: Dict) -> Dict:
    """Transform Bosta search response to grouped customers with their orders.

    Returns a dict:
    {
        'customers': [ { 'customer': {..}, 'orders': [..] }, ... ],
        'total_count': int,
        'page': int,
        'limit': int,
    }
    """
    # Support both shapes: either search_response has 'data' wrapper or is already the inner payload
    payload = search_response.get('data', search_response) if isinstance(search_response, dict) else {}
    deliveries: List[Dict] = (payload or {}).get('deliveries', []) or []

    customer_orders: Dict[str, Dict] = {}

    for delivery in deliveries:
        receiver = (delivery.get('receiver') or {})
        customer_phone = receiver.get('phone') or ''

        if customer_phone not in customer_orders:
            customer_orders[customer_phone] = {
                'customer': {
                    'full_name': receiver.get('fullName'),
                    'primary_phone': receiver.get('phone'),
                    'second_phone': receiver.get('secondPhone'),
                    'first_name': receiver.get('firstName'),
                    'last_name': receiver.get('lastName'),
                },
                'orders': [],
            }

        customer_orders[customer_phone]['orders'].append({
            'bosta_id': delivery.get('_id'),
            'tracking_number': delivery.get('trackingNumber'),
            'type': (delivery.get('type') or {}).get('value'),
            'type_code': (delivery.get('type') or {}).get('code'),
            'status': (delivery.get('state') or {}).get('value'),
            'status_code': (delivery.get('state') or {}).get('code'),
            'description': ((delivery.get('specs') or {}).get('packageDetails') or {}).get('description'),
            'notes': delivery.get('notes'),
            'cod_amount': delivery.get('cod'),
            'shipment_fees': delivery.get('shipmentFees'),
            'created_at': delivery.get('createdAt'),
            'updated_at': delivery.get('updatedAt'),
            'delivery_date': (delivery.get('state') or {}).get('deliveryTime'),
            'is_confirmed_delivery': delivery.get('isConfirmedDelivery'),
            'payment_method': delivery.get('paymentMethod'),
            'attempts_count': delivery.get('attemptsCount'),
            'calls_number': delivery.get('callsNumber'),
            'sms_number': delivery.get('smsNumber'),
        })

    return {
        'customers': list(customer_orders.values()),
        'total_count': (payload or {}).get('count', 0),
        'page': (payload or {}).get('page', 1),
        'limit': (payload or {}).get('limit', 50),
    }


def transform_bosta_data_for_service_actions(bosta_data: Dict) -> Dict:
    """Transform full Bosta API response to a structure tailored for service actions.

    Returns a nested dict including customer, order, package, return_specs, addresses, timeline, and business info.
    This function now uses the comprehensive data extraction from Task 1.1.1.
    """
    # Use the comprehensive transformation function for complete data extraction
    return transform_bosta_data_for_service_actions_complete(bosta_data)

def transform_bosta_data_for_service_actions_complete(bosta_data: Dict) -> Dict:
    """
    NEW COMPREHENSIVE: Transform Bosta API response to service action format with COMPLETE data extraction.
    This is the enhanced data extraction function as specified in Task 1.1.1.
    Extracts ALL critical data from Bosta API responses for service actions workflow.
    """
    if not bosta_data:
        return {}

    # ============================================================================
    # A. Customer Information (receiver object) - COMPLETE EXTRACTION
    # ============================================================================
    receiver = bosta_data.get('receiver', {}) or {}
    customer_data = {
        'id': receiver.get('_id'),                    # AP2zJaF38UWRAQ9GnknLy
        'phone': receiver.get('phone'),              # +201093095204
        'first_name': receiver.get('firstName'),     # ايمان مصطفي عبد الموجود
        'last_name': receiver.get('lastName'),       # -
        'full_name': receiver.get('fullName'),       # ايمان مصطفي عبد الموجود
        'second_phone': receiver.get('secondPhone')  # null or "01152362497"
    }

    # ============================================================================
    # B. Order Details (core order data) - COMPLETE EXTRACTION
    # ============================================================================
    state = bosta_data.get('state', {}) or {}
    order_type = bosta_data.get('type', {}) or {}
    order_data = {
        'bosta_id': bosta_data.get('_id'),                         # WXHnpRpICWPzOghd57p7a
        'tracking_number': bosta_data.get('trackingNumber'),       # 57646330
        'type_code': order_type.get('code'),              # 25
        'type_value': order_type.get('value'),            # "Customer Return Pickup"
        'state_value': state.get('value'),          # "Pickup requested"
        'state_code': state.get('code'),            # 10
        'cod_amount': bosta_data.get('cod'),                      # 0
        'shipment_fees': bosta_data.get('shipmentFees'),          # 59
        'created_at': bosta_data.get('createdAt'),                # "Wed Aug 13 2025 09:45:51 GMT+0000"
        'updated_at': bosta_data.get('updatedAt'),                # "Thu Aug 14 2025 14:59:25 GMT+0000"
        'scheduled_at': bosta_data.get('scheduledAt'),            # "2025-08-16T20:59:59.999Z"
        'pickup_request_id': bosta_data.get('pickupRequestId'),    # "070003396895"
        'pickup_request_type': bosta_data.get('pickupRequestType'), # "Customer Return Pickup"
        'is_confirmed_delivery': bosta_data.get('isConfirmedDelivery'), # false
        'confirmed_delivery_at': bosta_data.get('confirmedDeliveryAt'), # "2025-02-01T18:43:38.565Z"
        'payment_method': bosta_data.get('paymentMethod'),         # "COD"
        'attempts_count': bosta_data.get('attemptsCount'),         # 0
        'calls_number': bosta_data.get('callsNumber'),             # 0
        'sms_number': bosta_data.get('smsNumber'),                 # 0
        'masked_state': bosta_data.get('maskedState')              # "Created"
    }

    # ============================================================================
    # C. Package Specifications (specs object) - COMPLETE EXTRACTION
    # ============================================================================
    specs = bosta_data.get('specs', {}) or {}
    specs_data = {
        'package_type': specs.get('packageType'),    # "Parcel"
        'weight': specs.get('weight'),              # 1
        'size': specs.get('size'),                  # "SMALL" (may not exist)
        'items_count': specs.get('packageDetails', {}).get('itemsCount'),  # 1
        'description': specs.get('packageDetails', {}).get('description')  # Package description
    }

    # ============================================================================
    # D. Return Specifications (returnSpecs object - CRITICAL for service actions)
    # ============================================================================
    return_specs = bosta_data.get('returnSpecs', {}) or {}
    return_specs_data = {
        'return_description': return_specs.get('packageDetails', {}).get('description'),
        # "هنستلم: هاند بليندر 5057 السبب: الهاند بيسخن جامد+دراع الهراسه والكبه مبقوش بيركبوا للاخر طرد للصيانة (2)"
        'return_items_count': return_specs.get('packageDetails', {}).get('itemsCount'),   # 1
        'return_package_type': return_specs.get('packageType'),                   # "Parcel"
        'return_weight': return_specs.get('weight')                               # Return weight if specified
    }

    # ============================================================================
    # E. Address Information (pickupAddress and dropOffAddress) - COMPLETE EXTRACTION
    # ============================================================================
    pickup_addr = bosta_data.get('pickupAddress', {}) or {}
    dropoff_addr = bosta_data.get('dropOffAddress', {}) or {}

    # From pickupAddress
    pickup_address = {
        'country_name': pickup_addr.get('country', {}).get('name'),           # "Egypt"
        'country_code': pickup_addr.get('country', {}).get('code'),           # "EG"
        'city_name': pickup_addr.get('city', {}).get('name'),                # "Cairo"
        'city_name_ar': pickup_addr.get('city', {}).get('nameAr'),          # "القاهره"
        'zone_name': pickup_addr.get('zone', {}).get('name'),                # "Agouza"
        'zone_name_ar': pickup_addr.get('zone', {}).get('nameAr'),          # "العجوزه"
        'district_name': pickup_addr.get('district', {}).get('name'),        # "Mohandesiin"
        'district_name_ar': pickup_addr.get('district', {}).get('nameAr'),  # "المهندسين"
        'first_line': pickup_addr.get('firstLine'),                  # "الجيزه تابعه لمركز كرداسه طريق ناهيا ابو رواش بجوار مسجد النور المحمدي"
        'second_line': pickup_addr.get('secondLine'),                # "محل ١٣١"
        'is_work_address': pickup_addr.get('isWorkAddress'),          # false
        'building_number': pickup_addr.get('buildingNumber'),         # If pickup has building number
        'floor': pickup_addr.get('floor'),                           # If pickup has floor
        'apartment': pickup_addr.get('apartment'),                   # If pickup has apartment
        'location_name': pickup_addr.get('locationName'),           # If pickup has location name
        'geo_location': pickup_addr.get('geoLocation')              # If pickup has geo coordinates
    }

    # From dropOffAddress
    dropoff_address = {
        'country_name': dropoff_addr.get('country', {}).get('name'),         # "Egypt"
        'country_code': dropoff_addr.get('country', {}).get('code'),         # "EG"
        'city_name': dropoff_addr.get('city', {}).get('name'),              # "Sharqia"
        'city_name_ar': dropoff_addr.get('city', {}).get('nameAr'),        # "الشرقيه"
        'zone_name': dropoff_addr.get('zone', {}).get('name'),              # "Belbes"
        'zone_name_ar': dropoff_addr.get('zone', {}).get('nameAr'),        # "بلبيس"
        'district_name': dropoff_addr.get('district', {}).get('name'),      # "Belbes"
        'district_name_ar': dropoff_addr.get('district', {}).get('nameAr'), # "بلبيس"
        'first_line': dropoff_addr.get('firstLine'),                # "بلبيس شارع جمعيه الجمل"
        'second_line': dropoff_addr.get('secondLine'),              # "مدرسه ابو بكر الصديق"
        'building_number': dropoff_addr.get('buildingNumber'),      # "1"
        'floor': dropoff_addr.get('floor'),                    # "1"
        'apartment': dropoff_addr.get('apartment'),             # "1"
        'location_name': dropoff_addr.get('locationName'),     # "بيت العز"
        'geo_location': dropoff_addr.get('geoLocation')        # [31.5667069, 30.4173884]
    }

    # ============================================================================
    # F. Timeline and State Information (CRITICAL for workflow)
    # ============================================================================
    state_data = {
        'current_state': state.get('value'),                          # "Pickup requested"
        'current_state_code': state.get('code'),                      # 10
        'masked_state': bosta_data.get('maskedState'),                             # "Created"
        'picked_up_time': state.get('pickedUpTime'),             # "2025-08-14T10:22:53.520Z"
        'delivery_time': state.get('deliveryTime'),              # null
        'received_at_warehouse_time': state.get('receivedAtWarehouse', {}).get('time'),  # "2025-02-01T06:08:32.236Z"
        'warehouse_name': state.get('receivedAtWarehouse', {}).get('warehouse', {}).get('name'),  # "El-Sharkia Hub"
        'is_confirmed_delivery': bosta_data.get('isConfirmedDelivery'),            # false
        'confirmed_delivery_at': bosta_data.get('confirmedDeliveryAt'),        # "2025-02-01T18:43:38.565Z"
        'payment_method': bosta_data.get('paymentMethod'),                     # "COD"
        'attempts_count': bosta_data.get('attemptsCount'),                         # 0
        'calls_number': bosta_data.get('callsNumber'),                             # 0
        'sms_number': bosta_data.get('smsNumber')                                  # 0
    }

    # From timeline array
    timeline_data = [
        {
            'value': timeline_item.get('value'),                                   # "ready_for_pickup"
            'code': timeline_item.get('code'),                                     # 10
            'done': timeline_item.get('done'),                                     # true
            'date': timeline_item.get('date')                                  # "2025-08-13T09:45:51.763Z"
        }
        for timeline_item in bosta_data.get('timeline', [])
    ]

    # ============================================================================
    # G. Business Information (sender and holder)
    # ============================================================================
    sender = bosta_data.get('sender', {}) or {}
    holder = bosta_data.get('holder', {}) or {}

    sender_data = {
        'id': sender.get('_id'),                                     # "Z0fKnekRd7Iyehhc7hLFz"
        'phone': sender.get('phone'),                               # "+201277375716"
        'name': sender.get('name'),                                 # "HVAR"
        'type': sender.get('type'),                                 # "BUSINESS_ACCOUNT"
        'sub_account_id': sender.get('subAccountId')            # null
    }

    holder_data = {
        'id': holder.get('_id'),                                    # "5qx0p0cmUmx9XTVKfzKbZ"
        'phone': holder.get('phone'),                               # "+201147759963"
        'name': holder.get('name'),                                 # "IM-Mohamed Hassan Mohamed -E"
        'role': holder.get('role')                                  # "STAR"
    }

    # ============================================================================
    # H. Package Details and Notes (CRITICAL for service actions)
    # ============================================================================
    package_details = specs.get('packageDetails', {}) or {}
    package_info = {
        'description': package_details.get('description'),  # "1 * كبه هفار 1200 وات (5025)"
        'notes': bosta_data.get('notes'),                                       # "تفاصيل الطلب: استبدال متور 5025 هنسلمه بمتور5025هنستلمه"
        'items_count': package_details.get('itemsCount'),     # 1
        'package_type': specs.get('packageType'),                     # "Parcel"
        'weight': specs.get('weight'),                                 # 1
        'size': specs.get('size')                                      # "SMALL"
    }

    # ============================================================================
    # RETURN COMPLETE TRANSFORMED DATA
    # ============================================================================
    return {
        'customer': customer_data,
        'order': order_data,
        'package': package_info,
        'return_specs': return_specs_data,
        'addresses': {
            'pickup': pickup_address,
            'dropoff': dropoff_address
        },
        'timeline': timeline_data,
        'business': {
            'sender': sender_data,
            'holder': holder_data
        },
        'state': state_data,
        'specs': specs_data,  # Keep original specs structure for compatibility
        'raw_data': bosta_data  # Keep original data for debugging/auditing
    }


def transform_local_order_brief(order, preferred_phone: str = None) -> Dict:
    """Transform a local Order SQLAlchemy model to DeliveryBrief-like dict.

    Keeps response shape consistent with Bosta delivery brief for fallback flows.
    """
    if not order:
        return {}
    receiver_phone = order.customer_phone or preferred_phone
    return {
        'tracking_number': getattr(order, 'tracking_number', None),
        'masked_state': getattr(order.status, 'value', None),
        'state': {'value': getattr(order.status, 'value', None)},
        'order_type': 'Local Order',
        'cod_amount': float(getattr(order, 'cod_amount', 0) or 0),
        'receiver': {
            'full_name': getattr(order, 'customer_name', None) or 'Unknown',
            'phone': receiver_phone,
            'second_phone': getattr(order, 'customer_second_phone', None),
            'has_second_phone': bool(getattr(order, 'customer_second_phone', None)),
        },
        'created_at': order.created_at.isoformat() if getattr(order, 'created_at', None) else None,
        'updated_at': order.updated_at.isoformat() if getattr(order, 'updated_at', None) else None,
    }


