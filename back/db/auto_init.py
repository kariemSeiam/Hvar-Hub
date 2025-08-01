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

# ============================================================================
# MODEL DEFINITIONS
# ============================================================================

class BaseModel(db.Model):
    """Base model class with common fields and methods"""
    __abstract__ = True
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
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
    scanned_at = db.Column(db.DateTime, default=datetime.utcnow)
    received_at = db.Column(db.DateTime)
    maintenance_started_at = db.Column(db.DateTime)
    maintenance_completed_at = db.Column(db.DateTime)
    maintenance_failed_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)
    rescheduled_at = db.Column(db.DateTime)
    returned_at = db.Column(db.DateTime)
    
    # Bosta integration data
    bosta_data = db.Column(db.JSON)  # Store complete Bosta response
    timeline_data = db.Column(db.JSON)  # Bosta timeline
    bosta_proof_images = db.Column(db.JSON)  # Bosta proof images
    
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
                'maintenance_history': [history.to_dict() for history in maintenance_history],
                'proof_images': [image.to_dict() for image in self.proof_images.all()],
                'cod_amount': float(self.cod_amount) if self.cod_amount else 0,
                'bosta_fees': float(self.bosta_fees) if self.bosta_fees else 0,
                'new_cod_amount': float(self.new_cod_amount) if self.new_cod_amount else None,
                'package_weight': float(self.package_weight) if self.package_weight else None,
                'bosta_proof_images': self.bosta_proof_images or [],
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
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
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
}

# ============================================================================
# DATABASE INITIALIZATION FUNCTIONS
# ============================================================================

def create_mysql_database():
    """Create MySQL database if it doesn't exist"""
    try:
        # Connect to MySQL server (without specifying database)
        connection = pymysql.connect(
            host=Config.MYSQL_HOST,
            port=int(Config.MYSQL_PORT),
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            charset='utf8mb4'
        )
        
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
                db.engine.execute(text(index_sql))
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
            result = db.engine.execute(text("SELECT 1"))
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
    'MaintenanceAction',
    'ACTION_STATUS_MAP',
    'auto_initialize_database'
] 