#!/bin/bash

# Update system and install dependencies
apt update
apt install -y nginx nodejs npm

# Install PM2 globally
npm install -g pm2

# Create application directory
mkdir -p /var/www/kpi-dashboard
cd /var/www/kpi-dashboard

# Move and extract the zip file
mv /root/kpi-dashboard.zip .
unzip kpi-dashboard.zip

# Setup backend
cd /var/www/kpi-dashboard/backend
npm install

# Create backend environment file
cat > .env << EOF
PORT=3001
NODE_ENV=production
EOF

# Setup frontend
cd /var/www/kpi-dashboard/frontend
npm install
npm run build

# Setup Nginx configuration
cat > /etc/nginx/sites-available/kpi-dashboard << EOF
server {
    listen 80;
    server_name 207.244.237.89;

    # Frontend
    location / {
        root /var/www/kpi-dashboard/frontend/build;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/kpi-dashboard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Start the backend with PM2
cd /var/www/kpi-dashboard/backend
pm2 start server.js --name kpi-dashboard
pm2 save
pm2 startup

echo "Deployment complete! Your application should be accessible at http://207.244.237.89" 