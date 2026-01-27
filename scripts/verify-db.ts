import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const settings = await prisma.setting.count()
  const wallets = await prisma.wallet.count()
  const manualAssets = await prisma.manualAsset.count()
  const snapshots = await prisma.snapshot.count()
  const holdings = await prisma.snapshotHolding.count()
  const briefs = await prisma.brief.count()
  
  console.log('\n📊 PostgreSQL Data Verification:')
  console.log(`   ✅ Settings: ${settings}`)
  console.log(`   ✅ Wallets: ${wallets}`)
  console.log(`   ✅ Manual Assets: ${manualAssets}`)
  console.log(`   ✅ Snapshots: ${snapshots}`)
  console.log(`   ✅ Holdings: ${holdings}`)
  console.log(`   ✅ Briefs: ${briefs}\n`)
  
  await prisma.$disconnect()
}

check()
