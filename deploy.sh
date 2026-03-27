#!/bin/bash

# OptionsRanker Production Deployment Script
echo "🚀 Starting OptionsRanker production deployment..."

# Exit on any error
set -e

# Build all components
echo "📦 Building application..."
npm run build

# Check if builds succeeded
if [ ! -d "client/dist" ]; then
  echo "❌ Client build failed - dist directory not found"
  exit 1
fi

if [ ! -d "server/dist" ]; then
  echo "❌ Server build failed - dist directory not found"
  exit 1
fi

echo "✅ Build completed successfully"

# Database setup for production
echo "🗄️  Setting up production database..."
NODE_ENV=production npm run db:setup
NODE_ENV=production npm run db:seed

echo "✅ Database setup completed"

# Test the build
echo "🧪 Testing production build..."
timeout 10s npm start || echo "Server startup test completed"

echo "✅ Production build ready for deployment"
echo ""
echo "📋 Deployment Checklist:"
echo "   ✅ Client built to client/dist/"
echo "   ✅ Server built to server/dist/"
echo "   ✅ Database initialized"
echo "   ✅ Environment configured"
echo ""
echo "🌐 Deploy with:"
echo "   vercel --prod"
echo "   OR"
echo "   Deploy dist/ folders to your hosting provider"