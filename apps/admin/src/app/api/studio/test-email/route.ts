import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { auth } from "@kodevo/auth"
import { sendWelcomeEmail, sendPurchaseReceiptEmail } from "@kodevo/email"

export async function POST(req: NextRequest) {
  await requireAdmin()
  const session = await auth()
  const email = (session?.user as any)?.email
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 })

  const { type } = await req.json().catch(() => ({ type: "welcome" }))

  try {
    if (type === "receipt") {
      await sendPurchaseReceiptEmail(email, "Admin", {
        tier: "plus",
        billing: "monthly",
        amount: 62300,
        transactionId: "TRX-TEST-001",
        paidAt: new Date(),
        promo: { code: "EARLYBIRD30", type: "PERCENT_OFF", discountPercent: 30, discountAmount: null },
      })
    } else {
      await sendWelcomeEmail(email, "Admin")
    }
    return NextResponse.json({ ok: true, sentTo: email })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 })
  }
}
