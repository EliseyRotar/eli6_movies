#!/bin/bash

# Check if yay is installed, if not install it
if ! command -v yay &> /dev/null; then
    echo "yay is not installed. Installing yay..."
    sudo pacman -S --needed git base-devel
    git clone https://aur.archlinux.org/yay.git
    cd yay
    makepkg -si --noconfirm
    cd ..
    rm -rf yay
    echo "yay installed."
else
    echo "yay is already installed."
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
echo "Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npx live-server --port=5500 &
FRONTEND_PID=$!

echo "Application started successfully!"
echo "Frontend: http://localhost:5500"
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