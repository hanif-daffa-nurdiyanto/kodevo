import { cn } from "@kodevo/utils"

interface MiniBarChartProps {
  data: { label: string; count: number }[]
  color?: string
  height?: number
  startLabel?: string
  midLabel?: string
  endLabel?: string
}

export function MiniBarChart({
  data,
  color = "bg-blue-500",
  height = 80,
  startLabel,
  midLabel,
  endLabel,
}: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div>
      <div className={cn("flex items-end gap-[2px]")} style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end group relative">
            <div
              className={cn("w-full rounded-[2px] opacity-60 group-hover:opacity-100 transition-opacity cursor-default", color)}
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 5 : 1.5)}%` }}
            />
            {d.count > 0 && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                  {d.label}: <span className="font-semibold">{d.count}</span>
                </div>
                <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-[3px]" />
              </div>
            )}
          </div>
        ))}
      </div>
      {(startLabel || midLabel || endLabel) && (
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>{startLabel}</span>
          <span>{midLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  )
}
