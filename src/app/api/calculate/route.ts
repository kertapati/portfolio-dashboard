import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS, WalletError, AppSettings, WalletWithAllowlist } from '@/types'
import { fetchEvmWalletBalances } from '@/lib/evm'
import { fetchSolanaWalletBalances } from '@/lib/solana'
import { fetchHyperliquidData } from '@/lib/hyperliquid'
import { fetchAlchemyTokenBalances, fetchAlchemyEthBalance } from '@/lib/alchemy'
import { getBatchPrices } from '@/lib/coingecko'
import { determineLiquidityTier, determineExposureType } from '@/lib/calculations'

export async function GET() {
  try {
    const settingsRecords = await prisma.setting.findMany()
    const settingsObj: Partial<AppSettings> = {}
    for (const setting of settingsRecords) {
      try {
        settingsObj[setting.key as keyof AppSettings] = JSON.parse(setting.value)
      } catch {
        // ignore
      }
    }
    const settings = { ...DEFAULT_SETTINGS, ...settingsObj }

    const wallets = await prisma.wallet.findMany({
      include: {
        evmAllowlist: true,
        solAllowlist: true,
      }
    })

    const manualAssets = await prisma.manualAsset.findMany()

    const allHoldings: Array<{
      assetKey: string
      source: string
      walletId: string | null
      symbol: string
      quantity: number
      priceUsd: number | null
      valueAud: number
      liquidityTier: string
      exposureType: string
    }> = []

    const perpPositions: Array<{
      walletId: string
      address: string
      coin: string
      szi: string
      direction: 'LONG' | 'SHORT'
      entryPx: string
      positionValue: string
      unrealizedPnl: string
    }> = []

    const errors: WalletError[] = []

    const cryptoSymbols = new Set<string>()

    // Check if Alchemy API key is available
    const alchemyApiKey = process.env.ALCHEMY_API_KEY
    const useAlchemy = alchemyApiKey && alchemyApiKey.length > 0

    for (const wallet of wallets) {
      if (wallet.chainType === 'EVM') {
        try {
          if (useAlchemy) {
            // Use Alchemy for automatic token discovery
            const tokens = await fetchAlchemyTokenBalances(wallet.address, alchemyApiKey, 'eth-mainnet')

            // Also fetch native ETH balance
            const ethBalanceHex = await fetchAlchemyEthBalance(wallet.address, alchemyApiKey, 'eth-mainnet')
            const ethBalance = parseInt(ethBalanceHex, 16) / 1e18

            // Add ETH if non-zero
            if (ethBalance > 0) {
              cryptoSymbols.add('ETH')
              allHoldings.push({
                assetKey: `evm:ETH:${wallet.address}`,
                source: 'EVM',
                walletId: wallet.id,
                symbol: 'ETH',
                quantity: ethBalance,
                priceUsd: null,
                valueAud: 0,
                liquidityTier: determineLiquidityTier('ETH', settings),
                exposureType: determineExposureType('ETH', 'EVM', settings),
              })
            }

            // Add all ERC-20 tokens
            for (const token of tokens) {
              const quantity = parseInt(token.balance, 16) / Math.pow(10, token.decimals)
              if (quantity > 0) {
                cryptoSymbols.add(token.symbol)
                allHoldings.push({
                  assetKey: `evm:${token.contractAddress}:${wallet.address}`,
                  source: 'EVM',
                  walletId: wallet.id,
                  symbol: token.symbol,
                  quantity,
                  priceUsd: null,
                  valueAud: 0,
                  liquidityTier: determineLiquidityTier(token.symbol, settings),
                  exposureType: determineExposureType(token.symbol, 'EVM', settings),
                })
              }
            }
          } else {
            // Fallback to manual allowlist approach
            const holdings = await fetchEvmWalletBalances(wallet as WalletWithAllowlist, settings.evmRpcUrls)

            for (const holding of holdings) {
              cryptoSymbols.add(holding.symbol)
            }

            allHoldings.push(...holdings.map(h => ({
              assetKey: h.assetKey,
              source: 'EVM',
              walletId: wallet.id,
              symbol: h.symbol,
              quantity: h.quantity,
              priceUsd: null,
              valueAud: 0,
              liquidityTier: determineLiquidityTier(h.symbol, settings),
              exposureType: determineExposureType(h.symbol, 'EVM', settings),
            })))
          }
        } catch (error) {
          errors.push({
            walletId: wallet.id,
            address: wallet.address,
            chainType: 'EVM',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    for (const wallet of wallets.filter(w => w.chainType === 'SOL')) {
      const solAllowlistTokens = wallet.solAllowlist.map(t => ({
        symbol: t.symbol || t.mintAddress.slice(0, 8),
        coingeckoId: t.coingeckoId || null,
      }))

      for (const token of solAllowlistTokens) {
        cryptoSymbols.add(token.symbol)
      }
    }

    const prices = await getBatchPrices(
      Array.from(cryptoSymbols).map(symbol => ({ symbol }))
    )

    for (const wallet of wallets.filter(w => w.chainType === 'SOL')) {
      try {
        const holdings = await fetchSolanaWalletBalances(wallet as WalletWithAllowlist, settings.solanaRpcUrls, settings, prices)

        allHoldings.push(...holdings.map(h => ({
          assetKey: h.assetKey,
          source: 'SOL',
          walletId: wallet.id,
          symbol: h.symbol,
          quantity: h.quantity,
          priceUsd: null,
          valueAud: 0,
          liquidityTier: determineLiquidityTier(h.symbol, settings),
          exposureType: determineExposureType(h.symbol, 'SOL', settings),
        })))
      } catch (error) {
        errors.push({
          walletId: wallet.id,
          address: wallet.address,
          chainType: 'SOL',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Fetch Hyperliquid spot balances and perp positions
    for (const wallet of wallets.filter(w => w.chainType === 'HYPE')) {
      try {
        const hypeData = await fetchHyperliquidData(wallet.address)

        // Add USDC and HYPE spot balances
        for (const balance of hypeData.spotBalances) {
          const quantity = parseFloat(balance.total)
          if (quantity > 0) {
            const symbol = balance.coin
            cryptoSymbols.add(symbol)

            // Determine liquidity tier
            let liquidityTier = 'FAST'
            if (symbol === 'USDC') {
              liquidityTier = 'IMMEDIATE' // Stablecoin
            } else if (symbol === 'HYPE') {
              liquidityTier = 'FAST' // HYPE token
            }

            allHoldings.push({
              assetKey: `hype:${symbol}:${wallet.address}`,
              source: 'HYPE',
              walletId: wallet.id,
              symbol,
              quantity,
              priceUsd: null,
              valueAud: 0,
              liquidityTier,
              exposureType: determineExposureType(symbol, 'HYPE', settings),
            })
          }
        }

        // Add perp positions (don't add to net worth, only show for info)
        for (const position of hypeData.perpPositions) {
          const szi = parseFloat(position.szi)
          perpPositions.push({
            walletId: wallet.id,
            address: wallet.address,
            coin: position.coin,
            szi: position.szi,
            direction: szi > 0 ? 'LONG' : 'SHORT',
            entryPx: position.entryPx,
            positionValue: position.positionValue,
            unrealizedPnl: position.unrealizedPnl,
          })
        }
      } catch (error) {
        errors.push({
          walletId: wallet.id,
          address: wallet.address,
          chainType: 'HYPE',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    for (const holding of allHoldings) {
      const priceUsd = prices.get(holding.symbol) ?? null
      holding.priceUsd = priceUsd
      holding.valueAud = priceUsd ? priceUsd * settings.fxUsdAud * holding.quantity : 0
    }

    // Get ETH price for ETH-denominated assets
    const ethPriceUsd = settingsObj.ethPriceUsd ?
      (typeof settingsObj.ethPriceUsd === 'number' ? settingsObj.ethPriceUsd : parseFloat(settingsObj.ethPriceUsd as any)) :
      (prices.get('ETH') ?? 3000) // fallback to live ETH price or 3000

    for (const asset of manualAssets) {
      const assetKey = asset.type === 'BANK' ? `bank:${asset.id}` : `collectible:${asset.id}`
      const quantity = asset.quantity !== null && asset.quantity !== undefined ? asset.quantity : 1

      // Calculate total value based on currency
      let totalValue: number
      if (asset.currency === 'ETH') {
        // For ETH-denominated assets, valueAud stores ETH amount, multiply by ETH price
        totalValue = asset.valueAud * quantity * ethPriceUsd * settings.fxUsdAud
      } else if (asset.currency === 'USD') {
        // For USD assets, valueAud stores USD amount, multiply by FX rate
        totalValue = asset.valueAud * quantity * settings.fxUsdAud
      } else {
        // For AUD assets, valueAud is already in AUD
        totalValue = asset.valueAud * quantity
      }

      // Determine liquidity tier based on asset type
      let liquidityTier: string = 'SLOW'
      if (asset.type === 'BANK' || asset.type === 'CASH' || asset.type === 'STABLECOIN' || asset.type === 'GIFTCARD') {
        liquidityTier = 'IMMEDIATE'
      } else if (asset.type === 'CRYPTO') {
        liquidityTier = 'FAST'
      } else if (asset.type === 'SUPERANNUATION') {
        liquidityTier = 'SLOW' // locked, but still in SLOW category
      } else if (asset.type === 'CAR' || asset.type === 'COLLECTIBLE' || asset.type === 'NFT' || asset.type === 'REAL_ESTATE') {
        liquidityTier = 'SLOW'
      } else if (asset.type === 'MISC') {
        liquidityTier = 'SLOW' // Miscellaneous items default to slow
      }

      // Use manual exposureType if set, otherwise auto-detect
      const exposureType = (asset as any).exposureType || determineExposureType(asset.name, asset.type, settings)

      allHoldings.push({
        assetKey,
        source: asset.type,
        walletId: null,
        symbol: asset.name,
        quantity,
        priceUsd: asset.currency === 'ETH' ? ethPriceUsd : null,
        valueAud: totalValue,
        liquidityTier,
        exposureType,
      })
    }

    const totalAud = allHoldings.reduce((sum, h) => sum + h.valueAud, 0)

    const cashAud = allHoldings
      .filter(h => h.source === 'BANK' || h.liquidityTier === 'IMMEDIATE')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const cryptoAud = allHoldings
      .filter(h => h.source === 'EVM' || h.source === 'SOL')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const collectiblesAud = allHoldings
      .filter(h => h.source === 'COLLECTIBLE')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const evmTotalAud = allHoldings
      .filter(h => h.source === 'EVM')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const solTotalAud = allHoldings
      .filter(h => h.source === 'SOL')
      .reduce((sum, h) => sum + h.valueAud, 0)

    const manualTotalAud = allHoldings
      .filter(h => h.source === 'BANK' || h.source === 'COLLECTIBLE')
      .reduce((sum, h) => sum + h.valueAud, 0)

    // Return live snapshot data without saving to database
    const liveSnapshot = {
      id: 'live',
      createdAt: new Date(),
      fxUsdAud: settings.fxUsdAud,
      totalAud,
      cashAud,
      cryptoAud,
      collectiblesAud,
      evmTotalAud,
      solTotalAud,
      manualTotalAud,
      holdings: allHoldings,
    }

    return NextResponse.json({
      snapshot: liveSnapshot,
      perpPositions,
      errors,
    })
  } catch (error) {
    console.error('Calculate failed:', error)
    return NextResponse.json(
      { error: 'Calculate failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
