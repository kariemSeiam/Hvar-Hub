#!/usr/bin/env python3
"""
Database Initialization and Seeding Script for HVAR Hub

Usage:
  python back/init_db.py                 # Initialize database only
  python back/init_db.py --seed          # Initialize and seed products/parts from default products.json
  python back/init_db.py --seed PATH     # Initialize and seed from a specific JSON file
"""

import sys
import os
import json
import argparse

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from db import db
from db.auto_init import (
    auto_initialize_database,
    Product, Part,
    ProductCategory, PartType,
)


def _enum_by_value(enum_cls, value):
    if value is None:
        return None
    # Try exact value match first
    for member in enum_cls:
        if member.value == value:
            return member
    # Fallback: case-insensitive match for non-Arabic enums
    try:
        lowered = str(value).strip().lower()
        for member in enum_cls:
            if str(member.value).lower() == lowered:
                return member
    except Exception:
        pass
    return None


def seed_products_and_parts_from_json(json_path: str) -> bool:
    """Seed Product and Part data from a JSON file.

    The JSON schema is expected to match the repository's products.json file.
    Idempotent: existing products/parts will be updated; new ones will be created.
    """
    if not os.path.isabs(json_path):
        # Resolve relative to repo root (back/..)
        json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', json_path))

    if not os.path.exists(json_path):
        print(f"❌ Products JSON not found: {json_path}")
        return False

    print(f"📦 Seeding products and parts from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    products = data.get('products', [])
    if not products:
        print("ℹ️  No products found in JSON.")
        return False

    created_products = updated_products = 0
    created_parts = updated_parts = 0

    for p in products:
        try:
            sku = p.get('sku')
            name_ar = p.get('name_ar')
            category_value = p.get('category')
            category_enum = _enum_by_value(ProductCategory, category_value)
            if not sku or not name_ar or not category_enum:
                print(f"⚠️  Skipping product with missing fields or invalid category: sku={sku}, name={name_ar}, category={category_value}")
                continue

            product = Product.query.filter_by(sku=sku).first()
            if product is None:
                product = Product(
                    sku=sku,
                    name_ar=name_ar,
                    category=category_enum,
                    alert_quantity=int(p.get('alert_quantity') or 0),
                    current_stock=int(p.get('current_stock') or 0),
                    warranty_period_months=int(p.get('warranty_period_months') or 12),
                    is_active=bool(p.get('is_active') in [True, 1, '1', 'true', 'True'])
                ).save()
                created_products += 1
            else:
                product.name_ar = name_ar
                product.category = category_enum
                product.alert_quantity = int(p.get('alert_quantity') or product.alert_quantity or 0)
                product.warranty_period_months = int(p.get('warranty_period_months') or product.warranty_period_months or 12)
                product.is_active = bool(p.get('is_active') in [True, 1, '1', 'true', 'True'])
                product.save()
                updated_products += 1

            # Seed parts for this product
            for part in (p.get('parts') or []):
                part_sku = part.get('part_sku')
                part_name = part.get('part_name')
                part_type_value = (part.get('part_type') or '').strip()
                part_type_enum = _enum_by_value(PartType, part_type_value)
                if not part_type_enum:
                    # Graceful fallback for known typos/mismatches
                    aliases = {
                        'heat': PartType.HEATING_ELEMENT,
                        'heating': PartType.HEATING_ELEMENT,
                    }
                    part_type_enum = aliases.get(part_type_value.lower()) or PartType.COMPONENT

                if not part_sku or not part_name:
                    print(f"  ⚠️  Skipping part with missing fields under product {sku}: {part}")
                    continue

                existing_part = Part.query.filter_by(part_sku=part_sku).first()
                if existing_part is None:
                    Part(
                        part_sku=part_sku,
                        part_name=part_name,
                        part_type=part_type_enum,
                        product_id=product.id,
                        is_active=True
                    ).save()
                    created_parts += 1
                else:
                    existing_part.part_name = part_name
                    existing_part.part_type = part_type_enum
                    existing_part.product_id = product.id
                    existing_part.save()
                    updated_parts += 1

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error seeding product: {p.get('sku')} - {str(e)}")

    print(f"✅ Seeding complete: Products (created={created_products}, updated={updated_products}), Parts (created={created_parts}, updated={updated_parts})")
    return True


def main():
    parser = argparse.ArgumentParser(description='HVAR Hub DB Init and Seeder')
    parser.add_argument('--seed', nargs='?', const='products.json', help='Seed products/parts from JSON (default: products.json)')
    args = parser.parse_args()

    print("🚀 Database Initialization for HVAR Hub")
    print("=" * 50)

    # Create Flask app and init DB (auto-initialization happens inside create_app/init_db)
    app = create_app('development')

    # Run seeding if requested
    if args.seed:
        json_path = args.seed if isinstance(args.seed, str) else 'products.json'
        with app.app_context():
            ok = seed_products_and_parts_from_json(json_path)
            if not ok:
                sys.exit(1)
        print("\n✅ Database initialized and seeded successfully!")
        sys.exit(0)

    # Default: just ensure DB initialized
    success = auto_initialize_database()
    if success:
        print("\n✅ Database initialization completed successfully!")
        print("📝 You can now run the application with: python run.py")
        sys.exit(0)
    else:
        print("\n❌ Database initialization failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()