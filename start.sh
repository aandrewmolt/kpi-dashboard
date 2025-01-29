#!/bin/bash

# Cleanup function to kill processes on exit
cleanup() {
    echo "Cleaning up..."
    pkill -f "node server.js"
    pkill -f "react-scripts start"
    exit 0
}

# Set up trap for cleanup on script exit
trap cleanup EXIT INT TERM

echo "Starting KPI Dashboard setup..."

# Kill any existing processes on ports 3000 and 3001
echo "Checking for existing processes..."
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null

# Create necessary directories
echo "Creating directories..."
mkdir -p backend/logs
mkdir -p backend/data/backups
mkdir -p backend/scripts

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend || exit 1
npm install || { echo "Failed to install backend dependencies"; exit 1; }

# Run data validation
echo "Validating data..."
node scripts/validate-data.js || { echo "Data validation failed"; exit 1; }
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend || exit 1
npm install || { echo "Failed to install frontend dependencies"; exit 1; }
cd ..

# Start backend server
echo "Starting backend server..."
cd backend || exit 1
NODE_ENV=development node server.js &
backend_pid=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/jobs > /dev/null; then
        echo "Backend server is running"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Backend server failed to start"
        exit 1
    fi
    sleep 1
done

# Start frontend
echo "Starting frontend server..."
cd frontend || exit 1
BROWSER=none npm start &
frontend_pid=$!
cd ..

echo "Setup complete!"
echo "Backend running on http://localhost:3001"
echo "Frontend running on http://localhost:3000"
echo "Press Ctrl+C to stop all servers"

# Wait for processes
wait $backend_pid $frontend_pid