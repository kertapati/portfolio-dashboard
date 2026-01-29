import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  rightControls?: ReactNode
}

export function PageHeader({ title, subtitle, rightControls }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </div>
      {rightControls && (
        <div className="flex flex-wrap items-center gap-2">
          {rightControls}
        </div>
      )}
    </div>
  )
}
