import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, contractAddress, mintAddress, symbol, decimals, coingeckoId } = body

    const wallet = await prisma.wallet.findUnique({
      where: { id }
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    if (type === 'EVM' && wallet.chainType === 'EVM') {
      if (!contractAddress) {
        return NextResponse.json(
          { error: 'contractAddress is required for EVM tokens' },
          { status: 400 }
        )
      }

      const token = await prisma.evmTokenAllowlist.create({
        data: {
          walletId: id,
          contractAddress: contractAddress.toLowerCase(),
          symbol: symbol || null,
          decimals: decimals ? parseInt(decimals) : null,
          coingeckoId: coingeckoId || null,
        }
      })

      return NextResponse.json(token)
    } else if (type === 'SOL' && wallet.chainType === 'SOL') {
      if (!mintAddress) {
        return NextResponse.json(
          { error: 'mintAddress is required for SOL tokens' },
          { status: 400 }
        )
      }

      const token = await prisma.solTokenAllowlist.create({
        data: {
          walletId: id,
          mintAddress,
          symbol: symbol || null,
          coingeckoId: coingeckoId || null,
        }
      })

      return NextResponse.json(token)
    } else {
      return NextResponse.json(
        { error: 'Invalid token type for wallet' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Token already in allowlist' },
        { status: 400 }
      )
    }
    console.error('Failed to add token to allowlist:', error)
    return NextResponse.json(
      { error: 'Failed to add token to allowlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('tokenId')
    const type = searchParams.get('type')

    if (!tokenId || !type) {
      return NextResponse.json(
        { error: 'tokenId and type are required' },
        { status: 400 }
      )
    }

    if (type === 'EVM') {
      await prisma.evmTokenAllowlist.delete({
        where: { id: tokenId }
      })
    } else if (type === 'SOL') {
      await prisma.solTokenAllowlist.delete({
        where: { id: tokenId }
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove token from allowlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove token from allowlist' },
      { status: 500 }
    )
  }
}
