const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info'

export interface HyperliquidSpotBalance {
  coin: string
  hold: string
  total: string
}

export interface HyperliquidPerpPosition {
  coin: string
  szi: string  // Size (positive = long, negative = short)
  entryPx: string  // Entry price
  positionValue: string
  unrealizedPnl: string
  returnOnEquity: string
}

export interface HyperliquidSpotState {
  balances: HyperliquidSpotBalance[]
}

export interface HyperliquidPerpState {
  assetPositions: Array<{
    position: HyperliquidPerpPosition
    type: string
  }>
  marginSummary: {
    accountValue: string
    totalMarginUsed: string
    totalNtlPos: string
    totalRawUsd: string
  }
  crossMarginSummary?: {
    accountValue: string
    totalMarginUsed: string
    totalNtlPos: string
    totalRawUsd: string
  }
}

export async function fetchHyperliquidSpotBalances(
  address: string
): Promise<HyperliquidSpotBalance[]> {
  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'spotClearinghouseState',
        user: address,
      }),
    })

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`)
    }

    const data: HyperliquidSpotState = await response.json()
    return data.balances || []
  } catch (error) {
    console.error('Failed to fetch Hyperliquid spot balances:', error)
    throw error
  }
}

export async function fetchHyperliquidPerpPositions(
  address: string
): Promise<{ positions: HyperliquidPerpPosition[]; marginSummary: any }> {
  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
    })

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`)
    }

    const data: HyperliquidPerpState = await response.json()

    const positions = (data.assetPositions || [])
      .map(ap => ap.position)
      .filter(pos => parseFloat(pos.szi) !== 0) // Only include non-zero positions

    return {
      positions,
      marginSummary: data.marginSummary || data.crossMarginSummary,
    }
  } catch (error) {
    console.error('Failed to fetch Hyperliquid perp positions:', error)
    throw error
  }
}

export interface HyperliquidData {
  address: string
  spotBalances: HyperliquidSpotBalance[]
  perpPositions: HyperliquidPerpPosition[]
  marginSummary: any
}

export async function fetchHyperliquidData(address: string): Promise<HyperliquidData> {
  const [spotBalances, perpData] = await Promise.all([
    fetchHyperliquidSpotBalances(address),
    fetchHyperliquidPerpPositions(address),
  ])

  return {
    address,
    spotBalances,
    perpPositions: perpData.positions,
    marginSummary: perpData.marginSummary,
  }
}
