# 🚀 HVAR Hub cPanel Deployment Guide

## 📋 Prerequisites

- cPanel hosting with Python support
- Domain name pointing to your cPanel hosting
- Access to cPanel File Manager and Python App Manager

## 📦 Deployment Files Ready

Your deployment package has been created in the `deploy` folder with the following structure:

```
deploy/
├── passenger_wsgi.py    # WSGI file for Passenger
├── .htaccess           # Apache configuration
├── requirements.txt     # Python dependencies
├── back/               # Backend Flask application
│   ├── app.py
│   ├── requirements.txt
│   ├── config/
│   ├── routes/
│   ├── services/
│   └── db/
└── public_html/        # Built frontend files
    ├── index.html
    ├── assets/
    └── ...
```

## 🚀 Step-by-Step Deployment

### 1. Upload Files to cPanel

1. **Open cPanel File Manager**
   - Log into your cPanel
   - Go to "File Manager"
   - Navigate to your domain root directory (`/home/mcrm.hvarstore.com`)

2. **Upload All Files**
   - Upload all contents from the `deploy` folder to your domain root
   - Make sure `passenger_wsgi.py` is in the root directory
   - Make sure `.htaccess` is in the root directory
   - The `public_html` folder should contain your built frontend

### 2. Set Up Python Application

1. **Create Python App**
   - In cPanel, go to "Setup Python App"
   - Click "Create Application"
   - Fill in the details:
     - **Application Root**: `/home/mcrm.hvarstore.com`
     - **Application URL**: `https://mcrm.hvarstore.com`
     - **Application Startup File**: `passenger_wsgi.py`
     - **Python Version**: 3.8 or higher

2. **Install Dependencies**
   - In your Python app settings, click "Install Requirements"
   - Or run: `pip install -r requirements.txt`

3. **Set Environment Variables**
   - Add these environment variables in your Python app settings:
     ```
     FLASK_ENV=production
     FLASK_APP=app.py
     SECRET_KEY=your-secret-key-here
     ```

### 3. Database Setup

Your app will automatically use SQLite for development, but for production you can:

1. **Use MySQL (Recommended)**
   - Create a MySQL database in cPanel
   - Set these environment variables:
     ```
     MYSQL_HOST=localhost
     MYSQL_USER=your_db_user
     MYSQL_PASSWORD=your_db_password
     MYSQL_DATABASE=your_db_name
     ```

2. **Or Use SQLite (Default)**
   - The app will automatically create `hvar_hub.db` in the `back/instance/` directory

### 4. Restart Application

1. **Restart Python App**
   - In your Python app settings, click "Restart Application"
   - Wait for the application to start

2. **Check Logs**
   - If there are issues, check the error logs in cPanel

## 🌐 Access Your Application

After successful deployment:

- **Frontend**: `https://mcrm.hvarstore.com/`
- **API**: `https://mcrm.hvarstore.com/api/v1/`
- **Health Check**: `https://mcrm.hvarstore.com/api/v1/health`

## 🔧 Troubleshooting

### Common Issues:

1. **500 Internal Server Error**
   - Check Python app logs in cPanel
   - Verify all dependencies are installed
   - Check file permissions (should be 644 for files, 755 for directories)

2. **Module Not Found Errors**
   - Run `pip install -r requirements.txt` in your Python app
   - Check that `passenger_wsgi.py` is in the root directory

3. **Database Connection Issues**
   - For MySQL: Check database credentials and connection
   - For SQLite: Check file permissions on the `back/instance/` directory

4. **Frontend Not Loading**
   - Verify `.htaccess` file is uploaded correctly
   - Check that `public_html/index.html` exists
   - Clear browser cache

### File Permissions:
```
Files: 644
Directories: 755
passenger_wsgi.py: 755 (executable)
```

## 📱 Features Available

Your deployed application includes:

- ✅ **Order Management System**
- ✅ **QR Code Scanner**
- ✅ **Interactive Maps**
- ✅ **Analytics Dashboard**
- ✅ **Responsive Design**
- ✅ **RESTful API**
- ✅ **Database Management**

## 🔄 Updating Your Application

To update your application:

1. **Local Development**
   - Make changes to your code
   - Run `.\deploy.bat` to rebuild
   - Upload new files to cPanel

2. **Direct cPanel Editing**
   - Use cPanel File Manager to edit files directly
   - Restart your Python application after changes

## 📞 Support

If you encounter issues:

1. Check cPanel error logs
2. Verify all files are uploaded correctly
3. Ensure Python app is running
4. Test API endpoints directly

## 🎉 Success!

Once deployed, your HVAR Hub application will be fully functional with:
- Modern, responsive UI
- Real-time order management
- QR code scanning capabilities
- Interactive maps and analytics
- Secure API endpoints
- Professional dashboard interface

Your application is now ready for production use! 🚀 