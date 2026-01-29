import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-section-title">{title}</h2>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {action}
        </div>
      )}
    </div>
  )
}
