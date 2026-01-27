import { prisma } from './db'

const COINGECKO_IDS: Record<string, string> = {
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'WETH': 'weth',
  'WBTC': 'wrapped-bitcoin',
  'stETH': 'staked-ether',
  'cbETH': 'coinbase-wrapped-staked-eth',
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const RATE_LIMIT_DELAY_MS = 60 * 1000 // 60 seconds

interface PriceResult {
  priceUsd: number | null
  cached: boolean
}

export async function getTokenPrice(
  symbol: string,
  coingeckoIdOverride?: string | null
): Promise<PriceResult> {
  const assetKey = `crypto:${symbol}`

  const cached = await prisma.priceCache.findUnique({
    where: { assetKey }
  })

  const now = new Date()
  const cacheValid = cached && (now.getTime() - cached.fetchedAt.getTime() < CACHE_DURATION_MS)

  if (cacheValid && cached) {
    return { priceUsd: cached.priceUsd, cached: true }
  }

  const coingeckoId = coingeckoIdOverride || COINGECKO_IDS[symbol]

  if (!coingeckoId) {
    return { priceUsd: null, cached: false }
  }

  try {
    const price = await fetchCoinGeckoPrice(coingeckoId)

    if (price !== null) {
      await prisma.priceCache.upsert({
        where: { assetKey },
        update: {
          priceUsd: price,
          fetchedAt: now,
          symbol,
          coingeckoId,
        },
        create: {
          assetKey,
          symbol,
          coingeckoId,
          priceUsd: price,
          fetchedAt: now,
        }
      })
    }

    return { priceUsd: price, cached: false }
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error)

    if (cached) {
      console.warn(`Using stale price for ${symbol}`)
      return { priceUsd: cached.priceUsd, cached: true }
    }

    return { priceUsd: null, cached: false }
  }
}

export async function getBatchPrices(
  tokens: Array<{ symbol: string; coingeckoId?: string | null }>
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>()

  const uncachedTokens: Array<{ symbol: string; coingeckoId: string }> = []

  for (const token of tokens) {
    const assetKey = `crypto:${token.symbol}`
    const cached = await prisma.priceCache.findUnique({
      where: { assetKey }
    })

    const now = new Date()
    const cacheValid = cached && (now.getTime() - cached.fetchedAt.getTime() < CACHE_DURATION_MS)

    if (cacheValid && cached) {
      results.set(token.symbol, cached.priceUsd)
    } else {
      const coingeckoId = token.coingeckoId || COINGECKO_IDS[token.symbol]
      if (coingeckoId) {
        uncachedTokens.push({ symbol: token.symbol, coingeckoId })
      } else {
        results.set(token.symbol, null)
      }
    }
  }

  if (uncachedTokens.length > 0) {
    const coingeckoIds = uncachedTokens.map(t => t.coingeckoId).join(',')

    try {
      const prices = await fetchCoinGeckoBatchPrices(coingeckoIds)

      for (const token of uncachedTokens) {
        const price = prices.get(token.coingeckoId) ?? null
        results.set(token.symbol, price)

        if (price !== null) {
          const assetKey = `crypto:${token.symbol}`
          await prisma.priceCache.upsert({
            where: { assetKey },
            update: {
              priceUsd: price,
              fetchedAt: new Date(),
              symbol: token.symbol,
              coingeckoId: token.coingeckoId,
            },
            create: {
              assetKey,
              symbol: token.symbol,
              coingeckoId: token.coingeckoId,
              priceUsd: price,
              fetchedAt: new Date(),
            }
          })
        }
      }
    } catch (error) {
      console.error('Batch price fetch failed:', error)

      for (const token of uncachedTokens) {
        const assetKey = `crypto:${token.symbol}`
        const cached = await prisma.priceCache.findUnique({
          where: { assetKey }
        })

        if (cached) {
          console.warn(`Using stale price for ${token.symbol}`)
          results.set(token.symbol, cached.priceUsd)
        } else {
          results.set(token.symbol, null)
        }
      }
    }
  }

  return results
}

async function fetchCoinGeckoPrice(coingeckoId: string): Promise<number | null> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`

  const response = await fetch(url)

  if (response.status === 429) {
    console.warn('CoinGecko rate limit hit, waiting...')
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS))

    const retryResponse = await fetch(url)
    if (!retryResponse.ok) {
      throw new Error(`CoinGecko API error: ${retryResponse.status}`)
    }

    const retryData = await retryResponse.json()
    return retryData[coingeckoId]?.usd ?? null
  }

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  const data = await response.json()
  return data[coingeckoId]?.usd ?? null
}

async function fetchCoinGeckoBatchPrices(coingeckoIds: string): Promise<Map<string, number>> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`

  const response = await fetch(url)

  if (response.status === 429) {
    console.warn('CoinGecko rate limit hit, waiting...')
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS))

    const retryResponse = await fetch(url)
    if (!retryResponse.ok) {
      throw new Error(`CoinGecko API error: ${retryResponse.status}`)
    }

    const retryData = await retryResponse.json()
    const prices = new Map<string, number>()
    for (const [id, data] of Object.entries(retryData)) {
      if (typeof data === 'object' && data !== null && 'usd' in data) {
        prices.set(id, (data as { usd: number }).usd)
      }
    }
    return prices
  }

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  const data = await response.json()
  const prices = new Map<string, number>()

  for (const [id, priceData] of Object.entries(data)) {
    if (typeof priceData === 'object' && priceData !== null && 'usd' in priceData) {
      prices.set(id, (priceData as { usd: number }).usd)
    }
  }

  return prices
}
