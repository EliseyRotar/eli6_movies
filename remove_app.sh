#!/bin/bash

echo "=== Removing eli6 movies dependencies ==="

# Kill servers if running
echo "Killing backend (port 3000) and frontend (port 5500) if running..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5500 | xargs kill -9 2>/dev/null || true

# Remove live-server (npm global)
if command -v live-server &> /dev/null; then
    echo "Removing live-server..."
    npm uninstall -g live-server
else
    echo "live-server is not installed."
fi

# Remove backend dependencies
if [ -d "backend/node_modules" ]; then
    echo "Removing backend node_modules..."
    rm -rf backend/node_modules
fi

# Remove Node.js and npm
if command -v node &> /dev/null || command -v npm &> /dev/null; then
    echo "Removing Node.js and npm..."
    apt purge -y nodejs npm
    apt autoremove -y
else
    echo "Node.js and npm are not installed."
fi

# Remove PHP and php-curl
if command -v php &> /dev/null; then
    echo "Removing PHP and php-curl..."
    apt purge -y php php-curl
    apt autoremove -y
else
    echo "PHP is not installed."
fi

# Remove MongoDB
if command -v mongod &> /dev/null; then
    echo "Stopping and removing MongoDB..."
    systemctl stop mongodb
    systemctl disable mongodb
    apt purge -y mongodb
    apt autoremove -y
else
    echo "MongoDB is not installed."
fi

echo "Cleaning up package cache..."
apt clean

echo "=== All components removed successfully ==="
