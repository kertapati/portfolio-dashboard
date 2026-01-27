# 🚀 Deployment Guide: SQLite → PostgreSQL → Vercel

## Current Setup

Your app currently uses **SQLite** (file-based database):
- **Location**: `/prisma/portfolio.db`
- **Works on**: localhost only
- **Problem**: SQLite won't work on Vercel (no persistent filesystem)

## Solution: PostgreSQL on Neon

You already have a **Neon PostgreSQL** database URL in your `.env` file. This will work perfectly with Vercel's serverless architecture.

---

## Step-by-Step Migration

### 1. Prepare PostgreSQL Database

First, set your PostgreSQL connection as an environment variable for the migration:

```bash
export POSTGRES_URL="postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require"
```

### 2. Create Database Schema in PostgreSQL

Run Prisma to create all tables in PostgreSQL:

```bash
DATABASE_URL="$POSTGRES_URL" npx prisma db push
```

This creates all your tables (Settings, Wallet, ManualAsset, Snapshot, etc.) in the PostgreSQL database.

### 3. Migrate Your Data

Run the migration script to copy all your data from SQLite to PostgreSQL:

```bash
npm run migrate
```

This will transfer:
- ✅ 12 settings
- ✅ 5 wallets  
- ✅ 43 manual assets
- ✅ 277 snapshots
- ✅ 132 holdings
- ✅ 10 briefs

### 4. Verify Migration

Check your data in PostgreSQL:

```bash
DATABASE_URL="$POSTGRES_URL" npx prisma studio
```

### 5. Update .env for Production

Edit `.env` to use PostgreSQL:

```bash
# Production
DATABASE_URL="postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require"

# Keep SQLite commented for rollback
# DATABASE_URL="file:///Users/Peter/Documents/Claude Code/Portfolio Dashboard/prisma/portfolio.db"
```

### 6. Test Locally with PostgreSQL

```bash
npm run dev
```

Verify everything works at `http://localhost:3000`

### 7. Deploy to Vercel

```bash
vercel --prod
```

---

## Quick Commands

```bash
# Backup data
npm run backup

# Migrate to PostgreSQL  
npm run migrate

# Deploy to Vercel
vercel --prod
```
