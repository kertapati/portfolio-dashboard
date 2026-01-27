import { SnapshotWithHoldings } from '@/types'
import { formatCurrency, formatPercent, formatDate } from './utils'

export function generateBrief(
  current: SnapshotWithHoldings,
  previous: SnapshotWithHoldings | null
): string {
  const sections: string[] = []

  sections.push(`## Portfolio Brief — ${formatDate(current.createdAt)}`)
  sections.push('')

  sections.push('### Net Worth')
  sections.push(`- Current: ${formatCurrency(current.totalAud)}`)

  if (previous) {
    const change = current.totalAud - previous.totalAud
    const percentChange = previous.totalAud > 0 ? change / previous.totalAud : 0

    sections.push(`- 7 days ago: ${formatCurrency(previous.totalAud)}`)
    sections.push(`- Change: ${formatCurrency(change)} (${formatPercent(percentChange)})`)
  } else {
    sections.push('- No previous snapshot for comparison')
  }
  sections.push('')

  if (previous) {
    sections.push('### Top Movers')

    const currentByAsset = new Map<string, number>()
    for (const h of current.holdings) {
      currentByAsset.set(h.assetKey, (currentByAsset.get(h.assetKey) || 0) + h.valueAud)
    }

    const previousByAsset = new Map<string, number>()
    for (const h of previous.holdings) {
      previousByAsset.set(h.assetKey, (previousByAsset.get(h.assetKey) || 0) + h.valueAud)
    }

    const allKeys = new Set([...currentByAsset.keys(), ...previousByAsset.keys()])
    const movers = Array.from(allKeys).map(key => {
      const currentVal = currentByAsset.get(key) || 0
      const previousVal = previousByAsset.get(key) || 0
      const change = currentVal - previousVal
      const symbol = current.holdings.find(h => h.assetKey === key)?.symbol ||
                     previous.holdings.find(h => h.assetKey === key)?.symbol ||
                     key

      return { symbol, change: Math.abs(change), changeRaw: change }
    })

    movers.sort((a, b) => b.change - a.change)
    const top5 = movers.slice(0, 5)

    for (const mover of top5) {
      const sign = mover.changeRaw >= 0 ? '+' : ''
      sections.push(`- ${mover.symbol}: ${sign}${formatCurrency(mover.changeRaw)}`)
    }
    sections.push('')
  }

  sections.push('### Concentration Check')

  const topExposures = [...current.holdings]
    .reduce((acc, h) => {
      const existing = acc.find(x => x.assetKey === h.assetKey)
      if (existing) {
        existing.valueAud += h.valueAud
      } else {
        acc.push({ assetKey: h.assetKey, symbol: h.symbol, valueAud: h.valueAud })
      }
      return acc
    }, [] as Array<{ assetKey: string; symbol: string; valueAud: number }>)
    .sort((a, b) => b.valueAud - a.valueAud)

  const largestPercent = current.totalAud > 0 ? topExposures[0]?.valueAud / current.totalAud : 0
  const top3Total = topExposures.slice(0, 3).reduce((sum, e) => sum + e.valueAud, 0)
  const top3Percent = current.totalAud > 0 ? top3Total / current.totalAud : 0

  if (largestPercent > 0.25) {
    sections.push(`- WARNING: ${topExposures[0].symbol} represents ${formatPercent(largestPercent)} of portfolio`)
  }

  if (top3Percent > 0.50) {
    sections.push(`- WARNING: Top 3 assets represent ${formatPercent(top3Percent)} of portfolio`)
  }

  if (largestPercent <= 0.25 && top3Percent <= 0.50) {
    sections.push('- Concentration levels are healthy')
  }
  sections.push('')

  sections.push('### Liquidity Runway')

  const immediateAndFast = current.holdings
    .filter(h => h.liquidityTier === 'IMMEDIATE' || h.liquidityTier === 'FAST')
    .reduce((sum, h) => sum + h.valueAud, 0)

  const runway = immediateAndFast / 5000

  sections.push(`- Current: ${runway.toFixed(1)} months (Immediate + Fast, assuming $5,000 AUD monthly burn)`)

  if (previous) {
    const prevImmediateAndFast = previous.holdings
      .filter(h => h.liquidityTier === 'IMMEDIATE' || h.liquidityTier === 'FAST')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const prevRunway = prevImmediateAndFast / 5000
    const runwayChange = runway - prevRunway

    sections.push(`- Change from last week: ${runwayChange >= 0 ? '+' : ''}${runwayChange.toFixed(1)} months`)
  }
  sections.push('')

  const unpriced = current.holdings.filter(h => h.priceUsd === null || h.priceUsd === 0)
  const unpricedCount = new Set(unpriced.map(h => h.assetKey)).size

  sections.push('### Unpriced Assets')
  sections.push(`- Count: ${unpricedCount}`)

  if (previous) {
    const prevUnpriced = previous.holdings.filter(h => h.priceUsd === null || h.priceUsd === 0)
    const prevUnpricedCount = new Set(prevUnpriced.map(h => h.assetKey)).size
    const change = unpricedCount - prevUnpricedCount

    sections.push(`- Change from last week: ${change >= 0 ? '+' : ''}${change}`)
  }

  if (unpricedCount > 0) {
    const uniqueUnpriced = new Set(unpriced.map(h => h.symbol))
    sections.push(`- ${Array.from(uniqueUnpriced).join(', ')}`)
  }
  sections.push('')

  sections.push('### Risk Notes')

  const cryptoPercent = current.totalAud > 0 ? current.cryptoAud / current.totalAud : 0
  if (cryptoPercent > 0.7) {
    sections.push(`- WARNING: High crypto concentration (${formatPercent(cryptoPercent)})`)
  }

  if (runway < 6) {
    sections.push(`- WARNING: Low runway (${runway.toFixed(1)} months)`)
  }

  if (largestPercent > 0.3) {
    sections.push(`- WARNING: Single-asset concentration risk (${topExposures[0].symbol}: ${formatPercent(largestPercent)})`)
  }

  if (cryptoPercent <= 0.7 && runway >= 6 && largestPercent <= 0.3) {
    sections.push('- No major risk flags detected')
  }

  return sections.join('\n')
}
