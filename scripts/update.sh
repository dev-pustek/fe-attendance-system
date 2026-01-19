#!/bin/bash

# Navigate to project director
cd /home/deploy/apps/fe-visio

# Pull latest changes
echo "Pulling latest changes..."
git pull

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building project..."
npm run build

echo "Deployment complete! Verify at http://<YOUR_IP>:4000"
