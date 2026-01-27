import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const assets = await prisma.manualAsset.findMany({
      orderBy: { updatedAt: 'desc' }
    })
    return NextResponse.json(assets)
  } catch (error) {
    console.error('Failed to fetch manual assets:', error)
    // Return empty array on error so frontend doesn't break
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, valueAud, currency, quantity, notes, investmentDate, investmentAmount, investmentValuation, tradfiSystem, exposureType } = body

    if (!type || !name || valueAud === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if limit of 200 manual assets has been reached
    const count = await prisma.manualAsset.count()
    if (count >= 200) {
      return NextResponse.json(
        { error: 'Maximum limit of 200 manual assets reached' },
        { status: 400 }
      )
    }

    const asset = await prisma.manualAsset.create({
      data: {
        type,
        name,
        valueAud: parseFloat(valueAud),
        currency: currency || 'AUD',
        quantity: quantity !== null && quantity !== undefined ? parseFloat(quantity) : null,
        notes: notes || null,
        investmentDate: investmentDate ? new Date(investmentDate) : null,
        investmentAmount: investmentAmount !== null && investmentAmount !== undefined ? parseFloat(investmentAmount) : null,
        investmentValuation: investmentValuation !== null && investmentValuation !== undefined ? parseFloat(investmentValuation) : null,
        tradfiSystem: tradfiSystem || false,
        exposureType: exposureType || null,
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Failed to create manual asset:', error)
    return NextResponse.json(
      { error: 'Failed to create manual asset' },
      { status: 500 }
    )
  }
}
