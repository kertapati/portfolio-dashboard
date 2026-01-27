/**
 * Migration script: SQLite → PostgreSQL (Neon)
 *
 * This script copies all data from your local SQLite database
 * to your production PostgreSQL database on Vercel/Neon.
 *
 * Usage:
 *   1. Ensure POSTGRES_URL is set in .env
 *   2. Run: npm run migrate
 */

import { PrismaClient } from '@prisma/client'

// Source: SQLite
const sqlite = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/portfolio.db',
    },
  },
})

// Destination: PostgreSQL
const postgres = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
    },
  },
})

async function migrate() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n')

  try {
    // 1. Migrate Settings
    console.log('⚙️  Migrating Settings...')
    const settings = await sqlite.setting.findMany()
    for (const setting of settings) {
      await postgres.setting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedAt: setting.updatedAt,
        },
        create: setting,
      })
    }
    console.log(`   ✅ Migrated ${settings.length} settings\n`)

    // 2. Migrate Wallets
    console.log('👛 Migrating Wallets...')
    const wallets = await sqlite.wallet.findMany()
    for (const wallet of wallets) {
      await postgres.wallet.upsert({
        where: { id: wallet.id },
        update: {
          chainType: wallet.chainType,
          address: wallet.address,
          label: wallet.label,
          createdAt: wallet.createdAt,
        },
        create: wallet,
      })
    }
    console.log(`   ✅ Migrated ${wallets.length} wallets\n`)

    // 3. Migrate EVM Token Allowlists
    console.log('🔷 Migrating EVM Token Allowlists...')
    const evmAllowlists = await sqlite.evmTokenAllowlist.findMany()
    for (const item of evmAllowlists) {
      await postgres.evmTokenAllowlist.upsert({
        where: {
          walletId_contractAddress: {
            walletId: item.walletId,
            contractAddress: item.contractAddress,
          },
        },
        update: {
          symbol: item.symbol,
          decimals: item.decimals,
          coingeckoId: item.coingeckoId,
        },
        create: item,
      })
    }
    console.log(`   ✅ Migrated ${evmAllowlists.length} EVM allowlist entries\n`)

    // 4. Migrate Solana Token Allowlists
    console.log('🟣 Migrating Solana Token Allowlists...')
    const solAllowlists = await sqlite.solTokenAllowlist.findMany()
    for (const item of solAllowlists) {
      await postgres.solTokenAllowlist.upsert({
        where: {
          walletId_mintAddress: {
            walletId: item.walletId || '',
            mintAddress: item.mintAddress,
          },
        },
        update: {
          symbol: item.symbol,
          coingeckoId: item.coingeckoId,
        },
        create: item,
      })
    }
    console.log(`   ✅ Migrated ${solAllowlists.length} Solana allowlist entries\n`)

    // 5. Migrate Manual Assets
    console.log('📝 Migrating Manual Assets...')
    const manualAssets = await sqlite.manualAsset.findMany()
    for (const asset of manualAssets) {
      await postgres.manualAsset.upsert({
        where: { id: asset.id },
        update: {
          type: asset.type,
          name: asset.name,
          valueAud: asset.valueAud,
          currency: asset.currency,
          quantity: asset.quantity,
          notes: asset.notes,
          updatedAt: asset.updatedAt,
          investmentDate: asset.investmentDate,
          investmentAmount: asset.investmentAmount,
          investmentValuation: asset.investmentValuation,
          tradfiSystem: asset.tradfiSystem,
          exposureType: asset.exposureType,
        },
        create: asset,
      })
    }
    console.log(`   ✅ Migrated ${manualAssets.length} manual assets\n`)

    // 6. Migrate Price Cache
    console.log('💰 Migrating Price Cache...')
    const priceCache = await sqlite.priceCache.findMany()
    for (const price of priceCache) {
      await postgres.priceCache.upsert({
        where: { assetKey: price.assetKey },
        update: {
          symbol: price.symbol,
          coingeckoId: price.coingeckoId,
          priceUsd: price.priceUsd,
          fetchedAt: price.fetchedAt,
        },
        create: price,
      })
    }
    console.log(`   ✅ Migrated ${priceCache.length} price cache entries\n`)

    // 7. Migrate Snapshots
    console.log('📸 Migrating Snapshots...')
    const snapshots = await sqlite.snapshot.findMany({
      orderBy: { createdAt: 'asc' },
    })
    for (const snapshot of snapshots) {
      await postgres.snapshot.upsert({
        where: { id: snapshot.id },
        update: {
          createdAt: snapshot.createdAt,
          fxUsdAud: snapshot.fxUsdAud,
          totalAud: snapshot.totalAud,
          cashAud: snapshot.cashAud,
          cryptoAud: snapshot.cryptoAud,
          collectiblesAud: snapshot.collectiblesAud,
          evmTotalAud: snapshot.evmTotalAud,
          solTotalAud: snapshot.solTotalAud,
          manualTotalAud: snapshot.manualTotalAud,
        },
        create: snapshot,
      })
    }
    console.log(`   ✅ Migrated ${snapshots.length} snapshots\n`)

    // 8. Migrate Snapshot Holdings
    console.log('📈 Migrating Snapshot Holdings...')
    const holdings = await sqlite.snapshotHolding.findMany({
      orderBy: { snapshotId: 'asc' },
    })

    // Batch insert for better performance
    let processedCount = 0
    const batchSize = 100
    for (let i = 0; i < holdings.length; i += batchSize) {
      const batch = holdings.slice(i, i + batchSize)
      await Promise.all(
        batch.map((holding) =>
          postgres.snapshotHolding.upsert({
            where: { id: holding.id },
            update: {
              snapshotId: holding.snapshotId,
              assetKey: holding.assetKey,
              source: holding.source,
              walletId: holding.walletId,
              symbol: holding.symbol,
              quantity: holding.quantity,
              priceUsd: holding.priceUsd,
              valueAud: holding.valueAud,
              liquidityTier: holding.liquidityTier,
              exposureType: holding.exposureType,
            },
            create: holding,
          })
        )
      )
      processedCount += batch.length
      process.stdout.write(`   📊 Progress: ${processedCount}/${holdings.length} holdings...\r`)
    }
    console.log(`\n   ✅ Migrated ${holdings.length} snapshot holdings\n`)

    // 9. Migrate Briefs
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
          content: brief.content,
        },
        create: brief,
      })
    }
    console.log(`   ✅ Migrated ${briefs.length} briefs\n`)

    console.log('═'.repeat(60))
    console.log('🎉 Migration completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   • ${settings.length} settings`)
    console.log(`   • ${wallets.length} wallets`)
    console.log(`   • ${evmAllowlists.length} EVM token allowlists`)
    console.log(`   • ${solAllowlists.length} Solana token allowlists`)
    console.log(`   • ${manualAssets.length} manual assets`)
    console.log(`   • ${priceCache.length} price cache entries`)
    console.log(`   • ${snapshots.length} snapshots`)
    console.log(`   • ${holdings.length} snapshot holdings`)
    console.log(`   • ${briefs.length} briefs`)
    console.log('═'.repeat(60))
    console.log('\n✅ Next steps:')
    console.log('   1. Verify data in PostgreSQL: npx prisma studio --url=$POSTGRES_URL')
    console.log('   2. Update .env to use POSTGRES_URL for production')
    console.log('   3. Run: npx prisma migrate deploy (if needed)')
    console.log('   4. Deploy to Vercel: vercel --prod')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await sqlite.$disconnect()
    await postgres.$disconnect()
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
