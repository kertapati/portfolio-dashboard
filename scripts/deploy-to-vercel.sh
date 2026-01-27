#!/bin/bash

# Portfolio Dashboard - Vercel Deployment Script

echo "🚀 Portfolio Dashboard - Vercel Deployment Setup"
echo "================================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Step 1: Link project
echo "🔗 Step 1: Linking to Vercel project..."
vercel link

# Step 2: Pull environment variables
echo "📥 Step 2: Pulling environment variables from Vercel..."
vercel env pull .env.local

# Step 3: Generate Prisma client
echo "⚙️  Step 3: Generating Prisma client..."
npx prisma generate

# Step 4: Push database schema
echo "🗄️  Step 4: Pushing database schema to Vercel Postgres..."
echo "Make sure you've created a Postgres database in Vercel first!"
read -p "Have you created a Postgres database in Vercel? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma db push
    echo "✅ Database schema pushed successfully!"
else
    echo "⏸️  Skipping database push. Create a Postgres database in Vercel first:"
    echo "   1. Go to https://vercel.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to Storage tab"
    echo "   4. Create a Postgres database"
    echo "   5. Run this script again"
    exit 1
fi

# Step 5: Commit and push
echo ""
echo "📤 Step 5: Ready to deploy!"
echo ""
echo "Run the following commands to deploy:"
echo "  git add ."
echo "  git commit -m 'Configure Vercel Postgres'"
echo "  git push"
echo ""
echo "✨ Your app will automatically deploy with persistent data!"
