#!/usr/bin/env python3
"""
HVAR Hub Runner Script

Usage:
    python run.py --full    # Build frontend and run backend
    python run.py --server  # Run backend only
    python run.py           # Default: run backend only
"""

import os
import sys
import subprocess
import argparse
import threading
import time
import platform
from pathlib import Path
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "back"
sys.path.insert(0, str(backend_dir))

from app import create_app

def find_npm():
    """Find npm executable, with Windows-specific fallbacks"""
    # Common npm locations on Windows
    windows_npm_paths = [
        r"E:\Win\nodejs\npm.cmd",
        r"E:\Win\nodejs\npm.ps1", 
        r"C:\Program Files\nodejs\npm.cmd",
        r"C:\Program Files\nodejs\npm.ps1",
        r"C:\Program Files (x86)\nodejs\npm.cmd",
        r"C:\Program Files (x86)\nodejs\npm.ps1",
    ]
    
    # Try to find npm in PATH first
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            return "npm"
    except:
        pass
    
    # On Windows, try specific paths
    if platform.system() == "Windows":
        for npm_path in windows_npm_paths:
            if Path(npm_path).exists():
                return npm_path
    
    return None

def run_npm_command(command, cwd, shell=True):
    """Run npm command with proper shell handling"""
    npm_exe = find_npm()
    if not npm_exe:
        raise FileNotFoundError("npm not found. Please install Node.js and npm.")
    
    if platform.system() == "Windows":
        # On Windows, use shell=True and proper command formatting
        # Use the full path to npm and ensure we're in the right directory
        full_command = f'cd "{cwd}" && "{npm_exe}" {command}'
        return subprocess.run(full_command, shell=True, check=True)
    else:
        # On Unix-like systems, use the standard approach
        return subprocess.run([npm_exe] + command.split(), cwd=cwd, check=True)

def build_frontend():
    """Build the frontend using npm"""
    print("🔨 Building frontend...")
    frontend_dir = Path(__file__).parent / "front"
    
    try:
        # Install dependencies if node_modules doesn't exist
        if not (frontend_dir / "node_modules").exists():
            print("📦 Installing frontend dependencies...")
            run_npm_command("install", frontend_dir)
        
        # Build the frontend
        result = run_npm_command("run build", frontend_dir)
        print("✅ Frontend built successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend build failed: {e}")
        return False
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return False

def run_frontend_dev():
    """Run frontend in development mode"""
    print("🚀 Starting frontend development server...")
    frontend_dir = Path(__file__).parent / "front"
    
    try:
        # Install dependencies if node_modules doesn't exist
        if not (frontend_dir / "node_modules").exists():
            print("📦 Installing frontend dependencies...")
            run_npm_command("install", frontend_dir)
        
        # Run development server
        run_npm_command("run dev", frontend_dir)
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend dev server failed: {e}")
    except FileNotFoundError as e:
        print(f"❌ {e}")

def run_backend():
    """Run the Flask backend server"""
    print("🐍 Starting Flask backend server...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent / "back"
    os.chdir(backend_dir)
    
    # Set Flask environment to development to use SQLite
    os.environ['FLASK_ENV'] = 'development'
    
    try:
        
        # Create Flask app
        app = create_app('development')
        
        # Run the app
        print("✅ Backend server starting on http://localhost:5001")
        print("📡 API available at http://localhost:5001/api/v1/")
        print("🌐 Frontend served at http://localhost:5001/")
        
        app.run(
            host='0.0.0.0',
            port=5001,
            debug=True,
            use_reloader=False  # Disable reloader to avoid issues with threading
        )
        
    except ImportError as e:
        print(f"❌ Failed to import Flask app: {e}")
        print("💡 Make sure you've installed the requirements: pip install -r requirements.txt")
    except Exception as e:
        print(f"❌ Backend server failed: {e}")

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(description='HVAR Hub Development Server')
    parser.add_argument('--full', action='store_true', help='Build frontend and run backend')
    parser.add_argument('--server', action='store_true', help='Run backend server only')
    parser.add_argument('--dev', action='store_true', help='Run both frontend dev server and backend')
    
    args = parser.parse_args()
    
    print("🌟 HVAR Hub Development Server")
    print("=" * 40)
    
    if args.full:
        print("🔄 Full mode: Building frontend and starting backend...")
        if build_frontend():
            run_backend()
        else:
            sys.exit(1)
    
    elif args.dev:
        print("🔄 Development mode: Starting both frontend and backend...")
        
        # Start frontend in a separate thread
        frontend_thread = threading.Thread(target=run_frontend_dev, daemon=True)
        frontend_thread.start()
        
        # Give frontend a moment to start
        time.sleep(2)
        
        # Start backend
        run_backend()
    
    else:
        print("🔄 Server mode: Starting backend only...")
        run_backend()

if __name__ == "__main__":
    main() 