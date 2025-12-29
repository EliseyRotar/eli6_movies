#!/bin/bash

# Check if yay is installed, if not install it
if ! command -v yay &> /dev/null; then
    echo "yay is not installed. Installing yay..."
    sudo pacman -S --needed git base-devel --noconfirm
    git clone https://aur.archlinux.org/yay.git
    cd yay
    makepkg -si --noconfirm
    cd ..
    rm -rf yay
    echo "yay installed."
else
    echo "yay is already installed."
fi

# Check if Node.js and npm are installed, if not install them
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Node.js or npm is not installed. Installing Node.js and npm..."
    yay -S nodejs npm --noconfirm
    echo "Node.js and npm installed."
else
    echo "Node.js and npm are already installed."
fi

# Check if live-server is installed globally, if not install it
if ! command -v live-server &> /dev/null; then
    echo "live-server is not installed globally. Installing live-server..."
    sudo npm install -g live-server
    echo "live-server installed."
else
    echo "live-server is already installed."
fi

# Check if PHP is installed, if not install it
if ! command -v php &> /dev/null; then
    echo "PHP is not installed. Installing PHP..."
    yay -S php --noconfirm
    echo "PHP installed."
else
    echo "PHP is already installed."
fi

# Check if php-curl is enabled, if not install it
if ! php -m | grep -q curl; then
    echo "php-curl is not enabled. Installing php-curl..."
    yay -S php-curl --noconfirm
    echo "php-curl installed."
else
    echo "php-curl is already enabled."
fi

# Check if MongoDB is installed, if not install it
if ! command -v mongod &> /dev/null; then
    echo "MongoDB is not installed. Installing MongoDB..."
    yay -S mongodb-bin mongodb-tools-bin --noconfirm
    sudo systemctl start mongodb
    echo "MongoDB installed and started."
else
    echo "MongoDB is already installed."
fi

# Start MongoDB if not running
if ! systemctl is-active --quiet mongodb; then
    echo "Starting MongoDB..."
    sudo systemctl start mongodb
    echo "MongoDB started."
else
    echo "MongoDB is already running."
fi

echo "Starting eli6 movies..."

# Kill any process using port 3000
echo "Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend server
echo "Installing backend dependencies if needed..."
cd backend
if [ ! -d "node_modules" ] || [ package-lock.json -nt node_modules ]; then
    npm install
fi

echo "Starting backend server..."
node server.js &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

# Start frontend PHP server
echo "Starting frontend PHP server..."
cd ../frontend
# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
php -S 0.0.0.0:5500 &
FRONTEND_PID=$!

echo "Application started successfully!"
echo "Frontend (local): http://localhost:5500"
echo "Frontend (LAN):   http://$LOCAL_IP:5500"
echo "Backend: http://localhost:3000"
echo
echo "Press Ctrl+C to stop all servers..."

# Function to handle cleanup on script termination
cleanup() {
    echo "Stopping all servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to catch Ctrl+C and cleanup
trap cleanup SIGINT

# Keep script running
wait 
