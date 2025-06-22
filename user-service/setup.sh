#!/bin/bash

# User Service Startup Script
# This script helps set up and run the user service

set -e

echo "🚀 Starting User Service Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.development" ]; then
        echo "📄 Copying .env.development to .env..."
        cp .env.development .env
    elif [ -f ".env.template" ]; then
        echo "📄 Copying .env.template to .env..."
        cp .env.template .env
        echo "⚠️  Please update the .env file with your actual configuration values."
    else
        echo "❌ No environment file found. Please create a .env file or use .env.template"
        exit 1
    fi
fi

echo "✅ Environment file ready"

# Create logs directory
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
fi

# Check if PostgreSQL is available (optional check)
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client available"
else
    echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed and accessible."
fi

# Run basic validation
echo "🔍 Running basic validation..."
npm run lint || echo "⚠️  Linting issues found (non-critical)"

# Run tests
echo "🧪 Running tests..."
npm test || echo "⚠️  Some tests failed (check configuration)"

echo ""
echo "🎉 User Service setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure PostgreSQL is running and accessible"
echo "2. Update the .env file with your database credentials"
echo "3. Run 'npm run dev' to start the development server"
echo "4. The service will be available at http://localhost:3001"
echo ""
echo "🔧 Available commands:"
echo "  npm run dev     - Start development server with auto-reload"
echo "  npm start       - Start production server"
echo "  npm test        - Run tests"
echo "  npm run lint    - Check code style"
echo ""
echo "📚 API Documentation will be available at:"
echo "  http://localhost:3001/api/docs (when implemented)"
echo "  Health check: http://localhost:3001/api/health"
echo ""
