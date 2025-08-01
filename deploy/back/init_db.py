#!/usr/bin/env python3
"""
Simple Database Initialization Script for HVAR Hub
Run this script to manually initialize the database
"""

import sys
import os

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.auto_init import auto_initialize_database

if __name__ == "__main__":
    print("🚀 Manual Database Initialization for HVAR Hub")
    print("=" * 50)
    
    success = auto_initialize_database()
    
    if success:
        print("\n✅ Database initialization completed successfully!")
        print("📝 You can now run the application with: python run.py")
        sys.exit(0)
    else:
        print("\n❌ Database initialization failed!")
        sys.exit(1) 