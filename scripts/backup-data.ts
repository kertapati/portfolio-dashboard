import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface BackupData {
  exportedAt: string
  databaseType: 'sqlite'
  version: string
  data: {
    settings: any[]
    wallets: any[]
    evmTokenAllowlists: any[]
    solTokenAllowlists: any[]
    manualAssets: any[]
    priceCache: any[]
    snapshots: any[]
    snapshotHoldings: any[]
    briefs: any[]
  }
  stats: {
    totalSnapshots: number
    totalHoldings: number
    totalManualAssets: number
    totalWallets: number
    totalBriefs: number
    oldestSnapshot: string | null
    latestSnapshot: string | null
  }
}

async function backupAllData() {
  console.log('🔄 Starting portfolio data backup...\n')

  try {
    // Fetch all data from database
    console.log('📊 Fetching settings...')
    const settings = await prisma.setting.findMany()

    console.log('👛 Fetching wallets...')
    const wallets = await prisma.wallet.findMany({
      include: {
        evmAllowlist: true,
        solAllowlist: true,
      },
    })

    console.log('🪙 Fetching manual assets...')
    const manualAssets = await prisma.manualAsset.findMany()

    console.log('💰 Fetching price cache...')
    const priceCache = await prisma.priceCache.findMany()

    console.log('📸 Fetching snapshots...')
    const snapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'asc' },
    })

    console.log('📈 Fetching snapshot holdings...')
    const snapshotHoldings = await prisma.snapshotHolding.findMany({
      orderBy: { snapshotId: 'asc' },
    })

    console.log('📋 Fetching briefs...')
    const briefs = await prisma.brief.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Extract allowlists separately for cleaner JSON
    const evmTokenAllowlists = wallets.flatMap((w) => w.evmAllowlist)
    const solTokenAllowlists = wallets.flatMap((w) => w.solAllowlist)

    // Remove nested allowlists from wallets (already extracted above)
    const walletsClean = wallets.map(({ evmAllowlist, solAllowlist, ...wallet }) => wallet)

    // Calculate stats
    const oldestSnapshot = snapshots.length > 0 ? snapshots[0].createdAt.toISOString() : null
    const latestSnapshot =
      snapshots.length > 0 ? snapshots[snapshots.length - 1].createdAt.toISOString() : null

    const backup: BackupData = {
      exportedAt: new Date().toISOString(),
      databaseType: 'sqlite',
      version: '1.0',
      data: {
        settings,
        wallets: walletsClean,
        evmTokenAllowlists,
        solTokenAllowlists,
        manualAssets,
        priceCache,
        snapshots,
        snapshotHoldings,
        briefs,
      },
      stats: {
        totalSnapshots: snapshots.length,
        totalHoldings: snapshotHoldings.length,
        totalManualAssets: manualAssets.length,
        totalWallets: wallets.length,
        totalBriefs: briefs.length,
        oldestSnapshot,
        latestSnapshot,
      },
    }

    // Write to file
    const backupPath = path.join(process.cwd(), 'backup_portfolio.json')
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')

    console.log('\n✅ Backup completed successfully!\n')
    console.log('📁 Backup saved to:', backupPath)
    console.log('\n📊 Backup Statistics:')
    console.log(`   • Settings: ${backup.data.settings.length}`)
    console.log(`   • Wallets: ${backup.stats.totalWallets}`)
    console.log(`   • EVM Token Allowlists: ${backup.data.evmTokenAllowlists.length}`)
    console.log(`   • Solana Token Allowlists: ${backup.data.solTokenAllowlists.length}`)
    console.log(`   • Manual Assets: ${backup.stats.totalManualAssets}`)
    console.log(`   • Price Cache Entries: ${backup.data.priceCache.length}`)
    console.log(`   • Snapshots: ${backup.stats.totalSnapshots}`)
    console.log(`   • Snapshot Holdings: ${backup.stats.totalHoldings}`)
    console.log(`   • Briefs: ${backup.stats.totalBriefs}`)
    if (oldestSnapshot && latestSnapshot) {
      console.log(
        `   • Snapshot Range: ${new Date(oldestSnapshot).toLocaleDateString()} → ${new Date(latestSnapshot).toLocaleDateString()}`
      )
    }

    const fileSizeBytes = fs.statSync(backupPath).size
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2)
    console.log(`\n💾 Backup file size: ${fileSizeMB} MB`)
  } catch (error) {
    console.error('❌ Error during backup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run backup
backupAllData()
  .then(() => {
    console.log('\n🎉 Backup process completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Backup process failed:', error)
    process.exit(1)
  })
