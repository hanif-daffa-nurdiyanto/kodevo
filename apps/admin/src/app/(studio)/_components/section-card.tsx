import { ReactNode } from "react"
import { cn } from "@kodevo/utils"

interface SectionCardProps {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function SectionCard({ title, description, action, children, className, noPadding }: SectionCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  )
}
