/**
 * Seed PostgreSQL from JSON backup
 * Uses the backup_portfolio.json file to populate PostgreSQL
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const BACKUP_FILE = path.join(process.cwd(), 'backup_portfolio.json')
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING

if (!POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL environment variable not set')
  process.exit(1)
}

const postgres = new PrismaClient({
  datasources: {
    db: { url: POSTGRES_URL },
  },
})

async function seedFromBackup() {
  console.log('🚀 Starting PostgreSQL seed from backup...\n')

  try {
    // Read backup file
    console.log('📂 Reading backup file...')
    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'))
    console.log(`   ✅ Loaded backup from ${backupData.exportedAt}\n`)

    const { data } = backupData

    // 1. Seed Settings
    console.log('⚙️  Seeding Settings...')
    for (const setting of data.settings) {
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
    console.log(`   ✅ Seeded ${data.settings.length} settings\n`)

    // 2. Seed Wallets
    console.log('👛 Seeding Wallets...')
    for (const wallet of data.wallets) {
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
    console.log(`   ✅ Seeded ${data.wallets.length} wallets\n`)

    // 3. Seed EVM Token Allowlists
    console.log('🔷 Seeding EVM Token Allowlists...')
    for (const item of data.evmTokenAllowlists) {
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
    console.log(`   ✅ Seeded ${data.evmTokenAllowlists.length} EVM allowlist entries\n`)

    // 4. Seed Solana Token Allowlists
    console.log('🟣 Seeding Solana Token Allowlists...')
    for (const item of data.solTokenAllowlists) {
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
    console.log(`   ✅ Seeded ${data.solTokenAllowlists.length} Solana allowlist entries\n`)

    // 5. Seed Manual Assets
    console.log('📝 Seeding Manual Assets...')
    for (const asset of data.manualAssets) {
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
          tradfiSystem: asset.tradfiSystem,
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
          tradfiSystem: asset.tradfiSystem,
          exposureType: asset.exposureType,
        },
      })
    }
    console.log(`   ✅ Seeded ${data.manualAssets.length} manual assets\n`)

    // 6. Seed Price Cache
    console.log('💰 Seeding Price Cache...')
    for (const price of data.priceCache) {
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
    console.log(`   ✅ Seeded ${data.priceCache.length} price cache entries\n`)

    // 7. Seed Snapshots
    console.log('📸 Seeding Snapshots...')
    for (const snapshot of data.snapshots) {
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
    console.log(`   ✅ Seeded ${data.snapshots.length} snapshots\n`)

    // 8. Seed Snapshot Holdings
    console.log('📈 Seeding Snapshot Holdings...')
    let processedCount = 0
    const batchSize = 100
    const holdings = data.snapshotHoldings

    for (let i = 0; i < holdings.length; i += batchSize) {
      const batch = holdings.slice(i, i + batchSize)
      await Promise.all(
        batch.map((holding: any) =>
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
    console.log(`\n   ✅ Seeded ${holdings.length} snapshot holdings\n`)

    // 9. Seed Briefs
    console.log('📋 Seeding Briefs...')
    for (const brief of data.briefs) {
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
    console.log(`   ✅ Seeded ${data.briefs.length} briefs\n`)

    console.log('═'.repeat(60))
    console.log('🎉 Seed completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   • ${data.settings.length} settings`)
    console.log(`   • ${data.wallets.length} wallets`)
    console.log(`   • ${data.evmTokenAllowlists.length} EVM token allowlists`)
    console.log(`   • ${data.solTokenAllowlists.length} Solana token allowlists`)
    console.log(`   • ${data.manualAssets.length} manual assets`)
    console.log(`   • ${data.priceCache.length} price cache entries`)
    console.log(`   • ${data.snapshots.length} snapshots`)
    console.log(`   • ${holdings.length} snapshot holdings`)
    console.log(`   • ${data.briefs.length} briefs`)
    console.log('═'.repeat(60))
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    throw error
  } finally {
    await postgres.$disconnect()
  }
}

seedFromBackup()
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
