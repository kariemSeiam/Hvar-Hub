#!/bin/bash

echo "🚀 HVAR Hub Deployment Script"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "run.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create deployment directory
echo "📁 Creating deployment directory..."
rm -rf deploy
mkdir -p deploy

# Build frontend
echo "🔨 Building frontend..."
cd front
npm install
npm run build
cd ..

# Copy built frontend to public_html
echo "📦 Copying built frontend..."
mkdir -p deploy/public_html
cp -r front/dist/* deploy/public_html/

# Copy backend files
echo "🐍 Copying backend files..."
cp -r back deploy/
cp passenger_wsgi.py deploy/
cp .htaccess deploy/

# Copy requirements
echo "📋 Copying requirements..."
cp back/requirements.txt deploy/

# Create deployment instructions
echo "📝 Creating deployment instructions..."
cat > deploy/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# HVAR Hub cPanel Deployment Instructions

## Steps to Deploy:

1. **Upload Files to cPanel:**
   - Upload all files from this `deploy` folder to your cPanel root directory
   - Make sure `passenger_wsgi.py` is in the root directory
   - Make sure `.htaccess` is in the root directory
   - The `public_html` folder should contain your built frontend

2. **Set Up Python App in cPanel:**
   - Go to cPanel → "Setup Python App"
   - Create a new Python application
   - Set the application root to your domain root
   - Set the application URL to your domain
   - Choose Python version 3.8 or higher
   - Set the application startup file to: `passenger_wsgi.py`

3. **Install Dependencies:**
   - In cPanel, go to your Python app
   - Click "Install Requirements" or run: `pip install -r requirements.txt`

4. **Set Environment Variables:**
   - In your Python app settings, add these environment variables:
     - `FLASK_ENV=production`
     - `FLASK_APP=app.py`

5. **Restart Application:**
   - Restart your Python application in cPanel

## File Structure After Deployment:
```
your-domain.com/
├── passenger_wsgi.py
├── .htaccess
├── back/
│   ├── app.py
│   ├── requirements.txt
│   └── ... (other backend files)
└── public_html/
    ├── index.html
    ├── assets/
    └── ... (built frontend files)
```

## Troubleshooting:
- Check cPanel error logs if the app doesn't start
- Make sure all Python dependencies are installed
- Verify that `passenger_wsgi.py` has execute permissions
- Check that your domain points to the correct directory

## API Endpoints:
- Your API will be available at: `https://your-domain.com/api/v1/`
- Frontend will be served from: `https://your-domain.com/`
EOF

echo "✅ Deployment package created in 'deploy' folder!"
echo "📋 Check 'deploy/DEPLOYMENT_INSTRUCTIONS.md' for detailed instructions"
echo ""
echo "📦 Files ready for upload:"
echo "   - deploy/public_html/ (frontend files)"
echo "   - deploy/back/ (backend files)"
echo "   - deploy/passenger_wsgi.py (WSGI file)"
echo "   - deploy/.htaccess (Apache config)"
echo "   - deploy/requirements.txt (Python dependencies)" 