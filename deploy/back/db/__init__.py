from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    """Initialize database with Flask app"""
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Import models from auto_init to ensure they are registered with SQLAlchemy
    from db.auto_init import Order, MaintenanceHistory, ProofImage, BaseModel
    
    # Auto-initialize database if needed
    with app.app_context():
        try:
            # Test if tables exist
            db.engine.execute(db.text("SELECT 1 FROM orders LIMIT 1"))
            print("✅ Database tables already exist")
        except Exception:
            print("🔄 Auto-initializing database...")
            from db.auto_init import auto_initialize_database
            auto_initialize_database()
            
            # Create tables if they don't exist (for SQLite fallback)
            try:
                db.create_all()
                print("✅ Tables created successfully")
            except Exception as e:
                print(f"⚠️  Warning creating tables: {str(e)}")
    
    return db 