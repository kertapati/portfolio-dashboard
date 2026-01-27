# 🚀 Deploy to Vercel via GitHub

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `portfolio-dashboard` (or any name you prefer)
3. **Keep it Private** (recommended - contains your portfolio structure)
4. **Do NOT initialize** with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 2: Push Your Code to GitHub

GitHub will show you commands. Use these:

```bash
cd "/Users/Peter/Documents/Claude Code/Portfolio Dashboard"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/portfolio-dashboard.git

# Push code
git branch -M main
git push -u origin main
```

## Step 3: Connect Vercel to GitHub

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Find and select your `portfolio-dashboard` repository
4. Click "Import"

## Step 4: Configure Environment Variables

In the Vercel import screen, add this environment variable:

```
DATABASE_URL=postgresql://neondb_owner:npg_cNgOiHXC9mt3@ep-wispy-queen-a7c5z2pm-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
```

**Important:** This is your production database connection string. Keep it private!

## Step 5: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Your app will be live at: `https://your-project-name.vercel.app`

## Step 6: Verify Deployment

Visit your Vercel URL and check:
- ✅ Dashboard loads
- ✅ Settings show correct values
- ✅ History page shows 277 snapshots
- ✅ Manual assets appear (43 items)

---

## Future Deployments

After the initial setup, deploying is automatic:

```bash
# Make changes to your code
# Commit changes
git add .
git commit -m "Your commit message"

# Push to GitHub
git push

# Vercel automatically deploys! 🎉
```

---

## Why GitHub → Vercel?

This is the recommended workflow because:

1. ✅ **Automatic deployments** - Push to GitHub, Vercel auto-deploys
2. ✅ **Preview deployments** - Every branch gets a preview URL
3. ✅ **Rollback capability** - Easy to revert to previous deployments
4. ✅ **Build logs** - Better debugging when issues occur
5. ✅ **Team collaboration** - Others can contribute via GitHub
6. ✅ **Version control** - Full git history of your project

---

## Troubleshooting

### Build fails with "npm run build exited with 1"

Check Vercel build logs for specific errors. Common issues:
- Missing environment variables
- TypeScript errors
- Database connection issues

### "Cannot connect to database"

Verify `DATABASE_URL` is set in Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Ensure `DATABASE_URL` is added with the correct PostgreSQL URL

### App loads but shows no data

Your PostgreSQL database already has all your data from the migration. If it's empty:
1. Verify connection string is correct
2. Run `npm run verify-db` locally to confirm data exists

---

## Your Repository Structure

```
portfolio-dashboard/
├── .env.example          # Template for environment variables
├── .gitignore           # Excludes .env, *.db, backups
├── src/                 # Application code
├── prisma/              # Database schema
├── public/              # Static assets
└── scripts/             # Utility scripts
```

**Not committed (secure):**
- `.env` - Your database credentials
- `portfolio.db` - Local SQLite backup
- `backup_portfolio.json` - Your portfolio data backup

---

## Quick Reference

```bash
# Check git status
git status

# Commit changes
git add .
git commit -m "Description of changes"

# Push to GitHub (triggers Vercel deploy)
git push

# View deployment status
# Visit: https://vercel.com/your-username/portfolio-dashboard
```
