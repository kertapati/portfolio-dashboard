interface Snapshot {
  id: string
  createdAt: string
  totalAud: number
}

export interface PortfolioMetrics {
  currentNetWorth: number
  allTimeHigh: { value: number; date: string }
  allTimeLow: { value: number; date: string }
  totalChange: { value: number; percent: number }
  cagr: number
}

export interface PeriodReturn {
  period: string
  start: number
  end: number
  change: number
  percent: number
}

export interface RiskMetrics {
  maxDrawdown: { percent: number; peak: number; trough: number; peakDate: string; troughDate: string }
  currentDrawdown: number
  bestMonth: { value: number; date: string }
  worstMonth: { value: number; date: string }
  avgMonthlyChange: number
  monthsUp: number
  monthsDown: number
}

export interface DrawdownPoint {
  date: string
  drawdown: number
}

export interface MonthlyReturn {
  year: number
  month: number
  return: number
}

export function calculatePortfolioMetrics(snapshots: Snapshot[]): PortfolioMetrics {
  if (snapshots.length === 0) {
    return {
      currentNetWorth: 0,
      allTimeHigh: { value: 0, date: '' },
      allTimeLow: { value: 0, date: '' },
      totalChange: { value: 0, percent: 0 },
      cagr: 0,
    }
  }

  const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const current = sorted[sorted.length - 1]
  const first = sorted[0]

  // Find ATH and ATL
  let ath = sorted[0]
  let atl = sorted[0]
  for (const snapshot of sorted) {
    if (snapshot.totalAud > ath.totalAud) ath = snapshot
    if (snapshot.totalAud < atl.totalAud) atl = snapshot
  }

  // Calculate CAGR
  const startDate = new Date(first.createdAt)
  const endDate = new Date(current.createdAt)
  const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const cagr = years > 0 ? (Math.pow(current.totalAud / first.totalAud, 1 / years) - 1) * 100 : 0

  return {
    currentNetWorth: current.totalAud,
    allTimeHigh: { value: ath.totalAud, date: ath.createdAt },
    allTimeLow: { value: atl.totalAud, date: atl.createdAt },
    totalChange: {
      value: current.totalAud - first.totalAud,
      percent: first.totalAud > 0 ? ((current.totalAud - first.totalAud) / first.totalAud) * 100 : 0,
    },
    cagr,
  }
}

export function calculatePeriodReturns(snapshots: Snapshot[]): PeriodReturn[] {
  if (snapshots.length === 0) return []

  const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const current = sorted[sorted.length - 1]
  const now = new Date(current.createdAt)

  const periods = [
    { name: 'Last 7 days', days: 7 },
    { name: 'Last 30 days', days: 30 },
    { name: 'Last 90 days', days: 90 },
    { name: 'Last 12 months', days: 365 },
  ]

  const returns: PeriodReturn[] = []

  for (const period of periods) {
    const targetDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000)

    // Find closest snapshot to target date
    let closest = sorted[0]
    for (const snapshot of sorted) {
      const snapshotDate = new Date(snapshot.createdAt)
      if (snapshotDate <= targetDate) {
        closest = snapshot
      } else {
        break
      }
    }

    if (closest && closest.id !== current.id) {
      const change = current.totalAud - closest.totalAud
      const percent = closest.totalAud > 0 ? (change / closest.totalAud) * 100 : 0
      returns.push({
        period: period.name,
        start: closest.totalAud,
        end: current.totalAud,
        change,
        percent,
      })
    }
  }

  // Add "Since inception"
  const first = sorted[0]
  if (first.id !== current.id) {
    const change = current.totalAud - first.totalAud
    const percent = first.totalAud > 0 ? (change / first.totalAud) * 100 : 0
    returns.push({
      period: 'Since inception',
      start: first.totalAud,
      end: current.totalAud,
      change,
      percent,
    })
  }

  return returns
}

export function calculateRiskMetrics(snapshots: Snapshot[]): RiskMetrics {
  if (snapshots.length < 2) {
    return {
      maxDrawdown: { percent: 0, peak: 0, trough: 0, peakDate: '', troughDate: '' },
      currentDrawdown: 0,
      bestMonth: { value: 0, date: '' },
      worstMonth: { value: 0, date: '' },
      avgMonthlyChange: 0,
      monthsUp: 0,
      monthsDown: 0,
    }
  }

  const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Calculate max drawdown
  let maxDrawdown = { percent: 0, peak: 0, trough: 0, peakDate: '', troughDate: '' }
  let peak = sorted[0]

  for (const snapshot of sorted) {
    if (snapshot.totalAud > peak.totalAud) {
      peak = snapshot
    }

    const drawdown = peak.totalAud > 0 ? ((snapshot.totalAud - peak.totalAud) / peak.totalAud) * 100 : 0
    if (drawdown < maxDrawdown.percent) {
      maxDrawdown = {
        percent: drawdown,
        peak: peak.totalAud,
        trough: snapshot.totalAud,
        peakDate: peak.createdAt,
        troughDate: snapshot.createdAt,
      }
    }
  }

  // Calculate current drawdown
  const ath = sorted.reduce((max, s) => (s.totalAud > max.totalAud ? s : max), sorted[0])
  const current = sorted[sorted.length - 1]
  const currentDrawdown = ath.totalAud > 0 ? ((current.totalAud - ath.totalAud) / ath.totalAud) * 100 : 0

  // Calculate monthly changes
  const monthlyChanges: Array<{ value: number; date: string }> = []
  for (let i = 1; i < sorted.length; i++) {
    const change = sorted[i].totalAud - sorted[i - 1].totalAud
    monthlyChanges.push({ value: change, date: sorted[i].createdAt })
  }

  const bestMonth = monthlyChanges.reduce((max, m) => (m.value > max.value ? m : max), monthlyChanges[0] || { value: 0, date: '' })
  const worstMonth = monthlyChanges.reduce((min, m) => (m.value < min.value ? m : min), monthlyChanges[0] || { value: 0, date: '' })
  const avgMonthlyChange = monthlyChanges.length > 0 ? monthlyChanges.reduce((sum, m) => sum + m.value, 0) / monthlyChanges.length : 0
  const monthsUp = monthlyChanges.filter(m => m.value > 0).length
  const monthsDown = monthlyChanges.filter(m => m.value < 0).length

  return {
    maxDrawdown,
    currentDrawdown,
    bestMonth,
    worstMonth,
    avgMonthlyChange,
    monthsUp,
    monthsDown,
  }
}

export function calculateDrawdownSeries(snapshots: Snapshot[]): DrawdownPoint[] {
  if (snapshots.length === 0) return []

  const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const drawdowns: DrawdownPoint[] = []
  let peak = sorted[0]

  for (const snapshot of sorted) {
    if (snapshot.totalAud > peak.totalAud) {
      peak = snapshot
    }

    const drawdown = peak.totalAud > 0 ? ((snapshot.totalAud - peak.totalAud) / peak.totalAud) * 100 : 0
    drawdowns.push({
      date: new Date(snapshot.createdAt).toLocaleDateString(),
      drawdown,
    })
  }

  return drawdowns
}

export function calculateMonthlyReturns(snapshots: Snapshot[]): MonthlyReturn[] {
  if (snapshots.length === 0) return []

  const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // Group snapshots by month
  const monthlyGroups: Map<string, Snapshot[]> = new Map()

  sorted.forEach(snapshot => {
    const date = new Date(snapshot.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!monthlyGroups.has(key)) {
      monthlyGroups.set(key, [])
    }
    monthlyGroups.get(key)!.push(snapshot)
  })

  // Convert to array and sort by date
  const monthlyEntries = Array.from(monthlyGroups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))

  const monthlyReturns: MonthlyReturn[] = []

  for (let i = 1; i < monthlyEntries.length; i++) {
    const [prevKey, prevSnapshots] = monthlyEntries[i - 1]
    const [currKey, currSnapshots] = monthlyEntries[i]

    // Use last snapshot of each month
    const prevSnapshot = prevSnapshots[prevSnapshots.length - 1]
    const currSnapshot = currSnapshots[currSnapshots.length - 1]

    const returnValue = prevSnapshot.totalAud > 0
      ? ((currSnapshot.totalAud - prevSnapshot.totalAud) / prevSnapshot.totalAud) * 100
      : 0

    const currDate = new Date(currSnapshot.createdAt)
    monthlyReturns.push({
      year: currDate.getFullYear(),
      month: currDate.getMonth(),
      return: returnValue,
    })
  }

  return monthlyReturns
}

export function filterSnapshotsByTimeRange(snapshots: Snapshot[], range: '1M' | '3M' | '6M' | '1Y' | 'ALL'): Snapshot[] {
  if (range === 'ALL' || snapshots.length === 0) return snapshots

  const sorted = [...snapshots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const latest = new Date(sorted[0].createdAt)

  const daysMap = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  }

  const cutoffDate = new Date(latest.getTime() - daysMap[range] * 24 * 60 * 60 * 1000)

  return snapshots.filter(s => new Date(s.createdAt) >= cutoffDate)
}
