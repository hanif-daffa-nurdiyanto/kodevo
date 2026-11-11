import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { classifyTopicConfidence, fetchTopicContext, buildSearchQuery } from "@/lib/ai"

const FORCE_SERP_KEYWORDS = [
  "claude code", "claude ai", "cursor ", "windsurf", "copilot",
  "gemini cli", "vibe coding", "ai coding", "lovable", "bolt.new",
  "v0.dev", "devin", "replit agent", "github copilot", "codeium",
  "supermaven", "continue.dev", "aider", "sweep ai",
]

export async function POST(req: NextRequest) {
  await requireAdmin()
  const { topicTitle, learningObjective } = await req.json()

  const titleLower = (topicTitle ?? "").toLowerCase()
  const keywordMatch = FORCE_SERP_KEYWORDS.find((kw) => titleLower.includes(kw)) ?? null
  const forceSerp = !!keywordMatch

  let confident: boolean | null = null
  if (!forceSerp) {
    confident = await classifyTopicConfidence(topicTitle, learningObjective ?? "")
  }

  const needsSerp = forceSerp || confident === false
  const searchQuery = needsSerp ? buildSearchQuery(topicTitle) : null
  let serpResult: string | null = null
  if (needsSerp) {
    serpResult = await fetchTopicContext(topicTitle)
  }

  return NextResponse.json({
    topicTitle,
    steps: {
      keywordMatch,
      forceSerp,
      classifierResult: forceSerp ? "skipped (force serp)" : confident ? "confident ✓" : "not confident",
      needsSerp,
      searchQuery,
      serpFetched: needsSerp,
      serpSuccess: serpResult !== null,
      serpPreview: serpResult ? serpResult.slice(0, 800) + "..." : null,
    },
  })
}
