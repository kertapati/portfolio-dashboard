/**
 * Portfolio Health Score Utilities
 *
 * Functions to calculate various health metrics for a portfolio:
 * - Liquidity Score
 * - Concentration Score
 * - Diversification Score
 * - Volatility Score
 */

interface Holding {
  symbol: string
  valueAud: number
  exposureType: string
  liquidityTier: string
  source: string
}

interface Snapshot {
  id: string
  createdAt: string
  totalAud: number
  holdings: Holding[]
}

export interface HealthScores {
  liquidity: {
    score: number
    explanation: string
    monthsRunway: number
    liquidPercent: number
  }
  concentration: {
    score: number
    explanation: string
    topHoldingPercent: number
    top3Percent: number
  }
  diversification: {
    score: number
    explanation: string
    assetClassCount: number
    topClassPercent: number
  }
  volatility: {
    score: number
    explanation: string
    maxDrawdown: number
    monthlyVariance: number
  }
  overall: {
    score: number
    color: 'green' | 'yellow' | 'red'
  }
}

/**
 * Calculate Liquidity Score (0-100)
 * Based on months of runway and % in liquid assets
 */
export function calculateLiquidityScore(
  holdings: Holding[],
  totalValue: number,
  monthlyBurn: number
): HealthScores['liquidity'] {
  // Calculate liquid assets (IMMEDIATE liquidity tier)
  const liquidAssets = holdings
    .filter(h => h.liquidityTier === 'IMMEDIATE')
    .reduce((sum, h) => sum + h.valueAud, 0)

  const liquidPercent = totalValue > 0 ? (liquidAssets / totalValue) * 100 : 0

  // Calculate months of runway
  const monthsRunway = monthlyBurn > 0 ? liquidAssets / monthlyBurn : 999

  // Scoring logic
  let score = 0
  let explanation = ''

  if (monthsRunway >= 24 && liquidPercent >= 30) {
    score = 80 + Math.min(20, Math.floor((monthsRunway - 24) / 12 * 10))
    explanation = `Excellent liquidity with ${Math.floor(monthsRunway)} months runway`
  } else if (monthsRunway >= 12 || liquidPercent >= 20) {
    score = 60 + Math.min(19, Math.floor(monthsRunway - 12))
    explanation = `Strong liquidity with ${Math.floor(monthsRunway)} months runway`
  } else if (monthsRunway >= 6) {
    score = 40 + Math.min(19, Math.floor((monthsRunway - 6) * 3))
    explanation = `Moderate liquidity with ${Math.floor(monthsRunway)} months runway`
  } else {
    score = Math.min(39, Math.floor(monthsRunway * 6))
    explanation = `Low liquidity with only ${Math.floor(monthsRunway)} months runway`
  }

  return {
    score: Math.round(score),
    explanation,
    monthsRunway: Math.floor(monthsRunway),
    liquidPercent: Math.round(liquidPercent * 10) / 10,
  }
}

/**
 * Calculate Concentration Score (0-100)
 * Based on top holding % and top 3 holdings %
 */
export function calculateConcentrationScore(holdings: Holding[], totalValue: number): HealthScores['concentration'] {
  if (holdings.length === 0 || totalValue === 0) {
    return {
      score: 100,
      explanation: 'No holdings to analyze',
      topHoldingPercent: 0,
      top3Percent: 0,
    }
  }

  // Sort by value descending
  const sorted = [...holdings].sort((a, b) => b.valueAud - a.valueAud)

  const topHoldingPercent = (sorted[0].valueAud / totalValue) * 100
  const top3Percent = sorted.slice(0, 3).reduce((sum, h) => sum + h.valueAud, 0) / totalValue * 100

  // Scoring logic
  let score = 0
  let explanation = ''

  if (topHoldingPercent <= 15 && top3Percent <= 40) {
    score = 80 + Math.min(20, Math.floor((15 - topHoldingPercent) * 2))
    explanation = `Well-diversified holdings, top asset is ${Math.round(topHoldingPercent)}%`
  } else if (topHoldingPercent <= 25 && top3Percent <= 50) {
    score = 60 + Math.min(19, Math.floor((25 - topHoldingPercent) * 2))
    explanation = `Moderate concentration, top asset is ${Math.round(topHoldingPercent)}%`
  } else if (topHoldingPercent <= 35 || top3Percent <= 65) {
    score = 40 + Math.min(19, Math.floor((35 - topHoldingPercent)))
    explanation = `High concentration, top asset is ${Math.round(topHoldingPercent)}%`
  } else {
    score = Math.max(0, Math.floor((50 - topHoldingPercent) * 2))
    explanation = `Very high concentration, top asset is ${Math.round(topHoldingPercent)}%`
  }

  return {
    score: Math.round(score),
    explanation,
    topHoldingPercent: Math.round(topHoldingPercent * 10) / 10,
    top3Percent: Math.round(top3Percent * 10) / 10,
  }
}

/**
 * Calculate Diversification Score (0-100)
 * Based on number of asset classes and distribution
 */
export function calculateDiversificationScore(holdings: Holding[], totalValue: number): HealthScores['diversification'] {
  if (holdings.length === 0 || totalValue === 0) {
    return {
      score: 100,
      explanation: 'No holdings to analyze',
      assetClassCount: 0,
      topClassPercent: 0,
    }
  }

  // Group by exposure type
  const exposureGroups: Record<string, number> = {}
  holdings.forEach(h => {
    const type = h.exposureType || 'CRYPTO'
    exposureGroups[type] = (exposureGroups[type] || 0) + h.valueAud
  })

  const assetClassCount = Object.keys(exposureGroups).length
  const topClassValue = Math.max(...Object.values(exposureGroups))
  const topClassPercent = (topClassValue / totalValue) * 100

  // Count chains for blockchain assets
  const chains = new Set(
    holdings
      .filter(h => h.source === 'EVM' || h.source === 'SOL' || h.source === 'HYPE')
      .map(h => h.source)
  )
  const hasMultipleChains = chains.size > 1

  // Scoring logic
  let score = 0
  let explanation = ''

  if (assetClassCount >= 5 && topClassPercent <= 50) {
    score = 80 + Math.min(20, (assetClassCount - 5) * 4)
    explanation = `Excellent diversification across ${assetClassCount} asset classes`
  } else if (assetClassCount >= 4 && topClassPercent <= 60) {
    score = 70 + Math.min(9, (assetClassCount - 4) * 5 + (hasMultipleChains ? 5 : 0))
    explanation = `Very good diversification with ${assetClassCount} asset classes`
  } else if (assetClassCount >= 3 && topClassPercent <= 70) {
    score = 55 + Math.min(14, (assetClassCount - 3) * 7 + (hasMultipleChains ? 5 : 0))
    explanation = `Good diversification with ${assetClassCount} asset classes`
  } else if (assetClassCount >= 2 && topClassPercent <= 80) {
    score = 35 + Math.min(19, (assetClassCount - 2) * 10 + (100 - topClassPercent) / 5)
    explanation = `Moderate diversification across ${assetClassCount} asset classes`
  } else if (assetClassCount >= 2) {
    score = 20 + Math.min(14, (assetClassCount - 2) * 5)
    explanation = `Limited diversification, ${Math.round(topClassPercent)}% concentrated in one class`
  } else {
    score = Math.max(0, 20 - Math.floor((topClassPercent - 80) / 2))
    explanation = `Very limited: only ${assetClassCount} asset class with ${Math.round(topClassPercent)}% concentration`
  }

  return {
    score: Math.round(score),
    explanation,
    assetClassCount,
    topClassPercent: Math.round(topClassPercent * 10) / 10,
  }
}

/**
 * Calculate Volatility Score (0-100)
 * Based on recent drawdowns and monthly variance
 */
export function calculateVolatilityScore(snapshots: Snapshot[]): HealthScores['volatility'] {
  if (snapshots.length < 2) {
    return {
      score: 100,
      explanation: 'Insufficient history to calculate volatility',
      maxDrawdown: 0,
      monthlyVariance: 0,
    }
  }

  const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Calculate max drawdown
  let peak = sorted[0].totalAud
  let maxDrawdown = 0

  for (const snapshot of sorted) {
    if (snapshot.totalAud > peak) {
      peak = snapshot.totalAud
    }
    const drawdown = peak > 0 ? ((peak - snapshot.totalAud) / peak) * 100 : 0
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  // Calculate monthly variance (using recent snapshots)
  const recentSnapshots = sorted.slice(-30) // Last 30 snapshots
  const returns: number[] = []
  for (let i = 1; i < recentSnapshots.length; i++) {
    const ret = recentSnapshots[i - 1].totalAud > 0
      ? ((recentSnapshots[i].totalAud - recentSnapshots[i - 1].totalAud) / recentSnapshots[i - 1].totalAud) * 100
      : 0
    returns.push(ret)
  }

  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0
  const monthlyVariance = Math.sqrt(variance)

  // Scoring logic
  let score = 0
  let explanation = ''

  if (maxDrawdown < 15 && monthlyVariance < 10) {
    score = 80 + Math.min(20, Math.floor((15 - maxDrawdown) * 2))
    explanation = `Low volatility with ${Math.round(maxDrawdown)}% max drawdown`
  } else if (maxDrawdown < 25 && monthlyVariance < 15) {
    score = 60 + Math.min(19, Math.floor((25 - maxDrawdown)))
    explanation = `Moderate volatility with ${Math.round(maxDrawdown)}% max drawdown`
  } else if (maxDrawdown < 40 && monthlyVariance < 20) {
    score = 40 + Math.min(19, Math.floor((40 - maxDrawdown) / 2))
    explanation = `High volatility with ${Math.round(maxDrawdown)}% max drawdown`
  } else {
    score = Math.max(0, 40 - Math.floor((maxDrawdown - 40) / 2))
    explanation = `Very high volatility with ${Math.round(maxDrawdown)}% max drawdown`
  }

  return {
    score: Math.round(score),
    explanation,
    maxDrawdown: Math.round(maxDrawdown * 10) / 10,
    monthlyVariance: Math.round(monthlyVariance * 10) / 10,
  }
}

/**
 * Calculate overall portfolio health scores
 */
export function calculateHealthScores(
  holdings: Holding[],
  totalValue: number,
  monthlyBurn: number,
  snapshots: Snapshot[]
): HealthScores {
  const liquidity = calculateLiquidityScore(holdings, totalValue, monthlyBurn)
  const concentration = calculateConcentrationScore(holdings, totalValue)
  const diversification = calculateDiversificationScore(holdings, totalValue)
  const volatility = calculateVolatilityScore(snapshots)

  // Calculate weighted average (25% each)
  const overall = Math.round(
    (liquidity.score * 0.25 +
      concentration.score * 0.25 +
      diversification.score * 0.25 +
      volatility.score * 0.25)
  )

  let color: 'green' | 'yellow' | 'red' = 'green'
  if (overall < 50) {
    color = 'red'
  } else if (overall < 70) {
    color = 'yellow'
  }

  return {
    liquidity,
    concentration,
    diversification,
    volatility,
    overall: {
      score: overall,
      color,
    },
  }
}

/**
 * Generate risk narrative based on portfolio allocation
 */
export function generateRiskNarrative(holdings: Holding[], totalValue: number): string {
  if (holdings.length === 0 || totalValue === 0) {
    return 'No holdings to analyze.'
  }

  // Group by exposure type
  const exposureGroups: Record<string, number> = {}
  holdings.forEach(h => {
    const type = h.exposureType || 'CRYPTO'
    exposureGroups[type] = (exposureGroups[type] || 0) + h.valueAud
  })

  const cryptoPercent = ((exposureGroups['CRYPTO'] || 0) / totalValue) * 100
  const stablePercent = ((exposureGroups['STABLECOIN'] || 0) / totalValue) * 100
  const equityPercent = ((exposureGroups['EQUITY'] || 0) / totalValue) * 100
  const cashPercent = ((exposureGroups['CASH'] || 0) / totalValue) * 100

  // Find top holding
  const sorted = [...holdings].sort((a, b) => b.valueAud - a.valueAud)
  const topHolding = sorted[0]
  const topHoldingPercent = (topHolding.valueAud / totalValue) * 100

  // Generate narrative based on allocation
  const narratives: string[] = []

  // Crypto concentration
  if (cryptoPercent > 70) {
    narratives.push('continued crypto bull market and risk-on environment')
  } else if (cryptoPercent > 40) {
    narratives.push('moderate crypto exposure with upside in digital assets')
  }

  // Stablecoin positioning
  if (stablePercent > 40) {
    narratives.push('market uncertainty or anticipated buying opportunity')
  } else if (stablePercent > 20) {
    narratives.push('balanced liquidity for opportunistic deployment')
  }

  // Traditional assets
  if (equityPercent > 20) {
    narratives.push('correlation between traditional and crypto markets remaining low')
  }

  // Single asset concentration
  if (topHoldingPercent > 30) {
    narratives.push(`outsized performance from ${topHolding.symbol}, with concentrated downside risk`)
  }

  // Cash heavy
  if (cashPercent > 50) {
    narratives.push('capital preservation and defensive positioning')
  }

  // Default if no strong signals
  if (narratives.length === 0) {
    narratives.push('balanced market exposure across multiple asset classes')
  }

  return 'Your portfolio is currently positioned for: ' + narratives.join(', ') + '.'
}

/**
 * Generate action items based on health scores and holdings
 */
export function generateActionItems(
  holdings: Holding[],
  totalValue: number,
  scores: HealthScores
): string[] {
  const items: string[] = []

  // Liquidity concerns
  if (scores.liquidity.score < 50) {
    items.push(`Liquidity is low (${scores.liquidity.monthsRunway} months runway) — consider increasing stablecoin allocation`)
  }

  // Concentration warnings
  if (scores.concentration.score < 60) {
    const sorted = [...holdings].sort((a, b) => b.valueAud - a.valueAud)
    const topHolding = sorted[0]
    const topPercent = (topHolding.valueAud / totalValue) * 100
    if (topPercent > 25) {
      items.push(`Consider taking profits on ${topHolding.symbol} — it represents ${Math.round(topPercent)}% of portfolio`)
    }
  }

  // Diversification suggestions
  if (scores.diversification.score < 50) {
    const exposureGroups: Record<string, number> = {}
    holdings.forEach(h => {
      const type = h.exposureType || 'CRYPTO'
      exposureGroups[type] = (exposureGroups[type] || 0) + h.valueAud
    })

    const cryptoPercent = ((exposureGroups['CRYPTO'] || 0) / totalValue) * 100
    const hasNonCrypto = Object.keys(exposureGroups).some(k => k !== 'CRYPTO' && k !== 'STABLECOIN')

    if (cryptoPercent > 70 && !hasNonCrypto) {
      items.push('Portfolio has no non-crypto assets — consider diversification for risk management')
    }
  }

  // Volatility concerns
  if (scores.volatility.score < 50 && scores.liquidity.score < 70) {
    items.push(`High volatility (${scores.volatility.maxDrawdown}% max drawdown) — consider increasing stable allocations`)
  }

  // All good
  if (items.length === 0) {
    items.push('No immediate actions recommended. Portfolio health is good.')
  }

  return items.slice(0, 3) // Max 3 items
}
