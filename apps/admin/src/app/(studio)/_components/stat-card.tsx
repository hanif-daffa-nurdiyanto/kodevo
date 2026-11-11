import { cn } from "@kodevo/utils"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  iconColor?: string
  iconBg?: string
  className?: string
}

export function StatCard({ label, value, sub, icon: Icon, trend, iconColor, iconBg, className }: StatCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 tracking-wide">{label}</p>
        {Icon && (
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg ?? "bg-gray-100")}>
            <Icon className={cn("h-4 w-4", iconColor ?? "text-gray-500")} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
      {sub && (
        <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium",
          trend === "up" ? "text-emerald-600" :
          trend === "down" ? "text-red-500" :
          "text-gray-400"
        )}>
          {trend === "up" && <TrendingUp className="h-3 w-3" />}
          {trend === "down" && <TrendingDown className="h-3 w-3" />}
          {trend === "neutral" && <Minus className="h-3 w-3" />}
          <span>{sub}</span>
        </div>
      )}
    </div>
  )
}
