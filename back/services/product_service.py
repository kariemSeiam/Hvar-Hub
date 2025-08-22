"""Product and Part management service.

Encapsulates CRUD, listing, and simple inventory analytics for Products and Parts.
"""

import json
import os
from typing import Dict, Optional, Tuple, List

from db import db
from db.auto_init import Product, Part, ProductCategory, PartType


class ProductService:
    """Service layer for product and part management."""

    # ----------------------
    # Product CRUD & Lists
    # ----------------------
    @staticmethod
    def create_product(payload: Dict) -> Tuple[bool, Optional[Product], Optional[str]]:
        try:
            sku = (payload.get('sku') or '').strip()
            name_ar = (payload.get('name_ar') or '').strip()
            category_str = (payload.get('category') or '').strip()
            if not sku or not name_ar or not category_str:
                return False, None, 'بيانات المنتج غير مكتملة'
            try:
                category = ProductCategory(category_str)
            except ValueError:
                return False, None, 'فئة المنتج غير صحيحة'

            # Enforce unique SKU
            if Product.query.filter_by(sku=sku).first():
                return False, None, 'SKU موجود بالفعل'

            product = Product(
                sku=sku,
                name_ar=name_ar,
                category=category,
                alert_quantity=int(payload.get('alert_quantity') or 0),
                warranty_period_months=int(payload.get('warranty_period_months') or 12),
                is_active=bool(payload.get('is_active', True)),
                description=payload.get('description'),
                specifications=payload.get('specifications'),
                image_url=payload.get('image_url'),
            )
            product.save()
            return True, product, None
        except Exception as e:
            db.session.rollback()
            return False, None, f'خطأ عند إنشاء المنتج: {str(e)}'

    @staticmethod
    def update_product(product_id: int, payload: Dict) -> Tuple[bool, Optional[Product], Optional[str]]:
        try:
            product = Product.get_by_id(product_id)
            if not product:
                return False, None, 'المنتج غير موجود'

            if 'name_ar' in payload:
                product.name_ar = (payload.get('name_ar') or '').strip() or product.name_ar
            if 'category' in payload and payload.get('category'):
                try:
                    product.category = ProductCategory(payload.get('category'))
                except ValueError:
                    return False, None, 'فئة المنتج غير صحيحة'
            if 'alert_quantity' in payload:
                product.alert_quantity = int(payload.get('alert_quantity') or product.alert_quantity or 0)
            if 'warranty_period_months' in payload:
                product.warranty_period_months = int(payload.get('warranty_period_months') or product.warranty_period_months or 12)
            if 'current_stock' in payload:
                product.current_stock = int(payload.get('current_stock') or 0)
            if 'is_active' in payload:
                product.is_active = bool(payload.get('is_active'))
            if 'description' in payload:
                product.description = payload.get('description')
            if 'specifications' in payload:
                product.specifications = payload.get('specifications')
            if 'image_url' in payload:
                product.image_url = payload.get('image_url')

            product.save()
            return True, product, None
        except Exception as e:
            db.session.rollback()
            return False, None, f'خطأ عند تحديث المنتج: {str(e)}'

    @staticmethod
    def delete_product(product_id: int) -> Tuple[bool, Optional[str]]:
        try:
            product = Product.get_by_id(product_id)
            if not product:
                return False, 'المنتج غير موجود'
            product.delete()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f'خطأ عند حذف المنتج: {str(e)}'

    @staticmethod
    def list_products(category: Optional[str], page: int, limit: int):
        try:
            query = Product.query
            if category:
                try:
                    cat = ProductCategory(category)
                    query = query.filter_by(category=cat)
                except ValueError:
                    return {'error': 'فئة غير صحيحة'}
            pagination = query.order_by(Product.updated_at.desc()).paginate(page=page, per_page=limit, error_out=False)
            return {
                'products': [p.to_dict() for p in pagination.items],
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                }
            }
        except Exception as e:
            return {'error': f'خطأ في جلب المنتجات: {str(e)}'}

    # -----------------
    # Part CRUD & Lists
    # -----------------
    @staticmethod
    def create_part(payload: Dict) -> Tuple[bool, Optional[Part], Optional[str]]:
        try:
            part_sku = (payload.get('part_sku') or '').strip()
            part_name = (payload.get('part_name') or '').strip()
            product_id = payload.get('product_id')
            part_type_str = (payload.get('part_type') or '').strip()
            if not part_sku or not part_name or not product_id or not part_type_str:
                return False, None, 'بيانات القطعة غير مكتملة'
            try:
                part_type = PartType(part_type_str)
            except ValueError:
                return False, None, 'نوع القطعة غير صحيح'
            if Part.query.filter_by(part_sku=part_sku).first():
                return False, None, 'Part SKU موجود بالفعل'
            if not Product.get_by_id(product_id):
                return False, None, 'المنتج المرتبط غير موجود'

            part = Part(
                part_sku=part_sku,
                part_name=part_name,
                part_type=part_type,
                product_id=product_id,
                current_stock=int(payload.get('current_stock') or 0),
                min_stock_level=int(payload.get('min_stock_level') or 5),
                max_stock_level=int(payload.get('max_stock_level') or 100),
                serial_number=payload.get('serial_number'),
                is_active=bool(payload.get('is_active', True)),
                cost_price=payload.get('cost_price'),
                selling_price=payload.get('selling_price'),
            )
            part.save()
            return True, part, None
        except Exception as e:
            db.session.rollback()
            return False, None, f'خطأ عند إنشاء القطعة: {str(e)}'

    @staticmethod
    def update_part(part_id: int, payload: Dict) -> Tuple[bool, Optional[Part], Optional[str]]:
        try:
            part = Part.get_by_id(part_id)
            if not part:
                return False, None, 'القطعة غير موجودة'
            if 'part_name' in payload:
                part.part_name = (payload.get('part_name') or '').strip() or part.part_name
            if 'part_type' in payload and payload.get('part_type'):
                try:
                    part.part_type = PartType(payload.get('part_type'))
                except ValueError:
                    return False, None, 'نوع القطعة غير صحيح'
            if 'product_id' in payload and payload.get('product_id'):
                part.product_id = int(payload.get('product_id'))
            for key in ['current_stock', 'min_stock_level', 'max_stock_level']:
                if key in payload and payload.get(key) is not None:
                    setattr(part, key, int(payload.get(key)))
            if 'serial_number' in payload:
                part.serial_number = payload.get('serial_number')
            if 'is_active' in payload:
                part.is_active = bool(payload.get('is_active'))
            if 'cost_price' in payload:
                part.cost_price = payload.get('cost_price')
            if 'selling_price' in payload:
                part.selling_price = payload.get('selling_price')
            part.save()
            return True, part, None
        except Exception as e:
            db.session.rollback()
            return False, None, f'خطأ عند تحديث القطعة: {str(e)}'

    @staticmethod
    def delete_part(part_id: int) -> Tuple[bool, Optional[str]]:
        try:
            part = Part.get_by_id(part_id)
            if not part:
                return False, 'القطعة غير موجودة'
            part.delete()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f'خطأ عند حذف القطعة: {str(e)}'

    @staticmethod
    def list_parts(product_id: Optional[int], part_type: Optional[str], page: int, limit: int):
        try:
            query = Part.query
            if product_id:
                query = query.filter_by(product_id=product_id)
            if part_type:
                try:
                    pt = PartType(part_type)
                    query = query.filter_by(part_type=pt)
                except ValueError:
                    return {'error': 'نوع القطعة غير صحيح'}
            pagination = query.order_by(Part.updated_at.desc()).paginate(page=page, per_page=limit, error_out=False)
            return {
                'parts': [x.to_dict() for x in pagination.items],
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                }
            }
        except Exception as e:
            return {'error': f'خطأ في جلب القطع: {str(e)}'}

    # ------------------
    # Inventory analytics
    # ------------------
    @staticmethod
    def get_inventory_analytics():
        try:
            from sqlalchemy import func
            total_products = db.session.query(func.count(Product.id)).scalar() or 0
            total_parts = db.session.query(func.count(Part.id)).scalar() or 0
            low_stock_parts = Part.query.filter(Part.current_stock <= Part.min_stock_level).count()
            return {
                'total_products': total_products,
                'total_parts': total_parts,
                'low_stock_parts': low_stock_parts,
            }
        except Exception as e:
            return {'error': f'خطأ في جلب تحليلات المخزون: {str(e)}'}

    @staticmethod
    def get_low_stock_items(limit: int = 50):
        try:
            items = Part.query.filter(Part.current_stock <= Part.min_stock_level).order_by(Part.current_stock.asc()).limit(limit).all()
            return [x.to_dict() for x in items]
        except Exception as e:
            return {'error': f'خطأ في جلب العناصر منخفضة المخزون: {str(e)}'}

    @staticmethod
    def get_parts_by_product(product_id: int):
        try:
            parts = Part.query.filter_by(product_id=product_id).order_by(Part.part_name.asc()).all()
            return [x.to_dict() for x in parts]
        except Exception as e:
            return {'error': f'خطأ في جلب قطع المنتج: {str(e)}'}

    # ------------------
    # Auto-sync from JSON
    # ------------------
    @staticmethod
    def sync_products_from_json(json_file_path: str = None) -> Tuple[bool, Dict, Optional[str]]:
        """
        Automatically sync products and parts from products.json file to database.
        Creates products and parts if they don't exist, updates if they do.
        
        Args:
            json_file_path: Path to products.json file. If None, uses default location.
            
        Returns:
            Tuple of (success, sync_results, error_message)
        """
        try:
            # Determine file path
            if json_file_path is None:
                # Use default location relative to project root
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                json_file_path = os.path.join(project_root, 'products.json')
            
            # Check if file exists
            if not os.path.exists(json_file_path):
                return False, {}, f'ملف products.json غير موجود في: {json_file_path}'
            
            # Read and parse JSON file
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'products' not in data:
                return False, {}, 'ملف products.json لا يحتوي على بيانات المنتجات'
            
            sync_results = {
                'products_created': 0,
                'products_updated': 0,
                'parts_created': 0,
                'parts_updated': 0,
                'errors': []
            }
            
            # Process each product
            for product_data in data['products']:
                try:
                    # Extract product information
                    sku = product_data.get('sku', '').strip()
                    name_ar = product_data.get('name_ar', '').strip()
                    category_str = product_data.get('category', '').strip()
                    
                    if not sku or not name_ar or not category_str:
                        sync_results['errors'].append(f'بيانات المنتج غير مكتملة: {sku}')
                        continue
                    
                    # Validate category
                    try:
                        category = ProductCategory(category_str)
                    except ValueError:
                        sync_results['errors'].append(f'فئة المنتج غير صحيحة: {category_str} للـ SKU: {sku}')
                        continue
                    
                    # Check if product exists
                    existing_product = Product.query.filter_by(sku=sku).first()
                    
                    if existing_product:
                        # Update existing product
                        existing_product.name_ar = name_ar
                        existing_product.category = category
                        existing_product.alert_quantity = int(product_data.get('alert_quantity', 0))
                        existing_product.warranty_period_months = int(product_data.get('warranty_period_months', 12))
                        existing_product.is_active = bool(product_data.get('is_active', True))
                        
                        # Add specifications from features and other data
                        specs = {}
                        if 'features' in product_data:
                            specs['features'] = product_data['features']
                        if 'power_watts' in product_data:
                            specs['power_watts'] = product_data['power_watts']
                        if 'capacity_liters' in product_data:
                            specs['capacity_liters'] = product_data['capacity_liters']
                        if 'color' in product_data:
                            specs['color'] = product_data['color']
                        if 'speeds_count' in product_data:
                            specs['speeds_count'] = product_data['speeds_count']
                        
                        existing_product.specifications = specs
                        existing_product.save()
                        sync_results['products_updated'] += 1
                        product_id = existing_product.id
                    else:
                        # Create new product
                        specs = {}
                        if 'features' in product_data:
                            specs['features'] = product_data['features']
                        if 'power_watts' in product_data:
                            specs['power_watts'] = product_data['power_watts']
                        if 'capacity_liters' in product_data:
                            specs['capacity_liters'] = product_data['capacity_liters']
                        if 'color' in product_data:
                            specs['color'] = product_data['color']
                        if 'speeds_count' in product_data:
                            specs['speeds_count'] = product_data['speeds_count']
                        
                        new_product = Product(
                            sku=sku,
                            name_ar=name_ar,
                            category=category,
                            alert_quantity=int(product_data.get('alert_quantity', 0)),
                            warranty_period_months=int(product_data.get('warranty_period_months', 12)),
                            is_active=bool(product_data.get('is_active', True)),
                            specifications=specs
                        )
                        new_product.save()
                        sync_results['products_created'] += 1
                        product_id = new_product.id
                    
                    # Process parts for this product
                    if 'parts' in product_data and product_data['parts']:
                        for part_data in product_data['parts']:
                            try:
                                part_sku = part_data.get('part_sku', '').strip()
                                part_name = part_data.get('part_name', '').strip()
                                part_type_str = part_data.get('part_type', '').strip()
                                
                                if not part_sku or not part_name or not part_type_str:
                                    sync_results['errors'].append(f'بيانات القطعة غير مكتملة: {part_sku} للمنتج: {sku}')
                                    continue
                                
                                # Validate part type
                                try:
                                    part_type = PartType(part_type_str)
                                except ValueError:
                                    sync_results['errors'].append(f'نوع القطعة غير صحيح: {part_type_str} للـ SKU: {part_sku}')
                                    continue
                                
                                # Check if part exists
                                existing_part = Part.query.filter_by(part_sku=part_sku).first()
                                
                                if existing_part:
                                    # Update existing part
                                    existing_part.part_name = part_name
                                    existing_part.part_type = part_type
                                    existing_part.product_id = product_id
                                    existing_part.save()
                                    sync_results['parts_updated'] += 1
                                else:
                                    # Create new part
                                    new_part = Part(
                                        part_sku=part_sku,
                                        part_name=part_name,
                                        part_type=part_type,
                                        product_id=product_id,
                                        current_stock=0,  # Default stock
                                        min_stock_level=5,  # Default min stock
                                        max_stock_level=100,  # Default max stock
                                        is_active=True
                                    )
                                    new_part.save()
                                    sync_results['parts_created'] += 1
                                    
                            except Exception as part_error:
                                sync_results['errors'].append(f'خطأ في معالجة القطعة {part_data.get("part_sku", "unknown")}: {str(part_error)}')
                    
                except Exception as product_error:
                    sync_results['errors'].append(f'خطأ في معالجة المنتج {product_data.get("sku", "unknown")}: {str(product_error)}')
            
            # Commit all changes
            db.session.commit()
            
            return True, sync_results, None
            
        except Exception as e:
            db.session.rollback()
            return False, {}, f'خطأ في مزامنة المنتجات: {str(e)}'

    @staticmethod
    def get_sync_status() -> Dict:
        """
        Get current sync status by comparing database with JSON file.
        
        Returns:
            Dictionary with sync status information
        """
        try:
            # Get database counts
            db_products_count = Product.query.count()
            db_parts_count = Part.query.count()
            
            # Try to get JSON file info
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            json_file_path = os.path.join(project_root, 'products.json')
            
            json_info = {
                'file_exists': False,
                'last_modified': None,
                'products_count': 0,
                'parts_count': 0
            }
            
            if os.path.exists(json_file_path):
                json_info['file_exists'] = True
                json_info['last_modified'] = os.path.getmtime(json_file_path)
                
                try:
                    with open(json_file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    json_info['products_count'] = len(data.get('products', []))
                    json_info['parts_count'] = sum(len(p.get('parts', [])) for p in data.get('products', []))
                except Exception:
                    pass
            
            return {
                'database': {
                    'products_count': db_products_count,
                    'parts_count': db_parts_count
                },
                'json_file': json_info,
                'sync_needed': json_info['products_count'] != db_products_count or json_info['parts_count'] != db_parts_count
            }
            
        except Exception as e:
            return {'error': f'خطأ في جلب حالة المزامنة: {str(e)}'}


