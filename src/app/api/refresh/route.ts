import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS, RefreshResult, WalletError, AppSettings, WalletWithAllowlist } from '@/types'
import { fetchEvmWalletBalances } from '@/lib/evm'
import { fetchSolanaWalletBalances } from '@/lib/solana'
import { getBatchPrices } from '@/lib/coingecko'
import { determineLiquidityTier, determineExposureType } from '@/lib/calculations'

export async function POST() {
  try {
    // Check if we should create a new snapshot (every 2 days)
    const lastSnapshot = await prisma.snapshot.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        holdings: true
      }
    })

    if (lastSnapshot) {
      const hoursSinceLastSnapshot = (Date.now() - lastSnapshot.createdAt.getTime()) / (1000 * 60 * 60)
      const MIN_HOURS_BETWEEN_SNAPSHOTS = 48 // 2 days

      if (hoursSinceLastSnapshot < MIN_HOURS_BETWEEN_SNAPSHOTS) {
        return NextResponse.json({
          error: `Snapshots can only be created every 2 days. Last snapshot was ${Math.floor(hoursSinceLastSnapshot)} hours ago. Next snapshot allowed in ${Math.ceil(MIN_HOURS_BETWEEN_SNAPSHOTS - hoursSinceLastSnapshot)} hours.`,
          snapshot: lastSnapshot,
          nextSnapshotAllowedIn: Math.ceil(MIN_HOURS_BETWEEN_SNAPSHOTS - hoursSinceLastSnapshot)
        }, { status: 429 })
      }
    }

    const settingsRecords = await prisma.setting.findMany()
    const settingsObj: Partial<AppSettings> = {}
    for (const setting of settingsRecords) {
      try {
        settingsObj[setting.key as keyof AppSettings] = JSON.parse(setting.value)
      } catch {
        // ignore
      }
    }
    const settings = { ...DEFAULT_SETTINGS, ...settingsObj }

    const wallets = await prisma.wallet.findMany({
      include: {
        evmAllowlist: true,
        solAllowlist: true,
      }
    })

    const manualAssets = await prisma.manualAsset.findMany()

    const allHoldings: Array<{
      assetKey: string
      source: string
      walletId: string | null
      symbol: string
      quantity: number
      priceUsd: number | null
      valueAud: number
      liquidityTier: string
      exposureType: string
    }> = []

    const errors: WalletError[] = []

    const cryptoSymbols = new Set<string>()

    for (const wallet of wallets) {
      if (wallet.chainType === 'EVM') {
        try {
          const holdings = await fetchEvmWalletBalances(wallet as WalletWithAllowlist, settings.evmRpcUrls)

          for (const holding of holdings) {
            cryptoSymbols.add(holding.symbol)
          }

          allHoldings.push(...holdings.map(h => ({
            assetKey: h.assetKey,
            source: 'EVM',
            walletId: wallet.id,
            symbol: h.symbol,
            quantity: h.quantity,
            priceUsd: null,
            valueAud: 0,
            liquidityTier: determineLiquidityTier(h.symbol, settings),
            exposureType: determineExposureType(h.symbol, 'EVM', settings),
          })))
        } catch (error) {
          errors.push({
            walletId: wallet.id,
            address: wallet.address,
            chainType: 'EVM',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    for (const wallet of wallets.filter(w => w.chainType === 'SOL')) {
      const solAllowlistTokens = wallet.solAllowlist.map(t => ({
        symbol: t.symbol || t.mintAddress.slice(0, 8),
        coingeckoId: t.coingeckoId || null,
      }))

      for (const token of solAllowlistTokens) {
        cryptoSymbols.add(token.symbol)
      }
    }

    const prices = await getBatchPrices(
      Array.from(cryptoSymbols).map(symbol => ({ symbol }))
    )

    for (const wallet of wallets.filter(w => w.chainType === 'SOL')) {
      try {
        const holdings = await fetchSolanaWalletBalances(wallet as WalletWithAllowlist, settings.solanaRpcUrls, settings, prices)

        allHoldings.push(...holdings.map(h => ({
          assetKey: h.assetKey,
          source: 'SOL',
          walletId: wallet.id,
          symbol: h.symbol,
          quantity: h.quantity,
          priceUsd: null,
          valueAud: 0,
          liquidityTier: determineLiquidityTier(h.symbol, settings),
          exposureType: determineExposureType(h.symbol, 'SOL', settings),
        })))
      } catch (error) {
        errors.push({
          walletId: wallet.id,
          address: wallet.address,
          chainType: 'SOL',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    for (const holding of allHoldings) {
      const priceUsd = prices.get(holding.symbol) ?? null
      holding.priceUsd = priceUsd
      holding.valueAud = priceUsd ? priceUsd * settings.fxUsdAud * holding.quantity : 0
    }

    for (const asset of manualAssets) {
      const assetKey = asset.type === 'BANK' ? `bank:${asset.id}` : `collectible:${asset.id}`
      const quantity = asset.quantity !== null && asset.quantity !== undefined ? asset.quantity : 1
      const totalValue = asset.valueAud * quantity

      // Determine liquidity tier based on asset type
      let liquidityTier: string = 'SLOW'
      if (asset.type === 'BANK' || asset.type === 'CASH' || asset.type === 'STABLECOIN' || asset.type === 'GIFTCARD') {
        liquidityTier = 'IMMEDIATE'
      } else if (asset.type === 'CRYPTO') {
        liquidityTier = 'FAST'
      } else if (asset.type === 'SUPERANNUATION') {
        liquidityTier = 'SLOW' // locked, but still in SLOW category
      } else if (asset.type === 'CAR' || asset.type === 'COLLECTIBLE' || asset.type === 'NFT' || asset.type === 'REAL_ESTATE') {
        liquidityTier = 'SLOW'
      } else if (asset.type === 'MISC') {
        liquidityTier = 'SLOW' // Miscellaneous items default to slow
      }

      allHoldings.push({
        assetKey,
        source: asset.type,
        walletId: null,
        symbol: asset.name,
        quantity,
        priceUsd: null,
        valueAud: totalValue,
        liquidityTier,
        exposureType: determineExposureType(asset.name, asset.type, settings),
      })
    }

    const totalAud = allHoldings.reduce((sum, h) => sum + h.valueAud, 0)

    const cashAud = allHoldings
      .filter(h => h.source === 'BANK' || h.liquidityTier === 'IMMEDIATE')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const cryptoAud = allHoldings
      .filter(h => h.source === 'EVM' || h.source === 'SOL')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const collectiblesAud = allHoldings
      .filter(h => h.source === 'COLLECTIBLE')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const evmTotalAud = allHoldings
      .filter(h => h.source === 'EVM')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const solTotalAud = allHoldings
      .filter(h => h.source === 'SOL')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const manualTotalAud = allHoldings
      .filter(h => h.source === 'BANK' || h.source === 'COLLECTIBLE')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const snapshot = await prisma.snapshot.create({
      data: {
        fxUsdAud: settings.fxUsdAud,
        totalAud,
        cashAud,
        cryptoAud,
        collectiblesAud,
        evmTotalAud,
        solTotalAud,
        manualTotalAud,
        holdings: {
          create: allHoldings,
        },
      },
      include: {
        holdings: true,
      },
    })

    const result: RefreshResult = {
      snapshot: snapshot as any,
      errors,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Refresh failed:', error)
    return NextResponse.json(
      { error: 'Refresh failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
