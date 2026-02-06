#!/bin/bash

echo "🚀 Setting up BitZen Backend API..."

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL CLI not found. Make sure PostgreSQL is installed."
fi

if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis CLI not found. Make sure Redis is installed."
fi

echo "✅ Prerequisites checked"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Create logs directory
mkdir -p logs
echo "📁 Created logs directory"

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Ensure PostgreSQL is running: sudo service postgresql start"
echo "3. Ensure Redis is running: sudo service redis start"
echo "4. Create database: createdb bitizen"
echo "5. Start development server: npm run dev"
echo ""
echo "API will be available at: http://localhost:3001"
echo "Health check: http://localhost:3001/health"
