#!/usr/bin/env python3
"""
Auto Database Initialization System for HVAR Hub
Handles database setup, model creation, and table initialization automatically
"""

import os
import sys
import pymysql
from datetime import datetime
from enum import Enum
from sqlalchemy import Enum as SQLEnum, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import Config
from db import db
from utils.timezone import get_egypt_now

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import Config
from db import db

# Load environment variables
load_dotenv()

# ============================================================================
# ENUM DEFINITIONS
# ============================================================================

class OrderStatus(Enum):
    RECEIVED = 'received'
    IN_MAINTENANCE = 'in_maintenance'
    COMPLETED = 'completed'
    FAILED = 'failed'
    SENDING = 'sending'
    RETURNED = 'returned'

class ReturnCondition(Enum):
    VALID = 'valid'
    DAMAGED = 'damaged'

class MaintenanceAction(Enum):
    RECEIVED = 'received'
    START_MAINTENANCE = 'start_maintenance'
    COMPLETE_MAINTENANCE = 'complete_maintenance'
    FAIL_MAINTENANCE = 'fail_maintenance'
    RESCHEDULE = 'reschedule'
    SEND_ORDER = 'send_order'
    CONFIRM_SEND = 'confirm_send'
    RETURN_ORDER = 'return_order'
    MOVE_TO_RETURNS = 'move_to_returns'
    REFUND_OR_REPLACE = 'refund_or_replace'
    # New action that does not change status; only updates return condition for returned orders
    SET_RETURN_CONDITION = 'set_return_condition'

# ============================================================================
# MODEL DEFINITIONS
# ============================================================================

class BaseModel(db.Model):
    """Base model class with common fields and methods"""
    __abstract__ = True
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=get_egypt_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=get_egypt_now, onupdate=get_egypt_now, nullable=False)
    
    def save(self):
        """Save instance to database"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Delete instance from database"""
        db.session.delete(self)
        db.session.commit()
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            
            # Convert datetime objects to ISO format strings
            if isinstance(value, datetime):
                result[column.name] = value.isoformat() if value else None
            else:
                result[column.name] = value
                
        return result
    
    @classmethod
    def get_by_id(cls, id):
        """Get instance by ID"""
        return cls.query.get(id)
    
    @classmethod
    def get_all(cls):
        """Get all instances"""
        return cls.query.all()

class Order(BaseModel):
    """Order model for tracking maintenance orders"""
    __tablename__ = 'orders'
    
    # Primary identification
    tracking_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    bosta_id = db.Column(db.String(100), index=True)
    
    # Order status and workflow
    status = db.Column(SQLEnum(OrderStatus), nullable=False, default=OrderStatus.RECEIVED)
    is_return_order = db.Column(db.Boolean, default=False)
    is_refund_or_replace = db.Column(db.Boolean, default=False)
    is_action_completed = db.Column(db.Boolean, default=False)
    
    # Customer information
    customer_name = db.Column(db.String(255))
    customer_phone = db.Column(db.String(20), index=True)
    customer_second_phone = db.Column(db.String(20))
    
    # Address information
    pickup_address = db.Column(db.Text)
    dropoff_address = db.Column(db.Text)
    city = db.Column(db.String(100))
    zone = db.Column(db.String(100))
    building_number = db.Column(db.String(10))
    floor = db.Column(db.String(10))
    apartment = db.Column(db.String(10))
    
    # Financial information
    cod_amount = db.Column(db.Numeric(10, 2), default=0)
    bosta_fees = db.Column(db.Numeric(10, 2), default=0)
    new_cod_amount = db.Column(db.Numeric(10, 2))  # For final billing
    
    # Package information
    package_description = db.Column(db.Text)
    package_weight = db.Column(db.Numeric(5, 2))
    items_count = db.Column(db.Integer, default=1)
    
    # Order type and shipping info
    order_type = db.Column(db.String(50))  # Send, Return, etc.
    shipping_state = db.Column(db.String(50))  # Bosta state
    masked_state = db.Column(db.String(50))  # Bosta masked state
    
    # Timestamps
    scanned_at = db.Column(db.DateTime, default=get_egypt_now)
    received_at = db.Column(db.DateTime)
    maintenance_started_at = db.Column(db.DateTime)
    maintenance_completed_at = db.Column(db.DateTime)
    maintenance_failed_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)
    rescheduled_at = db.Column(db.DateTime)
    returned_at = db.Column(db.DateTime)
    
    # Returns classification (valid/damaged)
    return_condition = db.Column(SQLEnum(ReturnCondition), nullable=True)
    
    # Bosta integration data
    bosta_data = db.Column(db.JSON)  # Store complete Bosta response
    timeline_data = db.Column(db.JSON)  # Bosta timeline
    bosta_proof_images = db.Column(db.JSON)  # Bosta proof images
    return_specs_data = db.Column(db.JSON)  # Store returnSpecs for Customer Return orders
    
    # New tracking information (for returns)
    new_tracking_number = db.Column(db.String(100))
    
    # Relationships
    maintenance_history = db.relationship('MaintenanceHistory', backref='order', lazy='dynamic', cascade='all, delete-orphan')
    proof_images = db.relationship('ProofImage', backref='order', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Order {self.tracking_number}>'
    
    def to_dict(self):
        """Convert order to dictionary with all related data"""
        try:
            base_dict = super().to_dict()
            
            # Get maintenance history with proper ordering
            maintenance_history = self.maintenance_history.order_by(MaintenanceHistory.timestamp.desc()).all()
            
            base_dict.update({
                'status': self.status.value if self.status else None,
                'return_condition': self.return_condition.value if self.return_condition else None,
                'maintenance_history': [history.to_dict() for history in maintenance_history],
                'proof_images': [image.to_dict() for image in self.proof_images.all()],
                'cod_amount': float(self.cod_amount) if self.cod_amount else 0,
                'bosta_fees': float(self.bosta_fees) if self.bosta_fees else 0,
                'new_cod_amount': float(self.new_cod_amount) if self.new_cod_amount else None,
                'package_weight': float(self.package_weight) if self.package_weight else None,
                'bosta_proof_images': self.bosta_proof_images or [],
                'return_specs_data': self.return_specs_data or {},
                'new_tracking_number': self.new_tracking_number,
                'is_refund_or_replace': self.is_refund_or_replace,
                'is_action_completed': self.is_action_completed,
            })
            return base_dict
        except Exception as e:
            print(f"Error in Order.to_dict() for order {self.id}: {str(e)}")
            # Return a minimal dict to avoid complete failure
            return {
                'id': self.id,
                'tracking_number': self.tracking_number,
                'status': self.status.value if self.status else None,
                'error': f'Serialization error: {str(e)}'
            }
    
    def can_transition_to(self, new_status):
        """Check if order can transition to new status"""
        valid_transitions = {
            OrderStatus.RECEIVED: [OrderStatus.IN_MAINTENANCE, OrderStatus.RETURNED],
            OrderStatus.IN_MAINTENANCE: [OrderStatus.COMPLETED, OrderStatus.FAILED],
            OrderStatus.COMPLETED: [OrderStatus.SENDING],
            OrderStatus.FAILED: [OrderStatus.IN_MAINTENANCE, OrderStatus.SENDING, OrderStatus.RETURNED, OrderStatus.COMPLETED],
            OrderStatus.SENDING: [],  # Final state
            OrderStatus.RETURNED: []  # Final state
        }
        
        return new_status in valid_transitions.get(self.status, [])
    
    def get_latest_action(self):
        """Get the latest maintenance action"""
        return self.maintenance_history.order_by(MaintenanceHistory.timestamp.desc()).first()
    
    def has_action(self, action_type):
        """Check if order has a specific action in its history"""
        return self.maintenance_history.filter_by(action=action_type).first() is not None
    
    @classmethod
    def get_by_tracking_number(cls, tracking_number):
        """Get order by tracking number"""
        return cls.query.filter_by(tracking_number=tracking_number).first()
    
    @classmethod
    def get_by_status(cls, status, page=1, per_page=20):
        """Get orders by status with pagination"""
        return cls.query.filter_by(status=status).order_by(cls.updated_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
    
    @classmethod
    def get_summary(cls):
        """Get order count summary by status"""
        from sqlalchemy import func
        summary = db.session.query(
            cls.status,
            func.count(cls.id).label('count')
        ).group_by(cls.status).all()
        
        result = {status.value: 0 for status in OrderStatus}
        for status, count in summary:
            result[status.value] = count
        
        result['total'] = sum(result.values())
        return result

class MaintenanceHistory(BaseModel):
    """Maintenance history tracking for orders"""
    __tablename__ = 'maintenance_history'
    
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    action = db.Column(SQLEnum(MaintenanceAction), nullable=False, index=True)
    notes = db.Column(db.Text)
    user_name = db.Column(db.String(100), default='فني الصيانة')
    
    # Action-specific data stored as JSON
    action_data = db.Column(db.JSON)
    
    # Timestamps
    timestamp = db.Column(db.DateTime, default=get_egypt_now, nullable=False, index=True)
    
    def __repr__(self):
        return f'<MaintenanceHistory {self.action.value} for Order {self.order_id}>'
    
    def to_dict(self):
        """Convert history entry to dictionary"""
        try:
            base_dict = super().to_dict()
            base_dict.update({
                'action': self.action.value if self.action else None,
                'action_data': self.action_data or {},
                'user': self.user_name,  # Alias for frontend compatibility
            })
            return base_dict
        except Exception as e:
            print(f"Error in MaintenanceHistory.to_dict() for entry {self.id}: {str(e)}")
            return {
                'id': self.id,
                'action': self.action.value if self.action else None,
                'action_data': self.action_data or {},
                'error': f'Serialization error: {str(e)}'
            }

class ProofImage(BaseModel):
    """Proof images for orders"""
    __tablename__ = 'proof_images'
    
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    image_url = db.Column(db.Text, nullable=False)
    image_type = db.Column(db.String(50))
    uploaded_by = db.Column(db.String(100))
    
    def __repr__(self):
        return f'<ProofImage {self.id} for Order {self.order_id}>'
    
    def to_dict(self):
        """Convert proof image to dictionary"""
        try:
            base_dict = super().to_dict()
            return base_dict
        except Exception as e:
            print(f"Error in ProofImage.to_dict() for image {self.id}: {str(e)}")
            return {
                'id': self.id,
                'order_id': self.order_id,
                'image_url': self.image_url,
                'error': f'Serialization error: {str(e)}'
            }

# Action to Status mapping for business logic
ACTION_STATUS_MAP = {
    MaintenanceAction.RECEIVED: OrderStatus.RECEIVED,
    MaintenanceAction.START_MAINTENANCE: OrderStatus.IN_MAINTENANCE,
    MaintenanceAction.COMPLETE_MAINTENANCE: OrderStatus.COMPLETED,
    MaintenanceAction.FAIL_MAINTENANCE: OrderStatus.FAILED,
    MaintenanceAction.RESCHEDULE: OrderStatus.IN_MAINTENANCE,
    MaintenanceAction.SEND_ORDER: OrderStatus.SENDING,
    MaintenanceAction.CONFIRM_SEND: OrderStatus.SENDING,
    MaintenanceAction.RETURN_ORDER: OrderStatus.RETURNED,
    MaintenanceAction.MOVE_TO_RETURNS: OrderStatus.RETURNED,
    MaintenanceAction.REFUND_OR_REPLACE: OrderStatus.COMPLETED,  # Move to completed for failed orders
    # SET_RETURN_CONDITION does not change status
}

# ============================================================================
# DATABASE INITIALIZATION FUNCTIONS
# ============================================================================

def create_mysql_database():
    """Create MySQL database if it doesn't exist. Tries normal creds, then admin creds if provided."""
    def _connect(user, password):
        return pymysql.connect(
            host=Config.MYSQL_HOST,
            port=int(Config.MYSQL_PORT),
            user=user,
            password=password
        )

    try:
        # Try with app user first
        try:
            connection = _connect(Config.MYSQL_USER, Config.MYSQL_PASSWORD)
        except Exception:
            # Fallback to admin if available
            connection = _connect(getattr(Config, 'MYSQL_ADMIN_USER', Config.MYSQL_USER),
                                  getattr(Config, 'MYSQL_ADMIN_PASSWORD', Config.MYSQL_PASSWORD))
        
        cursor = connection.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"✅ Database '{Config.MYSQL_DATABASE}' created or already exists")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Exception as e:
        print(f"⚠️  MySQL not available: {str(e)}")
        print("🔄 Falling back to SQLite for development...")
        return False

def configure_utf8_database():
    """Configure database and tables with UTF-8 character set. Uses admin creds if needed."""
    try:
        print("🔧 Configuring UTF-8 character set for database and tables...")

        # Helper to run DDL via SQLAlchemy, fallback to admin PyMySQL if permission error
        def run_sql(query: str):
            try:
                with db.engine.connect() as connection:
                    connection.execute(text(query))
                    connection.commit()
                    return True
            except Exception as primary_error:
                # Try admin path only for MySQL
                try:
                    if db.engine.dialect.name == 'mysql':
                        admin_user = getattr(Config, 'MYSQL_ADMIN_USER', Config.MYSQL_USER)
                        admin_pass = getattr(Config, 'MYSQL_ADMIN_PASSWORD', Config.MYSQL_PASSWORD)
                        conn = pymysql.connect(
                            host=Config.MYSQL_HOST,
                            port=int(Config.MYSQL_PORT),
                            user=admin_user,
                            password=admin_pass,
                            database=Config.MYSQL_DATABASE,
                            charset='utf8mb4'
                        )
                        try:
                            with conn.cursor() as cursor:
                                cursor.execute(query)
                            conn.commit()
                            return True
                        finally:
                            conn.close()
                except Exception as admin_error:
                    print(f"⚠️  Failed to run DDL with admin fallback: {admin_error}")
                print(f"⚠️  Warning running DDL: {primary_error}")
                return False

        # Database-level charset
        run_sql(f"ALTER DATABASE `{Config.MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")

        # Table-level charset conversions
        table_charsets = [
            "ALTER TABLE orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY tracking_number VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY bosta_id VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY customer_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY customer_phone VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY customer_second_phone VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY pickup_address TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY dropoff_address TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY city VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY zone VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY building_number VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY floor VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY apartment VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY package_description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY order_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY shipping_state VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY masked_state VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE orders MODIFY new_tracking_number VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE maintenance_history CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE maintenance_history MODIFY notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE maintenance_history MODIFY user_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE proof_images CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE proof_images MODIFY image_url TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE proof_images MODIFY image_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            "ALTER TABLE proof_images MODIFY uploaded_by VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
        ]

        for q in table_charsets:
            run_sql(q)

        # Ensure return_condition exists with proper type per dialect
        from sqlalchemy import inspect as sa_inspect
        try:
            inspector = sa_inspect(db.engine)
            order_columns = [col['name'] for col in inspector.get_columns('orders')]
        except Exception:
            order_columns = []

        if 'return_condition' not in order_columns:
            if db.engine.dialect.name == 'mysql':
                run_sql("ALTER TABLE orders ADD COLUMN return_condition ENUM('valid','damaged') NULL")
            else:
                # SQLite or others
                run_sql("ALTER TABLE orders ADD COLUMN return_condition VARCHAR(20)")
            print("✅ Ensured column orders.return_condition exists")

        print("✅ UTF-8 configuration completed successfully")
        return True

    except Exception as e:
        print(f"❌ Error configuring UTF-8: {str(e)}")
        return False

def create_tables():
    """Create all tables in the database"""
    try:
        from flask import Flask
        from app import create_app
        
        # Create Flask app
        app = Flask(__name__)
        app.config.from_object(Config)
        
        # Initialize database
        db.init_app(app)
        
        with app.app_context():
            # Create all tables
            db.create_all()
            print("✅ All tables created successfully")
            
            # Configure UTF-8 character set
            configure_utf8_database()
            
            # Create indexes
            create_indexes()
            
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        return False

def create_indexes():
    """Create additional indexes for better performance"""
    try:
        # Create indexes for better query performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number)",
            "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
            "CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)",
            "CREATE INDEX IF NOT EXISTS idx_orders_scanned_at ON orders(scanned_at)",
            "CREATE INDEX IF NOT EXISTS idx_maintenance_history_order_id ON maintenance_history(order_id)",
            "CREATE INDEX IF NOT EXISTS idx_maintenance_history_action ON maintenance_history(action)",
            "CREATE INDEX IF NOT EXISTS idx_maintenance_history_timestamp ON maintenance_history(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_proof_images_order_id ON proof_images(order_id)"
        ]
        
        for index_sql in indexes:
            try:
                with db.engine.connect() as connection:
                    connection.execute(text(index_sql))
                    connection.commit()
            except Exception as e:
                print(f"⚠️  Warning creating index: {str(e)}")
        
        print("✅ Indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error creating indexes: {str(e)}")

def test_connection():
    """Test database connection"""
    try:
        from flask import Flask
        from app import create_app
        
        app = Flask(__name__)
        app.config.from_object(Config)
        db.init_app(app)
        
        with app.app_context():
            # Test connection
            with db.engine.connect() as connection:
                result = connection.execute(text("SELECT 1"))
                print("✅ Database connection successful")
                return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def auto_initialize_database():
    """Main auto-initialization function"""
    print("🚀 Starting Auto Database Initialization for HVAR Hub...")
    print(f"📊 Database: {Config.MYSQL_DATABASE}")
    print(f"🌐 Host: {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
    print(f"👤 User: {Config.MYSQL_USER}")
    
    # Step 1: Try to create MySQL database
    mysql_available = create_mysql_database()
    
    if not mysql_available:
        # Use SQLite for development
        print("📝 Using SQLite for development (MySQL not available)")
        return True  # Continue with SQLite
    
    # Step 2: Create tables
    if not create_tables():
        print("❌ Failed to create tables")
        return False
    
    # Step 3: Test connection
    if not test_connection():
        print("❌ Database connection test failed")
        return False
    
    print("🎉 Auto Database Initialization Complete!")
    print("📝 You can now run the application with: python run.py")
    
    return True

# ============================================================================
# EXPORT MODELS FOR USE IN OTHER MODULES
# ============================================================================

# Export all models and enums for use in other modules
__all__ = [
    'BaseModel',
    'Order', 
    'MaintenanceHistory', 
    'ProofImage',
    'OrderStatus',
    'ReturnCondition',
    'MaintenanceAction',
    'ACTION_STATUS_MAP',
    'auto_initialize_database'
] 