import os
from dotenv import load_dotenv

# Load .env file if it exists, otherwise use defaults
try:
    load_dotenv()
except Exception:
    # If .env file doesn't exist or has issues, continue with defaults
    pass

# Environment detection
ENV = os.environ.get('FLASK_ENV', 'development')

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    
    # MySQL Database Configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_PORT = os.environ.get('MYSQL_PORT') or 3306
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE') or 'hvar_hub'
    # Optional admin credentials for bootstrap/DDL (ALTER DATABASE/TABLE)
    MYSQL_ADMIN_USER = os.environ.get('MYSQL_ADMIN_USER') or MYSQL_USER
    MYSQL_ADMIN_PASSWORD = os.environ.get('MYSQL_ADMIN_PASSWORD') or MYSQL_PASSWORD
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@"
        f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    )

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DEVELOPMENT = True
    
    # Try MySQL first, fallback to SQLite
    def __init__(self):
        try:
            import pymysql
            # Test MySQL connection
            pymysql.connect(
                host=self.MYSQL_HOST,
                port=int(self.MYSQL_PORT),
                user=self.MYSQL_USER,
                password=self.MYSQL_PASSWORD,
                charset='utf8mb4'
            )
            # MySQL is available
            self.SQLALCHEMY_DATABASE_URI = (
                f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@"
                f"{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"
            )
            print("✅ MySQL connection successful, using MySQL database")
        except Exception as e:
            # MySQL not available, use SQLite
            self.SQLALCHEMY_DATABASE_URI = 'sqlite:///hvar_hub.db'
            print(f"⚠️  MySQL not available ({str(e)}), falling back to SQLite")

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    DEVELOPMENT = False
    
    # Production database settings
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_PORT = os.environ.get('MYSQL_PORT') or 3306
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'mcrmh4534_hvar'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE') or 'mcrmh4534_hvar_hub'
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@"
        f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    )

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 