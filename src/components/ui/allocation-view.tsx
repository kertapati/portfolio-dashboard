'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface AllocationItem {
  name: string
  value: number
  color?: string
}

interface AllocationViewProps {
  items: AllocationItem[]
  total: number
  formatValue: (value: number) => string
  formatPercent: (percent: number) => string
}

export function AllocationView({ items, total, formatValue, formatPercent }: AllocationViewProps) {
  // Sort by value descending and prepare data for pie chart
  const sortedItems = [...items].sort((a, b) => b.value - a.value)

  const chartData = sortedItems.map((item, idx) => ({
    name: item.name,
    value: item.value,
    percent: total > 0 ? (item.value / total) * 100 : 0,
    color: getAllocationColor(idx, sortedItems.length),
  }))

  return (
    <div className="space-y-6">
      {/* Pie Chart */}
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-sm">{data.name}</p>
                      <p className="text-sm tabular-nums">{formatValue(data.value)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{data.percent.toFixed(1)}%</p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend List */}
      <div className="space-y-2.5">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-sm font-semibold tabular-nums">{formatValue(item.value)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{item.percent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Professional color palette with good contrast and visual appeal
function getAllocationColor(index: number, total: number): string {
  const colors = [
    'hsl(189, 75%, 50%)',  // Cyan/Teal - Primary accent
    'hsl(217, 71%, 53%)',  // Blue
    'hsl(142, 55%, 48%)',  // Green
    'hsl(38, 75%, 55%)',   // Orange/Amber
    'hsl(271, 55%, 58%)',  // Purple
    'hsl(348, 83%, 58%)',  // Pink/Red
    'hsl(45, 93%, 58%)',   // Yellow
    'hsl(158, 64%, 52%)',  // Teal-green
  ]
  return colors[index % colors.length]
}
