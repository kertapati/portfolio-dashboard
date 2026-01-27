import { cn } from '@/lib/utils'
import { LiquidityTier } from '@/types'

interface TagProps {
  tier: LiquidityTier
  className?: string
}

const tierStyles = {
  IMMEDIATE: 'badge-immediate',
  FAST: 'badge-fast',
  SLOW: 'badge-slow',
}

export function Tag({ tier, className }: TagProps) {
  return (
    <span className={cn(
      tierStyles[tier],
      "uppercase tracking-wide",
      className
    )}>
      {tier}
    </span>
  )
}
