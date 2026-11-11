import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransaction, db, getAICreditDecision, InsufficientCreditError } from "@kodevo/db"
import { evaluateProjectSubmission, inferCodeLanguage } from "@/lib/ai"
import { checkAIRateLimit, incrementAIUsage, recordStreak, CREDIT_COST } from "@/lib/rate-limit"
import { PROJECT_FILE_FILTERS, isProjectLanguage } from "@/lib/exercise-utils"
import { z } from "zod"

const schema = z.object({
  repoFullName: z.string().min(1),  // e.g. "user/my-todo-app"
  branch: z.string().default("main"),
})

const XP_PER_TOPIC = 100
const XP_FIRST_ATTEMPT_BONUS = 50

async function fetchGitHubTree(
  token: string,
  repo: string,
  branch: string
): Promise<{ path: string; type: string; size?: number }[]> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  )
  if (!res.ok) throw new Error(`GitHub tree fetch failed: ${res.status}`)
  const data = await res.json()
  return data.tree ?? []
}

async function fetchFileContent(token: string, repo: string, path: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  )
  if (!res.ok) return ""
  const data = await res.json()
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
  }
  return ""
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json({ error: "Layanan AI sedang maintenance." }, { status: 503 })
  }

  const { exerciseId } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = await (sessionUser.id
    ? db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, level: true, isPremium: true, isPro: true, xp: true, githubAccessToken: true } })
    : db.user.findUnique({ where: { email: sessionUser.email! }, select: { id: true, level: true, isPremium: true, isPro: true, xp: true, githubAccessToken: true } }))
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!dbUser.githubAccessToken) {
    return NextResponse.json({ error: "GitHub belum terhubung. Hubungkan di Pengaturan → GitHub.", code: "GITHUB_NOT_CONNECTED" }, { status: 400 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { repoFullName, branch } = body.data

  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, userId: dbUser.id },
    include: {
      topic: { include: { module: { include: { track: { select: { id: true, title: true, goal: true } } } } } },
    },
  })
  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 })
  if (exercise.passed) return NextResponse.json({ error: "Soal ini sudah lulus." }, { status: 409 })

  const creditDecision = await getAICreditDecision({
    userId: dbUser.id,
    action: "PROJECT",
    trackId: exercise.topic.module.track?.id,
    moduleIsFree: exercise.topic.module.isFree,
  })
  if (!creditDecision.canAccess) {
    const status = creditDecision.reason === "TRACK_NOT_FOUND" ? 404 : 403
    const error = creditDecision.reason === "BUNDLE_REQUIRED" ? "Bundle required" : "Forbidden"
    return NextResponse.json({ error, reason: creditDecision.reason }, { status })
  }

  const rl = await checkAIRateLimit(dbUser.id, dbUser.isPremium)
  if (!rl.allowed) {
    const msg = rl.limitedBy === "weekly"
      ? "Kredit mingguan habis. Reset setiap Senin."
      : "Kredit harian habis. Coba lagi besok."
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  const language = inferCodeLanguage(
    exercise.topic.title,
    exercise.topic.description,
    exercise.topic.module.track?.title ?? "",
    exercise.topic.module.track?.goal ?? ""
  )

  if (!isProjectLanguage(language)) {
    return NextResponse.json({ error: "Exercise ini bukan tipe project." }, { status: 400 })
  }

  const filter = PROJECT_FILE_FILTERS[language]

  // 1. Get file tree
  let tree: { path: string; type: string; size?: number }[]
  try {
    tree = await fetchGitHubTree(dbUser.githubAccessToken, repoFullName, branch)
  } catch {
    return NextResponse.json({ error: "Tidak bisa mengakses repo. Pastikan repo ada dan branch benar." }, { status: 400 })
  }

  // 2. Filter relevant files
  const relevantPaths = tree
    .filter(item =>
      item.type === "blob" &&
      (item.size ?? 0) < 100_000 &&
      filter.include.some(re => re.test(item.path)) &&
      !filter.exclude.some(re => re.test(item.path))
    )
    .slice(0, filter.maxFiles)
    .map(item => item.path)

  if (relevantPaths.length === 0) {
    return NextResponse.json({ error: "Tidak ada file yang relevan ditemukan di repo." }, { status: 400 })
  }

  // 3. Fetch file contents in parallel
  const fileContents = await Promise.all(
    relevantPaths.map(async path => ({
      path,
      content: await fetchFileContent(dbUser.githubAccessToken!, repoFullName, path),
    }))
  )
  const files = fileContents.filter(f => f.content.length > 0)

  if (creditDecision.shouldDebit) {
    try {
      await applyCreditTransaction({
        userId: dbUser.id,
        type: "DEBIT",
        amount: creditDecision.debitAmount,
        action: "PROJECT",
        refId: exerciseId,
      })
    } catch (error) {
      if (error instanceof InsufficientCreditError) {
        return NextResponse.json(
          { error: "Credit tidak cukup, top up dulu.", balance: error.balance, required: error.required },
          { status: 402 }
        )
      }
      throw error
    }
  }

  // 4. AI evaluate
  const result = await evaluateProjectSubmission({
    topicTitle: exercise.topic.title,
    learningObjective: exercise.topic.learningObjective,
    level: dbUser.level,
    exercisePrompt: exercise.prompt,
    requirements: exercise.requirements as string[],
    language,
    files,
  })

  // 5. Save submission + XP
  const ops: Promise<any>[] = [
    db.testSubmission.create({
      data: {
        userId: dbUser.id,
        exerciseId,
        code: files.map(f => `=== ${f.path} ===\n${f.content}`).join("\n\n").slice(0, 20000),
        language,
        score: result.totalScore,
        funcScore: result.funcScore,
        qualityScore: result.qualityScore,
        efficiencyScore: result.efficiencyScore,
        feedback: result.feedback,
        passed: result.passed,
      },
    }),
    incrementAIUsage(dbUser.id, CREDIT_COST.PROJECT),
    recordStreak(dbUser.id),
  ]

  if (result.passed) {
    ops.push(db.exercise.update({ where: { id: exerciseId }, data: { passed: true } }))
    const xpGain = XP_PER_TOPIC + (exercise.attemptNumber === 1 ? XP_FIRST_ATTEMPT_BONUS : 0)
    ops.push(db.user.update({ where: { id: dbUser.id }, data: { xp: { increment: xpGain } } }))
  }

  await Promise.all(ops)

  if (result.passed) {
    const moduleTopicIds = (
      await db.topic.findMany({ where: { moduleId: exercise.topic.moduleId }, select: { id: true } })
    ).map(t => t.id)
    const passedCount = await db.exercise.count({
      where: { userId: dbUser.id, topicId: { in: moduleTopicIds }, passed: true },
    })
    if (passedCount >= moduleTopicIds.length) {
      await db.enrollment.updateMany({
        where: { userId: dbUser.id, moduleId: exercise.topic.moduleId },
        data: { status: "COMPLETED", completedAt: new Date() },
      })
    }
  }

  const xpGained = result.passed
    ? XP_PER_TOPIC + (exercise.attemptNumber === 1 ? XP_FIRST_ATTEMPT_BONUS : 0)
    : 0

  return NextResponse.json({
    result,
    xpGained,
    filesReviewed: files.length,
    repoFullName,
  })
}
