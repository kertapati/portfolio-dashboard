import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const wallets = await prisma.wallet.findMany({
      include: {
        evmAllowlist: true,
        solAllowlist: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(wallets)
  } catch (error) {
    console.error('Failed to fetch wallets:', error)
    // Return empty array on error so frontend doesn't break
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chainType, address, label } = body

    if (!chainType || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (chainType !== 'EVM' && chainType !== 'SOL') {
      return NextResponse.json(
        { error: 'Invalid chain type' },
        { status: 400 }
      )
    }

    const wallet = await prisma.wallet.create({
      data: {
        chainType,
        address: chainType === 'EVM' ? address.toLowerCase() : address,
        label: label || null,
      },
      include: {
        evmAllowlist: true,
        solAllowlist: true,
      }
    })

    return NextResponse.json(wallet)
  } catch (error) {
    console.error('Failed to create wallet:', error)
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    )
  }
}
