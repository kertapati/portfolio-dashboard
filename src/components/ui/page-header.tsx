import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  rightControls?: ReactNode
}

export function PageHeader({ title, subtitle, rightControls }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-page-title">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </div>
      {rightControls && (
        <div className="flex items-center gap-2">
          {rightControls}
        </div>
      )}
    </div>
  )
}
