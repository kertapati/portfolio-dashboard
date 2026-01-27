import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const snapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.snapshot.count()

    return NextResponse.json({ snapshots, total })
  } catch (error) {
    console.error('Failed to fetch snapshots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Get current portfolio state from calculate endpoint
    // Use relative URL for internal API calls to avoid network issues
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3003' // Match the dev server port
    const response = await fetch(`${baseUrl}/api/calculate`, {
      // Add timeout to prevent hanging (90 seconds for slow blockchain calls)
      signal: AbortSignal.timeout(90000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to calculate portfolio data' },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.snapshot) {
      return NextResponse.json(
        { error: 'No portfolio data available' },
        { status: 500 }
      )
    }

    const currentSnapshot = data.snapshot

    // Create snapshot in database with transaction for better performance
    const snapshot = await prisma.snapshot.create({
      data: {
        fxUsdAud: currentSnapshot.fxUsdAud,
        totalAud: currentSnapshot.totalAud,
        cashAud: currentSnapshot.cashAud,
        cryptoAud: currentSnapshot.cryptoAud,
        collectiblesAud: currentSnapshot.collectiblesAud,
        evmTotalAud: currentSnapshot.evmTotalAud,
        solTotalAud: currentSnapshot.solTotalAud,
        manualTotalAud: currentSnapshot.manualTotalAud,
        holdings: {
          create: currentSnapshot.holdings.map((h: any) => ({
            assetKey: h.assetKey,
            source: h.source,
            walletId: h.walletId,
            symbol: h.symbol,
            quantity: h.quantity,
            priceUsd: h.priceUsd,
            valueAud: h.valueAud,
            liquidityTier: h.liquidityTier,
            exposureType: h.exposureType,
          })),
        },
      },
      include: {
        holdings: true,
      },
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Failed to create snapshot:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to create snapshot: ${errorMessage}` },
      { status: 500 }
    )
  }
}
