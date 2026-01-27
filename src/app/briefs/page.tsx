'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { HealthScores } from '@/lib/portfolio-health'
import type { WeeklyBriefData, DeepDiveData, AssetChange } from '@/lib/report-generator'

interface Brief {
  id: string
  createdAt: string
  reportType: string
  snapshotId: string
  data: WeeklyBriefData | DeepDiveData | null
}

export default function ReportsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [healthScores, setHealthScores] = useState<HealthScores | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedBriefs, setExpandedBriefs] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([loadBriefs(), loadHealthScores()])
  }, [])

  async function loadBriefs() {
    try {
      const res = await fetch('/api/briefs')
      const data = await res.json()
      setBriefs(data)
    } catch (error) {
      console.error('Failed to load briefs:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadHealthScores() {
    try {
      const res = await fetch('/api/health-scores')
      const data = await res.json()
      setHealthScores(data)
    } catch (error) {
      console.error('Failed to load health scores:', error)
    }
  }

  async function handleGenerate(type: 'weekly' | 'deep-dive') {
    try {
      setGenerating(true)
      setError(null)

      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()

      if (res.ok) {
        setBriefs([data, ...briefs])
        // Auto-expand the new brief
        setExpandedBriefs(new Set([data.id]))
      } else {
        setError(data.error || 'Failed to generate report')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  function toggleBrief(id: string) {
    const newExpanded = new Set(expandedBriefs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedBriefs(newExpanded)
  }

  async function handleDeleteBrief(id: string) {
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      const res = await fetch(`/api/briefs/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setBriefs(briefs.filter(b => b.id !== id))
        const newExpanded = new Set(expandedBriefs)
        newExpanded.delete(id)
        setExpandedBriefs(newExpanded)
      }
    } catch (error) {
      console.error('Failed to delete brief:', error)
    }
  }

  const latestBrief = briefs.length > 0 ? briefs[0] : null
  const historicalBriefs = briefs.slice(1)

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Actionable insights and health metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleGenerate('weekly')}
            disabled={generating}
            variant="outline"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Weekly Brief
          </Button>
          <Button
            onClick={() => handleGenerate('deep-dive')}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Deep Dive
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Health Score */}
      {healthScores && <PortfolioHealthPanel scores={healthScores} />}

      {/* Latest Brief */}
      {latestBrief && latestBrief.data && (
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-section-title">
                Latest {latestBrief.reportType === 'deep-dive' ? 'Deep Dive' : 'Weekly Brief'}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {formatDate(latestBrief.createdAt)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {latestBrief.reportType === 'deep-dive' ? (
              <DeepDiveReport data={latestBrief.data as DeepDiveData} />
            ) : (
              <WeeklyBriefReport data={latestBrief.data as WeeklyBriefData} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Historical Reports */}
      {historicalBriefs.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-section-title">
              Historical Reports ({historicalBriefs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historicalBriefs.map(brief => (
                <div key={brief.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <button
                      onClick={() => toggleBrief(brief.id)}
                      className="flex-1 flex items-center justify-between hover:bg-muted/50 transition-colors -m-4 p-4 mr-2"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">
                            {brief.reportType === 'deep-dive' ? 'Deep Dive' : 'Weekly Brief'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(brief.createdAt)}
                            {brief.data && ' • ' + formatCurrency((brief.data as WeeklyBriefData).currentValue)}
                          </div>
                        </div>
                      </div>
                      {expandedBriefs.has(brief.id) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBrief(brief.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {expandedBriefs.has(brief.id) && brief.data && (
                    <div className="p-4 border-t">
                      {brief.reportType === 'deep-dive' ? (
                        <DeepDiveReport data={brief.data as DeepDiveData} />
                      ) : (
                        <WeeklyBriefReport data={brief.data as WeeklyBriefData} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && briefs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reports yet. Generate your first report to get started.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Portfolio Health Score Panel Component
 */
function PortfolioHealthPanel({ scores }: { scores: HealthScores }) {
  const { overall, liquidity, concentration, diversification, volatility } = scores

  const scoreColor = overall.color === 'green' ? 'text-green-600' : overall.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = overall.color === 'green' ? 'bg-green-100' : overall.color === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-section-title">Portfolio Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-5">
          {/* Overall Score - Large circular gauge */}
          <div className="flex flex-col items-center justify-center">
            <div className={`relative w-32 h-32 rounded-full ${scoreBg} flex items-center justify-center`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${scoreColor}`}>{overall.score}</div>
                <div className="text-xs text-muted-foreground mt-1">Overall</div>
              </div>
            </div>
            <div className={`mt-2 text-sm font-medium ${scoreColor}`}>
              {overall.score >= 70 ? 'Healthy' : overall.score >= 50 ? 'Fair' : 'At Risk'}
            </div>
          </div>

          {/* Individual Metrics */}
          <ScoreGauge
            title="Liquidity"
            score={liquidity.score}
            explanation={liquidity.explanation}
            detail={`${liquidity.liquidPercent}% liquid`}
          />
          <ScoreGauge
            title="Concentration"
            score={concentration.score}
            explanation={concentration.explanation}
            detail={`Top: ${concentration.topHoldingPercent}%`}
          />
          <ScoreGauge
            title="Diversification"
            score={diversification.score}
            explanation={diversification.explanation}
            detail={`${diversification.assetClassCount} classes`}
          />
          <ScoreGauge
            title="Volatility"
            score={volatility.score}
            explanation={volatility.explanation}
            detail={`${volatility.maxDrawdown}% max DD`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Individual Score Gauge Component
 */
function ScoreGauge({
  title,
  score,
  explanation,
  detail,
}: {
  title: string
  score: number
  explanation: string
  detail: string
}) {
  const color = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
  const bg = score >= 70 ? 'bg-green-100' : score >= 50 ? 'bg-yellow-100' : 'bg-red-100'

  return (
    <div className="flex flex-col">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center mb-2`}>
        <div className={`text-2xl font-bold ${color}`}>{score}</div>
      </div>
      <div className="text-xs text-muted-foreground">{detail}</div>
      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{explanation}</div>
    </div>
  )
}

/**
 * Weekly Brief Report Component
 */
function WeeklyBriefReport({ data }: { data: WeeklyBriefData | DeepDiveData }) {
  return (
    <div className="space-y-6">
      {/* Header with key metrics */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <div className="text-sm text-muted-foreground">{data.dateRange}</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(data.currentValue)}</div>
        </div>
        <div className={`flex items-center gap-2 ${data.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {data.changePercent >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          <div>
            <div className="text-xl font-bold">
              {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(1)}%
            </div>
            <div className="text-sm">
              {data.changePercent >= 0 ? '+' : ''}{formatCurrency(data.change)}
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Executive Summary</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.executiveSummary}</p>
      </div>

      {/* What Changed */}
      {data.topChanges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">What Changed</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Asset</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Last Week</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Now</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Change</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Impact</th>
                </tr>
              </thead>
              <tbody>
                {data.topChanges.map((change, idx) => (
                  <AssetChangeRow key={idx} change={change} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Narrative */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Risk Narrative</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.riskNarrative}</p>
      </div>

      {/* Concentration Alerts */}
      {data.concentrationAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Concentration Alerts</h3>
          <div className="space-y-2">
            {data.concentrationAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Action Items</h3>
        <div className="space-y-2">
          {data.actionItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Deep Dive Report Component
 */
function DeepDiveReport({ data }: { data: DeepDiveData }) {
  return (
    <div className="space-y-6">
      {/* Include all weekly brief content first */}
      <WeeklyBriefReport data={data} />

      <div className="border-t pt-6">
        <h2 className="text-lg font-bold mb-4">Deep Dive Analysis</h2>

        {/* Asset-by-Asset Analysis */}
        {data.assetAnalysis.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Asset-by-Asset Analysis (Top 10)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Asset</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Value</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">% Portfolio</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">30d</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">90d</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assetAnalysis.map((asset, idx) => (
                    <tr key={idx} className="border-b border-border/40 last:border-0">
                      <td className="py-2 px-2 font-medium">{asset.symbol}</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(asset.currentValue)}</td>
                      <td className="py-2 px-2 text-right">{asset.portfolioPercent}%</td>
                      <td className={`py-2 px-2 text-right ${asset.change30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.change30d >= 0 ? '+' : ''}{asset.change30d}%
                      </td>
                      <td className={`py-2 px-2 text-right ${asset.change90d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.change90d >= 0 ? '+' : ''}{asset.change90d}%
                      </td>
                      <td className="py-2 px-2 text-right text-xs">
                        <span className={`px-2 py-1 rounded ${
                          asset.recommendation === 'Consider Reducing' ? 'bg-red-100 text-red-700' :
                          asset.recommendation === 'Consider Adding' ? 'bg-green-100 text-green-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {asset.recommendation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Correlation Analysis */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Correlation Analysis</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Your portfolio is {data.correlationAnalysis.btcCorrelation}% correlated with BTC</p>
            <p>When BTC drops 10%, your portfolio historically drops {data.correlationAnalysis.btcImpact}%</p>
          </div>
        </div>

        {/* Scenario Analysis */}
        {data.scenarioAnalysis.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Scenario Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Scenario</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Portfolio Value</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scenarioAnalysis.map((scenario, idx) => (
                    <tr key={idx} className="border-b border-border/40 last:border-0">
                      <td className="py-2 px-2">{scenario.scenario}</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(scenario.result)}</td>
                      <td className="py-2 px-2 text-right text-red-600">
                        {formatCurrency(scenario.impact)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Historical Context */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Historical Context</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Tracking Duration</div>
              <div className="font-semibold mt-1">{data.historicalContext.trackingMonths} months</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Growth</div>
              <div className={`font-semibold mt-1 ${data.historicalContext.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.historicalContext.growthPercent >= 0 ? '+' : ''}{data.historicalContext.growthPercent}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Drawdowns &gt;20%</div>
              <div className="font-semibold mt-1">{data.historicalContext.drawdownCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Recovery</div>
              <div className="font-semibold mt-1">{data.historicalContext.avgRecoveryMonths} months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Asset Change Row Component
 */
function AssetChangeRow({ change }: { change: AssetChange }) {
  const isPositive = change.change >= 0
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600'

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 px-2 font-medium">{change.symbol}</td>
      <td className="py-2 px-2 text-right">{formatCurrency(change.lastWeekValue)}</td>
      <td className="py-2 px-2 text-right">{formatCurrency(change.currentValue)}</td>
      <td className={`py-2 px-2 text-right ${colorClass}`}>
        {isPositive ? '+' : ''}{formatCurrency(change.change)}
        <span className="text-xs ml-1">
          ({isPositive ? '+' : ''}{change.impactPercent.toFixed(1)}%)
        </span>
      </td>
      <td className={`py-2 px-2 text-right ${colorClass}`}>
        {isPositive ? '+' : ''}{change.impact.toFixed(2)}% of portfolio
      </td>
    </tr>
  )
}
