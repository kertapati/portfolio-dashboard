'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { SummaryTile } from '@/components/ui/summary-tile'
import { SectionHeader } from '@/components/ui/section-header'
import { Tag } from '@/components/ui/tag'
import { AllocationDonut } from '@/components/ui/allocation-donut'
import { InvestmentJournal } from '@/components/ui/investment-journal'
import { DataTable, DataTableHeader, DataTableBody, DataTableFooter, DataTableRow, DataTableHead, DataTableCell } from '@/components/ui/data-table'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { SnapshotWithHoldings, TopExposure, ManualAssetItem, WalletWithAllowlist } from '@/types'
import { Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<SnapshotWithHoldings | null>(null)
  const [previousSnapshot, setPreviousSnapshot] = useState<SnapshotWithHoldings | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [displayCurrency, setDisplayCurrency] = useState<'AUD' | 'USD'>('AUD')
  const [manualAssets, setManualAssets] = useState<ManualAssetItem[]>([])
  const [wallets, setWallets] = useState<WalletWithAllowlist[]>([])
  const [manualFxRate, setManualFxRate] = useState<string>('')
  const [manualEthPrice, setManualEthPrice] = useState<string>('')
  const [showAllHoldings, setShowAllHoldings] = useState(false)
  const [holdingsSearch, setHoldingsSearch] = useState('')
  const [holdingsExposureFilter, setHoldingsExposureFilter] = useState<string>('ALL')
  const [holdingsSortBy, setHoldingsSortBy] = useState<'value' | 'symbol' | 'allocation' | 'exposure'>('value')
  const [holdingsSortDir, setHoldingsSortDir] = useState<'asc' | 'desc'>('desc')
  const [monthlyBurnAud, setMonthlyBurnAud] = useState(5000)
  const [perpPositions, setPerpPositions] = useState<Array<{
    walletId: string
    address: string
    coin: string
    szi: string
    direction: 'LONG' | 'SHORT'
    entryPx: string
    positionValue: string
    unrealizedPnl: string
  }>>([])
  const [showPerpPositions, setShowPerpPositions] = useState(false)

  useEffect(() => {
    let isActive = true

    async function loadManualAssets() {
      try {
        const res = await fetch('/api/manual-assets')
        if (res.ok && isActive) {
          const data = await res.json()
          setManualAssets(data)
        }
      } catch (error) {
        console.error('Failed to load manual assets:', error)
      }
    }

    async function loadWallets() {
      try {
        const res = await fetch('/api/wallets')
        if (res.ok && isActive) {
          const data = await res.json()
          setWallets(data)
        }
      } catch (error) {
        console.error('Failed to load wallets:', error)
      }
    }

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok && isActive) {
          const settings = await res.json()
          if (settings.monthlyBurnAud) {
            setMonthlyBurnAud(settings.monthlyBurnAud)
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    async function loadLatestSnapshot() {
      try {
        if (isActive) setLoading(true)

        const liveRes = await fetch('/api/calculate')

        if (liveRes.ok && isActive) {
          const liveData = await liveRes.json()
          if (liveData.snapshot) {
            setSnapshot(liveData.snapshot)

            if (liveData.perpPositions) {
              setPerpPositions(liveData.perpPositions)
            }

            if (liveData.errors && liveData.errors.length > 0) {
              setErrors(liveData.errors.map((e: any) => `${e.chainType} wallet ${e.address}: ${e.error}`))
            }
          }
        }

        const historyRes = await fetch('/api/snapshots?limit=1')
        if (historyRes.ok && isActive) {
          const historyData = await historyRes.json()
          if (historyData.snapshots && historyData.snapshots.length > 0) {
            const prevId = historyData.snapshots[0].id
            const prevRes = await fetch(`/api/snapshots/${prevId}`)
            if (prevRes.ok && isActive) {
              const prevData = await prevRes.json()
              setPreviousSnapshot(prevData)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load snapshot:', error)
        if (isActive) setErrors(['Failed to load data. Please try refreshing.'])
      } finally {
        if (isActive) setLoading(false)
      }
    }

    const loadWithTimeout = async () => {
      const timeoutId = setTimeout(() => {
        if (isActive) {
          setLoading(false)
          setErrors(['Loading timeout. Please refresh the page.'])
        }
      }, 30000) // Increased timeout to 30 seconds for better reliability

      // Load data in parallel for better performance
      await Promise.all([
        loadLatestSnapshot(),
        loadManualAssets(),
        loadWallets(),
        loadSettings()
      ])

      if (isActive) {
        clearTimeout(timeoutId)
      }
    }

    loadWithTimeout()

    return () => {
      isActive = false
    }
  }, [])

  const topExposures = useMemo(() => snapshot ? calculateTopExposures(snapshot) : [], [snapshot])

  const fxRate = snapshot?.fxUsdAud || 1.5

  const tradfiSystemValue = useMemo(() => {
    return (manualAssets || [])
      .filter(asset => asset.tradfiSystem)
      .reduce((sum, asset) => {
        const quantity = asset.quantity !== null && asset.quantity !== undefined ? asset.quantity : 1
        let totalValue: number
        if (asset.currency === 'ETH') {
          const ethPrice = snapshot?.holdings.find(h => h.symbol === 'ETH')?.priceUsd || 3000
          totalValue = asset.valueAud * quantity * ethPrice * fxRate
        } else if (asset.currency === 'USD') {
          totalValue = asset.valueAud * quantity * fxRate
        } else {
          totalValue = asset.valueAud * quantity
        }
        return sum + totalValue
      }, 0)
  }, [manualAssets, snapshot, fxRate])
  const displayValue = snapshot ? (displayCurrency === 'AUD' ? snapshot.totalAud : snapshot.totalAud / fxRate) : 0
  const previousDisplayValue = previousSnapshot ? (displayCurrency === 'AUD' ? previousSnapshot.totalAud : previousSnapshot.totalAud / fxRate) : 0

  const change = previousSnapshot && snapshot ? displayValue - previousDisplayValue : 0
  const changePercent = previousSnapshot && previousDisplayValue > 0 ? change / previousDisplayValue : 0
  const isPositive = change >= 0

  const toggleCurrency = () => {
    setDisplayCurrency(displayCurrency === 'AUD' ? 'USD' : 'AUD')
  }

  const assetAllocation = useMemo(() => {
    if (!snapshot || !snapshot.holdings) return []

    // Group holdings by exposureType
    const exposureGroups: Record<string, number> = {}

    snapshot.holdings.forEach(holding => {
      const exposureType = holding.exposureType || 'CRYPTO'
      exposureGroups[exposureType] = (exposureGroups[exposureType] || 0) + holding.valueAud
    })

    // Convert to display currency
    const conversionFactor = displayCurrency === 'USD' ? 1 / fxRate : 1

    // Map exposureType to display names and combine Cash
    const result: Array<{ name: string; value: number }> = []

    if (exposureGroups['BTC']) {
      result.push({ name: 'BTC', value: exposureGroups['BTC'] * conversionFactor })
    }

    if (exposureGroups['ETH']) {
      result.push({ name: 'ETH', value: exposureGroups['ETH'] * conversionFactor })
    }

    if (exposureGroups['JLP']) {
      result.push({ name: 'JLP', value: exposureGroups['JLP'] * conversionFactor })
    }

    if (exposureGroups['CRYPTO']) {
      result.push({ name: 'Crypto', value: exposureGroups['CRYPTO'] * conversionFactor })
    }

    if (exposureGroups['STABLECOIN']) {
      result.push({ name: 'Stablecoins', value: exposureGroups['STABLECOIN'] * conversionFactor })
    }

    if (exposureGroups['NFT']) {
      result.push({ name: 'NFTs', value: exposureGroups['NFT'] * conversionFactor })
    }

    if (exposureGroups['EQUITY']) {
      result.push({ name: 'Equities', value: exposureGroups['EQUITY'] * conversionFactor })
    }

    // Combine all CASH into one category
    const totalCash = (exposureGroups['CASH'] || 0) * conversionFactor
    if (totalCash > 0) {
      result.push({ name: 'Cash', value: totalCash })
    }

    if (exposureGroups['REAL_ESTATE']) {
      result.push({ name: 'Real Estate', value: exposureGroups['REAL_ESTATE'] * conversionFactor })
    }

    if (exposureGroups['CAR']) {
      result.push({ name: 'Car', value: exposureGroups['CAR'] * conversionFactor })
    }

    if (exposureGroups['COLLECTIBLE']) {
      result.push({ name: 'Collectibles', value: exposureGroups['COLLECTIBLE'] * conversionFactor })
    }

    // Add "Others" category (MISC and any other uncategorized types)
    if (exposureGroups['OTHERS']) {
      result.push({ name: 'Others', value: exposureGroups['OTHERS'] * conversionFactor })
    }

    return result
  }, [snapshot, displayCurrency, fxRate])

  const concentrationWarnings = useMemo(() => {
    if (!snapshot) return []
    return getConcentrationWarnings(topExposures, snapshot.totalAud)
  }, [topExposures, snapshot])

  const liquidityRunway = useMemo(() => {
    if (!snapshot) return 0
    return calculateRunway(snapshot)
  }, [snapshot])

  // Get unique exposure types for filter dropdown
  const uniqueExposureTypes = useMemo(() => {
    const types = new Set(snapshot?.holdings.map(h => h.exposureType) || [])
    return ['ALL', ...Array.from(types).sort()]
  }, [snapshot])

  // Prepare holdings data - manual assets are already included in snapshot.holdings by backend
  const allHoldings = useMemo(() => {
    if (!snapshot || !snapshot.holdings) return []
    return topExposures.flatMap(exp => {
      return snapshot.holdings
        .filter(h => h.assetKey === exp.assetKey && h.source !== 'AIRDROP' && h.source !== 'PRIVATE_INVESTMENT')
        .map(holding => {
          const manualAsset = (manualAssets || []).find(a => holding.symbol === a.name)
          const wallet = holding.walletId ? (wallets || []).find(w => w.id === holding.walletId) : null
          return {
            holding,
            manualAsset,
            wallet,
          }
        })
    }).sort((a, b) => b.holding.valueAud - a.holding.valueAud)
  }, [snapshot, topExposures, manualAssets, wallets])

  // Filter and sort holdings
  const filteredAndSortedHoldings = useMemo(() => {
    let result = [...allHoldings]

    // Apply search filter
    if (holdingsSearch) {
      result = result.filter(({ holding }) =>
        holding.symbol.toLowerCase().includes(holdingsSearch.toLowerCase())
      )
    }

    // Apply exposure type filter
    if (holdingsExposureFilter !== 'ALL') {
      result = result.filter(({ holding }) => holding.exposureType === holdingsExposureFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (holdingsSortBy) {
        case 'value':
          comparison = b.holding.valueAud - a.holding.valueAud
          break
        case 'symbol':
          comparison = a.holding.symbol.localeCompare(b.holding.symbol)
          break
        case 'allocation':
          if (!snapshot) return 0
          comparison = (b.holding.valueAud / snapshot.totalAud) - (a.holding.valueAud / snapshot.totalAud)
          break
        case 'exposure':
          comparison = a.holding.exposureType.localeCompare(b.holding.exposureType)
          break
      }

      return holdingsSortDir === 'asc' ? -comparison : comparison
    })

    return result
  }, [allHoldings, holdingsSearch, holdingsExposureFilter, holdingsSortBy, holdingsSortDir, snapshot])

  const displayHoldings = useMemo(() => {
    return showAllHoldings ? filteredAndSortedHoldings : filteredAndSortedHoldings.slice(0, 10)
  }, [filteredAndSortedHoldings, showAllHoldings])

  const holdingsTotals = useMemo(() => {
    if (!snapshot) return { totalAud: 0, totalUsd: 0, percentOfPortfolio: 0 }

    const totalAud = filteredAndSortedHoldings.reduce((sum, { holding }) => sum + holding.valueAud, 0)
    const totalUsd = totalAud / fxRate
    const percentOfPortfolio = snapshot.totalAud > 0 ? totalAud / snapshot.totalAud : 0

    return { totalAud, totalUsd, percentOfPortfolio }
  }, [filteredAndSortedHoldings, snapshot, fxRate])

  async function loadManualAssetsHelper() {
    try {
      const res = await fetch('/api/manual-assets')
      if (res.ok) {
        const data = await res.json()
        setManualAssets(data)
      }
    } catch (error) {
      console.error('Failed to load manual assets:', error)
    }
  }

  async function loadWalletsHelper() {
    try {
      const res = await fetch('/api/wallets')
      if (res.ok) {
        const data = await res.json()
        setWallets(data)
      }
    } catch (error) {
      console.error('Failed to load wallets:', error)
    }
  }

  function handleCategoryClick(category: string) {
    // Map category names to exposure types for filtering
    const categoryToExposureMap: Record<string, string> = {
      'BTC': 'BTC',
      'ETH': 'ETH',
      'JLP': 'JLP',
      'Crypto': 'CRYPTO',
      'Stablecoins': 'STABLECOIN',
      'NFTs': 'NFT',
      'Equities': 'EQUITY',
      'Cash': 'CASH',
      'Real Estate': 'REAL_ESTATE',
      'Car': 'CAR',
      'Collectibles': 'COLLECTIBLE',
      'Other': 'DEFI', // or MISC
    }

    const exposureType = categoryToExposureMap[category]
    if (exposureType) {
      setHoldingsExposureFilter(exposureType)
      setShowAllHoldings(true)

      // Scroll to holdings section
      const holdingsSection = document.querySelector('[data-section="holdings"]')
      if (holdingsSection) {
        holdingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true)
      setErrors([])

      const res = await fetch('/api/calculate')
      const data: any = await res.json()

      if (data.snapshot) {
        const prevSnapshot = snapshot
        setSnapshot(data.snapshot)
        if (prevSnapshot) {
          setPreviousSnapshot(prevSnapshot)
        }

        if (data.perpPositions) {
          setPerpPositions(data.perpPositions)
        }

        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors.map((e: any) => `${e.chainType} wallet ${e.address}: ${e.error}`))
        }

        await Promise.all([loadManualAssetsHelper(), loadWalletsHelper()])
      }
    } catch (error) {
      setErrors(['Refresh failed: ' + (error instanceof Error ? error.message : 'Unknown error')])
    } finally {
      setRefreshing(false)
    }
  }

  async function handleFxRateUpdate() {
    if (!manualFxRate || isNaN(parseFloat(manualFxRate))) return

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'fxUsdAud',
          value: parseFloat(manualFxRate),
        }),
      })
      await handleRefresh()
    } catch (error) {
      console.error('Failed to update FX rate:', error)
    }
  }

  async function handleEthPriceUpdate() {
    if (!manualEthPrice || isNaN(parseFloat(manualEthPrice))) return

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'ethPriceUsd',
          value: parseFloat(manualEthPrice),
        }),
      })
      await handleRefresh()
    } catch (error) {
      console.error('Failed to update ETH price:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="premium-card p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">Welcome to Portfolio Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            No data yet. Click Refresh to fetch your first snapshot.
          </p>
          <Button onClick={handleRefresh} disabled={refreshing} className="mt-4">
            {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {refreshing ? 'Refreshing...' : 'Refresh Holdings'}
          </Button>
        </div>
      </div>
    )
  }

  // Top concentration for summary
  const topConcentration = topExposures.length > 0 ? topExposures[0] : null

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Portfolio"
        subtitle={`Last updated ${new Date(snapshot.createdAt).toLocaleString()}`}
        rightControls={
          <>
            <Input
              type="number"
              step="0.01"
              placeholder={`FX: ${fxRate.toFixed(4)}`}
              value={manualFxRate}
              onChange={(e) => setManualFxRate(e.target.value)}
              onBlur={handleFxRateUpdate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFxRateUpdate()
                }
              }}
              className="w-28 h-8 text-xs rounded-lg"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="ETH/USD"
              value={manualEthPrice}
              onChange={(e) => setManualEthPrice(e.target.value)}
              onBlur={handleEthPriceUpdate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEthPriceUpdate()
                }
              }}
              className="w-28 h-8 text-xs rounded-lg"
            />
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
              className="h-8 px-3 rounded-lg"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs">Refresh</span>
            </Button>
          </>
        }
      />

      {errors.length > 0 && (
        <div className="premium-card border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              {errors.map((error, i) => (
                <p key={i} className="text-xs text-destructive">{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Net Worth"
          value={
            <button
              onClick={toggleCurrency}
              className="hover:text-primary transition-colors text-left tabular-nums"
            >
              {displayCurrency === 'AUD' ? '$' : '$'}
              {displayValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-sm text-muted-foreground ml-1.5">{displayCurrency}</span>
            </button>
          }
          delta={
            previousSnapshot
              ? {
                  value: `${isPositive ? '+' : ''}${formatPercent(changePercent)}`,
                  positive: isPositive,
                }
              : undefined
          }
        />

        <SummaryTile
          label="Liquid Runway"
          value={`${liquidityRunway.toFixed(1)}m`}
          subvalue="IMMEDIATE + FAST tiers"
        />

        <SummaryTile
          label="Top Concentration"
          value={topConcentration ? topConcentration.symbol : 'N/A'}
          subvalue={topConcentration ? formatPercent(topConcentration.percentOfPortfolio) : ''}
        />

        <SummaryTile
          label="In the System"
          value={
            <button
              onClick={toggleCurrency}
              className="hover:text-primary transition-colors text-left tabular-nums"
            >
              {displayCurrency === 'AUD' ? '$' : '$'}
              {(displayCurrency === 'AUD' ? tradfiSystemValue : tradfiSystemValue / fxRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-sm text-muted-foreground ml-1.5">{displayCurrency}</span>
            </button>
          }
          subvalue="Tradfi system assets"
        />
      </div>

      {/* Holdings Section */}
      <div className="premium-card p-6 space-y-4" data-section="holdings">
        <SectionHeader
          title="Holdings"
          description={`${filteredAndSortedHoldings.length} of ${allHoldings.length} positions`}
          action={
            <>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={holdingsSearch}
                  onChange={(e) => setHoldingsSearch(e.target.value)}
                  className="h-7 w-full sm:w-40 text-xs pl-7 rounded-lg"
                />
              </div>
              <select
                value={holdingsExposureFilter}
                onChange={(e) => setHoldingsExposureFilter(e.target.value)}
                className="h-7 px-2 text-xs rounded-lg border border-input bg-background"
              >
                {uniqueExposureTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'ALL' ? 'All Types' : type}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllHoldings(!showAllHoldings)}
                className="h-7 text-xs"
              >
                {showAllHoldings ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    View All ({filteredAndSortedHoldings.length})
                  </>
                )}
              </Button>
            </>
          }
        />

        <DataTable compact>
          <DataTableHeader sticky={showAllHoldings}>
            <DataTableRow>
              <DataTableHead>
                <button
                  onClick={() => {
                    if (holdingsSortBy === 'symbol') {
                      setHoldingsSortDir(holdingsSortDir === 'asc' ? 'desc' : 'asc')
                    } else {
                      setHoldingsSortBy('symbol')
                      setHoldingsSortDir('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Asset
                  {holdingsSortBy === 'symbol' && (
                    holdingsSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </DataTableHead>
              <DataTableHead align="right">
                <button
                  onClick={() => {
                    if (holdingsSortBy === 'value') {
                      setHoldingsSortDir(holdingsSortDir === 'asc' ? 'desc' : 'asc')
                    } else {
                      setHoldingsSortBy('value')
                      setHoldingsSortDir('desc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-foreground ml-auto"
                >
                  Value (USD)
                  {holdingsSortBy === 'value' && (
                    holdingsSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </DataTableHead>
              <DataTableHead align="right">Value (AUD)</DataTableHead>
              <DataTableHead align="right">
                <button
                  onClick={() => {
                    if (holdingsSortBy === 'allocation') {
                      setHoldingsSortDir(holdingsSortDir === 'asc' ? 'desc' : 'asc')
                    } else {
                      setHoldingsSortBy('allocation')
                      setHoldingsSortDir('desc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-foreground ml-auto"
                >
                  % Portfolio
                  {holdingsSortBy === 'allocation' && (
                    holdingsSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </DataTableHead>
              <DataTableHead align="right">
                <button
                  onClick={() => {
                    if (holdingsSortBy === 'exposure') {
                      setHoldingsSortDir(holdingsSortDir === 'asc' ? 'desc' : 'asc')
                    } else {
                      setHoldingsSortBy('exposure')
                      setHoldingsSortDir('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-foreground ml-auto"
                >
                  Exposure
                  {holdingsSortBy === 'exposure' && (
                    holdingsSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </DataTableHead>
              <DataTableHead align="right">Liquidity</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {displayHoldings.map(({ holding, manualAsset, wallet }, idx) => {
              const walletLabel = wallet?.label || (wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : null)

              // holding.valueAud is already in AUD (calculated correctly in backend)
              const displayValueAud = holding.valueAud
              const displayValueUsd = holding.valueAud / fxRate

              return (
                <DataTableRow key={`${holding.assetKey}-${idx}`}>
                  <DataTableCell>
                    <div>
                      <div className="font-medium text-sm">{holding.symbol}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {holding.source}
                        {walletLabel && ` · ${walletLabel}`}
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell align="right" className="font-medium">
                    ${displayValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </DataTableCell>
                  <DataTableCell align="right" className="font-medium">
                    {formatCurrency(displayValueAud)}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <span className={holding.valueAud / snapshot.totalAud > 0.25 ? 'text-warning' : ''}>
                      {formatPercent(holding.valueAud / snapshot.totalAud)}
                    </span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 font-medium">
                      {holding.exposureType}
                    </span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <Tag tier={holding.liquidityTier} />
                  </DataTableCell>
                </DataTableRow>
              )
            })}
          </DataTableBody>
          <DataTableFooter>
            <DataTableRow>
              <DataTableCell>
                <span className="font-semibold text-sm">Total</span>
              </DataTableCell>
              <DataTableCell align="right" className="font-semibold">
                ${holdingsTotals.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </DataTableCell>
              <DataTableCell align="right" className="font-semibold">
                {formatCurrency(holdingsTotals.totalAud)}
              </DataTableCell>
              <DataTableCell align="right" className="font-semibold">
                {formatPercent(holdingsTotals.percentOfPortfolio)}
              </DataTableCell>
              <DataTableCell align="right">&nbsp;</DataTableCell>
              <DataTableCell align="right">&nbsp;</DataTableCell>
            </DataTableRow>
          </DataTableFooter>
        </DataTable>
      </div>

      {/* Allocation */}
      <div className="premium-card p-5">
        <SectionHeader title="Asset Allocation" description="Portfolio breakdown with insights" />
        <div className="mt-4">
          <AllocationDonut
            items={assetAllocation}
            total={displayValue}
            previousTotal={previousDisplayValue}
            formatValue={formatCurrency}
            formatPercent={formatPercent}
            monthlyBurnAud={displayCurrency === 'USD' ? monthlyBurnAud / fxRate : monthlyBurnAud}
            onCategoryClick={handleCategoryClick}
            displayCurrency={displayCurrency}
            onCurrencyToggle={toggleCurrency}
          />
        </div>
      </div>

      {/* Investment Journal & Trade Ideas */}
      <InvestmentJournal />

      {/* Risk Flags */}
      {concentrationWarnings.length > 0 && (
        <div className="premium-card border-warning/40 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2">Risk Flags</h3>
              <ul className="space-y-1.5">
                {concentrationWarnings.map((warning, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Private Investments */}
      {(manualAssets || []).filter(a => a.type === 'PRIVATE_INVESTMENT').length > 0 && (
        <div className="premium-card p-6 space-y-4">
          <SectionHeader
            title="Private Investments"
            description="Early stage investments (marked to 0)"
          />
          <DataTable compact>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Currency</DataTableHead>
                <DataTableHead align="right">Amount Invested</DataTableHead>
                <DataTableHead>Date</DataTableHead>
                <DataTableHead align="right">Valuation</DataTableHead>
                <DataTableHead>Notes</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {(manualAssets || []).filter(a => a.type === 'PRIVATE_INVESTMENT').map((investment) => {
                const formatWithCurrency = (value: number) => {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: investment.currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(value)
                }

                return (
                  <DataTableRow key={investment.id}>
                    <DataTableCell className="font-medium">{investment.name}</DataTableCell>
                    <DataTableCell>{investment.currency}</DataTableCell>
                    <DataTableCell align="right">
                      {investment.investmentAmount ? formatWithCurrency(investment.investmentAmount) : '-'}
                    </DataTableCell>
                    <DataTableCell>
                      {investment.investmentDate ? new Date(investment.investmentDate).toLocaleDateString() : '-'}
                    </DataTableCell>
                    <DataTableCell align="right">
                      {investment.investmentValuation ? formatWithCurrency(investment.investmentValuation) : '-'}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground text-xs">{investment.notes || '-'}</DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {/* Expected Airdrops */}
      {(manualAssets || []).filter(a => a.type === 'AIRDROP').length > 0 && (
        <div className="premium-card p-6 space-y-4">
          <SectionHeader
            title="Expected Airdrops"
            description="Tracking future airdrops"
          />
          <DataTable compact>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Notes</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {(manualAssets || []).filter(a => a.type === 'AIRDROP').map((airdrop) => (
                <DataTableRow key={airdrop.id}>
                  <DataTableCell className="font-medium">{airdrop.name}</DataTableCell>
                  <DataTableCell className="text-muted-foreground text-xs">{airdrop.notes || '-'}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {/* Hyperliquid Perp Positions */}
      {perpPositions.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Hyperliquid Perpetual Positions"
            description={`${perpPositions.length} active position${perpPositions.length !== 1 ? 's' : ''}`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPerpPositions(!showPerpPositions)}
              >
                {showPerpPositions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            }
          />
          {showPerpPositions && (
            <Card className="premium-card">
              <CardContent className="p-0">
                <DataTable compact>
                  <DataTableHeader>
                    <DataTableRow>
                      <DataTableHead>Asset</DataTableHead>
                      <DataTableHead align="right">Direction</DataTableHead>
                      <DataTableHead align="right">Size</DataTableHead>
                      <DataTableHead align="right">Entry Price</DataTableHead>
                      <DataTableHead align="right">Position Value (USD)</DataTableHead>
                      <DataTableHead align="right">Unrealized PnL (USD)</DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {perpPositions.map((position, idx) => {
                      const sziNum = parseFloat(position.szi)
                      const posValueNum = parseFloat(position.positionValue)
                      const pnlNum = parseFloat(position.unrealizedPnl)
                      const isProfitable = pnlNum >= 0

                      return (
                        <DataTableRow key={`${position.address}-${position.coin}-${idx}`}>
                          <DataTableCell>
                            <div>
                              <div className="font-medium text-sm">{position.coin}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {position.address.slice(0, 6)}...{position.address.slice(-4)}
                              </div>
                            </div>
                          </DataTableCell>
                          <DataTableCell align="right">
                            <span className={position.direction === 'LONG' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {position.direction}
                            </span>
                          </DataTableCell>
                          <DataTableCell align="right" className="font-medium tabular-nums">
                            {Math.abs(sziNum).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                          </DataTableCell>
                          <DataTableCell align="right" className="tabular-nums">
                            ${parseFloat(position.entryPx).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </DataTableCell>
                          <DataTableCell align="right" className="font-medium tabular-nums">
                            ${Math.abs(posValueNum).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </DataTableCell>
                          <DataTableCell align="right">
                            <span className={isProfitable ? 'text-success font-medium tabular-nums' : 'text-destructive font-medium tabular-nums'}>
                              {isProfitable ? '+' : ''}${pnlNum.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </span>
                          </DataTableCell>
                        </DataTableRow>
                      )
                    })}
                  </DataTableBody>
                </DataTable>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function calculateTopExposures(snapshot: SnapshotWithHoldings): TopExposure[] {
  const grouped = new Map<string, { valueAud: number; symbol: string }>()

  for (const holding of (snapshot.holdings || [])) {
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

  return Array.from(grouped.entries())
    .map(([assetKey, data]) => ({
      assetKey,
      symbol: data.symbol,
      valueAud: data.valueAud,
      percentOfPortfolio: snapshot.totalAud > 0 ? data.valueAud / snapshot.totalAud : 0,
    }))
    .sort((a, b) => b.valueAud - a.valueAud)
}

function getUnpricedAssets(snapshot: SnapshotWithHoldings) {
  const unpriced = (snapshot.holdings || []).filter(h => h.priceUsd === null || h.priceUsd === 0)
  const grouped = new Map<string, any>()

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

function getConcentrationWarnings(topExposures: TopExposure[], totalAud: number): string[] {
  const warnings: string[] = []

  if (topExposures.length > 0 && topExposures[0].percentOfPortfolio > 0.25) {
    warnings.push(`${topExposures[0].symbol} represents ${formatPercent(topExposures[0].percentOfPortfolio)} of portfolio`)
  }

  const top3Total = topExposures.slice(0, 3).reduce((sum, e) => sum + e.valueAud, 0)
  const top3Percent = totalAud > 0 ? top3Total / totalAud : 0

  if (top3Percent > 0.50) {
    warnings.push(`Top 3 assets represent ${formatPercent(top3Percent)} of portfolio`)
  }

  return warnings
}

function calculateRunway(snapshot: SnapshotWithHoldings): number {
  const immediateAndFast = (snapshot.holdings || [])
    .filter(h => h.liquidityTier === 'IMMEDIATE' || h.liquidityTier === 'FAST')
    .reduce((sum, h) => sum + h.valueAud, 0)

  return immediateAndFast / 5000
}
