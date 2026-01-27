# Setting Up Vercel Postgres for Portfolio Dashboard

## Step 1: Create Vercel Postgres Database

1. Go to https://vercel.com/dashboard
2. Select your portfolio dashboard project
3. Click on the "Storage" tab
4. Click "Create Database"
5. Select "Postgres"
6. Name it `portfolio-db` (or any name you prefer)
7. Click "Create"

Vercel will automatically add these environment variables to your project:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` 
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Step 2: Update Your .env File

Copy the `POSTGRES_PRISMA_URL` value from Vercel and update your local `.env` file:

```bash
DATABASE_URL="<POSTGRES_PRISMA_URL from Vercel>"
POSTGRES_URL_NON_POOLING="<POSTGRES_URL_NON_POOLING from Vercel>"
```

## Step 3: Run Prisma Migrations

In your terminal, run:

```bash
# Generate a migration from your schema
npx prisma migrate dev --name init

# This will:
# 1. Create the migration files
# 2. Apply the migration to your database
# 3. Generate the Prisma client
```

## Step 4: (Optional) Migrate Data from SQLite

If you have existing data in your local SQLite database that you want to migrate to Postgres:

1. Export data from SQLite (manual process - export each table as JSON or CSV)
2. Import data into Postgres using Prisma Studio or custom scripts

## Step 5: Deploy to Vercel

```bash
git add .
git commit -m "Migrate to PostgreSQL for Vercel deployment"
git push
```

Vercel will automatically:
- Use the environment variables from the Postgres database
- Run `prisma generate` (via postinstall script)
- Build and deploy your app

## Step 6: Verify

1. Visit your Vercel deployment URL
2. Click "Refresh Holdings"
3. Your data should now persist across deployments!

## Troubleshooting

If you get database connection errors:

1. Check that `DATABASE_URL` is set in Vercel environment variables
2. Make sure you've run migrations: `npx prisma migrate deploy`
3. Check Vercel deployment logs for Prisma errors
