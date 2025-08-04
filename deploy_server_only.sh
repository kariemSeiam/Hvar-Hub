#!/bin/bash

# HVAR Hub - Server-Only Deployment Script
# This script deploys only the backend server, assuming frontend dist files are already built

set -e  # Exit on any error

echo "🚀 HVAR Hub - Server Deployment"
echo "==============================="

# Configuration
REMOTE_HOST="31.97.184.179"
REMOTE_USER="root"
REMOTE_PATH="/home/mcrm.hvarstore.com/public_html"
DB_NAME="mcrmh4534_hvar_hub"
DB_USER="mcrmh4534_hvar"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "passenger_wsgi.py" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if frontend dist exists
if [ ! -d "front/dist" ]; then
    print_warning "Frontend dist folder not found. Make sure you've built the frontend first."
    print_warning "The server will still deploy but frontend might not work."
fi

print_status "📦 Preparing deployment package..."

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
print_status "Creating deployment package in: $TEMP_DIR"

# Copy only necessary files (no node_modules, no source files)
rsync -av \
    --include="back/" \
    --include="back/**" \
    --include="front/dist/" \
    --include="front/dist/**" \
    --include="passenger_wsgi.py" \
    --include=".htaccess" \
    --include="*.py" \
    --include="*.md" \
    --exclude="front/src/" \
    --exclude="front/node_modules/" \
    --exclude="front/package*" \
    --exclude="front/vite*" \
    --exclude="front/eslint*" \
    --exclude="front/tailwind*" \
    --exclude="front/postcss*" \
    --exclude=".git/" \
    --exclude="*.log" \
    --exclude="__pycache__/" \
    --exclude="*.pyc" \
    . "$TEMP_DIR/"

# Create environment file for production
print_status "🔧 Creating production environment configuration..."
cat > "$TEMP_DIR/.env" << EOL
# Production Environment Configuration
FLASK_ENV=production
FLASK_APP=app.py

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=$DB_USER
MYSQL_PASSWORD=YOUR_DB_PASSWORD_HERE
MYSQL_DATABASE=$DB_NAME

# Security (Generate a secure secret key)
SECRET_KEY=YOUR_SECRET_KEY_HERE
EOL

# Create server setup script
print_status "📝 Creating server setup script..."
cat > "$TEMP_DIR/setup_server.sh" << 'EOL'
#!/bin/bash

# Server Setup Script - Run this on your VPS

set -e

echo "🔧 Setting up HVAR Hub server..."

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Check if we're in the right directory
if [ ! -f "passenger_wsgi.py" ]; then
    print_error "Please run this script from /home/mcrm.hvarstore.com/public_html"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
yum update -y

# Install Python 3 and pip if not available
print_status "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    print_status "Installing Python 3..."
    yum install -y python3 python3-pip
fi

# Install Python dependencies
print_status "Installing Python dependencies..."
python3 -m pip install --user -r back/requirements.txt

# Set proper file permissions
print_status "Setting file permissions..."
chown -R mcrmh4534:mcrmh4534 .
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod +x passenger_wsgi.py

# Create database if MySQL credentials are provided
if [ -f ".env" ] && grep -q "MYSQL_PASSWORD=" .env && ! grep -q "YOUR_DB_PASSWORD_HERE" .env; then
    print_status "Setting up database..."
    # Note: You'll need to create the database manually in CyberPanel
    # or provide the root MySQL password for automatic creation
    print_warning "⚠️  Please create the database manually in CyberPanel:"
    print_warning "   Database Name: mcrmh4534_hvar_hub"
    print_warning "   Username: mcrmh4534_hvar"
    print_warning "   Then update the .env file with the password"
else
    print_warning "⚠️  Database not configured. Please:"
    print_warning "   1. Create database in CyberPanel"
    print_warning "   2. Update .env file with credentials"
fi

# Initialize database tables
print_status "Initializing database tables..."
cd back
if python3 init_db.py; then
    print_status "✅ Database initialized successfully!"
else
    print_warning "⚠️  Database initialization failed. Check your database credentials."
fi
cd ..

# Test the application
print_status "Testing application..."
if python3 -c "from back.app import create_app; app = create_app('production'); print('✅ App created successfully')"; then
    print_status "✅ Application test passed!"
else
    print_error "❌ Application test failed. Check the logs."
fi

print_status "🎉 Server setup complete!"
print_status "🌐 Your application should be available at: https://mcrm.hvarstore.com"
print_warning "⚠️  Don't forget to:"
print_warning "   1. Update .env file with your actual database password"
print_warning "   2. Update .env file with a secure secret key"
print_warning "   3. Create the database in CyberPanel if not done already"

echo "================================="
echo "🚀 HVAR Hub server is ready!"
EOL

chmod +x "$TEMP_DIR/setup_server.sh"

print_status "📤 Deployment package ready!"
print_status "📁 Package location: $TEMP_DIR"

# Ask for deployment method
echo ""
echo "Choose deployment method:"
echo "1. Upload via SCP (requires password)"
echo "2. Show manual upload instructions"
echo "3. Exit (files prepared in temp directory)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        print_status "🚀 Uploading files via SCP..."
        read -p "Enter VPS root password: " -s VPS_PASSWORD
        echo
        
        if command -v sshpass &> /dev/null; then
            sshpass -p "$VPS_PASSWORD" rsync -avz --delete \
                "$TEMP_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
            
            print_status "📡 Running setup script on VPS..."
            sshpass -p "$VPS_PASSWORD" ssh "$REMOTE_USER@$REMOTE_HOST" \
                "cd $REMOTE_PATH && chmod +x setup_server.sh && ./setup_server.sh"
        else
            print_error "sshpass not found. Installing..."
            # Try to install sshpass
            if command -v apt-get &> /dev/null; then
                sudo apt-get install -y sshpass
            elif command -v yum &> /dev/null; then
                sudo yum install -y sshpass
            else
                print_error "Cannot install sshpass. Please upload files manually."
                choice=2
            fi
        fi
        ;;
    2)
        print_status "📋 Manual upload instructions:"
        echo ""
        echo "1. Upload all files from: $TEMP_DIR"
        echo "2. To VPS directory: $REMOTE_PATH"
        echo "3. Connect to VPS: ssh root@$REMOTE_HOST"
        echo "4. Run: cd $REMOTE_PATH && chmod +x setup_server.sh && ./setup_server.sh"
        echo ""
        ;;
    3)
        print_status "Files prepared for manual deployment"
        ;;
    *)
        print_error "Invalid choice"
        ;;
esac

if [ "$choice" = "1" ] || [ "$choice" = "2" ]; then
    print_status "🎉 Deployment complete!"
    print_status "🌐 Your application should be available at: https://mcrm.hvarstore.com"
    print_warning "⚠️  Remember to:"
    print_warning "   1. Update .env file with database credentials"
    print_warning "   2. Create database in CyberPanel if needed"
    print_warning "   3. Test the application"
fi

# Cleanup
print_status "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "================================="
echo "🚀 Deployment script finished!"