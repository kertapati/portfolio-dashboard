#!/bin/bash

# Simple script to set up PostgreSQL database with your data
# Run this: bash scripts/setup-postgres.sh

echo "🚀 Setting up PostgreSQL database with your data..."
echo ""

# Step 1: Backup current schema
echo "📦 Backing up current schema..."
cp prisma/schema.prisma prisma/schema.prisma.backup

# Step 2: Update schema to PostgreSQL
echo "🔄 Switching to PostgreSQL..."
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}

model Wallet {
  id               String   @id @default(cuid())
  address          String   @unique
  label            String?
  blockchain       String
  includeInBalance Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  allowlist        TokenAllowlist[]
}

model TokenAllowlist {
  walletId  String
  symbol    String
  assetKey  String
  createdAt DateTime @default(now())
  wallet    Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@id([walletId, symbol])
}

model ManualHolding {
  id        String   @id @default(cuid())
  symbol    String
  assetKey  String
  quantity  Float
  source    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Snapshot {
  id        String            @id @default(cuid())
  createdAt DateTime          @default(now())
  totalAud  Float
  totalUsd  Float
  fxRate    Float
  holdings  SnapshotHolding[]
}

model SnapshotHolding {
  id            String   @id @default(cuid())
  snapshotId    String
  symbol        String
  assetKey      String
  quantity      Float
  valueUsd      Float
  valueAud      Float
  source        String
  walletAddress String?
  snapshot      Snapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
}

model Brief {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  reportType  String
  snapshotId  String
  data        String
  content     String?
}
EOF

# Step 3: Push schema to PostgreSQL
echo "📤 Pushing schema to PostgreSQL..."
POSTGRES_URL="postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" \
POSTGRES_URL_NON_POOLING="postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" \
npx prisma db push

# Step 4: Generate Prisma client for PostgreSQL
echo "🔧 Generating Prisma client..."
npx prisma generate

# Step 5: Run migration script
echo "🔄 Migrating data from SQLite to PostgreSQL..."
POSTGRES_URL="postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" \
POSTGRES_URL_NON_POOLING="postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" \
node scripts/migrate-sqlite-to-postgres.js

# Step 6: Restore SQLite schema
echo "↩️  Restoring SQLite schema for localhost..."
mv prisma/schema.prisma.backup prisma/schema.prisma
npx prisma generate

echo ""
echo "✅ Done! Your PostgreSQL database now has all your data."
echo ""
echo "Next steps:"
echo "1. Your localhost will continue using SQLite (all your data is safe)"
echo "2. Deploy to Vercel: git add . && git commit -m 'Setup PostgreSQL' && git push"
echo "3. Your Vercel site will now have all your data!"
