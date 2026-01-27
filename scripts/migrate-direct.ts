/**
 * Direct SQLite to PostgreSQL migration
 * Reads SQLite file directly and writes to PostgreSQL
 */

import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'

const SQLITE_PATH = './prisma/portfolio.db'
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING

if (!POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL environment variable not set')
  process.exit(1)
}

// PostgreSQL client
const postgres = new PrismaClient({
  datasources: {
    db: { url: POSTGRES_URL },
  },
})

async function migrate() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n')

  const sqlite = new Database(SQLITE_PATH, { readonly: true })

  try {
    // 1. Migrate Settings
    console.log('⚙️  Migrating Settings...')
    const settings = sqlite.prepare('SELECT * FROM Setting').all() as any[]
    for (const setting of settings) {
      await postgres.setting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedAt: new Date(setting.updatedAt),
        },
        create: {
          key: setting.key,
          value: setting.value,
          updatedAt: new Date(setting.updatedAt),
        },
      })
    }
    console.log(`   ✅ Migrated ${settings.length} settings\n`)

    // 2. Migrate Wallets
    console.log('👛 Migrating Wallets...')
    const wallets = sqlite.prepare('SELECT * FROM Wallet').all() as any[]
    for (const wallet of wallets) {
      await postgres.wallet.upsert({
        where: { id: wallet.id },
        update: {
          chainType: wallet.chainType,
          address: wallet.address,
          label: wallet.label,
          createdAt: new Date(wallet.createdAt),
        },
        create: {
          id: wallet.id,
          chainType: wallet.chainType,
          address: wallet.address,
          label: wallet.label,
          createdAt: new Date(wallet.createdAt),
        },
      })
    }
    console.log(`   ✅ Migrated ${wallets.length} wallets\n`)

    // 3. Migrate EVM Token Allowlists
    console.log('🔷 Migrating EVM Token Allowlists...')
    const evmAllowlists = sqlite.prepare('SELECT * FROM EvmTokenAllowlist').all() as any[]
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
        create: {
          id: item.id,
          walletId: item.walletId,
          contractAddress: item.contractAddress,
          symbol: item.symbol,
          decimals: item.decimals,
          coingeckoId: item.coingeckoId,
        },
      })
    }
    console.log(`   ✅ Migrated ${evmAllowlists.length} EVM allowlist entries\n`)

    // 4. Migrate Solana Token Allowlists
    console.log('🟣 Migrating Solana Token Allowlists...')
    const solAllowlists = sqlite.prepare('SELECT * FROM SolTokenAllowlist').all() as any[]
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
        create: {
          id: item.id,
          walletId: item.walletId,
          mintAddress: item.mintAddress,
          symbol: item.symbol,
          coingeckoId: item.coingeckoId,
        },
      })
    }
    console.log(`   ✅ Migrated ${solAllowlists.length} Solana allowlist entries\n`)

    // 5. Migrate Manual Assets
    console.log('📝 Migrating Manual Assets...')
    const manualAssets = sqlite.prepare('SELECT * FROM ManualAsset').all() as any[]
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
          updatedAt: new Date(asset.updatedAt),
          investmentDate: asset.investmentDate ? new Date(asset.investmentDate) : null,
          investmentAmount: asset.investmentAmount,
          investmentValuation: asset.investmentValuation,
          tradfiSystem: asset.tradfiSystem === 1,
          exposureType: asset.exposureType,
        },
        create: {
          id: asset.id,
          type: asset.type,
          name: asset.name,
          valueAud: asset.valueAud,
          currency: asset.currency,
          quantity: asset.quantity,
          notes: asset.notes,
          updatedAt: new Date(asset.updatedAt),
          investmentDate: asset.investmentDate ? new Date(asset.investmentDate) : null,
          investmentAmount: asset.investmentAmount,
          investmentValuation: asset.investmentValuation,
          tradfiSystem: asset.tradfiSystem === 1,
          exposureType: asset.exposureType,
        },
      })
    }
    console.log(`   ✅ Migrated ${manualAssets.length} manual assets\n`)

    // 6. Migrate Price Cache
    console.log('💰 Migrating Price Cache...')
    const priceCache = sqlite.prepare('SELECT * FROM PriceCache').all() as any[]
    for (const price of priceCache) {
      await postgres.priceCache.upsert({
        where: { assetKey: price.assetKey },
        update: {
          symbol: price.symbol,
          coingeckoId: price.coingeckoId,
          priceUsd: price.priceUsd,
          fetchedAt: new Date(price.fetchedAt),
        },
        create: {
          assetKey: price.assetKey,
          symbol: price.symbol,
          coingeckoId: price.coingeckoId,
          priceUsd: price.priceUsd,
          fetchedAt: new Date(price.fetchedAt),
        },
      })
    }
    console.log(`   ✅ Migrated ${priceCache.length} price cache entries\n`)

    // 7. Migrate Snapshots
    console.log('📸 Migrating Snapshots...')
    const snapshots = sqlite
      .prepare('SELECT * FROM Snapshot ORDER BY createdAt ASC')
      .all() as any[]
    for (const snapshot of snapshots) {
      await postgres.snapshot.upsert({
        where: { id: snapshot.id },
        update: {
          createdAt: new Date(snapshot.createdAt),
          fxUsdAud: snapshot.fxUsdAud,
          totalAud: snapshot.totalAud,
          cashAud: snapshot.cashAud,
          cryptoAud: snapshot.cryptoAud,
          collectiblesAud: snapshot.collectiblesAud,
          evmTotalAud: snapshot.evmTotalAud,
          solTotalAud: snapshot.solTotalAud,
          manualTotalAud: snapshot.manualTotalAud,
        },
        create: {
          id: snapshot.id,
          createdAt: new Date(snapshot.createdAt),
          fxUsdAud: snapshot.fxUsdAud,
          totalAud: snapshot.totalAud,
          cashAud: snapshot.cashAud,
          cryptoAud: snapshot.cryptoAud,
          collectiblesAud: snapshot.collectiblesAud,
          evmTotalAud: snapshot.evmTotalAud,
          solTotalAud: snapshot.solTotalAud,
          manualTotalAud: snapshot.manualTotalAud,
        },
      })
    }
    console.log(`   ✅ Migrated ${snapshots.length} snapshots\n`)

    // 8. Migrate Snapshot Holdings
    console.log('📈 Migrating Snapshot Holdings...')
    const holdings = sqlite
      .prepare('SELECT * FROM SnapshotHolding ORDER BY snapshotId ASC')
      .all() as any[]

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
            create: {
              id: holding.id,
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
          })
        )
      )
      processedCount += batch.length
      process.stdout.write(`   📊 Progress: ${processedCount}/${holdings.length} holdings...\r`)
    }
    console.log(`\n   ✅ Migrated ${holdings.length} snapshot holdings\n`)

    // 9. Migrate Briefs
    console.log('📋 Migrating Briefs...')
    const briefs = sqlite.prepare('SELECT * FROM Brief').all() as any[]
    for (const brief of briefs) {
      await postgres.brief.upsert({
        where: { id: brief.id },
        update: {
          createdAt: new Date(brief.createdAt),
          reportType: brief.reportType,
          snapshotId: brief.snapshotId,
          data: brief.data,
          content: brief.content,
        },
        create: {
          id: brief.id,
          createdAt: new Date(brief.createdAt),
          reportType: brief.reportType,
          snapshotId: brief.snapshotId,
          data: brief.data,
          content: brief.content,
        },
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
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    sqlite.close()
    await postgres.$disconnect()
  }
}

migrate()
  .then(() => {
    console.log('\n✨ All done! Your data is now in PostgreSQL.')
    console.log('\n📝 Next steps:')
    console.log('   1. Update .env: DATABASE_URL to use PostgreSQL URL')
    console.log('   2. Test locally: npm run dev')
    console.log('   3. Deploy: vercel --prod')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
