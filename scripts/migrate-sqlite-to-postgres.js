/**
 * Migration script: SQLite → PostgreSQL
 *
 * This script copies all data from your local SQLite database
 * to your Vercel PostgreSQL (Neon) database.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.js
 */

const { PrismaClient: PrismaSQLite } = require('@prisma/client')
const { PrismaClient: PrismaPostgres } = require('@prisma/client')

async function migrate() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n')

  // Connect to SQLite (source)
  const sqlite = new PrismaSQLite({
    datasources: {
      db: {
        url: 'file:./prisma/portfolio.db'
      }
    }
  })

  // Connect to PostgreSQL (destination)
  const postgres = new PrismaPostgres({
    datasources: {
      db: {
        url: process.env.POSTGRES_URL || process.env.DATABASE_URL
      }
    }
  })

  try {
    // 1. Migrate Settings
    console.log('📊 Migrating Settings...')
    const settings = await sqlite.setting.findMany()
    for (const setting of settings) {
      await postgres.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, updatedAt: setting.updatedAt },
        create: setting
      })
    }
    console.log(`✅ Migrated ${settings.length} settings\n`)

    // 2. Migrate Wallets
    console.log('💳 Migrating Wallets...')
    const wallets = await sqlite.wallet.findMany()
    for (const wallet of wallets) {
      await postgres.wallet.upsert({
        where: { id: wallet.id },
        update: {
          address: wallet.address,
          label: wallet.label,
          blockchain: wallet.blockchain,
          includeInBalance: wallet.includeInBalance,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt
        },
        create: wallet
      })
    }
    console.log(`✅ Migrated ${wallets.length} wallets\n`)

    // 3. Migrate Token Allowlists
    console.log('🎯 Migrating Token Allowlists...')
    const allowlists = await sqlite.tokenAllowlist.findMany()
    for (const item of allowlists) {
      await postgres.tokenAllowlist.upsert({
        where: {
          walletId_symbol: {
            walletId: item.walletId,
            symbol: item.symbol
          }
        },
        update: {
          assetKey: item.assetKey,
          createdAt: item.createdAt
        },
        create: item
      })
    }
    console.log(`✅ Migrated ${allowlists.length} allowlist entries\n`)

    // 4. Migrate Manual Holdings
    console.log('📝 Migrating Manual Holdings...')
    const manualHoldings = await sqlite.manualHolding.findMany()
    for (const holding of manualHoldings) {
      await postgres.manualHolding.upsert({
        where: { id: holding.id },
        update: {
          symbol: holding.symbol,
          assetKey: holding.assetKey,
          quantity: holding.quantity,
          source: holding.source,
          createdAt: holding.createdAt,
          updatedAt: holding.updatedAt
        },
        create: holding
      })
    }
    console.log(`✅ Migrated ${manualHoldings.length} manual holdings\n`)

    // 5. Migrate Snapshots
    console.log('📸 Migrating Snapshots...')
    const snapshots = await sqlite.snapshot.findMany({
      include: {
        holdings: true
      }
    })
    for (const snapshot of snapshots) {
      // Create snapshot
      await postgres.snapshot.upsert({
        where: { id: snapshot.id },
        update: {
          createdAt: snapshot.createdAt,
          totalAud: snapshot.totalAud,
          totalUsd: snapshot.totalUsd,
          fxRate: snapshot.fxRate
        },
        create: {
          id: snapshot.id,
          createdAt: snapshot.createdAt,
          totalAud: snapshot.totalAud,
          totalUsd: snapshot.totalUsd,
          fxRate: snapshot.fxRate
        }
      })

      // Create holdings for this snapshot
      for (const holding of snapshot.holdings) {
        await postgres.snapshotHolding.upsert({
          where: { id: holding.id },
          update: {
            snapshotId: holding.snapshotId,
            symbol: holding.symbol,
            assetKey: holding.assetKey,
            quantity: holding.quantity,
            valueUsd: holding.valueUsd,
            valueAud: holding.valueAud,
            source: holding.source,
            walletAddress: holding.walletAddress
          },
          create: holding
        })
      }
    }
    console.log(`✅ Migrated ${snapshots.length} snapshots with their holdings\n`)

    // 6. Migrate Briefs
    console.log('📋 Migrating Briefs...')
    const briefs = await sqlite.brief.findMany()
    for (const brief of briefs) {
      await postgres.brief.upsert({
        where: { id: brief.id },
        update: {
          createdAt: brief.createdAt,
          reportType: brief.reportType,
          snapshotId: brief.snapshotId,
          data: brief.data,
          content: brief.content
        },
        create: brief
      })
    }
    console.log(`✅ Migrated ${briefs.length} briefs\n`)

    console.log('🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Verify your data in PostgreSQL by running: npx prisma studio')
    console.log('2. Update your .env file to use PostgreSQL')
    console.log('3. Deploy to Vercel: git push')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sqlite.$disconnect()
    await postgres.$disconnect()
  }
}

// Run migration
migrate()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
