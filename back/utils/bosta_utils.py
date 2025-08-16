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
    """
    if not bosta_data:
        return {}

    receiver = (bosta_data.get('receiver') or {})
    order_type = (bosta_data.get('type') or {})
    state = (bosta_data.get('state') or {})
    specs = (bosta_data.get('specs') or {})
    package_details = (specs.get('packageDetails') or {})
    return_specs = (bosta_data.get('returnSpecs') or {})
    return_package_details = (return_specs.get('packageDetails') or {})
    pickup = (bosta_data.get('pickupAddress') or {})
    dropoff = (bosta_data.get('dropOffAddress') or {})
    pickup_country = (pickup.get('country') or {})
    pickup_city = (pickup.get('city') or {})
    pickup_zone = (pickup.get('zone') or {})
    pickup_district = (pickup.get('district') or {})
    drop_country = (dropoff.get('country') or {})
    drop_city = (dropoff.get('city') or {})
    drop_zone = (dropoff.get('zone') or {})
    drop_district = (dropoff.get('district') or {})
    sender = (bosta_data.get('sender') or {})
    holder = (bosta_data.get('holder') or {})

    timeline = []
    for item in (bosta_data.get('timeline') or []):
        timeline.append({
            'value': item.get('value'),
            'code': item.get('code'),
            'done': item.get('done'),
            'date': item.get('date'),
        })

    return {
        'customer': {
            'id': receiver.get('_id'),
            'full_name': receiver.get('fullName'),
            'primary_phone': receiver.get('phone'),
            'second_phone': receiver.get('secondPhone'),
            'first_name': receiver.get('firstName'),
            'last_name': receiver.get('lastName'),
        },
        'order': {
            'bosta_id': bosta_data.get('_id'),
            'tracking_number': bosta_data.get('trackingNumber'),
            'type': order_type.get('value'),
            'type_code': order_type.get('code'),
            'status': state.get('value'),
            'status_code': state.get('code'),
            'cod_amount': bosta_data.get('cod'),
            'shipment_fees': bosta_data.get('shipmentFees'),
            'created_at': bosta_data.get('createdAt'),
            'updated_at': bosta_data.get('updatedAt'),
            'scheduled_at': bosta_data.get('scheduledAt'),
            'is_confirmed_delivery': bosta_data.get('isConfirmedDelivery'),
            'payment_method': bosta_data.get('paymentMethod'),
            'attempts_count': bosta_data.get('attemptsCount'),
            'calls_number': bosta_data.get('callsNumber'),
            'sms_number': bosta_data.get('smsNumber'),
            'pickup_request_id': bosta_data.get('pickupRequestId'),
            'pickup_request_type': bosta_data.get('pickupRequestType'),
            'masked_state': bosta_data.get('maskedState'),
        },
        'package': {
            'description': package_details.get('description'),
            'notes': bosta_data.get('notes'),
            'items_count': package_details.get('itemsCount'),
            'package_type': specs.get('packageType'),
            'weight': specs.get('weight'),
            'size': specs.get('size'),
        },
        'return_specs': {
            'description': return_package_details.get('description'),
            'items_count': return_package_details.get('itemsCount'),
            'package_type': return_specs.get('packageType'),
        },
        'addresses': {
            'pickup': {
                'country': pickup_country.get('name'),
                'country_code': pickup_country.get('code'),
                'city': pickup_city.get('name'),
                'city_ar': pickup_city.get('nameAr'),
                'zone': pickup_zone.get('name'),
                'zone_ar': pickup_zone.get('nameAr'),
                'district': pickup_district.get('name'),
                'district_ar': pickup_district.get('nameAr'),
                'first_line': pickup.get('firstLine'),
                'second_line': pickup.get('secondLine'),
                'is_work_address': pickup.get('isWorkAddress'),
            },
            'dropoff': {
                'country': drop_country.get('name'),
                'country_code': drop_country.get('code'),
                'city': drop_city.get('name'),
                'city_ar': drop_city.get('nameAr'),
                'zone': drop_zone.get('name'),
                'zone_ar': drop_zone.get('nameAr'),
                'district': drop_district.get('name'),
                'district_ar': drop_district.get('nameAr'),
                'first_line': dropoff.get('firstLine'),
                'second_line': dropoff.get('secondLine'),
                'building_number': dropoff.get('buildingNumber'),
                'floor': dropoff.get('floor'),
                'apartment': dropoff.get('apartment'),
                'location_name': dropoff.get('locationName'),
                'geo_location': dropoff.get('geoLocation'),
            },
        },
        'timeline': timeline,
        'business': {
            'sender': {
                'id': sender.get('_id'),
                'name': sender.get('name'),
                'phone': sender.get('phone'),
                'type': sender.get('type'),
                'sub_account_id': sender.get('subAccountId'),
            },
            'holder': {
                'id': holder.get('_id'),
                'name': holder.get('name'),
                'phone': holder.get('phone'),
                'role': holder.get('role'),
            },
        },
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


