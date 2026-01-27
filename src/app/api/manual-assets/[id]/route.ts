import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, name, valueAud, currency, quantity, notes, investmentDate, investmentAmount, investmentValuation, tradfiSystem, exposureType } = body

    const asset = await prisma.manualAsset.update({
      where: { id },
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
        tradfiSystem: tradfiSystem !== undefined ? tradfiSystem : false,
        exposureType: exposureType !== undefined ? (exposureType || null) : null,
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Failed to update manual asset:', error)
    return NextResponse.json(
      { error: 'Failed to update manual asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.manualAsset.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete manual asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete manual asset' },
      { status: 500 }
    )
  }
}
