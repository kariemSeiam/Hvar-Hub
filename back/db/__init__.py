from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import text, inspect
import os

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    """Initialize database with Flask app and ensure clean boot when DB is missing"""
    # Ensure SQLite directory exists when using a relative path (instance/)
    database_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if database_uri.startswith('sqlite:///'):
        sqlite_path = database_uri.replace('sqlite:///', '', 1)
        # Resolve relative path from app root
        if not os.path.isabs(sqlite_path):
            sqlite_path = os.path.join(app.root_path, sqlite_path)
        sqlite_dir = os.path.dirname(sqlite_path)
        if sqlite_dir and not os.path.exists(sqlite_dir):
            os.makedirs(sqlite_dir, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)

    # Import models from auto_init to ensure they are registered with SQLAlchemy
    from db.auto_init import (
        Order, MaintenanceHistory, ProofImage, BaseModel,
        Product, Part, ServiceAction, ServiceActionHistory,
        create_indexes, configure_utf8_database
    )

    # Auto-initialize database if needed
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            has_orders = inspector.has_table('orders')
            if has_orders:
                print("✅ Database tables already exist")
            else:
                print("🔄 Auto-initializing database (orders table missing)...")
                from db.auto_init import auto_initialize_database
                auto_initialize_database()
        except Exception:
            print("🔄 Auto-initializing database (tables not found or engine cold start)...")
            from db.auto_init import auto_initialize_database
            auto_initialize_database()

        # Always attempt to create any missing tables for newly added models
        try:
            db.create_all()
            print("✅ Ensured tables are created (idempotent)")
        except Exception as e:
            print(f"⚠️  Warning creating tables: {str(e)}")

        # Configure UTF-8 on MySQL and ensure indexes exist
        try:
            if db.engine.dialect.name == 'mysql':
                try:
                    configure_utf8_database()
                except Exception as e:
                    print(f"ℹ️  UTF-8 configuration skipped: {str(e)}")
            try:
                create_indexes()
            except Exception as e:
                print(f"ℹ️  Skipping index creation: {str(e)}")
        except Exception as e:
            print(f"ℹ️  Post-init configuration skipped: {str(e)}")

        # Ensure new columns exist without requiring full migrations (safe/no-op if present)
        try:
            inspector = inspect(db.engine)
            if inspector.has_table('orders'):
                columns = [col['name'] for col in inspector.get_columns('orders')]
                if 'return_condition' not in columns:
                    try:
                        with db.engine.connect() as connection:
                            # Use generic SQL to add a VARCHAR/TEXT column compatible with SQLite/MySQL
                            connection.execute(text("ALTER TABLE orders ADD COLUMN return_condition VARCHAR(20)"))
                            connection.commit()
                            print("✅ Added missing column: orders.return_condition")
                    except Exception as e:
                        print(f"ℹ️  Skipping add return_condition column (may already exist or not supported): {str(e)}")
                # Additional service-action integration columns
                if 'is_service_action_order' not in columns:
                    try:
                        with db.engine.connect() as connection:
                            if db.engine.dialect.name == 'mysql':
                                connection.execute(text("ALTER TABLE orders ADD COLUMN is_service_action_order TINYINT(1) DEFAULT 0"))
                            else:
                                connection.execute(text("ALTER TABLE orders ADD COLUMN is_service_action_order BOOLEAN DEFAULT 0"))
                            connection.commit()
                            print("✅ Added missing column: orders.is_service_action_order")
                    except Exception as e:
                        print(f"ℹ️  Skipping add is_service_action_order (may already exist): {str(e)}")
                if 'service_action_id' not in columns:
                    try:
                        with db.engine.connect() as connection:
                            connection.execute(text("ALTER TABLE orders ADD COLUMN service_action_id INTEGER"))
                            connection.commit()
                            print("✅ Added missing column: orders.service_action_id")
                    except Exception as e:
                        print(f"ℹ️  Skipping add service_action_id (may already exist): {str(e)}")
                if 'service_action_type' not in columns:
                    try:
                        with db.engine.connect() as connection:
                            if db.engine.dialect.name == 'mysql':
                                connection.execute(text("ALTER TABLE orders ADD COLUMN service_action_type VARCHAR(50)"))
                            else:
                                connection.execute(text("ALTER TABLE orders ADD COLUMN service_action_type VARCHAR(50)"))
                            connection.commit()
                            print("✅ Added missing column: orders.service_action_type")
                    except Exception as e:
                        print(f"ℹ️  Skipping add service_action_type (may already exist): {str(e)}")
        except Exception as e:
            print(f"ℹ️  Schema check skipped due to error: {str(e)}")

    return db