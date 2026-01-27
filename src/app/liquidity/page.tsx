'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { formatCurrency } from '@/lib/utils'
import { SnapshotWithHoldings, AppSettings, LiquidityTier } from '@/types'
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LiquidityPage() {
  const [snapshot, setSnapshot] = useState<SnapshotWithHoldings | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [burnRate, setBurnRate] = useState(5000)
  const [incomeRate, setIncomeRate] = useState(0)
  const [expandedTier, setExpandedTier] = useState<string | null>(null)

  useEffect(() => {
    const loadWithTimeout = async () => {
      const timeoutId = setTimeout(() => {
        setLoading(false)
      }, 10000)

      await loadData()
      clearTimeout(timeoutId)
    }

    loadWithTimeout()
  }, [])

  useEffect(() => {
    if (settings) {
      setBurnRate(settings.monthlyBurnAud)
    }
  }, [settings])

  async function loadData() {
    try {
      setLoading(true)

      const [snapshotsRes, settingsRes] = await Promise.all([
        fetch('/api/snapshots?limit=1'),
        fetch('/api/settings'),
      ])

      const snapshotsData = await snapshotsRes.json()
      const settingsData = await settingsRes.json()

      setSettings(settingsData)

      if (snapshotsData.snapshots && snapshotsData.snapshots.length > 0) {
        const snapshotId = snapshotsData.snapshots[0].id
        const detailRes = await fetch(`/api/snapshots/${snapshotId}`)
        const detailData = await detailRes.json()
        setSnapshot(detailData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!snapshot || !settings) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Liquidity & Runway</CardTitle>
            <CardDescription>No data available. Please refresh holdings first.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Calculate liquidity buckets
  const buckets: Record<LiquidityTier, number> = {
    IMMEDIATE: 0,
    FAST: 0,
    SLOW: 0,
  }

  const bucketHoldings: Record<LiquidityTier, typeof snapshot.holdings> = {
    IMMEDIATE: [],
    FAST: [],
    SLOW: [],
  }

  for (const holding of snapshot.holdings) {
    buckets[holding.liquidityTier as LiquidityTier] += holding.valueAud
    bucketHoldings[holding.liquidityTier as LiquidityTier].push(holding)
  }

  const haircuts = {
    IMMEDIATE: settings.haircutImmediate,
    FAST: settings.haircutFast,
    SLOW: settings.haircutSlow,
  }

  const immediateAfterHaircut = buckets.IMMEDIATE * (1 - haircuts.IMMEDIATE)
  const fastAfterHaircut = buckets.FAST * (1 - haircuts.FAST)
  const slowAfterHaircut = buckets.SLOW * (1 - haircuts.SLOW)

  const netBurnRate = burnRate - incomeRate
  const immediateRunway = netBurnRate > 0 ? immediateAfterHaircut / netBurnRate : 0
  const fastRunway = netBurnRate > 0 ? (immediateAfterHaircut + fastAfterHaircut) / netBurnRate : 0
  const totalRunway = netBurnRate > 0 ? (immediateAfterHaircut + fastAfterHaircut + slowAfterHaircut) / netBurnRate : 0

  // Determine runway status
  const getRunwayStatus = (months: number) => {
    if (months >= 12) return { color: 'text-green-600', bgColor: 'bg-green-50', label: 'Healthy' }
    if (months >= 6) return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: 'Caution' }
    return { color: 'text-red-600', bgColor: 'bg-red-50', label: 'Critical' }
  }

  const runwayStatus = getRunwayStatus(fastRunway)

  // Helper to format months as "X years Y months" or just "X months"
  const formatRunway = (months: number) => {
    if (months === 0 || !isFinite(months)) return '0 months'
    const years = Math.floor(months / 12)
    const remainingMonths = Math.round(months % 12)
    if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`
    return `${years}y ${remainingMonths}mo`
  }

  // Get total crypto value for percentage calculations
  const totalCryptoValue = snapshot.holdings
    .filter(h => h.source === 'EVM' || h.source === 'SOL')
    .reduce((sum, h) => sum + h.valueAud, 0)

  // Calculate health insights
  const liquidityRatio = snapshot.totalAud > 0 ? (immediateAfterHaircut + fastAfterHaircut) / snapshot.totalAud : 0
  const immediateRatio = snapshot.totalAud > 0 ? immediateAfterHaircut / snapshot.totalAud : 0

  const strengths: string[] = []
  const considerations: string[] = []
  const warnings: string[] = []

  if (fastRunway >= 12) {
    strengths.push(`Strong runway of ${formatRunway(fastRunway)}`)
  }
  if (liquidityRatio >= 0.5) {
    strengths.push(`${(liquidityRatio * 100).toFixed(1)}% of portfolio is liquid (IMMEDIATE + FAST)`)
  }
  if (immediateAfterHaircut >= netBurnRate * 3 && netBurnRate > 0) {
    strengths.push(`${formatRunway(immediateRunway)} in instant-access funds`)
  }

  if (fastRunway >= 6 && fastRunway < 12) {
    considerations.push(`Runway of ${formatRunway(fastRunway)} is adequate but could be stronger`)
  }
  if (liquidityRatio < 0.5 && liquidityRatio >= 0.2) {
    considerations.push(`Only ${(liquidityRatio * 100).toFixed(1)}% readily accessible - consider rebalancing`)
  }
  if (totalCryptoValue / snapshot.totalAud > 0.5) {
    considerations.push(`${((totalCryptoValue / snapshot.totalAud) * 100).toFixed(1)}% in crypto exposes you to volatility`)
  }

  if (fastRunway < 6) {
    warnings.push(`Critical: Only ${formatRunway(fastRunway)} runway - urgent action needed`)
  }
  if (liquidityRatio < 0.2) {
    warnings.push(`Warning: Only ${(liquidityRatio * 100).toFixed(1)}% of assets are liquid`)
  }
  if (immediateAfterHaircut < netBurnRate * 3 && netBurnRate > 0) {
    warnings.push(`Low emergency fund: Only ${formatRunway(immediateRunway)} instant access`)
  }

  // Enhanced Recommendations
  const recommendations: Array<{ text: string; priority: 'high' | 'medium' | 'low' }> = []

  // Critical runway issues
  if (fastRunway < 6) {
    recommendations.push({
      text: '🚨 Critical: Build emergency fund to 6 months minimum. Current runway leaves you vulnerable to unexpected events.',
      priority: 'high'
    })
    recommendations.push({
      text: 'Consider converting SLOW tier assets to FAST/IMMEDIATE tiers for better liquidity access.',
      priority: 'high'
    })
  } else if (fastRunway < 12) {
    recommendations.push({
      text: '⚠️ Target: Increase liquid runway to 12+ months. This provides better financial security and flexibility.',
      priority: 'medium'
    })
  } else if (fastRunway >= 24) {
    recommendations.push({
      text: '✅ Excellent runway position. Consider deploying excess liquidity into higher-yield opportunities.',
      priority: 'low'
    })
  } else {
    recommendations.push({
      text: '✅ Runway is healthy - maintain current liquidity levels while optimizing returns.',
      priority: 'low'
    })
  }

  // Immediate liquidity check
  if (immediateRatio < 0.05) {
    recommendations.push({
      text: `Build IMMEDIATE liquidity to at least 5-10% of portfolio (currently ${(immediateRatio * 100).toFixed(1)}%). Having instant cash access is critical for emergencies.`,
      priority: 'high'
    })
  } else if (immediateRatio < 0.1) {
    recommendations.push({
      text: `Consider increasing IMMEDIATE liquidity to 10% of portfolio (currently ${(immediateRatio * 100).toFixed(1)}%). This provides better emergency coverage.`,
      priority: 'medium'
    })
  }

  // Crypto concentration risk
  const cryptoRatio = totalCryptoValue / snapshot.totalAud
  if (cryptoRatio > 0.8) {
    recommendations.push({
      text: `Very high crypto concentration at ${(cryptoRatio * 100).toFixed(1)}%. Strongly consider diversifying into stable assets, traditional investments, or real assets to reduce volatility risk.`,
      priority: 'high'
    })
  } else if (cryptoRatio > 0.6) {
    recommendations.push({
      text: `High crypto exposure at ${(cryptoRatio * 100).toFixed(1)}%. Consider gradual diversification to reduce portfolio volatility and correlation risk.`,
      priority: 'medium'
    })
  }

  // SLOW asset concentration
  const slowRatio = buckets.SLOW / snapshot.totalAud
  if (buckets.SLOW > buckets.IMMEDIATE + buckets.FAST) {
    recommendations.push({
      text: `${(slowRatio * 100).toFixed(1)}% of portfolio is in SLOW tier. Create a clear exit strategy and timeline for converting these to more liquid assets.`,
      priority: 'medium'
    })
  }

  // Income vs expenses insight
  if (netBurnRate <= 0) {
    recommendations.push({
      text: '💰 Your income covers expenses! Focus on investing surplus systematically and building long-term wealth.',
      priority: 'low'
    })
  } else if (burnRate > immediateAfterHaircut + fastAfterHaircut) {
    recommendations.push({
      text: 'Your monthly expenses exceed total liquid assets. This is unsustainable - reduce expenses or increase liquid holdings urgently.',
      priority: 'high'
    })
  }

  // Liquidity distribution insight
  const liquidRatio = (buckets.IMMEDIATE + buckets.FAST) / snapshot.totalAud
  if (liquidRatio < 0.3) {
    recommendations.push({
      text: `Only ${(liquidRatio * 100).toFixed(1)}% of portfolio is liquid (IMMEDIATE + FAST). Aim for at least 30-50% in liquid tiers for financial flexibility.`,
      priority: 'medium'
    })
  } else if (liquidRatio > 0.8) {
    recommendations.push({
      text: `${(liquidRatio * 100).toFixed(1)}% of portfolio is highly liquid. You may have too much in cash/stables - consider deploying into higher-yield opportunities while maintaining 50-70% liquidity.`,
      priority: 'low'
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // Cash breakdown
  const cashHoldings = snapshot.holdings.filter(h =>
    h.source === 'BANK' || h.source === 'CASH' || h.source === 'GIFTCARD'
  )
  const stablecoinHoldings = snapshot.holdings.filter(h =>
    settings.stablecoins.includes(h.symbol)
  )
  const totalCash = cashHoldings.reduce((sum, h) => sum + h.valueAud, 0)
  const totalStablecoins = stablecoinHoldings.reduce((sum, h) => sum + h.valueAud, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Liquidity & Runway</h1>

      {/* Compact Runway Overview */}
      <Card className="premium-card">
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Main Runway */}
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">Liquid Runway (IMMEDIATE + FAST)</div>
              <div className={`text-4xl font-bold tabular-nums ${runwayStatus.color}`}>
                {formatRunway(fastRunway)}
              </div>
              <div className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${runwayStatus.bgColor} ${runwayStatus.color}`}>
                {runwayStatus.label}
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">IMMEDIATE Only</div>
              <div className="text-2xl font-bold tabular-nums text-green-600">
                {formatRunway(immediateRunway)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(immediateAfterHaircut)} AUD
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Total (All Tiers)</div>
              <div className="text-2xl font-bold tabular-nums text-orange-600">
                {formatRunway(totalRunway)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(immediateAfterHaircut + fastAfterHaircut + slowAfterHaircut)} AUD
              </div>
            </div>
          </div>

          {/* Compact Visual Bar */}
          <div className="mt-6">
            <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-green-500/40 flex items-center px-3"
                style={{ width: `${Math.min((immediateRunway / totalRunway) * 100, 100)}%` }}
              >
                {immediateRunway > 0.5 && (
                  <span className="text-xs font-semibold text-green-800 whitespace-nowrap">
                    IMMEDIATE
                  </span>
                )}
              </div>
              <div
                className="absolute top-0 h-full bg-blue-500/40 flex items-center px-3"
                style={{
                  left: `${Math.min((immediateRunway / totalRunway) * 100, 100)}%`,
                  width: `${Math.min(((fastRunway - immediateRunway) / totalRunway) * 100, 100 - (immediateRunway / totalRunway) * 100)}%`
                }}
              >
                {(fastRunway - immediateRunway) > 0.5 && (
                  <span className="text-xs font-semibold text-blue-800 whitespace-nowrap">
                    FAST
                  </span>
                )}
              </div>
              <div
                className="absolute top-0 h-full bg-orange-500/40 flex items-center px-3"
                style={{
                  left: `${Math.min((fastRunway / totalRunway) * 100, 100)}%`,
                  width: `${Math.min(((totalRunway - fastRunway) / totalRunway) * 100, 100 - (fastRunway / totalRunway) * 100)}%`
                }}
              >
                {(totalRunway - fastRunway) > 0.5 && (
                  <span className="text-xs font-semibold text-orange-800 whitespace-nowrap">
                    SLOW
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>Net burn: {formatCurrency(netBurnRate)}/mo AUD</span>
              <span>Total: {formatRunway(totalRunway)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Burn Rate Adjuster */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-section-title">Adjust Monthly Burn Rate</CardTitle>
          <CardDescription className="text-[12px] text-muted-foreground mt-1">
            See how changes in spending affect your runway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Monthly Expenses</span>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(burnRate)} AUD</span>
            </div>
            <Slider
              value={[burnRate]}
              onValueChange={(value: number[]) => setBurnRate(value[0])}
              min={1000}
              max={20000}
              step={500}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$1,000/mo</span>
              <span>$20,000/mo</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">IMMEDIATE Runway</div>
              <div className="text-xl font-bold tabular-nums">
                {netBurnRate > 0 ? formatRunway(immediateAfterHaircut / netBurnRate) : '∞'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">FAST Runway</div>
              <div className="text-xl font-bold tabular-nums">
                {netBurnRate > 0 ? formatRunway((immediateAfterHaircut + fastAfterHaircut) / netBurnRate) : '∞'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Runway</div>
              <div className="text-xl font-bold tabular-nums">
                {netBurnRate > 0 ? formatRunway((immediateAfterHaircut + fastAfterHaircut + slowAfterHaircut) / netBurnRate) : '∞'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Income Rate Adjuster */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-section-title">Adjust Monthly Income</CardTitle>
          <CardDescription className="text-[12px] text-muted-foreground mt-1">
            Include recurring income to see net burn rate impact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Monthly Income</span>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(incomeRate)} AUD</span>
            </div>
            <Slider
              value={[incomeRate]}
              onValueChange={(value: number[]) => setIncomeRate(value[0])}
              min={0}
              max={20000}
              step={500}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$0/mo</span>
              <span>$20,000/mo</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Monthly Expenses</div>
              <div className="text-lg font-bold tabular-nums text-red-600">
                -{formatCurrency(burnRate)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Monthly Income</div>
              <div className="text-lg font-bold tabular-nums text-green-600">
                +{formatCurrency(incomeRate)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Net Burn Rate</div>
              <div className={`text-lg font-bold tabular-nums ${netBurnRate > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {netBurnRate > 0 ? '-' : '+'}{formatCurrency(Math.abs(netBurnRate))}
              </div>
            </div>
          </div>

          {netBurnRate <= 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-semibold text-green-800">
                {netBurnRate === 0 ? '✅ Break-even: Income covers all expenses' : '✅ Positive cash flow: Building wealth over time'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Position Card */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-section-title">Cash Position</CardTitle>
          <CardDescription className="text-[12px] text-muted-foreground mt-1">
            Detailed breakdown of immediately accessible funds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide">Category</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide">Amount (AUD)</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide">% of Portfolio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b border-border/40">
                <TableCell className="font-semibold text-sm py-3">Bank Accounts & Cash</TableCell>
                <TableCell className="text-right tabular-nums text-sm py-3">{formatCurrency(totalCash)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm py-3">{((totalCash / snapshot.totalAud) * 100).toFixed(1)}%</TableCell>
              </TableRow>
              <TableRow className="border-b border-border/40">
                <TableCell className="font-semibold text-sm py-3">Stablecoins</TableCell>
                <TableCell className="text-right tabular-nums text-sm py-3">{formatCurrency(totalStablecoins)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm py-3">{((totalStablecoins / snapshot.totalAud) * 100).toFixed(1)}%</TableCell>
              </TableRow>
              <TableRow className="border-b border-border/40">
                <TableCell className="font-semibold text-sm py-3">Other IMMEDIATE Tier</TableCell>
                <TableCell className="text-right tabular-nums text-sm py-3">{formatCurrency(buckets.IMMEDIATE - totalCash - totalStablecoins)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm py-3">{(((buckets.IMMEDIATE - totalCash - totalStablecoins) / snapshot.totalAud) * 100).toFixed(1)}%</TableCell>
              </TableRow>
              <TableRow className="border-0 bg-muted/30">
                <TableCell className="font-bold text-sm py-3">Total IMMEDIATE</TableCell>
                <TableCell className="text-right tabular-nums font-bold text-sm py-3">{formatCurrency(buckets.IMMEDIATE)}</TableCell>
                <TableCell className="text-right tabular-nums font-bold text-sm py-3">{((buckets.IMMEDIATE / snapshot.totalAud) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Liquidity Waterfall */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Liquidity Waterfall</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instant Access */}
          <Card className="premium-card border-green-200">
            <CardHeader>
              <CardTitle className="text-lg text-green-700">Instant Access</CardTitle>
              <CardDescription className="text-xs">Available immediately</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Before Haircut</div>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(buckets.IMMEDIATE)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">After {(haircuts.IMMEDIATE * 100).toFixed(0)}% Haircut</div>
                <div className="text-2xl font-bold tabular-nums text-green-600">{formatCurrency(immediateAfterHaircut)}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Runway</div>
                <div className="text-xl font-bold tabular-nums">{formatRunway(immediateRunway)}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setExpandedTier(expandedTier === 'IMMEDIATE' ? null : 'IMMEDIATE')}
              >
                {expandedTier === 'IMMEDIATE' ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {bucketHoldings.IMMEDIATE.length} assets
              </Button>
              {expandedTier === 'IMMEDIATE' && (
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto text-xs">
                  {bucketHoldings.IMMEDIATE.filter(h => h.valueAud > 0).map((h, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-border/20">
                      <span className="font-medium">{h.symbol}</span>
                      <span className="tabular-nums">{formatCurrency(h.valueAud)} AUD</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Within 1 Week */}
          <Card className="premium-card border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-700">Within 1 Week</CardTitle>
              <CardDescription className="text-xs">Major tokens, quick to sell</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Before Haircut</div>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(buckets.FAST)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">After {(haircuts.FAST * 100).toFixed(0)}% Haircut</div>
                <div className="text-2xl font-bold tabular-nums text-blue-600">{formatCurrency(fastAfterHaircut)}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Additional Runway</div>
                <div className="text-xl font-bold tabular-nums">{formatRunway(fastRunway - immediateRunway)}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setExpandedTier(expandedTier === 'FAST' ? null : 'FAST')}
              >
                {expandedTier === 'FAST' ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {bucketHoldings.FAST.length} assets
              </Button>
              {expandedTier === 'FAST' && (
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto text-xs">
                  {bucketHoldings.FAST.filter(h => h.valueAud > 0).map((h, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-border/20">
                      <span className="font-medium">{h.symbol}</span>
                      <span className="tabular-nums">{formatCurrency(h.valueAud)} AUD</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Within 1 Month */}
          <Card className="premium-card border-orange-200">
            <CardHeader>
              <CardTitle className="text-lg text-orange-700">Within 1 Month</CardTitle>
              <CardDescription className="text-xs">Illiquid or hard to exit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Before Haircut</div>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(buckets.SLOW)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">After {(haircuts.SLOW * 100).toFixed(0)}% Haircut</div>
                <div className="text-2xl font-bold tabular-nums text-orange-600">{formatCurrency(slowAfterHaircut)}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Additional Runway</div>
                <div className="text-xl font-bold tabular-nums">{formatRunway(totalRunway - fastRunway)}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setExpandedTier(expandedTier === 'SLOW' ? null : 'SLOW')}
              >
                {expandedTier === 'SLOW' ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {bucketHoldings.SLOW.length} assets
              </Button>
              {expandedTier === 'SLOW' && (
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto text-xs">
                  {bucketHoldings.SLOW.filter(h => h.valueAud > 0).map((h, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-border/20">
                      <span className="font-medium">{h.symbol}</span>
                      <span className="tabular-nums">{formatCurrency(h.valueAud)} AUD</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Liquidity Health Check */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-section-title">Liquidity Health Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span>Strengths</span>
              </div>
              <ul className="space-y-1 ml-7">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {considerations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-yellow-700">
                <AlertCircle className="h-5 w-5" />
                <span>Considerations</span>
              </div>
              <ul className="space-y-1 ml-7">
                {considerations.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {c}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span>Warnings</span>
              </div>
              <ul className="space-y-1 ml-7">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="premium-card border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-section-title">Recommendations & Insights</CardTitle>
            <CardDescription className="text-[12px] text-muted-foreground mt-1">
              Actionable insights to improve your liquidity position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const priorityStyles = {
                  high: 'border-l-red-500 bg-red-50/50',
                  medium: 'border-l-yellow-500 bg-yellow-50/50',
                  low: 'border-l-green-500 bg-green-50/50'
                }
                const priorityIcons = {
                  high: <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />,
                  medium: <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />,
                  low: <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                }

                return (
                  <div
                    key={i}
                    className={`p-3 border-l-4 rounded-r-lg ${priorityStyles[rec.priority]}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {priorityIcons[rec.priority]}
                      <span className="text-sm leading-relaxed">{rec.text}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
