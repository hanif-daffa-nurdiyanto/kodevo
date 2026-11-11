# Plan Perubahan Payment: Bundle + Credit Top-up

Dokumen ini dibuat berdasarkan brief `kodevo-dev-brief-bundle-credit-v1` dan kondisi project saat ini. Target perubahan: mengganti model subscription `isPremium`/`isPro` menjadi prepaid **bundle purchase** dan **credit top-up**.

## Konteks Project Saat Ini

Project sudah berbentuk monorepo:

- `apps/web`: aplikasi user, auth, learning flow, checkout, webhook, user settings.
- `apps/admin`: Studio admin yang sudah dipisah dari web.
- `packages/db`: Prisma schema, generated client, dan singleton DB.
- `packages/auth`: NextAuth shared config/server/admin guard.
- `packages/email`, `packages/ui`, `packages/utils`: shared package pendukung.

Payment saat ini masih berbasis subscription:

- Web checkout ada di `apps/web/src/app/api/checkout/route.ts`.
- Mayar helper ada di `apps/web/src/lib/mayar.ts`.
- Mayar webhook ada di `apps/web/src/app/api/mayar/webhook/route.ts`.
- Stripe masih tersedia di `apps/web/src/lib/stripe.ts` dan beberapa endpoint Stripe.
- User entitlement masih memakai `User.isPremium`, `User.isPro`, `premiumExpiresAt`, `proExpiresAt`.
- AI usage masih memakai `AIUsage` sebagai kuota harian/mingguan, bukan saldo uang.
- `CREDIT_COST` di `apps/web/src/lib/rate-limit.ts` masih bobot rate-limit internal, bukan harga credit riil.
- `AppSetting` sudah ada dan cocok untuk menyimpan harga credit/action secara editable.

## Target Produk

Model baru:

- **Bundle**: user membeli akses flat ke satu kurikulum kurasi, misalnya Fullstack Developer atau Claude Code. Bundle tidak memotong credit untuk materi/quiz/exercise/evaluasi/chat yang berada di track bundle yang sudah dibeli.
- **Credit top-up**: user membeli saldo prepaid. Credit dipakai untuk generate roadmap custom dan aksi AI di luar bundle.
- **No subscription**: `isPremium`/`isPro` tidak lagi menjadi sumber entitlement baru.
- **Mayar sebagai gateway utama**: Stripe boleh dibiarkan dormant selama fase migrasi, tapi UI dan flow baru diarahkan ke Mayar bundle/top-up.

## Prinsip Arsitektur

Bundle harus memakai track shared, bukan clone per pembeli.

Satu `Track` bertipe `BUNDLE` dipakai banyak user. Progress tetap per user melalui `Enrollment`. Jangan clone `Track`, `Module`, atau `Topic` untuk tiap pembelian karena itu akan memecah cache `GeneratedMaterial` per `topicId` dan menaikkan biaya AI.

Credit harus berbentuk ledger.

`CreditBalance.balance` hanya cache cepat. Source of truth audit adalah `CreditTransaction`. Semua perubahan saldo wajib lewat satu fungsi transaksi terpusat agar balance dan ledger tidak out of sync.

## Perubahan Data Model

### Track Type

Tambahkan enum:

```prisma
enum TrackType {
  CUSTOM
  BUNDLE
}
```

Perluas `Track`:

```prisma
model Track {
  // existing fields
  type           TrackType @default(CUSTOM)
  priceIdr       Int?
  hasCertificate Boolean   @default(false)
  purchases      BundlePurchase[]
  certificates   Certificate[]
}
```

Aturan:

- `CUSTOM`: track milik user, `userId` berisi id user, dibuat dari generate roadmap.
- `BUNDLE`: track kurasi, `userId = null`, `priceIdr` diisi, `hasCertificate` bisa true.

### Bundle Purchase

Tambahkan model:

```prisma
model BundlePurchase {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  trackId             String
  track               Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  amountPaidIdr       Int
  mayarTransactionId  String?
  purchasedAt         DateTime @default(now())
  certificateIssuedAt DateTime?

  @@unique([userId, trackId])
  @@index([trackId])
}
```

Akses bundle ditentukan oleh keberadaan `BundlePurchase(userId, trackId)`.

### Credit Ledger

Tambahkan enum dan model:

```prisma
enum CreditTxType {
  TOPUP
  DEBIT
  REFUND
  ADJUSTMENT
}

model CreditBalance {
  userId    String   @id
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance   Int      @default(0)
  updatedAt DateTime @updatedAt
}

model CreditTransaction {
  id           String       @id @default(cuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  type         CreditTxType
  amount       Int
  balanceAfter Int
  action       String?
  refId        String?
  createdAt    DateTime     @default(now())

  @@index([userId, createdAt])
}
```

Tambahkan relasi di `User`:

```prisma
creditBalance       CreditBalance?
creditTransactions  CreditTransaction[]
bundlePurchases     BundlePurchase[]
certificates        Certificate[]
```

### Certificate

Tambahkan model:

```prisma
model Certificate {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  trackId       String
  track         Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  issuedAt      DateTime @default(now())
  certificateNo String   @unique

  @@unique([userId, trackId])
}
```

Fase ini hanya membuat record sertifikat. Desain visual/PDF/verifikasi publik bisa menyusul.

## Credit Pricing

Simpan harga di `AppSetting`, bukan hardcode.

Default awal dari brief:

```text
credit_price_idr=50
credit_cost_curriculum=13
credit_cost_material=31
credit_cost_quiz=11
credit_cost_exercise_generate=8
credit_cost_exercise_submit=8
credit_cost_project=12
credit_cost_chat=8
```

Paket top-up awal:

```text
Rp 50.000 = 1.000 credit
```

Jika nanti ada beberapa paket, simpan sebagai config AppSetting atau table khusus `CreditPackage`. Untuk fase pertama, satu paket cukup.

## Fungsi Credit Terpusat

Buat shared helper, idealnya di package yang dekat DB, misalnya `packages/db/src/credits.ts`, lalu export dari `@kodevo/db`.

Kontrak:

```ts
async function applyCreditTransaction(params: {
  userId: string
  type: "TOPUP" | "DEBIT" | "REFUND" | "ADJUSTMENT"
  amount: number
  action?: string
  refId?: string
}): Promise<{ balanceAfter: number }>
```

Aturan:

- `amount` input selalu positif.
- `TOPUP`, `REFUND`, `ADJUSTMENT` positif menambah saldo.
- `DEBIT` mengurangi saldo.
- `DEBIT` wajib punya `action`.
- Saldo tidak boleh negatif.
- Semua operasi memakai `db.$transaction`.
- Tulis/update `CreditBalance`.
- Tulis `CreditTransaction` dengan `balanceAfter`.

Tambahkan error khusus seperti `InsufficientCreditError` agar route bisa return status `402`.

## Access Logic Baru

Buat helper terpusat, misalnya:

```ts
async function canAccessTrackContent(params: {
  userId: string
  trackId: string
  moduleIsFree: boolean
}): Promise<boolean>
```

Access diizinkan jika:

- `module.isFree === true`
- atau `track.type === "CUSTOM"` dan `track.userId === userId`
- atau ada `BundlePurchase` untuk `(userId, trackId)`

Ganti semua gate yang sekarang memakai `dbUser.isPremium` atau `dbUser.isPro` untuk akses belajar.

Area yang perlu diaudit:

- `apps/web/src/app/(protected)/learn/[trackSlug]/page.tsx`
- `apps/web/src/app/(protected)/learn/[trackSlug]/[moduleId]/page.tsx`
- `apps/web/src/app/api/ai/generate-material/route.ts`
- route quiz/generate, exercise/generate, exercise submit, project submit, chat tutor jika bergantung entitlement premium.
- UI pricing/billing yang sekarang menampilkan Plus/Pro.

## AI Credit Debit

Ganti `checkAIRateLimit` + `incrementAIUsage` untuk aksi berbayar menjadi credit debit.

Aturan:

- Cache hit `GeneratedMaterial` tidak memotong credit.
- Aksi dalam bundle yang sudah dibeli tidak memotong credit.
- Aksi custom roadmap atau AI di luar bundle memotong credit sesuai AppSetting.
- Jika credit kurang, route return `402` dengan pesan jelas: `Credit tidak cukup, top up dulu.`
- `AIUsage` boleh sementara dipertahankan sebagai telemetry/rate safety, tapi bukan sumber billing.

Tahap aman:

1. Buat helper baru tanpa menghapus `AIUsage`.
2. Ubah route satu per satu memakai helper credit.
3. Setelah stabil, putuskan apakah rate-limit lama tetap dipakai sebagai abuse control.

## Mayar Refactor

`createMayarPayment()` saat ini terikat `tier` dan `billing`. Refactor menjadi generic:

```ts
async function createMayarPayment(params: {
  name: string
  email: string
  amount: number
  description: string
  redirectUrl: string
}): Promise<{ link: string; transactionId: string }>
```

Flow legacy subscription bisa memakai wrapper lama jika masih dipertahankan dormant.

Description baru:

```text
Kodevo Top-up 1000 credit | uid:{userId} | type:credit_topup | credits:1000
Kodevo Bundle: Fullstack Developer | uid:{userId} | type:bundle | trackId:{trackId}
```

Webhook Mayar perlu parse `type:`:

- `credit_topup`: ambil `uid`, `credits`, transaction id, lalu panggil `applyCreditTransaction({ type: "TOPUP" })`.
- `bundle`: ambil `uid`, `trackId`, amount, transaction id, lalu `upsert BundlePurchase`.
- tanpa `type`: jalankan logic legacy subscription jika belum dicabut.

Webhook harus idempotent. Untuk top-up, gunakan `mayarTransactionId` sebagai `refId` dan cegah top-up dobel untuk transaction yang sama. Jika perlu, tambahkan field unik atau table payment event.

## Endpoint Web Baru

Tambahkan endpoint:

```text
POST /api/credit/topup
POST /api/bundles/[trackId]/checkout
GET  /api/credit/balance
```

`POST /api/credit/topup`:

- auth wajib.
- ambil config `credit_price_idr`.
- untuk fase pertama: 1 paket `1000 credit`.
- buat Mayar payment dengan `type:credit_topup`.

`POST /api/bundles/[trackId]/checkout`:

- auth wajib.
- track harus `type=BUNDLE`.
- user belum punya `BundlePurchase`.
- pakai `track.priceIdr`.
- buat Mayar payment dengan `type:bundle`.

`GET /api/credit/balance`:

- auth wajib.
- return current `CreditBalance.balance` dan beberapa transaksi terakhir.

## UI Web

Ganti UI subscription di Settings Billing:

- hilangkan copy Plus/Pro subscription sebagai CTA utama.
- tampilkan saldo credit.
- tampilkan tombol top-up credit.
- tampilkan daftar bundle yang tersedia dan status `Sudah Dibeli` / `Beli Bundle`.
- untuk track bundle yang belum dibeli, tampilkan locked CTA ke checkout bundle.
- untuk custom roadmap, tampilkan biaya credit sebelum generate.

Landing/pricing:

- ganti pricing card Pro subscription menjadi:
  - Bundle kurasi: harga flat per track.
  - Credit top-up: prepaid untuk roadmap custom dan AI.

AI usage counter:

- ubah menjadi credit balance indicator.
- jika `AIUsage` tetap dipakai sebagai safety limit, tampilkan sebagai limit terpisah hanya jika dibutuhkan.

## Admin Impact

Admin app sudah dipisah di `apps/admin`, jadi data admin baru sebaiknya ditambahkan di sana.

Minimal data admin yang perlu tampil:

- total credit sold.
- outstanding credit liability atau total saldo credit aktif.
- daftar transaksi credit.
- daftar pembelian bundle.
- daftar bundle track dan harga.
- manual adjustment credit.
- flag `Track.type`, `Track.priceIdr`, `Track.hasCertificate`.

UI admin lengkap bisa fase lanjutan, tapi API/data model harus siap dari awal.

## Migration Strategy

Fase pertama tidak perlu migration path subscriber existing yang kompleks karena brief menyatakan `isPremium/isPro` tidak dipakai lagi.

Namun secara teknis, lebih aman:

- jangan langsung hapus kolom `isPremium`, `isPro`, `premiumExpiresAt`, `proExpiresAt`.
- hentikan pemakaian kolom tersebut untuk gating baru.
- biarkan Stripe endpoint dormant sampai UI baru stabil.
- Mayar legacy branch tetap ada sementara untuk payload lama.
- PromoCode/PromoRedemption jangan dicabut dulu; putuskan nanti apakah dipakai untuk diskon bundle/top-up.

## Audit Fase 0

Audit dilakukan pada 2026-08-10. Generated Prisma client di `packages/db/src/generated` diabaikan dari catatan ini karena hanya output build dari schema.

### Entitlement Lama

Pemakaian `isPremium`, `isPro`, `premiumExpiresAt`, dan `proExpiresAt` masih tersebar di area berikut:

- Schema dan auth shared:
  - `packages/db/prisma/schema.prisma`
  - `packages/auth/src/server.ts`
  - `packages/auth/src/config.ts`
- Gate akses belajar dan AI di web:
  - `apps/web/src/app/(protected)/learn/[trackSlug]/page.tsx`
  - `apps/web/src/app/(protected)/learn/[trackSlug]/[moduleId]/page.tsx`
  - `apps/web/src/app/api/ai/generate-material/route.ts`
- Feature gate Pro/Premium di web:
  - `apps/web/src/app/(protected)/learn/[trackSlug]/[moduleId]/[topicId]/test/page.tsx`
  - `apps/web/src/app/api/user/me/route.ts`
  - route GitHub/project API yang masih mengecek `isPro`
- UI user:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/(protected)/dashboard/page.tsx`
  - `apps/web/src/app/(protected)/settings/page.tsx`
  - `apps/web/src/app/(protected)/settings/billing-section.tsx`
  - `apps/web/src/components/ai-usage-counter.tsx`
  - `apps/web/src/components/layout/sidebar.tsx`
  - `apps/web/src/components/layout/dashboard-nav.tsx`
  - `apps/web/src/components/tutor-chat.tsx`
- Admin analytics dan operasi user:
  - `apps/admin/src/app/(studio)/page.tsx`
  - `apps/admin/src/app/(studio)/users/page.tsx`
  - `apps/admin/src/app/(studio)/users/[id]/page.tsx`
  - `apps/admin/src/app/(studio)/finance/page.tsx`
  - `apps/admin/src/app/(studio)/funnel/page.tsx`
  - `apps/admin/src/app/(studio)/at-risk/page.tsx`
  - `apps/admin/src/app/(studio)/engagement/page.tsx`
  - `apps/admin/src/app/api/admin/users/[id]/premium/route.ts`

Keputusan awal:

- Field lama boleh dipertahankan sementara untuk histori dan kompatibilitas session.
- Gate akses baru tidak boleh memakai `isPremium`/`isPro`.
- Admin page yang menghitung premium/pro perlu diganti bertahap menjadi metrik bundle purchase, credit top-up, dan credit balance.

### Rate Limit dan AI Usage

Pemakaian `checkAIRateLimit`, `incrementAIUsage`, `CREDIT_COST`, dan `AIUsage` ada di:

- Helper lama:
  - `apps/web/src/lib/rate-limit.ts`
  - `apps/admin/src/lib/rate-limit.ts`
- Telemetry/dashboard:
  - `apps/web/src/app/api/ai/usage/route.ts`
  - `apps/web/src/components/ai-usage-counter.tsx`
  - `apps/web/src/components/layout/header.tsx`
  - `apps/admin/src/app/(studio)/page.tsx`
  - `apps/admin/src/app/(studio)/engagement/page.tsx`
- Route AI yang perlu diganti ke debit credit:
  - `apps/web/src/app/api/ai/chat/route.ts`
  - `apps/web/src/app/api/ai/generate-material/route.ts`
  - `apps/web/src/app/api/test/generate/route.ts`
  - `apps/web/src/app/api/test/[exerciseId]/submit/route.ts`
  - `apps/web/src/app/api/test/[exerciseId]/submit-project/route.ts`
  - `apps/web/src/app/api/curriculum/generate/route.ts`

Keputusan awal:

- `AIUsage` tetap dipakai sementara sebagai telemetry dan abuse-control ringan.
- Billing harus pindah ke `CreditTransaction`.
- `CREDIT_COST` lama tidak dipakai sebagai harga final; nilai final dibaca dari `AppSetting`.
- Route material harus tetap menghormati cache hit `GeneratedMaterial`: cache hit tidak memotong credit.

### Checkout dan Subscription UI

Flow subscription lama yang perlu diganti atau dibuat dormant:

- Web checkout:
  - `apps/web/src/app/api/checkout/route.ts`
  - `apps/web/src/app/api/mayar/webhook/route.ts`
  - `apps/web/src/lib/mayar.ts`
  - `apps/web/src/app/api/stripe/checkout/route.ts`
  - `apps/web/src/app/api/stripe/portal/route.ts`
  - `apps/web/src/app/api/stripe/webhook/route.ts`
- Web UI:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/(protected)/settings/page.tsx`
  - `apps/web/src/app/(protected)/settings/billing-section.tsx`
- Promo dan email:
  - `apps/web/src/app/api/promo/validate/route.ts`
  - `apps/web/src/app/api/promo/redeem/route.ts`
  - `packages/email/src/index.ts`
- Admin payment config dan promo:
  - `apps/admin/src/app/(studio)/settings/page.tsx`
  - `apps/admin/src/lib/settings.ts`
  - `apps/admin/src/app/(studio)/promo-codes`
  - `apps/admin/src/app/api/admin/promo-codes`
  - `apps/admin/src/app/api/admin/settings/route.ts`

Keputusan awal:

- Mayar menjadi jalur utama untuk bundle dan credit top-up.
- Stripe boleh tetap ada sebagai legacy dormant selama tidak tampil sebagai flow utama user.
- PromoCode perlu diputuskan ulang: dipakai ulang untuk diskon bundle/top-up, atau dibuat dormant seperti subscription.

## Tahapan Eksekusi

### Fase 0: Audit

- Audit semua pemakaian `isPremium`/`isPro`.
- Audit semua route yang memanggil `checkAIRateLimit`, `incrementAIUsage`, dan `CREDIT_COST`.
- Audit semua checkout/payment UI.
- Audit Mayar webhook payload yang tersedia di production logs jika ada.

### Fase 1: Schema dan Shared Helper

- Tambah enum/model Prisma: `TrackType`, `CreditBalance`, `CreditTransaction`, `CreditTxType`, `BundlePurchase`, `Certificate`.
- Tambah relasi ke `User` dan `Track`.
- Buat helper `applyCreditTransaction`.
- Buat helper read pricing dari `AppSetting`.
- Seed default AppSetting untuk harga credit dan cost per action.
- Jalankan `npm run db:generate`.

### Fase 2: Bundle Access

- Ubah `Track` existing custom agar default `type=CUSTOM`.
- Siapkan seed/manual script untuk bundle awal.
- Buat helper access track.
- Ganti gate `isPremium`/`isPro` di halaman learn dan route material.
- Pastikan bundle tidak clone track/module/topic.

### Fase 3: Credit Debit

- Buat helper yang menentukan apakah aksi harus potong credit atau gratis karena bundle.
- Ganti debit pada generate curriculum, generate material, quiz, exercise generate, exercise submit, project submit, dan chat.
- Pastikan cache hit material tidak debit credit.
- Return `402` saat saldo kurang.

### Fase 4: Mayar Top-up dan Bundle Checkout

- Generalize Mayar payment creation.
- Tambah endpoint top-up credit.
- Tambah endpoint bundle checkout.
- Refactor webhook berdasarkan `type:`.
- Tambah idempotency agar webhook tidak double-credit atau double-purchase.

### Fase 5: UI Web

- Ubah Settings Billing menjadi credit/bundle dashboard.
- Ubah pricing di landing.
- Ubah AI usage counter menjadi credit balance.
- Ubah locked state di learn menjadi CTA bundle/top-up sesuai konteks.

### Fase 6: Admin dan Reporting

- Tambah tampilan credit transactions.
- Tambah bundle purchase list.
- Tambah track bundle config.
- Tambah manual adjustment credit.
- Tambah metric revenue prepaid dan outstanding credit.

### Fase 7: Sertifikat

- Buat helper issue certificate.
- Trigger setelah module assessment terakhir di bundle selesai.
- Pastikan unique `(userId, trackId)`.
- Simpan `certificateNo`.
- Visual sertifikat dan public verification ditunda ke brief berikutnya.

### Fase 8: Cleanup Subscription Lama

- Matikan CTA Plus/Pro.
- Putuskan nasib Stripe route.
- Putuskan apakah `isPremium`/`isPro` tetap disimpan sebagai historical field atau dihapus migration lanjutan.
- Putuskan reuse PromoCode untuk bundle/top-up.

## Risiko dan Mitigasi

Risiko double webhook:

- Mitigasi dengan idempotency berbasis transaction id.

Risiko saldo negatif:

- Mitigasi dengan `db.$transaction` dan helper tunggal.

Risiko cache material jadi mahal:

- Mitigasi dengan bundle shared track, bukan clone per pembeli.

Risiko gate access tercerai-berai:

- Mitigasi dengan helper access tunggal dan audit semua `isPremium`/`isPro`.

Risiko pricing berubah karena kurs/API cost:

- Mitigasi dengan `AppSetting`, bukan hardcode.

## Pertanyaan Produk/Teknis

- Stripe subscription lama akan dibiarkan dormant atau dicabut sekaligus?
- Kolom `isPremium`/`isPro` akan dibiarkan historical atau dihapus setelah migration stabil?
- PromoCode lama akan dipakai untuk diskon bundle/top-up atau deprecated?
- Paket top-up awal hanya 1.000 credit atau beberapa paket?
- Harga bundle awal untuk Fullstack Developer dan Claude Code berapa?
- Bundle buyer perlu akses komunitas otomatis atau manual?

## Execution Checklist

- [x] Audit semua pemakaian `isPremium` dan `isPro` di web, admin, auth, dan API.
- [x] Audit semua pemakaian `checkAIRateLimit`, `incrementAIUsage`, dan `CREDIT_COST`.
- [x] Audit semua UI checkout/subscription di landing dan settings.
- [x] Tambah enum `TrackType` ke Prisma schema.
- [x] Tambah model `CreditBalance`, `CreditTransaction`, dan enum `CreditTxType`.
- [x] Tambah model `BundlePurchase`.
- [x] Tambah model `Certificate`.
- [x] Tambah relasi credit, bundle purchase, dan certificate ke `User`.
- [x] Tambah field `type`, `priceIdr`, `hasCertificate`, purchases, dan certificates ke `Track`.
- [x] Jalankan Prisma generate dari `packages/db`.
- [x] Buat helper `applyCreditTransaction` terpusat.
- [x] Buat error khusus untuk saldo credit tidak cukup.
- [x] Seed default `AppSetting` untuk `credit_price_idr` dan cost per action.
- [x] Buat helper pricing credit dari `AppSetting`.
- [x] Buat helper access track berbasis module free, custom owner, atau bundle purchase.
- [x] Ganti gate akses learn/material dari `isPremium` ke helper access baru.
- [x] Siapkan seed/script bundle awal untuk Fullstack Developer.
- [x] Siapkan seed/script bundle awal untuk Claude Code.
- [x] Pastikan bundle memakai track shared dan tidak clone module/topic per user.
- [x] Buat helper untuk menentukan aksi AI perlu debit credit atau gratis karena bundle.
- [x] Ganti generate curriculum agar memotong credit `CURRICULUM`.
- [x] Ganti generate material agar memotong credit `MATERIAL` hanya saat cache miss dan bukan bundle.
- [x] Ganti generate quiz agar memotong credit `QUIZ`.
- [x] Ganti generate exercise agar memotong credit `EXERCISE_GENERATE`.
- [x] Ganti submit exercise agar memotong credit `EXERCISE_SUBMIT`.
- [x] Ganti submit project agar memotong credit `PROJECT`.
- [x] Ganti chat tutor agar memotong credit `CHAT`.
- [x] Return status `402` saat saldo credit tidak cukup.
- [x] Generalize `createMayarPayment` agar menerima `amount` dan `description` bebas.
- [x] Tambah endpoint `POST /api/credit/topup`.
- [x] Tambah endpoint `POST /api/bundles/[trackId]/checkout`.
- [x] Tambah endpoint `GET /api/credit/balance`.
- [x] Refactor Mayar webhook untuk parse `type:credit_topup`.
- [x] Refactor Mayar webhook untuk parse `type:bundle`.
- [x] Tambah idempotency webhook berbasis Mayar transaction id.
- [x] Ubah Settings Billing menjadi dashboard credit dan bundle.
- [x] Ubah landing pricing dari subscription ke bundle/top-up.
- [x] Ubah AI usage counter menjadi credit balance indicator.
- [x] Ubah locked state di learn menjadi CTA beli bundle atau top-up.
- [x] Tambah data/API admin untuk credit transactions.
- [x] Tambah data/API admin untuk bundle purchases.
- [x] Tambah data/API admin untuk bundle track pricing/config.
- [x] Tambah manual credit adjustment di admin.
- [x] Buat helper issue certificate.
- [x] Trigger certificate saat bundle track selesai.
- [x] Pastikan certificate unique per `(userId, trackId)`.
- [ ] Putuskan nasib Stripe subscription lama.
- [ ] Putuskan nasib field `isPremium`/`isPro`.
- [ ] Putuskan reuse/deprecate PromoCode untuk bundle/top-up.
- [ ] Jalankan build web.
- [ ] Jalankan build admin.
- [ ] Smoke test top-up credit.
- [ ] Smoke test bundle purchase.
- [ ] Smoke test debit credit semua aksi AI.
- [ ] Smoke test bundle tidak memotong credit.
- [ ] Smoke test cache hit material tidak memotong credit.
