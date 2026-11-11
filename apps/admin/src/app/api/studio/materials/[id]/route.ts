import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db } from "@kodevo/db"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  await db.generatedMaterial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
