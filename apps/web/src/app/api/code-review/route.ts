import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import Groq from "groq-sdk"
import { z } from "zod"

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! })
}

const schema = z.object({
  code: z.string().min(1).max(12000),
  language: z.string().max(50),
  context: z.string().max(500).optional(),
  filename: z.string().max(200).optional(),
})

const LEVEL_PROMPT: Record<string, string> = {
  BEGINNER: "gunakan bahasa yang sangat sederhana, hindari jargon teknis, jelaskan konsep dari awal, fokus 3-4 isu utama saja",
  MID: "boleh lebih teknis, mention best practices, boleh sebut design pattern jika relevan",
  ADVANCE: "fokus ke arsitektur, performa, keamanan, maintainability, dan clean code principles",
  UNSCREENED: "gunakan bahasa sederhana dan ramah pemula",
}

export async function POST(req: NextRequest) {
  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json({ error: "AI sedang maintenance." }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = await db.user.findUnique({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    select: {
      id: true,
      isPro: true,
      isPremium: true,
      level: true,
      curricula: {
        where: { userId: sessionUser.id ?? undefined },
        orderBy: { id: "desc" },
        take: 1,
        select: { title: true },
      },
    },
  })

  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!dbUser.isPro && !dbUser.isPremium) return NextResponse.json({ error: "Fitur ini hanya untuk pengguna Premium." }, { status: 403 })

  const body = schema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 })

  const { code, language, context, filename } = body.data
  const level = dbUser.level
  const curriculum = dbUser.curricula[0]?.title ?? null
  const levelNote = LEVEL_PROMPT[level] ?? LEVEL_PROMPT.UNSCREENED

  const systemPrompt = `Kamu adalah AI code reviewer untuk platform belajar coding Indonesia bernama Kodevo.
Pelajar ini adalah programmer level ${level}.${curriculum ? `\nSedang belajar kurikulum: ${curriculum}.` : ""}${context ? `\nKonteks kode: ${context}` : ""}
Bahasa pemrograman: ${language}${filename ? ` (file: ${filename})` : ""}.

Review kode berikut dan berikan feedback yang EDUKATIF.
PENTING: Jelaskan KENAPA sesuatu salah atau bisa ditingkatkan, bukan hanya APA yang salah.
Panduan level: ${levelNote}

Kembalikan HANYA JSON valid (tanpa markdown, tanpa komentar) dengan format:
{
  "summary": "Ringkasan 2-3 kalimat dalam Bahasa Indonesia tentang keseluruhan kode",
  "comments": [
    {
      "line": <nomor baris 1-indexed>,
      "type": "error",
      "title": "Judul singkat Bahasa Indonesia (max 8 kata)",
      "message": "Penjelasan edukatif Bahasa Indonesia — jelaskan KENAPA"
    }
  ]
}

Tipe komentar: "error" (bug/salah), "warning" (perlu diperhatikan), "suggestion" (bisa ditingkatkan), "good" (sudah benar/bagus).
Aturan:
- Maksimum 8 komentar, fokus yang paling penting
- Wajib minimal 1 komentar bertipe "good"
- Berikan nomor baris yang akurat sesuai kode
- Jika kode singkat/sederhana, tetap berikan feedback konstruktif`

  let raw: string
  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Kode untuk direview:\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    })
    raw = completion.choices[0].message.content ?? "{}"
  } catch (err) {
    console.error("[code-review] groq error", err)
    return NextResponse.json({ error: "AI gagal merespons. Coba lagi." }, { status: 503 })
  }

  let parsed: { summary?: string; comments?: unknown[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "AI mengembalikan format tidak valid. Coba lagi." }, { status: 500 })
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary : "Review selesai."
  const comments = Array.isArray(parsed.comments) ? parsed.comments : []

  // Save to history
  await db.codeReview.create({
    data: {
      userId: dbUser.id,
      language,
      filename: filename ?? null,
      code,
      context: context ?? null,
      summary,
      comments: comments as any,
    },
  })

  return NextResponse.json({ summary, comments })
}
