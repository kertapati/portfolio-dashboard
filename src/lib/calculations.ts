import {
  AppSettings,
  LiquidityTier,
  LiquidityBucket,
  StressScenario,
  SnapshotWithHoldings,
  TopExposure,
  ChainBreakdown,
  CustodyBreakdown,
  UnpricedAsset,
} from '@/types'

export function calculateLiquidityBuckets(
  snapshot: SnapshotWithHoldings,
  settings: AppSettings
): LiquidityBucket[] {
  const buckets: Record<LiquidityTier, number> = {
    IMMEDIATE: 0,
    FAST: 0,
    SLOW: 0,
  }

  for (const holding of snapshot.holdings) {
    buckets[holding.liquidityTier as LiquidityTier] += holding.valueAud
  }

  const haircuts = {
    IMMEDIATE: settings.haircutImmediate,
    FAST: settings.haircutFast,
    SLOW: settings.haircutSlow,
  }

  return Object.entries(buckets).map(([tier, assetsAud]) => {
    const haircut = haircuts[tier as LiquidityTier]
    const afterHaircut = assetsAud * (1 - haircut)
    const runwayMonths = settings.monthlyBurnAud > 0
      ? afterHaircut / settings.monthlyBurnAud
      : 0

    return {
      tier: tier as LiquidityTier,
      assetsAud,
      afterHaircut,
      runwayMonths,
    }
  })
}

export function calculateStressScenarios(
  snapshot: SnapshotWithHoldings,
  settings: AppSettings
): StressScenario[] {
  const cryptoHoldings = snapshot.holdings.filter(
    h => h.source === 'EVM' || h.source === 'SOL'
  )

  const largestCryptoHolding = cryptoHoldings.reduce((max, h) =>
    h.valueAud > max.valueAud ? h : max
  , { valueAud: 0, symbol: '' })

  const scenarios: StressScenario[] = []

  const crypto30 = applyStressScenario(snapshot, settings, h =>
    (h.source === 'EVM' || h.source === 'SOL') ? h.valueAud * 0.7 : h.valueAud
  )
  scenarios.push({
    name: 'Crypto -30%',
    netWorth: crypto30.netWorth,
    immediateLiquidity: crypto30.immediateLiquidity,
    runway: crypto30.runway,
  })

  const crypto50 = applyStressScenario(snapshot, settings, h =>
    (h.source === 'EVM' || h.source === 'SOL') ? h.valueAud * 0.5 : h.valueAud
  )
  scenarios.push({
    name: 'Crypto -50%',
    netWorth: crypto50.netWorth,
    immediateLiquidity: crypto50.immediateLiquidity,
    runway: crypto50.runway,
  })

  const largest60 = applyStressScenario(snapshot, settings, h =>
    h.symbol === largestCryptoHolding.symbol ? h.valueAud * 0.4 : h.valueAud
  )
  scenarios.push({
    name: `Largest (${largestCryptoHolding.symbol}) -60%`,
    netWorth: largest60.netWorth,
    immediateLiquidity: largest60.immediateLiquidity,
    runway: largest60.runway,
  })

  const liquidityFreeze = applyStressScenario(snapshot, settings, h => h.valueAud, true)
  scenarios.push({
    name: 'Liquidity freeze (SLOW → 70% haircut)',
    netWorth: snapshot.totalAud,
    immediateLiquidity: liquidityFreeze.immediateLiquidity,
    runway: liquidityFreeze.runway,
  })

  return scenarios
}

function applyStressScenario(
  snapshot: SnapshotWithHoldings,
  settings: AppSettings,
  valueAdjust: (h: any) => number,
  freezeSlow: boolean = false
): { netWorth: number; immediateLiquidity: number; runway: number } {
  const adjustedHoldings = snapshot.holdings.map(h => ({
    ...h,
    valueAud: valueAdjust(h),
  }))

  const netWorth = adjustedHoldings.reduce((sum, h) => sum + h.valueAud, 0)

  const haircuts = {
    IMMEDIATE: settings.haircutImmediate,
    FAST: settings.haircutFast,
    SLOW: freezeSlow ? 0.7 : settings.haircutSlow,
  }

  let immediateLiquidity = 0
  for (const h of adjustedHoldings) {
    if (h.liquidityTier === 'IMMEDIATE' || h.liquidityTier === 'FAST') {
      const haircut = haircuts[h.liquidityTier as LiquidityTier]
      immediateLiquidity += h.valueAud * (1 - haircut)
    }
  }

  const runway = settings.monthlyBurnAud > 0
    ? immediateLiquidity / settings.monthlyBurnAud
    : 0

  return { netWorth, immediateLiquidity, runway }
}

export function calculateTopExposures(
  snapshot: SnapshotWithHoldings,
  limit: number = 10
): TopExposure[] {
  const grouped = new Map<string, { valueAud: number; symbol: string }>()

  for (const holding of snapshot.holdings) {
    const existing = grouped.get(holding.assetKey)
    if (existing) {
      existing.valueAud += holding.valueAud
    } else {
      grouped.set(holding.assetKey, {
        valueAud: holding.valueAud,
        symbol: holding.symbol,
      })
    }
  }

  const sorted = Array.from(grouped.entries())
    .map(([assetKey, data]) => ({
      assetKey,
      symbol: data.symbol,
      valueAud: data.valueAud,
      percentOfPortfolio: snapshot.totalAud > 0 ? data.valueAud / snapshot.totalAud : 0,
    }))
    .sort((a, b) => b.valueAud - a.valueAud)

  return sorted.slice(0, limit)
}

export function calculateChainBreakdown(snapshot: SnapshotWithHoldings): ChainBreakdown[] {
  return [
    {
      chain: 'EVM',
      valueAud: snapshot.evmTotalAud,
      percentOfPortfolio: snapshot.totalAud > 0 ? snapshot.evmTotalAud / snapshot.totalAud : 0,
    },
    {
      chain: 'Solana',
      valueAud: snapshot.solTotalAud,
      percentOfPortfolio: snapshot.totalAud > 0 ? snapshot.solTotalAud / snapshot.totalAud : 0,
    },
    {
      chain: 'Manual',
      valueAud: snapshot.manualTotalAud,
      percentOfPortfolio: snapshot.totalAud > 0 ? snapshot.manualTotalAud / snapshot.totalAud : 0,
    },
  ].filter(c => c.valueAud > 0)
}

export function calculateCustodyBreakdown(
  snapshot: SnapshotWithHoldings,
  wallets: Array<{ id: string; label: string | null; address: string }>
): CustodyBreakdown[] {
  const grouped = new Map<string | null, number>()

  for (const holding of snapshot.holdings) {
    const existing = grouped.get(holding.walletId || null)
    if (existing !== undefined) {
      grouped.set(holding.walletId || null, existing + holding.valueAud)
    } else {
      grouped.set(holding.walletId || null, holding.valueAud)
    }
  }

  return Array.from(grouped.entries())
    .map(([walletId, valueAud]) => {
      const wallet = wallets.find(w => w.id === walletId)
      const label = walletId === null
        ? 'Manual Assets'
        : wallet?.label || wallet?.address.slice(0, 8) || 'Unknown'

      return {
        walletId,
        label,
        valueAud,
        percentOfPortfolio: snapshot.totalAud > 0 ? valueAud / snapshot.totalAud : 0,
      }
    })
    .sort((a, b) => b.valueAud - a.valueAud)
}

export function getUnpricedAssets(snapshot: SnapshotWithHoldings): UnpricedAsset[] {
  const unpriced = snapshot.holdings.filter(h => h.priceUsd === null || h.priceUsd === 0)

  const grouped = new Map<string, UnpricedAsset>()

  for (const holding of unpriced) {
    const existing = grouped.get(holding.assetKey)
    if (existing) {
      existing.quantity += holding.quantity
    } else {
      grouped.set(holding.assetKey, {
        assetKey: holding.assetKey,
        symbol: holding.symbol,
        quantity: holding.quantity,
        source: holding.source,
      })
    }
  }

  return Array.from(grouped.values())
}

export function determineLiquidityTier(
  symbol: string,
  settings: AppSettings
): LiquidityTier {
  if (settings.stablecoins.includes(symbol)) {
    return 'IMMEDIATE'
  }
  if (settings.majorTokens.includes(symbol)) {
    return 'FAST'
  }
  return 'SLOW'
}

export type ExposureType = 'BTC' | 'ETH' | 'JLP' | 'STABLECOIN' | 'CRYPTO' | 'EQUITY' | 'DEFI' | 'CASH' | 'COLLECTIBLE' | 'REAL_ESTATE' | 'NFT' | 'CAR' | 'OTHERS'

export function determineExposureType(
  symbol: string,
  source: string,
  settings: AppSettings
): ExposureType {
  // Check for specific exposure types first (BTC, ETH, JLP)
  const symbolUpper = symbol.toUpperCase()

  if (symbolUpper === 'BTC' || symbolUpper === 'WBTC') {
    return 'BTC'
  }

  if (symbolUpper === 'ETH' || symbolUpper === 'WETH') {
    return 'ETH'
  }

  if (symbolUpper === 'JLP') {
    return 'JLP'
  }

  // Stablecoins
  const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX', 'BUSD', 'TUSD', 'USDP', 'GUSD']
  if (stablecoins.includes(symbolUpper)) {
    return 'STABLECOIN'
  }

  // Cash (bank accounts, cash, giftcards)
  if (source === 'BANK' || source === 'CASH' || source === 'GIFTCARD') {
    return 'CASH'
  }

  // Real Estate
  if (source === 'REAL_ESTATE') {
    return 'REAL_ESTATE'
  }

  // NFTs
  if (source === 'NFT') {
    return 'NFT'
  }

  // Cars
  if (source === 'CAR') {
    return 'CAR'
  }

  // Collectibles (physical items)
  if (source === 'COLLECTIBLE') {
    return 'COLLECTIBLE'
  }

  // Equities (stocks, tokenized assets)
  if (source === 'EQUITIES' || source === 'SUPERANNUATION') {
    return 'EQUITY'
  }

  // Miscellaneous / Others
  if (source === 'MISC') {
    return 'OTHERS'
  }

  // Major crypto assets (excluding BTC, ETH which have their own exposure types)
  const majorCrypto = ['SOL', 'BNB', 'MATIC', 'AVAX', 'HYPE']
  if (majorCrypto.includes(symbolUpper)) {
    return 'CRYPTO'
  }

  // Check if it's a stablecoin source type (manual stablecoin assets)
  if (source === 'STABLECOIN') {
    return 'STABLECOIN'
  }

  // Default to CRYPTO for all blockchain assets
  if (source === 'EVM' || source === 'SOL' || source === 'HYPE' || source === 'CRYPTO') {
    return 'CRYPTO'
  }

  // Everything else defaults to CRYPTO
  return 'CRYPTO'
}
