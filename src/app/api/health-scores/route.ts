import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { calculateHealthScores } from '@/lib/portfolio-health'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get the latest snapshot
    const snapshot = await prisma.snapshot.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        holdings: true,
      },
    })

    if (!snapshot) {
      return NextResponse.json({ error: 'No snapshots found' }, { status: 404 })
    }

    // Get monthly burn rate from settings
    const burnSetting = await prisma.setting.findUnique({
      where: { key: 'monthlyBurn' },
    })
    const monthlyBurn = burnSetting ? parseFloat(burnSetting.value) : 0

    // Get all snapshots for volatility calculation
    const allSnapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        holdings: true,
      },
    })

    // Calculate health scores - convert Date to string for compatibility
    const snapshotsWithStringDates = allSnapshots.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString()
    }))

    const healthScores = calculateHealthScores(
      snapshot.holdings,
      snapshot.totalAud,
      monthlyBurn,
      snapshotsWithStringDates
    )

    return NextResponse.json(healthScores)
  } catch (error) {
    console.error('Error calculating health scores:', error)
    return NextResponse.json({ error: 'Failed to calculate health scores' }, { status: 500 })
  }
}
