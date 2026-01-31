import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const entries = await prisma.journalEntry.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Failed to fetch journal entries:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetName } = body

    if (!assetName || typeof assetName !== 'string' || !assetName.trim()) {
      return NextResponse.json(
        { error: 'Asset name is required' },
        { status: 400 }
      )
    }

    // Check if limit of 100 journal entries has been reached
    const count = await prisma.journalEntry.count()
    if (count >= 100) {
      return NextResponse.json(
        { error: 'Maximum limit of 100 journal entries reached' },
        { status: 400 }
      )
    }

    const entry = await prisma.journalEntry.create({
      data: {
        assetName: assetName.trim()
      }
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to create journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
}
