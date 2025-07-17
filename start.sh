#!/bin/bash

# Script for starting DrevMaster on Timeweb hosting

echo "Starting DrevMaster application..."

# Set NODE_ENV
export NODE_ENV=production

# Kill any existing Node.js processes
pkill -f "node.*next"

# Start the application in background
nohup npm start > app.log 2>&1 &

echo "Application started! Check app.log for details."
echo "Process ID: $!"

# Wait a bit and check if app is running
sleep 5
if pgrep -f "node.*next" > /dev/null; then
    echo "✅ Application is running successfully!"
    echo "You can access it at your domain"
else
    echo "❌ Application failed to start. Check app.log for errors."
    cat app.log
fi 