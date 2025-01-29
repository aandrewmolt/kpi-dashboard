#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands and files
check_requirements() {
    local missing_requirements=0

    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        missing_requirements=1
    fi

    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        missing_requirements=1
    fi

    if ! command_exists pm2; then
        print_warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2 || {
            print_error "Failed to install PM2"
            missing_requirements=1
        }
    fi

    # Check Node.js version
    local node_version=$(node -v | cut -d 'v' -f 2)
    if [ "$(printf '%s\n' "14.0.0" "$node_version" | sort -V | head -n1)" = "14.0.0" ]; then
        print_message "Node.js version $node_version is compatible"
    else
        print_error "Node.js version must be 14.0.0 or higher (current: $node_version)"
        missing_requirements=1
    fi

    if [ $missing_requirements -eq 1 ]; then
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_message "Creating necessary directories..."
    
    # Create logs directory in backend if it doesn't exist
    if [ ! -d "backend/logs" ]; then
        mkdir -p backend/logs
        print_message "Created logs directory"
    fi

    # Create data/backups directory if it doesn't exist
    if [ ! -d "backend/data/backups" ]; then
        mkdir -p backend/data/backups
        print_message "Created backups directory"
    fi
}

# Setup production environment
setup_environment() {
    print_message "Setting up production environment..."
    
    # Get the server's public IP
    PUBLIC_IP=$(curl -s ifconfig.me)
    
    # Setup backend environment
    cat > backend/.env << EOF
PORT=3001
NODE_ENV=production
EOF
    
    # Build and setup frontend environment
    cat > frontend/.env << EOF
REACT_APP_API_URL=http://${PUBLIC_IP}:3001
EOF
}

# Install backend dependencies
setup_backend() {
    print_message "Setting up backend..."
    cd backend || {
        print_error "Failed to change to backend directory"
        exit 1
    }
    
    npm install --production || {
        print_error "Failed to install backend dependencies"
        exit 1
    }
    
    cd ..
}

# Install frontend dependencies and build
setup_frontend() {
    print_message "Setting up frontend..."
    cd frontend || {
        print_error "Failed to change to frontend directory"
        exit 1
    }
    
    # Install dependencies
    npm install || {
        print_error "Failed to install frontend dependencies"
        exit 1
    }
    
    # Build frontend
    print_message "Building frontend..."
    npm run build || {
        print_error "Failed to build frontend"
        exit 1
    }
    
    cd ..
}

# Setup and start nginx
setup_nginx() {
    print_message "Setting up nginx..."
    
    if ! command_exists nginx; then
        print_warning "nginx is not installed. Installing nginx..."
        sudo apt-get update && sudo apt-get install -y nginx || {
            print_error "Failed to install nginx"
            exit 1
        }
    }
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/kpi-dashboard << EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root $(pwd)/frontend/build;
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
    sudo ln -sf /etc/nginx/sites-available/kpi-dashboard /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t || {
        print_error "nginx configuration test failed"
        exit 1
    }
    
    # Restart nginx
    sudo systemctl restart nginx
}

# Start the backend server using PM2
start_backend() {
    print_message "Starting backend server with PM2..."
    cd backend || exit 1
    pm2 delete kpi-backend 2>/dev/null || true
    pm2 start server.js --name kpi-backend || {
        print_error "Failed to start backend server"
        exit 1
    }
    pm2 save
    cd ..
}

# Main execution
main() {
    print_message "Starting KPI Dashboard production deployment..."
    
    # Check requirements first
    check_requirements
    
    # Create necessary directories
    create_directories
    
    # Setup environment
    setup_environment
    
    # Setup everything
    setup_backend
    setup_frontend
    
    # Setup and start nginx
    setup_nginx
    
    # Start backend server
    start_backend
    
    # Get the server's public IP
    PUBLIC_IP=$(curl -s ifconfig.me)
    
    print_message "Deployment complete!"
    print_message "Your application is now running at: http://${PUBLIC_IP}"
    print_message "Backend API is available at: http://${PUBLIC_IP}:3001"
    print_message "To monitor the backend server, use: pm2 status"
    print_message "To view backend logs, use: pm2 logs kpi-backend"
}

# Run main function
main 