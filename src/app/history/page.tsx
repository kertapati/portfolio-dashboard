'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Loader2, Trash2 } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  calculatePortfolioMetrics,
  calculatePeriodReturns,
  calculateRiskMetrics,
  calculateDrawdownSeries,
  calculateMonthlyReturns,
  filterSnapshotsByTimeRange,
} from '@/lib/analytics'

interface Snapshot {
  id: string
  createdAt: string
  totalAud: number
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL'

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
  const [creatingSnapshot, setCreatingSnapshot] = useState(false)

  useEffect(() => {
    loadSnapshots()
  }, [])

  async function loadSnapshots() {
    try {
      setLoading(true)
      const res = await fetch('/api/snapshots?limit=500')
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
      }
    } catch (error) {
      console.error('Failed to load snapshots:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleMakeSnapshot() {
    try {
      setCreatingSnapshot(true)
      const res = await fetch('/api/snapshots', {
        method: 'POST',
      })

      if (!res.ok) {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to create snapshot')
        return
      }

      // Reload snapshots after creating a new one
      await loadSnapshots()
    } catch (error) {
      console.error('Failed to create snapshot:', error)
      alert('Failed to create snapshot: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setCreatingSnapshot(false)
    }
  }

  async function handleDeleteSnapshot(id: string) {
    if (!confirm('Are you sure you want to delete this snapshot?')) {
      return
    }

    try {
      const res = await fetch(`/api/snapshots/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await loadSnapshots()
      }
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
    }
  }

  const filteredSnapshots = useMemo(
    () => filterSnapshotsByTimeRange(snapshots, timeRange),
    [snapshots, timeRange]
  )

  const metrics = useMemo(
    () => calculatePortfolioMetrics(filteredSnapshots),
    [filteredSnapshots]
  )

  const periodReturns = useMemo(
    () => calculatePeriodReturns(filteredSnapshots),
    [filteredSnapshots]
  )

  const riskMetrics = useMemo(
    () => calculateRiskMetrics(filteredSnapshots),
    [filteredSnapshots]
  )

  const drawdownData = useMemo(
    () => calculateDrawdownSeries(filteredSnapshots),
    [filteredSnapshots]
  )

  const monthlyReturns = useMemo(
    () => calculateMonthlyReturns(filteredSnapshots),
    [filteredSnapshots]
  )

  const chartData = useMemo(() => {
    return filteredSnapshots
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((snapshot) => ({
        date: new Date(snapshot.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: snapshot.totalAud,
        fullDate: snapshot.createdAt,
      }))
  }, [filteredSnapshots])

  const monthlyReturnsHeatmap = useMemo(() => {
    const heatmapData: Record<number, Record<number, number>> = {}

    monthlyReturns.forEach((mr) => {
      if (!heatmapData[mr.year]) {
        heatmapData[mr.year] = {}
      }
      heatmapData[mr.year][mr.month] = mr.return
    })

    return heatmapData
  }, [monthlyReturns])

  const years = Object.keys(monthlyReturnsHeatmap).map(Number).sort((a, b) => b - a)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const getReturnColor = (returnValue: number) => {
    if (returnValue > 10) return 'bg-green-600 text-white'
    if (returnValue > 5) return 'bg-green-500 text-white'
    if (returnValue > 0) return 'bg-green-400 text-white'
    if (returnValue === 0) return 'bg-muted text-muted-foreground'
    if (returnValue > -5) return 'bg-red-400 text-white'
    if (returnValue > -10) return 'bg-red-500 text-white'
    return 'bg-red-600 text-white'
  }

  // Generate key insights
  const insights = useMemo(() => {
    if (!metrics || snapshots.length < 2) return []

    const result: string[] = []

    // Insight 1: Distance from ATH
    if (metrics.currentNetWorth < metrics.allTimeHigh.value) {
      const drawdownPercent = ((metrics.currentNetWorth - metrics.allTimeHigh.value) / metrics.allTimeHigh.value) * 100
      const athDate = new Date(metrics.allTimeHigh.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      result.push(`Portfolio is currently ${Math.abs(drawdownPercent).toFixed(1)}% below all-time high of ${formatCurrency(metrics.allTimeHigh.value)} (${athDate})`)
    }

    // Insight 2: Major drawdowns
    const majorDrawdowns = filteredSnapshots.filter((s, i) => {
      if (i === 0) return false
      const prev = filteredSnapshots[i - 1]
      const drawdown = ((s.totalAud - prev.totalAud) / prev.totalAud) * 100
      return drawdown < -20
    })
    if (majorDrawdowns.length > 0) {
      result.push(`You've experienced ${majorDrawdowns.length} drawdown${majorDrawdowns.length > 1 ? 's' : ''} greater than 20% since tracking began`)
    }

    // Insight 3: Overall growth
    if (metrics.totalChange.value !== 0) {
      const startDate = new Date(snapshots[snapshots.length - 1].createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      result.push(`Portfolio has ${metrics.totalChange.value >= 0 ? 'grown' : 'declined'} ${Math.abs(metrics.totalChange.percent).toFixed(1)}% since you started tracking (${startDate})`)
    }

    // Insight 4: Win rate
    if (riskMetrics.monthsUp + riskMetrics.monthsDown > 0) {
      const winRate = (riskMetrics.monthsUp / (riskMetrics.monthsUp + riskMetrics.monthsDown)) * 100
      result.push(`Your portfolio has positive returns ${winRate.toFixed(0)}% of the time (${riskMetrics.monthsUp} winning periods vs ${riskMetrics.monthsDown} losing periods)`)
    }

    // Insight 5: 90-day trajectory
    const last90Return = periodReturns.find(pr => pr.period === 'Last 90 days')
    if (last90Return && Math.abs(last90Return.percent) > 5) {
      const annualizedReturn = Math.pow(1 + (last90Return.percent / 100), 365 / 90) - 1
      const projected = metrics.currentNetWorth * (1 + annualizedReturn)
      if (annualizedReturn > 0.1 || annualizedReturn < -0.1) {
        result.push(`Current 90-day trajectory: if this pace continues, portfolio will be ${formatCurrency(projected)} in 12 months (${(annualizedReturn * 100).toFixed(0)}% annualized)`)
      }
    }

    return result.slice(0, 5)
  }, [metrics, snapshots, filteredSnapshots, riskMetrics, periodReturns])

  const timeRangeButtons: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Portfolio Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No historical data available. Snapshots will appear here after you create them from the main dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Portfolio Analytics"
          subtitle={`Analyzing ${filteredSnapshots.length} snapshots`}
        />
        <Button
          onClick={handleMakeSnapshot}
          disabled={creatingSnapshot}
          size="sm"
        >
          {creatingSnapshot && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Make Snapshot
        </Button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Current Net Worth</div>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(metrics.currentNetWorth)}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">All-Time High</div>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(metrics.allTimeHigh.value)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {new Date(metrics.allTimeHigh.date).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">All-Time Low</div>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(metrics.allTimeLow.value)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {new Date(metrics.allTimeLow.date).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Change</div>
            <div className={`text-2xl font-bold tabular-nums ${metrics.totalChange.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.totalChange.value >= 0 ? '+' : ''}
              {formatCurrency(metrics.totalChange.value)}
            </div>
            <div className={`text-xs mt-1 ${metrics.totalChange.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.totalChange.percent >= 0 ? '+' : ''}{metrics.totalChange.percent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">CAGR</div>
            <div className={`text-2xl font-bold tabular-nums ${metrics.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(2)}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Annualized return
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="premium-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-section-title">Portfolio Value Over Time</CardTitle>
            <div className="flex gap-2">
              {timeRangeButtons.map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="h-7 text-xs px-3"
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                labelFormatter={(label: string, payload: any) => {
                  if (payload && payload.length > 0) {
                    const fullDate = new Date(payload[0].payload.fullDate)
                    return fullDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  return label
                }}
                formatter={(value: number, name: string, props: any) => {
                  const index = chartData.findIndex((d) => d.date === props.payload.date)
                  const change = index > 0 ? value - chartData[index - 1].value : 0
                  const changePercent = index > 0 ? (change / chartData[index - 1].value) * 100 : 0
                  return [
                    <div key="value" className="space-y-1">
                      <div className="font-semibold">{formatCurrency(value)}</div>
                      {index > 0 && (
                        <div className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {change >= 0 ? '+' : ''}{formatCurrency(change)} ({change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                        </div>
                      )}
                    </div>,
                    'Net Worth',
                  ]
                }}
              />
              <ReferenceLine
                y={metrics.allTimeHigh.value}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: 'ATH', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Analysis */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-section-title">Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Period Returns */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Period Returns</h3>
              <div className="space-y-2">
                {periodReturns.map((period, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground">{period.period}</span>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${period.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {period.change >= 0 ? '+' : ''}{formatCurrency(period.change)}
                      </div>
                      <div className={`text-xs ${period.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {period.percent >= 0 ? '+' : ''}{period.percent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Metrics */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Risk Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Max Drawdown</span>
                  <span className="text-sm font-semibold text-red-600">
                    {riskMetrics.maxDrawdown.percent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Current Drawdown</span>
                  <span className="text-sm font-semibold text-red-600">
                    {riskMetrics.currentDrawdown.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Best Month</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(riskMetrics.bestMonth.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(riskMetrics.bestMonth.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Worst Month</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-600">
                      {formatCurrency(riskMetrics.worstMonth.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(riskMetrics.worstMonth.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Avg Monthly Change</span>
                  <span className={`text-sm font-semibold ${riskMetrics.avgMonthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(riskMetrics.avgMonthlyChange)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-sm font-semibold">
                    {riskMetrics.monthsUp + riskMetrics.monthsDown > 0
                      ? ((riskMetrics.monthsUp / (riskMetrics.monthsUp + riskMetrics.monthsDown)) * 100).toFixed(1)
                      : 0}%
                    <span className="text-xs text-muted-foreground ml-1">
                      ({riskMetrics.monthsUp}W / {riskMetrics.monthsDown}L)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown Chart */}
      {drawdownData.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-section-title">Drawdown Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDrawdown)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Returns Heatmap */}
      {years.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-section-title">Monthly Returns Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(12, 1fr)` }}>
                  {/* Header Row */}
                  <div className="text-xs font-semibold text-muted-foreground"></div>
                  {monthNames.map((month) => (
                    <div key={month} className="text-xs font-semibold text-muted-foreground text-center">
                      {month}
                    </div>
                  ))}

                  {/* Data Rows */}
                  {years.map((year) => (
                    <React.Fragment key={year}>
                      <div className="text-xs font-semibold text-muted-foreground flex items-center">
                        {year}
                      </div>
                      {monthNames.map((_, monthIdx) => {
                        const returnValue = monthlyReturnsHeatmap[year]?.[monthIdx]
                        const hasData = returnValue !== undefined

                        return (
                          <div
                            key={`${year}-${monthIdx}`}
                            className={`
                              h-12 rounded flex items-center justify-center text-xs font-semibold
                              ${hasData ? getReturnColor(returnValue) : 'bg-muted/30 text-muted-foreground'}
                            `}
                          >
                            {hasData ? `${returnValue > 0 ? '+' : ''}${returnValue.toFixed(1)}%` : '-'}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-600"></div>
                <span>&lt; -10%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-400"></div>
                <span>-5% to 0%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted"></div>
                <span>0%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-400"></div>
                <span>0% to 5%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600"></div>
                <span>&gt; 10%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights Panel */}
      {insights.length > 0 && (
        <Card className="premium-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-section-title">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Snapshots List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-section-title">All Snapshots ({snapshots.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Net Worth (AUD)</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Change</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((snapshot, idx, arr) => {
                    const prevSnapshot = arr[idx + 1]
                    const change = prevSnapshot ? snapshot.totalAud - prevSnapshot.totalAud : 0
                    const changePercent = prevSnapshot && prevSnapshot.totalAud > 0
                      ? (change / prevSnapshot.totalAud) * 100
                      : 0

                    return (
                      <tr key={snapshot.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          {new Date(snapshot.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {formatCurrency(snapshot.totalAud)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {prevSnapshot ? (
                            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {change >= 0 ? '+' : ''}{formatCurrency(change)}
                              <span className="text-xs ml-1">
                                ({change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSnapshot(snapshot.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
