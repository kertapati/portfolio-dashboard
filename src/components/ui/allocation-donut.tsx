'use client'

import { useMemo, useState, memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface AllocationItem {
  name: string
  value: number
  color?: string
}

interface AllocationDonutProps {
  items: AllocationItem[]
  total: number
  previousTotal?: number
  formatValue: (value: number) => string
  formatPercent: (percent: number) => string
  monthlyBurnAud: number
  onCategoryClick?: (category: string) => void
  displayCurrency?: 'AUD' | 'USD'
  onCurrencyToggle?: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'Crypto': '#3B82F6',
  'Stablecoins': '#10B981',
  'Equities': '#8B5CF6',
  'Cash': '#F59E0B',
  'NFTs': '#EC4899',
  'Real Estate': '#14B8A6',
  'Car': '#F97316',
  'Collectibles': '#A855F7',
  'Other': '#6B7280',
}

export const AllocationDonut = memo(function AllocationDonut({
  items,
  total,
  previousTotal,
  formatValue,
  formatPercent,
  monthlyBurnAud,
  onCategoryClick,
  displayCurrency = 'AUD',
  onCurrencyToggle,
}: AllocationDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Sort by value descending and prepare data
  const sortedItems = useMemo(() => {
    return [...items]
      .map(item => ({
        ...item,
        percent: total > 0 ? (item.value / total) * 100 : 0,
        color: CATEGORY_COLORS[item.name] || CATEGORY_COLORS['Other'],
      }))
      .sort((a, b) => b.value - a.value)
  }, [items, total])

  // Calculate change vs previous snapshot
  const change = previousTotal ? total - previousTotal : 0
  const changePercent = previousTotal && previousTotal > 0 ? change / previousTotal : 0
  const isPositive = change >= 0

  // Calculate liquid vs illiquid
  const liquidCategories = ['Crypto', 'Stablecoins', 'Cash']
  const liquidValue = sortedItems
    .filter(item => liquidCategories.includes(item.name))
    .reduce((sum, item) => sum + item.value, 0)
  const illiquidValue = total - liquidValue
  const liquidPercent = total > 0 ? liquidValue / total : 0

  // Calculate crypto exposure
  const cryptoCategories = ['Crypto', 'Stablecoins', 'NFTs']
  const cryptoValue = sortedItems
    .filter(item => cryptoCategories.includes(item.name))
    .reduce((sum, item) => sum + item.value, 0)
  const cryptoPercent = total > 0 ? cryptoValue / total : 0

  // Calculate cash runway
  const cashValue = sortedItems
    .filter(item => item.name === 'Cash' || item.name === 'Stablecoins')
    .reduce((sum, item) => sum + item.value, 0)
  const runway = monthlyBurnAud > 0 ? cashValue / monthlyBurnAud : 0

  // Find largest holding
  const largestHolding = sortedItems[0]
  const largestPercent = largestHolding ? largestHolding.percent / 100 : 0

  return (
    <div className="space-y-4">
      {/* Main Layout: Donut + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Donut Chart (40%) */}
        <div className="lg:col-span-2 flex items-center justify-center">
          <div className="relative w-full max-w-[280px] aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedItems}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(data) => onCategoryClick?.(data.name)}
                  className="cursor-pointer focus:outline-none"
                >
                  {sortedItems.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || CATEGORY_COLORS['Other']}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      className="transition-opacity duration-200"
                      style={{
                        filter: activeIndex === index ? 'brightness(1.1) drop-shadow(0 0 8px currentColor)' : 'none',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: data.color || CATEGORY_COLORS['Other'] }}
                            />
                            <p className="font-semibold text-sm">{data.name}</p>
                          </div>
                          <p className="text-sm tabular-nums font-medium">{formatValue(data.value)}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{data.percent.toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Total Net Worth
              </div>
              <div
                className="text-2xl font-bold tabular-nums pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onCurrencyToggle}
              >
                {formatValue(total)}
              </div>
              {onCurrencyToggle && (
                <button
                  onClick={onCurrencyToggle}
                  className="pointer-events-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5 px-2 py-0.5 rounded hover:bg-muted/50"
                >
                  {displayCurrency}
                </button>
              )}
              {previousTotal && (
                <div className={`flex items-center gap-1 mt-1 text-xs tabular-nums ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}{formatPercent(changePercent)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Breakdown Table (60%) */}
        <div className="lg:col-span-3">
          <div className="space-y-1">
            {sortedItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onCategoryClick?.(item.name)}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                {/* Color Dot + Category */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color || CATEGORY_COLORS['Other'] }}
                  />
                  <span className="text-sm font-medium text-left">{item.name}</span>
                </div>

                {/* Value */}
                <div className="flex-1 text-sm font-semibold tabular-nums text-right">
                  {formatValue(item.value)}
                </div>

                {/* Percentage */}
                <div className="w-14 text-xs text-muted-foreground tabular-nums text-right">
                  {item.percent.toFixed(1)}%
                </div>

                {/* Bar */}
                <div className="w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color || CATEGORY_COLORS['Other'],
                      opacity: activeIndex === null || activeIndex === idx ? 1 : 0.4,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border/40">
        {/* Liquid vs Illiquid */}
        <div className="text-xs space-y-0.5">
          <div className="text-muted-foreground">Liquid vs Illiquid</div>
          <div className="font-medium tabular-nums">
            {formatPercent(liquidPercent)} liquid ({formatValue(liquidValue)})
            {' • '}
            {formatPercent(1 - liquidPercent)} illiquid ({formatValue(illiquidValue)})
          </div>
        </div>

        {/* Crypto Exposure */}
        <div className="text-xs space-y-0.5">
          <div className="text-muted-foreground">Crypto Exposure</div>
          <div className={`font-medium tabular-nums flex items-center gap-1 ${
            cryptoPercent > 0.7 ? 'text-warning' : ''
          }`}>
            {formatPercent(cryptoPercent)} crypto exposure
            {cryptoPercent > 0.7 && (
              <AlertTriangle className="h-3 w-3" />
            )}
          </div>
        </div>

        {/* Cash Runway */}
        <div className="text-xs space-y-0.5">
          <div className="text-muted-foreground">Cash Runway</div>
          <div className="font-medium tabular-nums">
            {runway.toFixed(1)} months at current burn
          </div>
        </div>

        {/* Largest Holding */}
        <div className="text-xs space-y-0.5">
          <div className="text-muted-foreground">Largest Allocation</div>
          <div className={`font-medium tabular-nums flex items-center gap-1 ${
            largestPercent > 0.25 ? 'text-warning' : ''
          }`}>
            {largestHolding?.name} is {formatPercent(largestPercent)}
            {largestPercent > 0.25 && (
              <AlertTriangle className="h-3 w-3" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
