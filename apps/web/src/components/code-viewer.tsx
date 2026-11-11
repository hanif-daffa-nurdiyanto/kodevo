"use client"

import { Fragment } from "react"
import { AlertCircle, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react"
import { cn } from "@kodevo/utils"

export type ReviewComment = {
  line: number
  type: "error" | "warning" | "suggestion" | "good"
  title: string
  message: string
}

const COMMENT_STYLE = {
  error:      { bg: "bg-red-950/40",     border: "border-l-red-500",     text: "text-red-400",     icon: AlertCircle },
  warning:    { bg: "bg-yellow-950/40",  border: "border-l-yellow-500",  text: "text-yellow-400",  icon: AlertTriangle },
  suggestion: { bg: "bg-blue-950/40",    border: "border-l-blue-500",    text: "text-blue-400",    icon: Lightbulb },
  good:       { bg: "bg-emerald-950/40", border: "border-l-emerald-500", text: "text-emerald-400", icon: CheckCircle2 },
} as const

const TYPE_LABEL = {
  error: "Error", warning: "Perhatian", suggestion: "Saran", good: "Bagus",
} as const

const HIGHLIGHT_BG: Record<string, string> = {
  error: "bg-red-950/30", warning: "bg-yellow-950/30",
  suggestion: "bg-blue-950/30", good: "bg-emerald-950/30",
}

export function CodeViewer({ code, comments }: { code: string; comments: ReviewComment[] }) {
  const lines = code.split("\n")

  const byLine = comments.reduce<Record<number, ReviewComment[]>>((acc, c) => {
    acc[c.line] = [...(acc[c.line] ?? []), c]
    return acc
  }, {})

  const lineHighlight: Record<number, ReviewComment["type"]> = {}
  const priority: Record<string, number> = { error: 4, warning: 3, suggestion: 2, good: 1 }
  comments.forEach((c) => {
    if (!lineHighlight[c.line] || priority[c.type] > priority[lineHighlight[c.line]]) {
      lineHighlight[c.line] = c.type
    }
  })

  return (
    <div className="rounded-xl border border-border overflow-auto bg-gray-950 text-sm font-mono">
      {lines.map((line, i) => {
        const lineNum = i + 1
        const lineComments = byLine[lineNum]
        const hl = lineHighlight[lineNum]
        return (
          <Fragment key={lineNum}>
            <div className={cn("flex min-w-0", hl && HIGHLIGHT_BG[hl])}>
              <span className="w-10 shrink-0 select-none border-r border-gray-800 py-0.5 pr-2 text-right text-xs text-gray-600">
                {lineNum}
              </span>
              <pre className="flex-1 overflow-x-auto px-3 py-0.5 text-gray-200 whitespace-pre">
                {line || " "}
              </pre>
            </div>
            {lineComments?.map((c, ci) => {
              const s = COMMENT_STYLE[c.type]
              const Icon = s.icon
              return (
                <div key={ci} className={cn("flex gap-3 border-l-4 px-4 py-2.5 ml-10", s.bg, s.border)}>
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", s.text)} />
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold", s.text)}>
                      {TYPE_LABEL[c.type]}: {c.title}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{c.message}</p>
                  </div>
                </div>
              )
            })}
          </Fragment>
        )
      })}
    </div>
  )
}
