# HVAR Hub - VPS Deployment Guide

## 🏗️ VPS File Structure

```
/home/mcrm.hvarstore.com/
├── public_html/                    # Main web root
│   ├── .htaccess                  # Apache configuration
│   ├── passenger_wsgi.py          # Passenger WSGI entry point
│   ├── back/                      # Backend Flask application
│   │   ├── app.py
│   │   ├── config/
│   │   ├── db/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── requirements.txt
│   ├── front/                     # Frontend React application
│   │   └── dist/                  # Built frontend files
│   │       ├── index.html
│   │       ├── assets/
│   │       └── ...
│   └── deploy_server_only.sh      # Deployment script
├── logs/                          # Application logs
└── .env                           # Environment variables
```

## 🔧 VPS Configuration

### **Virtual Host Configuration**

Your current vhost config is good, but here are the recommended additions:

```apache
# Add to your vhost configuration
context /api {
  type                    proxy
  handler                 http://127.0.0.1:5000
  addDefaultCharset       off
}

# For static files
context /assets {
  location                $DOC_ROOT/front/dist/assets
  allowBrowse             1
}

# For SPA routing
context / {
  type                    file
  handler                 $DOC_ROOT/front/dist/index.html
  addDefaultCharset       off
}
```

### **Updated .htaccess Configuration**

```apache
# HVAR Hub .htaccess for CyberPanel deployment
RewriteEngine On

# Handle CORS for API requests
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET,POST,PUT,DELETE,OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type,Authorization,X-Requested-With"
    Header always set Access-Control-Allow-Credentials "true"
</IfModule>

# Handle preflight OPTIONS requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule .* - [L]

# Handle API routes - forward to Flask
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^(.*)$ passenger_wsgi.py/$1 [QSA,L]

# Handle frontend routes - serve index.html for SPA routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^(.*)$ front/dist/index.html [L]

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compress text files
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

## 🚀 Deployment Steps

### **Step 1: Upload Files to VPS**

```bash
# From your local machine
scp -r ./back root@31.97.184.179:/home/mcrm.hvarstore.com/public_html/
scp -r ./front/dist root@31.97.184.179:/home/mcrm.hvarstore.com/public_html/front/
scp .htaccess root@31.97.184.179:/home/mcrm.hvarstore.com/public_html/
scp passenger_wsgi.py root@31.97.184.179:/home/mcrm.hvarstore.com/public_html/
```

### **Step 2: Set Up Environment**

Create `.env` file in `/home/mcrm.hvarstore.com/`:

```bash
# Production Environment Configuration
FLASK_ENV=production
FLASK_APP=app.py

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=mcrmh4534_hvar
MYSQL_PASSWORD=YOUR_ACTUAL_PASSWORD
MYSQL_DATABASE=mcrmh4534_hvar_hub

# Security
SECRET_KEY=YOUR_SECURE_SECRET_KEY
```

### **Step 3: Install Dependencies**

```bash
# SSH into VPS
ssh root@31.97.184.179

# Navigate to project
cd /home/mcrm.hvarstore.com/public_html

# Install Python dependencies
python3 -m pip install --user -r back/requirements.txt
```

### **Step 4: Set Permissions**

```bash
# Set proper ownership
chown -R mcrmh4534:mcrmh4534 /home/mcrm.hvarstore.com/

# Set file permissions
find /home/mcrm.hvarstore.com/public_html -type f -exec chmod 644 {} \;
find /home/mcrm.hvarstore.com/public_html -type d -exec chmod 755 {} \;
chmod +x /home/mcrm.hvarstore.com/public_html/passenger_wsgi.py
```

### **Step 5: Initialize Database**

```bash
cd /home/mcrm.hvarstore.com/public_html/back
python3 init_db.py
```

### **Step 6: Configure CyberPanel**

1. **Create Database in CyberPanel:**
   - Database Name: `mcrmh4534_hvar_hub`
   - Username: `mcrmh4534_hvar`
   - Set password and update `.env` file

2. **Update Virtual Host:**
   - Add the context configurations mentioned above
   - Ensure `autoLoadHtaccess` is enabled

3. **SSL Certificate:**
   - Your SSL is already configured correctly
   - Certificate: `/etc/letsencrypt/live/mcrm.hvarstore.com/`

## 🔍 Testing Your Deployment

### **Test API Endpoints:**

```bash
# Health check
curl https://mcrm.hvarstore.com/api/v1/health

# Test order scanning
curl -X POST https://mcrm.hvarstore.com/api/orders/scan \
  -H "Content-Type: application/json" \
  -d '{"tracking_number": "TEST123"}'
```

### **Test Frontend:**

Visit: `https://mcrm.hvarstore.com`

## 🛠️ Troubleshooting

### **Common Issues:**

1. **500 Internal Server Error:**
   - Check logs: `/home/mcrm.hvarstore.com/logs/`
   - Verify database connection
   - Check file permissions

2. **404 Not Found:**
   - Ensure `.htaccess` is properly configured
   - Check if `front/dist/index.html` exists

3. **Database Connection Issues:**
   - Verify MySQL credentials in `.env`
   - Check if database exists in CyberPanel

### **Log Locations:**

- **Error Logs:** `/home/mcrm.hvarstore.com/logs/mcrm.hvarstore.com.error_log`
- **Access Logs:** `/home/mcrm.hvarstore.com/logs/mcrm.hvarstore.com.access_log`

## 🔒 Security Considerations

1. **Environment Variables:**
   - Never commit `.env` file to git
   - Use strong passwords for database

2. **File Permissions:**
   - Keep sensitive files out of web root
   - Use proper ownership (mcrmh4534:mcrmh4534)

3. **SSL/TLS:**
   - Your SSL is properly configured
   - Force HTTPS redirects

## 📊 Performance Optimization

1. **Caching:**
   - Static assets are cached for 1 year
   - Enable gzip compression

2. **Database:**
   - Use MySQL for production
   - Optimize queries with proper indexing

3. **Frontend:**
   - Minified and optimized build files
   - CDN for static assets (optional)

## 🚀 Final Checklist

- [ ] Files uploaded to `/home/mcrm.hvarstore.com/public_html/`
- [ ] `.env` file configured with production settings
- [ ] Database created in CyberPanel
- [ ] Dependencies installed
- [ ] Permissions set correctly
- [ ] Database initialized
- [ ] SSL certificate working
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Error logs monitored

Your HVAR Hub should now be fully operational at `https://mcrm.hvarstore.com`! 🎉 