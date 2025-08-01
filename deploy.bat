@echo off
echo 🚀 HVAR Hub Deployment Script
echo ==============================

REM Check if we're in the right directory
if not exist "run.py" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Create deployment directory
echo 📁 Creating deployment directory...
if exist "deploy" rmdir /s /q deploy
mkdir deploy

REM Build frontend
echo 🔨 Building frontend...
cd front
call npm install
call npm run build
cd ..

REM Copy built frontend to public_html
echo 📦 Copying built frontend...
mkdir deploy\public_html
xcopy "front\dist\*" "deploy\public_html\" /E /I /Y

REM Copy backend files
echo 🐍 Copying backend files...
xcopy "back" "deploy\back\" /E /I /Y
copy "passenger_wsgi.py" "deploy\"
copy ".htaccess" "deploy\"

REM Copy requirements
echo 📋 Copying requirements...
copy "back\requirements.txt" "deploy\"

echo ✅ Deployment package created in 'deploy' folder!
echo 📋 Check the deployment instructions below:
echo.
echo ========================================
echo DEPLOYMENT INSTRUCTIONS:
echo ========================================
echo.
echo 1. Upload all files from the 'deploy' folder to your cPanel root directory
echo 2. In cPanel, go to "Setup Python App" and create a new Python application
echo 3. Set the application startup file to: passenger_wsgi.py
echo 4. Install requirements: pip install -r requirements.txt
echo 5. Set environment variables: FLASK_ENV=production, FLASK_APP=app.py
echo 6. Restart your Python application
echo.
echo Your app will be available at your domain!
echo API endpoints: https://your-domain.com/api/v1/
echo Frontend: https://your-domain.com/
echo.
pause 