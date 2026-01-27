/**
 * Report Generation Utilities
 *
 * Functions to generate Weekly Briefs and Deep Dive reports
 */

import { calculateHealthScores, generateRiskNarrative, generateActionItems, type HealthScores } from './portfolio-health'
import { formatCurrency, formatPercent } from './utils'

interface Holding {
  symbol: string
  valueAud: number
  exposureType: string
  liquidityTier: string
  source: string
  assetKey: string
  priceUsd?: number
  quantity: number
}

interface Snapshot {
  id: string
  createdAt: string
  totalAud: number
  fxUsdAud: number
  holdings: Holding[]
}

export interface AssetChange {
  symbol: string
  lastWeekValue: number
  currentValue: number
  change: number
  impact: number
  impactPercent: number
}

interface BaseReportData {
  dateRange: string
  currentValue: number
  previousValue: number
  change: number
  changePercent: number
  executiveSummary: string
  topChanges: AssetChange[]
  riskNarrative: string
  concentrationAlerts: string[]
  actionItems: string[]
  healthScores: HealthScores
}

export interface WeeklyBriefData extends BaseReportData {
  type: 'weekly'
}

export interface DeepDiveData extends BaseReportData {
  type: 'deep-dive'
  assetAnalysis: AssetAnalysisItem[]
  correlationAnalysis: {
    btcCorrelation: number
    btcImpact: number
  }
  scenarioAnalysis: ScenarioItem[]
  historicalContext: {
    trackingMonths: number
    growthPercent: number
    drawdownCount: number
    avgRecoveryMonths: number
  }
}

export interface AssetAnalysisItem {
  symbol: string
  currentValue: number
  portfolioPercent: number
  change30d: number
  change90d: number
  recommendation: 'Hold' | 'Consider Reducing' | 'Consider Adding'
}

export interface ScenarioItem {
  scenario: string
  result: number
  impact: number
}

/**
 * Generate a Weekly Brief report
 */
export function generateWeeklyBrief(
  currentSnapshot: Snapshot,
  previousSnapshot: Snapshot | null,
  allSnapshots: Snapshot[],
  monthlyBurn: number
): WeeklyBriefData {
  const currentDate = new Date(currentSnapshot.createdAt)
  const previousDate = previousSnapshot ? new Date(previousSnapshot.createdAt) : null

  // Date range
  const dateRange = previousDate
    ? `${previousDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Calculate change
  const currentValue = currentSnapshot.totalAud
  const previousValue = previousSnapshot?.totalAud || currentValue
  const change = currentValue - previousValue
  const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0

  // Calculate health scores
  const healthScores = calculateHealthScores(
    currentSnapshot.holdings,
    currentSnapshot.totalAud,
    monthlyBurn,
    allSnapshots
  )

  // Top changes
  const topChanges = calculateTopChanges(currentSnapshot, previousSnapshot)

  // Risk narrative
  const riskNarrative = generateRiskNarrative(currentSnapshot.holdings, currentSnapshot.totalAud)

  // Concentration alerts
  const concentrationAlerts = generateConcentrationAlerts(currentSnapshot.holdings, currentSnapshot.totalAud)

  // Action items
  const actionItems = generateActionItems(currentSnapshot.holdings, currentSnapshot.totalAud, healthScores)

  // Executive summary
  const executiveSummary = generateExecutiveSummary({
    changePercent,
    currentValue,
    topChanges,
    healthScores,
    concentrationAlerts,
  })

  return {
    type: 'weekly',
    dateRange,
    currentValue,
    previousValue,
    change,
    changePercent,
    executiveSummary,
    topChanges,
    riskNarrative,
    concentrationAlerts,
    actionItems,
    healthScores,
  }
}

/**
 * Generate a Deep Dive report (includes everything from Weekly Brief plus more)
 */
export function generateDeepDive(
  currentSnapshot: Snapshot,
  previousSnapshot: Snapshot | null,
  allSnapshots: Snapshot[],
  monthlyBurn: number
): DeepDiveData {
  // Start with weekly brief data
  const weeklyData = generateWeeklyBrief(currentSnapshot, previousSnapshot, allSnapshots, monthlyBurn)

  // Asset-by-asset analysis
  const assetAnalysis = generateAssetAnalysis(currentSnapshot, allSnapshots)

  // Correlation analysis (simplified - would need BTC price data for real correlation)
  const correlationAnalysis = generateCorrelationAnalysis(currentSnapshot, allSnapshots)

  // Scenario analysis
  const scenarioAnalysis = generateScenarioAnalysis(currentSnapshot)

  // Historical context
  const historicalContext = generateHistoricalContext(allSnapshots)

  return {
    ...weeklyData,
    type: 'deep-dive',
    assetAnalysis,
    correlationAnalysis,
    scenarioAnalysis,
    historicalContext,
  }
}

/**
 * Calculate top asset changes
 */
function calculateTopChanges(currentSnapshot: Snapshot, previousSnapshot: Snapshot | null): AssetChange[] {
  if (!previousSnapshot) {
    return []
  }

  // Group holdings by symbol
  const currentHoldings = groupHoldingsBySymbol(currentSnapshot.holdings)
  const previousHoldings = groupHoldingsBySymbol(previousSnapshot.holdings)

  const changes: AssetChange[] = []

  // Compare each asset
  const allSymbols = new Set([...Object.keys(currentHoldings), ...Object.keys(previousHoldings)])

  allSymbols.forEach(symbol => {
    const currentValue = currentHoldings[symbol] || 0
    const lastWeekValue = previousHoldings[symbol] || 0
    const change = currentValue - lastWeekValue
    const impact = (change / currentSnapshot.totalAud) * 100

    if (Math.abs(change) > 0) {
      changes.push({
        symbol,
        lastWeekValue,
        currentValue,
        change,
        impact,
        impactPercent: lastWeekValue > 0 ? (change / lastWeekValue) * 100 : 0,
      })
    }
  })

  // Sort by absolute impact and return top 5
  return changes
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5)
}

/**
 * Group holdings by symbol
 */
function groupHoldingsBySymbol(holdings: Holding[]): Record<string, number> {
  const grouped: Record<string, number> = {}
  holdings.forEach(h => {
    grouped[h.symbol] = (grouped[h.symbol] || 0) + h.valueAud
  })
  return grouped
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(data: {
  changePercent: number
  currentValue: number
  topChanges: AssetChange[]
  healthScores: HealthScores
  concentrationAlerts: string[]
}): string {
  const { changePercent, currentValue, topChanges, healthScores, concentrationAlerts } = data

  const changeDirection = changePercent >= 0 ? 'increased' : 'decreased'
  const changeText = `${changeDirection} ${Math.abs(changePercent).toFixed(1)}%`

  // Main driver
  const mainDriver = topChanges[0]
  const driverText = mainDriver
    ? `, primarily driven by ${mainDriver.symbol} (${mainDriver.impactPercent >= 0 ? '+' : ''}${mainDriver.impactPercent.toFixed(1)}%)`
    : ''

  // Liquidity assessment
  const liquidityText = healthScores.liquidity.score >= 70
    ? `your liquidity position remains strong at ${healthScores.liquidity.monthsRunway} months runway`
    : `liquidity is ${healthScores.liquidity.monthsRunway < 6 ? 'concerning at' : 'moderate at'} ${healthScores.liquidity.monthsRunway} months runway`

  // Action recommendation
  let actionText = ''
  if (concentrationAlerts.length > 0) {
    actionText = ' Consider rebalancing to reduce concentration risk.'
  } else if (healthScores.overall.score >= 70) {
    actionText = ' No major allocation changes are needed.'
  } else {
    actionText = ' Review action items for optimization opportunities.'
  }

  return `Your portfolio ${changeText} this week to ${formatCurrency(currentValue)}${driverText}. ${liquidityText.charAt(0).toUpperCase() + liquidityText.slice(1)}.${actionText}`
}

/**
 * Generate concentration alerts
 */
function generateConcentrationAlerts(holdings: Holding[], totalValue: number): string[] {
  const alerts: string[] = []

  if (holdings.length === 0 || totalValue === 0) return alerts

  // Group by symbol
  const grouped = groupHoldingsBySymbol(holdings)
  const sortedHoldings = Object.entries(grouped)
    .map(([symbol, value]) => ({ symbol, value }))
    .sort((a, b) => b.value - a.value)

  // Top holding alert
  const topHolding = sortedHoldings[0]
  const topPercent = (topHolding.value / totalValue) * 100
  if (topPercent > 25) {
    alerts.push(`⚠️ ${topHolding.symbol} is now ${Math.round(topPercent)}% of portfolio (threshold: 25%)`)
  }

  // Top 3 holdings alert
  const top3Value = sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.value, 0)
  const top3Percent = (top3Value / totalValue) * 100
  if (top3Percent > 60) {
    alerts.push(`⚠️ Top 3 holdings represent ${Math.round(top3Percent)}% of portfolio`)
  }

  // Exposure type alerts
  const exposureGroups: Record<string, number> = {}
  holdings.forEach(h => {
    const type = h.exposureType || 'CRYPTO'
    exposureGroups[type] = (exposureGroups[type] || 0) + h.valueAud
  })

  Object.entries(exposureGroups).forEach(([type, value]) => {
    const percent = (value / totalValue) * 100
    if (percent > 70) {
      alerts.push(`⚠️ ${type} exposure is ${Math.round(percent)}% (consider diversifying)`)
    }
  })

  return alerts
}

/**
 * Generate asset-by-asset analysis for top 10 holdings
 */
function generateAssetAnalysis(currentSnapshot: Snapshot, allSnapshots: Snapshot[]): AssetAnalysisItem[] {
  const grouped = groupHoldingsBySymbol(currentSnapshot.holdings)
  const sortedHoldings = Object.entries(grouped)
    .map(([symbol, value]) => ({ symbol, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const sorted = [...allSnapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return sortedHoldings.map(holding => {
    const portfolioPercent = (holding.value / currentSnapshot.totalAud) * 100

    // Find 30d and 90d snapshots
    const snapshot30d = findSnapshotByDaysAgo(sorted, 30)
    const snapshot90d = findSnapshotByDaysAgo(sorted, 90)

    const value30d = snapshot30d ? groupHoldingsBySymbol(snapshot30d.holdings)[holding.symbol] || 0 : 0
    const value90d = snapshot90d ? groupHoldingsBySymbol(snapshot90d.holdings)[holding.symbol] || 0 : 0

    const change30d = value30d > 0 ? ((holding.value - value30d) / value30d) * 100 : 0
    const change90d = value90d > 0 ? ((holding.value - value90d) / value90d) * 100 : 0

    // Simple recommendation logic
    let recommendation: AssetAnalysisItem['recommendation'] = 'Hold'
    if (portfolioPercent > 30) {
      recommendation = 'Consider Reducing'
    } else if (portfolioPercent < 5 && change30d > 20) {
      recommendation = 'Consider Adding'
    }

    return {
      symbol: holding.symbol,
      currentValue: holding.value,
      portfolioPercent: Math.round(portfolioPercent * 10) / 10,
      change30d: Math.round(change30d * 10) / 10,
      change90d: Math.round(change90d * 10) / 10,
      recommendation,
    }
  })
}

/**
 * Find snapshot by days ago
 */
function findSnapshotByDaysAgo(sortedSnapshots: Snapshot[], daysAgo: number): Snapshot | null {
  if (sortedSnapshots.length === 0) return null

  const targetDate = new Date(sortedSnapshots[sortedSnapshots.length - 1].createdAt)
  targetDate.setDate(targetDate.getDate() - daysAgo)

  // Find closest snapshot
  let closest = sortedSnapshots[0]
  let minDiff = Math.abs(new Date(closest.createdAt).getTime() - targetDate.getTime())

  for (const snapshot of sortedSnapshots) {
    const diff = Math.abs(new Date(snapshot.createdAt).getTime() - targetDate.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closest = snapshot
    }
  }

  return closest
}

/**
 * Generate correlation analysis
 */
function generateCorrelationAnalysis(currentSnapshot: Snapshot, allSnapshots: Snapshot[]): {
  btcCorrelation: number
  btcImpact: number
} {
  // Simplified - would need BTC price history for real correlation
  // For now, estimate based on crypto exposure
  const cryptoPercent = currentSnapshot.holdings
    .filter(h => h.exposureType === 'CRYPTO')
    .reduce((sum, h) => sum + h.valueAud, 0) / currentSnapshot.totalAud * 100

  const btcCorrelation = Math.min(95, cryptoPercent * 0.9) // Rough estimate
  const btcImpact = cryptoPercent * 0.1 // If BTC drops 10%, portfolio drops this much

  return {
    btcCorrelation: Math.round(btcCorrelation),
    btcImpact: Math.round(btcImpact * 10) / 10,
  }
}

/**
 * Generate scenario analysis
 */
function generateScenarioAnalysis(currentSnapshot: Snapshot): ScenarioItem[] {
  const currentValue = currentSnapshot.totalAud

  // Group by exposure type
  const exposureGroups: Record<string, number> = {}
  currentSnapshot.holdings.forEach(h => {
    const type = h.exposureType || 'CRYPTO'
    exposureGroups[type] = (exposureGroups[type] || 0) + h.valueAud
  })

  const cryptoValue = exposureGroups['CRYPTO'] || 0
  const stableValue = exposureGroups['STABLECOIN'] || 0

  // Find largest holding
  const grouped = groupHoldingsBySymbol(currentSnapshot.holdings)
  const largestHolding = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0]

  const scenarios: ScenarioItem[] = [
    {
      scenario: 'Crypto market -30%',
      result: currentValue - (cryptoValue * 0.3),
      impact: -(cryptoValue * 0.3),
    },
    {
      scenario: 'Crypto market -50%',
      result: currentValue - (cryptoValue * 0.5),
      impact: -(cryptoValue * 0.5),
    },
    {
      scenario: `${largestHolding[0]} -50%`,
      result: currentValue - (largestHolding[1] * 0.5),
      impact: -(largestHolding[1] * 0.5),
    },
    {
      scenario: 'Stablecoins depeg 10%',
      result: currentValue - (stableValue * 0.1),
      impact: -(stableValue * 0.1),
    },
  ]

  return scenarios
}

/**
 * Generate historical context
 */
function generateHistoricalContext(allSnapshots: Snapshot[]): DeepDiveData['historicalContext'] {
  if (allSnapshots.length === 0) {
    return {
      trackingMonths: 0,
      growthPercent: 0,
      drawdownCount: 0,
      avgRecoveryMonths: 0,
    }
  }

  const sorted = [...allSnapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Tracking duration
  const firstDate = new Date(sorted[0].createdAt)
  const lastDate = new Date(sorted[sorted.length - 1].createdAt)
  const trackingMonths = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

  // Growth
  const firstValue = sorted[0].totalAud
  const lastValue = sorted[sorted.length - 1].totalAud
  const growthPercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0

  // Drawdowns >20%
  let peak = sorted[0].totalAud
  let drawdownCount = 0
  let inDrawdown = false

  for (const snapshot of sorted) {
    if (snapshot.totalAud > peak) {
      peak = snapshot.totalAud
      inDrawdown = false
    }
    const drawdown = peak > 0 ? ((peak - snapshot.totalAud) / peak) * 100 : 0
    if (drawdown > 20 && !inDrawdown) {
      drawdownCount++
      inDrawdown = true
    }
  }

  // Average recovery time (simplified)
  const avgRecoveryMonths = drawdownCount > 0 ? Math.floor(trackingMonths / (drawdownCount + 1)) : 0

  return {
    trackingMonths,
    growthPercent: Math.round(growthPercent * 10) / 10,
    drawdownCount,
    avgRecoveryMonths,
  }
}
