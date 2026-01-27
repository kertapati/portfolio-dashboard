import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DataTableProps {
  children: ReactNode
  compact?: boolean
  className?: string
}

export function DataTable({ children, compact = true, className }: DataTableProps) {
  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className={cn(
        "w-full border-separate border-spacing-0",
        compact ? "text-[13px]" : "text-sm"
      )}>
        {children}
      </table>
    </div>
  )
}

interface DataTableHeaderProps {
  children: ReactNode
  sticky?: boolean
}

export function DataTableHeader({ children, sticky = false }: DataTableHeaderProps) {
  return (
    <thead className={cn(
      "border-b border-border/60",
      sticky && "sticky top-0 z-10 bg-background"
    )}>
      {children}
    </thead>
  )
}

interface DataTableBodyProps {
  children: ReactNode
}

export function DataTableBody({ children }: DataTableBodyProps) {
  return (
    <tbody>
      {children}
    </tbody>
  )
}

interface DataTableFooterProps {
  children: ReactNode
}

export function DataTableFooter({ children }: DataTableFooterProps) {
  return (
    <tfoot className="border-t-2 border-border/80 bg-muted/20">
      {children}
    </tfoot>
  )
}

interface DataTableRowProps {
  children: ReactNode
  className?: string
}

export function DataTableRow({ children, className }: DataTableRowProps) {
  return (
    <tr className={cn(
      "border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20",
      className
    )}>
      {children}
    </tr>
  )
}

interface DataTableHeadProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export function DataTableHead({ children, className, align = 'left' }: DataTableHeadProps) {
  return (
    <th className={cn(
      "px-3 py-2 font-medium text-[11px] uppercase tracking-wide text-muted-foreground",
      align === 'right' && "text-right",
      align === 'center' && "text-center",
      className
    )}>
      {children}
    </th>
  )
}

interface DataTableCellProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export function DataTableCell({ children, className, align = 'left' }: DataTableCellProps) {
  return (
    <td className={cn(
      "px-3 py-2.5",
      align === 'right' && "text-right tabular-nums",
      align === 'center' && "text-center",
      className
    )}>
      {children}
    </td>
  )
}
