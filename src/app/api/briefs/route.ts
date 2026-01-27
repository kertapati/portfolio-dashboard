import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateWeeklyBrief, generateDeepDive } from '@/lib/report-generator'

export async function GET() {
  try {
    const briefs = await prisma.brief.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Parse the data field for each brief
    const parsed = briefs.map(brief => ({
      ...brief,
      data: brief.data ? JSON.parse(brief.data) : null,
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Failed to fetch briefs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reportType = body.type || 'weekly' // 'weekly' or 'deep-dive'

    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { holdings: true },
    })

    if (!latestSnapshot) {
      return NextResponse.json(
        { error: 'No snapshots available. Please refresh holdings first.' },
        { status: 400 }
      )
    }

    // Get the most recent snapshot before the current one (for comparison)
    const previousSnapshot = await prisma.snapshot.findFirst({
      where: {
        createdAt: {
          lt: latestSnapshot.createdAt,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { holdings: true },
    })

    // Get monthly burn rate
    const burnSetting = await prisma.setting.findUnique({
      where: { key: 'monthlyBurn' },
    })
    const monthlyBurn = burnSetting ? parseFloat(burnSetting.value) : 0

    // Get all snapshots for deep dive
    const allSnapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'asc' },
      include: { holdings: true },
    })

    // Generate report data - convert Date to string and null to undefined for compatibility
    const convertSnapshot = (s: any) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      holdings: s.holdings.map((h: any) => ({
        ...h,
        priceUsd: h.priceUsd ?? undefined
      }))
    })

    const snapshotsWithStringDates = allSnapshots.map(convertSnapshot)
    const latestWithStringDate = convertSnapshot(latestSnapshot)
    const previousWithStringDate = previousSnapshot ? convertSnapshot(previousSnapshot) : null

    const reportData = reportType === 'deep-dive'
      ? generateDeepDive(latestWithStringDate, previousWithStringDate, snapshotsWithStringDates, monthlyBurn)
      : generateWeeklyBrief(latestWithStringDate, previousWithStringDate, snapshotsWithStringDates, monthlyBurn)

    // Create brief with structured data
    const brief = await prisma.brief.create({
      data: {
        reportType,
        snapshotId: latestSnapshot.id,
        data: JSON.stringify(reportData),
        content: null, // No longer using markdown content
      },
    })

    return NextResponse.json({
      ...brief,
      data: reportData,
    })
  } catch (error) {
    console.error('Failed to generate brief:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: 'Failed to generate brief',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
