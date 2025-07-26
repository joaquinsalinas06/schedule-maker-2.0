#!/bin/bash

echo "🚀 Setting up Schedule Maker 2.0 Backend"

# Check if python3-venv is installed
if ! dpkg -l | grep -q python3-venv; then
    echo "📦 Installing python3-venv..."
    sudo apt update
    sudo apt install python3-venv python3-full -y
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your database credentials!"
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your database credentials"
echo "2. Create PostgreSQL database 'schedule_maker'"
echo "3. Run: source venv/bin/activate"
echo "4. Run: uvicorn app.main:app --reload"