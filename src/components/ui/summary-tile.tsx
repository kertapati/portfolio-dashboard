import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SummaryTileProps {
  label: string
  value: string | ReactNode
  delta?: {
    value: string
    positive: boolean
  }
  subvalue?: string
  className?: string
}

export function SummaryTile({ label, value, delta, subvalue, className }: SummaryTileProps) {
  return (
    <div className={cn("financial-widget", className)}>
      <div className="text-label mb-2.5">
        {label}
      </div>
      <div className="flex items-baseline gap-2.5 mb-1">
        <div className="text-financial">
          {value}
        </div>
        {delta && (
          <div className={cn(
            "text-[13px] font-semibold tabular-nums",
            delta.positive ? "text-success" : "text-destructive"
          )}>
            {delta.value}
          </div>
        )}
      </div>
      {subvalue && (
        <div className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
          {subvalue}
        </div>
      )}
    </div>
  )
}
