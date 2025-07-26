#!/bin/bash

echo "🚀 Starting Schedule Maker 2.0 with Docker Compose..."
echo ""

# Stop any running containers
docker compose down

# Build and start all services
docker compose up --build

echo ""
echo "✅ All services started!"
echo "🌐 Frontend: http://localhost:3001"
echo "🔧 Backend API: http://localhost:8001"
echo "🐘 Database: localhost:5433"
echo ""
echo "Press Ctrl+C to stop all services"