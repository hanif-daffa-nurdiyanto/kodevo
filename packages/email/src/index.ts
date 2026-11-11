import { Resend } from "resend"

const FROM = "Kodevo <noreply@kodevo.id>"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kodevo.id"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await getResend().emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error("[email] failed to send:", subject, err)
  }
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1f3d">Reset password</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6">
      Hei ${name}, kami menerima permintaan reset password untuk akunmu. Klik tombol di bawah untuk membuat password baru.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;margin-bottom:24px">
      <p style="margin:0;color:#9a3412;font-size:13px">
        ⏰ Link ini hanya berlaku selama <strong>1 jam</strong>. Jika kamu tidak meminta reset password, abaikan email ini.
      </p>
    </div>
    ${ctaButton(resetUrl, "Reset Password")}
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Atau copy link ini: <br/><span style="color:#2A92F0;word-break:break-all">${resetUrl}</span>
    </p>
  `)
  await sendEmail(to, "Reset password Kodevo", html)
}

// ── Email Verification ────────────────────────────────────────────────────────

export async function sendEmailVerificationEmail(to: string, name: string, verifyUrl: string) {
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1f3d">
      Verifikasi emailmu, ${name}!
    </h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6">
      Satu langkah lagi — klik tombol di bawah untuk memverifikasi alamat emailmu.
    </p>
    ${ctaButton(verifyUrl, "Verifikasi Email")}
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Link berlaku selama 24 jam.
    </p>
  `)
  await sendEmail(to, "Verifikasi email Kodevo", html)
}

// ── Welcome ──────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1f3d">
      Selamat datang di Kodevo, ${name}! 🎉
    </h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6">
      Kamu sudah siap mulai belajar coding lewat pack siap pakai atau roadmap personal dari AI.
    </p>
    <div style="background:#f0f9ff;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-weight:600;color:#0f1f3d;font-size:14px">Mulai dari sini:</p>
      <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:2">
        <li>Pilih pack belajar yang sudah tersedia</li>
        <li>Buat roadmap personal kapan pun kamu butuh arah khusus</li>
        <li>Kerjakan topik & test untuk kumpulkan XP dan streak</li>
      </ul>
    </div>
    ${ctaButton(`${BASE_URL}/learn?filter=bundle`, "Lihat Pack Tersedia")}
  `)
  await sendEmail(to, "Selamat datang di Kodevo! 👋", html)
}

// ── Streak Reminder ───────────────────────────────────────────────────────────

export async function sendStreakReminderEmail(to: string, name: string, streakDays: number) {
  const urgency = streakDays >= 7
    ? `Streak <strong>${streakDays} harimu</strong> hampir putus!`
    : `Jangan lupa belajar hari ini!`

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:8px">🔥</div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1f3d">${urgency}</h1>
      <p style="margin:0;color:#64748b;font-size:15px">
        ${streakDays > 0
          ? `Kamu sudah ${streakDays} hari berturut-turut belajar. Sayang kalau berhenti sekarang.`
          : "Mulai streak belajarmu hari ini!"}
      </p>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center">
      <p style="margin:0;color:#9a3412;font-size:14px;font-weight:600">
        ⏰ Luangkan 15 menit saja hari ini — cukup untuk menyelesaikan 1 topik.
      </p>
    </div>
    ${ctaButton(`${BASE_URL}/dashboard`, "Lanjut Belajar")}
  `)
  await sendEmail(to, `🔥 Streak ${streakDays} harimu hampir putus!`, html)
}

// ── Streak Milestone ──────────────────────────────────────────────────────────

export async function sendStreakMilestoneEmail(to: string, name: string, days: number) {
  const messages: Record<number, { emoji: string; title: string; body: string }> = {
    7:   { emoji: "🎯", title: "7 hari berturut-turut!", body: "Konsistensi selama seminggu — kamu sudah membangun kebiasaan belajar yang solid." },
    14:  { emoji: "💪", title: "2 minggu streak!", body: "Dua minggu tanpa putus. Ilmu yang kamu pelajari sudah mulai menempel." },
    30:  { emoji: "🏆", title: "30 hari streak!", body: "Satu bulan penuh belajar setiap hari. Ini pencapaian luar biasa — tidak banyak orang sampai sini." },
    100: { emoji: "🚀", title: "100 hari streak!", body: "100 hari. Konsistensi seperti ini yang membedakan developer handal dari yang lainnya. Luar biasa!" },
  }
  const m = messages[days] ?? { emoji: "🔥", title: `${days} hari streak!`, body: `Kamu sudah belajar ${days} hari berturut-turut. Tetap semangat!` }

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:56px;margin-bottom:12px">${m.emoji}</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1f3d">${m.title}</h1>
      <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6">${m.body}</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center">
      <p style="margin:0;font-size:32px;font-weight:800;color:#166534">${days} 🔥</p>
      <p style="margin:4px 0 0;color:#15803d;font-size:13px">hari berturut-turut</p>
    </div>
    ${ctaButton(`${BASE_URL}/dashboard`, "Lihat Progressmu")}
  `)
  await sendEmail(to, `${m.emoji} ${name}, kamu mencapai ${days} hari streak!`, html)
}

// ── Weekly Progress ───────────────────────────────────────────────────────────

export async function sendWeeklyProgressEmail(
  to: string,
  name: string,
  stats: { activeDays: number; topicsCompleted: number; xpGained: number; currentStreak: number }
) {
  const html = emailLayout(`
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f1f3d">Recap minggu ini, ${name}</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px">Berikut progress belajarmu selama 7 hari terakhir.</p>
    <div style="display:grid;gap:12px;margin-bottom:24px">
      ${statBox("📅", "Hari Aktif", `${stats.activeDays} / 7 hari`)}
      ${statBox("📚", "Topik Selesai", `${stats.topicsCompleted} topik`)}
      ${statBox("⚡", "XP Didapat", `+${stats.xpGained} XP`)}
      ${statBox("🔥", "Streak Saat Ini", `${stats.currentStreak} hari`)}
    </div>
    ${stats.activeDays >= 5
      ? `<div style="background:#f0fdf4;border-radius:12px;padding:14px 18px;margin-bottom:24px">
           <p style="margin:0;color:#166534;font-size:14px;font-weight:600">🎉 Minggu yang sangat produktif! Pertahankan ritme ini.</p>
         </div>`
      : `<div style="background:#fff7ed;border-radius:12px;padding:14px 18px;margin-bottom:24px">
           <p style="margin:0;color:#9a3412;font-size:14px">💡 Minggu depan coba targetkan minimal 5 hari aktif ya!</p>
         </div>`
    }
    ${ctaButton(`${BASE_URL}/dashboard`, "Lanjutkan Belajar")}
  `)
  await sendEmail(to, `📊 Recap belajar minggu ini — ${stats.topicsCompleted} topik selesai`, html)
}

// ── Win-back ──────────────────────────────────────────────────────────────────

export async function sendWinBackEmail(to: string, name: string, daysMissed: number) {
  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:12px">👋</div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1f3d">Hai ${name}, kami merindukanmu!</h1>
      <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6">
        Kamu sudah ${daysMissed} hari tidak belajar. Tidak apa-apa — yang penting mulai lagi sekarang.
      </p>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 6px;font-weight:600;color:#0f1f3d;font-size:14px">Ingat tujuanmu:</p>
      <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6">
        Kamu daftar ke Kodevo karena ingin belajar coding. Satu langkah kecil hari ini sudah cukup untuk memulai lagi.
      </p>
    </div>
    ${ctaButton(`${BASE_URL}/dashboard`, "Kembali Belajar Sekarang")}
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Tidak ingin menerima email ini? <a href="${BASE_URL}/settings" style="color:#2A92F0">Atur preferensi email</a>
    </p>
  `)
  await sendEmail(to, `👋 ${name}, sudah ${daysMissed} hari — yuk lanjut belajar lagi!`, html)
}

// ── Premium Welcome ───────────────────────────────────────────────────────────

export async function sendPremiumWelcomeEmail(to: string, name: string) {
  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:12px">✨</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1f3d">Selamat bergabung di Premium!</h1>
      <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6">
        Terima kasih sudah upgrade, ${name}. Sekarang kamu punya akses penuh ke semua fitur Kodevo.
      </p>
    </div>
    <div style="background:#f0f9ff;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 10px;font-weight:600;color:#0f1f3d;font-size:14px">Yang kamu dapatkan:</p>
      <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:2.2">
        <li>✅ Kurikulum tak terbatas</li>
        <li>✅ AI request tak terbatas</li>
        <li>✅ Akses komunitas Discord eksklusif</li>
        <li>✅ Prioritas fitur baru</li>
      </ul>
    </div>
    ${ctaButton(`${BASE_URL}/dashboard`, "Mulai Eksplorasi Premium")}
  `)
  await sendEmail(to, "✨ Selamat datang di Kodevo Premium!", html)
}

// ── Purchase Receipt ──────────────────────────────────────────────────────────

export async function sendPurchaseReceiptEmail(
  to: string,
  name: string,
  details: {
    tier: "plus" | "pro"
    billing: "monthly" | "annual"
    amount: number
    transactionId?: string
    paidAt?: Date
    promo?: { code: string; type: string; discountPercent: number | null; discountAmount: number | null }
  }
) {
  const planLabel = details.tier === "pro" ? "Premium Pro" : "Premium Plus"
  const billingLabel = details.billing === "annual" ? "Tahunan" : "Bulanan"
  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
  const amountFormatted = fmt(details.amount)
  const dateFormatted = (details.paidAt ?? new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  const BASE_PRICE = details.tier === "pro"
    ? (details.billing === "annual" ? 1799000 : 199000)
    : (details.billing === "annual" ? 849000 : 89000)

  const promoRows = details.promo ? (() => {
    const p = details.promo!
    const discountLabel = p.type === "PERCENT_OFF" ? `Diskon ${p.discountPercent}% (${p.code})` : `Diskon (${p.code})`
    const discountValue = p.type === "PERCENT_OFF" ? `−${p.discountPercent}%` : `−${fmt(p.discountAmount ?? 0)}`
    return `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:12px 0;color:#64748b">Harga Normal</td>
        <td style="padding:12px 0;text-align:right;color:#94a3b8;text-decoration:line-through">${fmt(BASE_PRICE)}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:12px 0;color:#16a34a">${discountLabel}</td>
        <td style="padding:12px 0;text-align:right;color:#16a34a;font-weight:600">${discountValue}</td>
      </tr>`
  })() : ""

  const html = emailLayout(`
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f1f3d">Pembayaran berhasil 🎉</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px">Terima kasih, ${name}! Berikut detail transaksi kamu.</p>

    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px">
      <div style="background:#f8fafc;padding:12px 18px;border-bottom:1px solid #e2e8f0">
        <p style="margin:0;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Detail Transaksi</p>
      </div>
      <div style="padding:0 18px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:12px 0;color:#64748b">Plan</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:#0f1f3d">${planLabel}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:12px 0;color:#64748b">Periode</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:#0f1f3d">${billingLabel}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:12px 0;color:#64748b">Tanggal</td>
            <td style="padding:12px 0;text-align:right;color:#0f1f3d">${dateFormatted}</td>
          </tr>
          ${details.transactionId ? `
          <tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:12px 0;color:#64748b">ID Transaksi</td>
            <td style="padding:12px 0;text-align:right;color:#64748b;font-family:monospace;font-size:12px">${details.transactionId}</td>
          </tr>` : ""}
          ${promoRows}
          <tr>
            <td style="padding:14px 0;font-weight:700;color:#0f1f3d;font-size:15px">Total Dibayar</td>
            <td style="padding:14px 0;text-align:right;font-weight:700;color:#2A92F0;font-size:16px">${amountFormatted}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:24px">
      <p style="margin:0;color:#166534;font-size:13px">
        ✅ Akun kamu sudah diaktifkan ke <strong>${planLabel}</strong>. Simpan email ini sebagai bukti pembayaran.
      </p>
    </div>

    ${ctaButton(`${BASE_URL}/settings`, "Lihat Status Langganan")}

    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Ada pertanyaan? Balas email ini atau hubungi kami di Discord.
    </p>
  `)
  await sendEmail(to, `Konfirmasi pembayaran ${planLabel} — ${amountFormatted}`, html)
}

// ── Premium Expired ───────────────────────────────────────────────────────────

export async function sendPremiumExpiredEmail(to: string, name: string) {
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1f3d">Langganan Premiummu telah berakhir</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6">
      Hei ${name}, langganan Premium Kodevo kamu sudah tidak aktif. Kamu masih bisa belajar dengan akun gratis, tapi beberapa fitur akan terbatas.
    </p>
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-weight:600;color:#713f12;font-size:14px">Fitur yang tidak aktif:</p>
      <ul style="margin:0;padding-left:20px;color:#854d0e;font-size:14px;line-height:2">
        <li>Kurikulum lebih dari 1</li>
        <li>AI request lebih dari 10/hari</li>
        <li>Akses komunitas Discord</li>
      </ul>
    </div>
    ${ctaButton(`${BASE_URL}/settings`, "Perpanjang Premium")}
  `)
  await sendEmail(to, "Langganan Premiummu telah berakhir", html)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ctaButton(href: string, label: string) {
  return `<a href="${href}" style="display:block;background:#2A92F0;color:#fff;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;margin-bottom:8px">${label}</a>`
}

function statBox(emoji: string, label: string, value: string) {
  return `<div style="background:#f8fafc;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:14px">
    <span style="font-size:24px">${emoji}</span>
    <div>
      <p style="margin:0;font-size:12px;color:#94a3b8">${label}</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#0f1f3d">${value}</p>
    </div>
  </div>`
}

function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;padding:0 16px 40px">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:20px;font-weight:800;color:#0f1f3d">Kode<span style="color:#2A92F0">vo</span></span>
    </div>
    <!-- Card -->
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
      ${content}
    </div>
    <!-- Footer -->
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;line-height:1.6">
      Kodevo · Platform belajar coding berbasis AI<br>
      <a href="${BASE_URL}/settings" style="color:#2A92F0;text-decoration:none">Atur preferensi email</a>
    </p>
  </div>
</body>
</html>`
}
