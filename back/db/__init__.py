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
    from db.auto_init import Order, MaintenanceHistory, ProofImage, BaseModel

    # Auto-initialize database if needed
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            has_orders = inspector.has_table('orders')
            if has_orders:
                print("✅ Database tables already exist")
            else:
                raise RuntimeError('Orders table missing')
        except Exception:
            print("🔄 Auto-initializing database (tables not found or engine cold start)...")
            from db.auto_init import auto_initialize_database
            auto_initialize_database()

            # Create tables idempotently (covers SQLite and fresh MySQL schemas)
            try:
                db.create_all()
                print("✅ Tables created successfully")
                try:
                    # Create helpful indexes as a final step
                    from db.auto_init import create_indexes
                    create_indexes()
                except Exception as e:
                    print(f"ℹ️  Skipping index creation: {str(e)}")
            except Exception as e:
                print(f"⚠️  Warning creating tables: {str(e)}")

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
        except Exception as e:
            print(f"ℹ️  Schema check skipped due to error: {str(e)}")

    return db