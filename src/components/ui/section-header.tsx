import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-section-title">{title}</h2>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
