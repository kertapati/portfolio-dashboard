import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS, AppSettings } from '@/types'

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    const settingsObj: Partial<AppSettings> = {}
    for (const setting of settings) {
      try {
        settingsObj[setting.key as keyof AppSettings] = JSON.parse(setting.value)
      } catch {
        // ignore invalid JSON
      }
    }

    const merged = { ...DEFAULT_SETTINGS, ...settingsObj }

    return NextResponse.json(merged)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      })
    }

    const updated = await GET()
    return updated
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
