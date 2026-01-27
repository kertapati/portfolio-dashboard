import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function parseDate(dateStr: string): Date {
  // Try DD/M/YYYY format first (e.g., "25/7/2023")
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // Fallback to standard Date parsing for ISO dates
  return new Date(dateStr)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { snapshots } = body

    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return NextResponse.json(
        { error: 'Invalid snapshots data' },
        { status: 400 }
      )
    }

    // Import snapshots
    const imported = []
    for (const snap of snapshots) {
      const { date, totalAud, fxUsdAud } = snap

      if (!date || !totalAud) {
        continue
      }

      const createdSnapshot = await prisma.snapshot.create({
        data: {
          createdAt: parseDate(date),
          fxUsdAud: fxUsdAud || 1.50,
          totalAud: parseFloat(totalAud),
          cashAud: 0,
          cryptoAud: 0,
          collectiblesAud: 0,
          evmTotalAud: 0,
          solTotalAud: 0,
          manualTotalAud: parseFloat(totalAud),
        }
      })

      imported.push(createdSnapshot)
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      snapshots: imported
    })
  } catch (error) {
    console.error('Failed to import snapshots:', error)
    return NextResponse.json(
      { error: 'Failed to import snapshots' },
      { status: 500 }
    )
  }
}
