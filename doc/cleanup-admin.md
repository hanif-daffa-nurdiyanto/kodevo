# Plan Cleanup Admin untuk Skema Credit + Bundle

Dokumen ini menganalisis halaman admin yang masih membawa konsep lama **premium/subscription/Pro/Stripe** dan merencanakan cleanup agar tetap mempertahankan konsep analytics yang sudah ada, tetapi sumber datanya disesuaikan ke skema baru **credit + bundle**.

## Tujuan

- Admin tetap punya dashboard analytics, funnel, finance, retention, at-risk, users, payment, bundle, dan pricing.
- Semua istilah dan metrik user-facing admin diarahkan ke skema baru:
  - **Credit top-up** untuk pembelian saldo.
  - **Bundle purchase** untuk akses track berbayar.
  - **Bundle free/paid** untuk entitlement belajar.
  - **Credit transaction** untuk konsumsi AI.
- Konsep lama subscription tidak langsung dihapus dari database, tetapi dibuat dormant dan tidak menjadi sumber utama analytics.
- Halaman yang sebelumnya menghitung premium harus diganti dengan metrik yang lebih relevan untuk model prepaid.

## Kondisi Saat Ini

### Sudah Sesuai Arah Baru

- Admin `/payments` sudah menampilkan:
  - credit transactions,
  - bundle purchases,
  - credit outstanding,
  - top-up summary,
  - manual credit adjustment.
- Admin `/pricing` sudah menampilkan:
  - CRUD paket top-up credit,
  - edit cost per action,
  - validasi pricing.
- Admin `/bundles` sudah menjadi area khusus bundle:
  - list bundle,
  - CRUD metadata,
  - harga,
  - sertifikat,
  - draft/publish,
  - editor module/topic,
  - preview.

### Masih Membawa Konsep Lama

Halaman berikut masih memakai istilah atau data premium/subscription:

- `apps/admin/src/app/(studio)/finance/page.tsx`
  - Menghitung `isPremium`, `premiumExpiresAt`, `proExpiresAt`, `isPro`.
  - Mengestimasi MRR dari harga bulanan/tahunan hardcoded.
  - Menampilkan subscriber premium dan expiry subscription.
- `apps/admin/src/app/(studio)/funnel/page.tsx`
  - Step terakhir masih `Went Premium`.
  - Conversion masih `registrasi -> premium`.
  - Drop-off masih `passed topic tapi tidak premium`.
- `apps/admin/src/app/(studio)/users/page.tsx`
  - Filter `premium`, `free`, `expiring`.
  - Badge crown premium.
  - Kolom `Expires`.
- `apps/admin/src/app/(studio)/users/[id]/page.tsx`
  - Menampilkan crown premium.
  - Memiliki tombol `TogglePremiumButton`.
  - Menampilkan Stripe Customer.
  - AI usage masih dibaca dari `AIUsage`, bukan credit transaction.
- `apps/admin/src/app/(studio)/users/[id]/toggle-premium.tsx`
  - Masih memberi/mencabut premium manual.
- `apps/admin/src/app/api/admin/users/[id]/premium/route.ts`
  - Masih endpoint admin untuk toggle premium.
- `apps/admin/src/app/(studio)/at-risk/page.tsx`
  - Kategori `Premium At-Risk`.
  - Kategori `Peluang Konversi Premium`.
  - Query `isPremium`.
- `apps/admin/src/app/(studio)/settings/page.tsx`
  - Masih memilih provider `stripe` atau `mayar`.
  - Masih menyimpan Mayar static links Plus/Pro bulanan/tahunan.
  - Copy masih menyebut billing subscription.
- `apps/admin/src/app/(studio)/retention/page.tsx`
  - Konsep halaman masih valid, tetapi copy menyebut kandidat premium.
- `apps/admin/src/app/(studio)/promo-codes`
  - Promo masih mungkin terkait subscription/Stripe coupon.
  - Perlu keputusan apakah promo dipakai ulang untuk bundle/top-up atau dibuat dormant.
- `apps/admin/src/app/(studio)/page.tsx`
  - Overview utama masih import Stripe.
  - Masih menghitung `Premium Users`, `MRR`, active subscriptions, conversion premium, dan premium at-risk.
- `apps/admin/src/app/(studio)/engagement/page.tsx`
  - Masih menampilkan badge premium dari `isPremium`.
- `apps/admin/src/lib/stripe.ts`
  - Client Stripe masih tersedia untuk kebutuhan legacy.
- `apps/admin/src/lib/settings.ts`
  - Default `payment_provider` masih `stripe`.
- `apps/admin/src/lib/rate-limit.ts`
  - Helper limit lama masih memakai parameter `isPremium`.

### Hasil Audit Legacy Admin

Audit awal dilakukan dengan mencari pemakaian:

```text
isPremium
isPro
premiumExpiresAt
proExpiresAt
stripeCustomerId
stripeSubscriptionId
premium
subscription
subscriber
Stripe/stripe
MRR
```

Area prioritas cleanup:

- Prioritas 1: `apps/admin/src/app/(studio)/page.tsx`, `finance/page.tsx`, `funnel/page.tsx`.
- Prioritas 2: `users/page.tsx`, `users/[id]/page.tsx`, `users/[id]/toggle-premium.tsx`, `api/admin/users/[id]/premium/route.ts`.
- Prioritas 3: `at-risk/page.tsx`, `retention/page.tsx`, `engagement/page.tsx`.
- Prioritas 4: `settings/page.tsx`, `api/admin/settings/route.ts`, `lib/settings.ts`, `lib/stripe.ts`.
- Prioritas produk: `promo-codes` perlu keputusan apakah menjadi promo bundle/top-up atau dormant legacy.

Status audit:

- Audit ini hanya memetakan pemakaian legacy admin dan belum menghapus behavior legacy.
- Kolom legacy database tetap dipertahankan sebagai data dormant.
- Cleanup UI berikutnya sebaiknya memakai helper analytics baru agar definisi paid user konsisten.

## Prinsip Cleanup

- Jangan hapus kolom legacy `isPremium`, `isPro`, `premiumExpiresAt`, `proExpiresAt`, `stripeCustomerId`, `stripeSubscriptionId` pada fase cleanup UI.
- Jangan hapus route Stripe atau subscription sebelum ada keputusan migrasi data dan rollback.
- Ubah halaman admin dari bahasa subscription menjadi bahasa purchase/credit.
- Pertahankan konsep analytics yang berguna:
  - funnel tetap ada,
  - finance tetap ada,
  - at-risk tetap ada,
  - user segmentation tetap ada.
- Ganti definisi segmen dan metrik agar sesuai prepaid:
  - paid user = pernah top-up credit atau membeli bundle,
  - active paid user = paid user yang aktif dalam rentang tertentu,
  - bundle buyer = punya `BundlePurchase`,
  - top-up buyer = punya `CreditTransaction(type: TOPUP)`,
  - credit spender = punya `CreditTransaction(type: DEBIT)`.

## Target Halaman

### Dashboard / Overview

Saat ini route `/dashboard` hanya redirect ke `/`.

Target jika dashboard overview dikembangkan:

- Total users.
- Active users 7 hari.
- Total credit outstanding.
- Credit top-up bulan ini.
- Bundle purchase bulan ini.
- AI credit spent bulan ini.
- Top bundle berdasarkan purchase.
- Top AI action berdasarkan debit credit.

Catatan:

- Jika `/` sudah menjadi overview utama, cukup pastikan overview itu memakai credit + bundle.
- Jangan buat duplicate dashboard jika route `/` sudah dipakai sebagai overview admin.

### Finance

Ganti konsep Finance dari subscription MRR menjadi prepaid revenue dashboard.

Metrik baru:

- Gross top-up revenue dari credit package checkout yang sukses.
- Gross bundle revenue dari `BundlePurchase.amountPaidIdr`.
- Total revenue bulan ini.
- Total credit sold.
- Credit outstanding liability dari `CreditBalance.balance`.
- Total credit spent dari `CreditTransaction(type: DEBIT)`.
- Bundle purchase count.
- Top-up purchase count.

Pengganti section:

- `Est. MRR` -> `Revenue Bulan Ini`.
- `Total Premium` -> `Paid Users`.
- `Baru Bulan Ini` -> `New Paying Users Bulan Ini`.
- `Expiring <=30 Hari` -> `Credit Low Balance Users` atau `Dormant Paid Users`.
- `Subscriber Baru per Bulan` -> `Revenue / Purchase per Bulan`.
- `Akan Expiry dalam 30 Hari` -> `Low Credit Balance` atau `Recent High-Value Buyers`.
- `Semua Subscriber Premium` -> `Recent Paying Users`.

Sumber data:

- `CreditTransaction` untuk top-up dan debit.
- `CreditBalance` untuk outstanding balance.
- `BundlePurchase` untuk bundle revenue.
- `User` hanya untuk profil buyer.

Catatan risiko:

- `CreditTransaction.amount` adalah jumlah credit, bukan rupiah.
- Untuk top-up revenue presisi, idealnya simpan payment amount atau package snapshot pada transaksi/payment event.
- Saat ini bundle revenue lebih presisi karena `BundlePurchase.amountPaidIdr` tersedia.

### Funnel

Pertahankan funnel sebagai journey user, tetapi step akhir bukan premium.

Funnel baru yang disarankan:

1. Registered.
2. Completed Screening.
3. Created Curriculum atau Opened Learn.
4. Started Bundle atau Generated Material.
5. Attempted Quiz / Exercise.
6. Used Paid AI Action atau Bought Bundle.
7. First Top-up / First Bundle Purchase.

Opsi funnel terpisah:

- **Learning Funnel**
  - registered -> screening -> curriculum -> material -> quiz/exercise -> completion.
- **Monetization Funnel**
  - registered -> meaningful learning activity -> hit locked/paid CTA -> checkout started -> payment completed.

Pengganti istilah:

- `Went Premium` -> `First Purchase`.
- `registrasi -> premium` -> `registrasi -> first purchase`.
- `Lulus topik tapi tidak premium` -> `Engaged but not purchased`.
- `Target penawaran upgrade` -> `Target bundle/top-up offer`.

Data yang perlu ditambahkan jika belum ada:

- Checkout started event untuk bundle/top-up.
- Payment completed event yang menyimpan source.
- Locked CTA impression/click agar funnel monetization tidak hanya proxy.

### Users List

Ganti segmentasi premium/free menjadi segmentasi credit + bundle.

Filter baru:

- All.
- Has Credit.
- Low Credit.
- No Credit.
- Bought Bundle.
- Never Purchased.
- Active 7d.
- Dormant.
- Beginner/Mid/Advance tetap dipertahankan.

Kolom baru:

- Credit Balance.
- Bundle Count.
- Last Purchase.
- Last Active.
- Joined.

Yang dihapus/dormant dari UI:

- Filter `premium`.
- Filter `expiring`.
- Badge crown premium.
- Kolom `Expires`.

Catatan:

- `Free` dapat diganti menjadi `Never Purchased`, bukan `isPremium=false`.
- Paid status dihitung dari transaksi/purchase, bukan boolean legacy.

### User Detail

Ganti profile admin user agar menunjukkan entitlement baru.

Tambahkan section:

- Credit balance.
- Recent credit transactions.
- Bundle purchases user.
- Certificates user.
- Manual credit adjustment shortcut.
- AI credit usage by action.

Ganti section lama:

- `TogglePremiumButton` -> `Manual Credit Adjustment` atau link ke `/payments`.
- Crown premium -> badge `Paid`, `Bundle Buyer`, atau `Has Credit`.
- `Stripe Customer` -> `Payment refs`, Mayar transaction ids, atau legacy field di section teknis tersembunyi.
- `AI Usage (14 days)` -> `Credit Usage (14 days)` dari `CreditTransaction(type: DEBIT)`.

Yang boleh tetap:

- Profile info.
- Level.
- XP.
- Streak.
- Topics done.
- Curricula/bundle progress.

### At-Risk

Pertahankan konsep at-risk, tetapi ubah kategori.

Kategori baru:

- **Paid At-Risk**
  - user pernah top-up atau beli bundle, tetapi tidak aktif 7+ hari.
- **Bundle At-Risk**
  - user membeli bundle tetapi progress kecil atau berhenti 7+ hari.
- **Low Credit Active Users**
  - user aktif, sering debit credit, saldo rendah.
- **Engaged Never Purchased**
  - user aktif dan menyelesaikan beberapa topic/quiz, tetapi belum pernah top-up atau beli bundle.
- **Win-Back Buyers**
  - user pernah bayar, lalu dormant 14-60 hari.

Pengganti copy:

- `Premium At-Risk` -> `Paid At-Risk`.
- `Peluang Konversi Premium` -> `Peluang Pembelian`.
- `Free user aktif` -> `Engaged never-purchased users`.

Data:

- `BundlePurchase`.
- `CreditTransaction`.
- `CreditBalance`.
- `Streak`.
- `TopicQuiz`.

### Retention

Konsep retention tetap valid.

Adjustment copy:

- `kandidat premium terbaik` -> `kandidat bundle/top-up terbaik`.
- Jika ada cohort monetization, tambahkan retention khusus:
  - retention setelah top-up pertama,
  - retention setelah bundle purchase,
  - bundle completion retention.

Metrik tambahan:

- Week 1 retention setelah first purchase.
- Week 4 retention setelah bundle purchase.
- Repeat top-up rate.
- Bundle completion rate.

### Settings

Settings admin sebaiknya tidak lagi mengelola payment links subscription.

Target baru:

- Payment provider operational config:
  - Mayar enabled/disabled.
  - Mayar API configured status.
  - Webhook configured status.
  - Callback/redirect URL reference.
- Email test tetap boleh dipertahankan.
- Stripe dapat dipindah ke section `Legacy Subscription` yang collapsed/dormant jika masih diperlukan.

Yang dipindahkan:

- Pricing paket credit ke `/pricing`.
- Cost per action ke `/pricing`.
- Bundle pricing ke `/bundles`.

Yang dihapus dari UI utama:

- `mayar_plus_monthly_url`.
- `mayar_plus_annual_url`.
- `mayar_pro_monthly_url`.
- `mayar_pro_annual_url`.
- Toggle provider Stripe/Mayar sebagai pilihan utama jika flow baru hanya memakai Mayar.

### Promo Codes

Perlu keputusan produk.

Opsi A: Reuse promo untuk credit + bundle.

- Promo dapat berlaku untuk `credit_topup`.
- Promo dapat berlaku untuk `bundle`.
- Tambahkan scope promo:
  - all,
  - credit_package,
  - bundle,
  - specific bundle,
  - specific credit package.

Opsi B: Dormant legacy.

- Sembunyikan menu promo dari sidebar.
- Pertahankan data/API sampai subscription lama benar-benar dicabut.

Rekomendasi:

- Untuk sementara pertahankan, tetapi label ulang menjadi `Promotions`.
- Tambahkan plan lanjutan untuk scope promo sebelum mengubah behavior checkout.

## Target Data Helper

Agar halaman admin tidak mengulang query kompleks, buat helper read model analytics.

Helper yang disarankan:

- `getPaidUserIds()`
  - user yang punya `BundlePurchase` atau `CreditTransaction(type: TOPUP)`.
- `getUserCreditSummary(userId)`
  - balance, total top-up credit, total spent credit, recent transactions.
- `getRevenueSummary(range)`
  - top-up revenue, bundle revenue, total purchase count.
- `getBundleBuyerSummary(range)`
  - purchase count, revenue, top bundles.
- `getCreditUsageSummary(range)`
  - debit by action, top spender, total spent.

Catatan:

- Untuk top-up revenue yang akurat, perlu payment amount. Jika belum tersimpan di transaksi, pakai package snapshot atau Mayar payment event pada tahap berikutnya.
- Jangan mengartikan `CreditTransaction.amount` sebagai rupiah.
- Helper awal dibuat di `apps/admin/src/lib/admin-analytics.ts`.
- `getRevenueSummary()` sementara mengembalikan `estimatedTopupRevenueIdr` karena top-up payment amount belum tersimpan eksplisit di `CreditTransaction`.

## Urutan Implementasi Disarankan

1. Audit ulang semua pemakaian `isPremium`, `isPro`, `premiumExpiresAt`, `proExpiresAt`, `stripeCustomerId`, `stripeSubscriptionId` di admin.
2. Tambahkan helper shared admin analytics untuk paid user, revenue, credit, bundle.
3. Cleanup `/finance` menjadi prepaid revenue dashboard.
4. Cleanup `/funnel` menjadi learning + first purchase funnel.
5. Cleanup `/users` list filter, badge, dan kolom ke credit + bundle.
6. Cleanup `/users/[id]` detail ke credit balance, bundle purchase, credit transaction, dan certificate.
7. Ganti `TogglePremiumButton` dengan manual credit adjustment/link ke payment tooling.
8. Cleanup `/at-risk` menjadi paid at-risk, bundle at-risk, low credit active, dan engaged never-purchased.
9. Cleanup copy `/retention` dari premium ke bundle/top-up.
10. Cleanup `/settings` agar subscription payment links menjadi legacy/dormant atau dihapus dari UI utama.
11. Putuskan strategy promo code: reuse untuk bundle/top-up atau dormant legacy.
12. Setelah UI admin bersih, audit ulang route API legacy premium dan tentukan apakah tetap dormant atau dihapus.

## Checklist

- [x] Audit semua pemakaian legacy premium/subscription di admin.
- [x] Buat helper analytics admin untuk paid user berbasis credit + bundle.
- [x] Cleanup halaman Finance dari subscription MRR ke prepaid revenue.
- [x] Ganti Finance subscriber list menjadi recent paying users.
- [x] Tambahkan metrik credit outstanding liability di Finance.
- [x] Tambahkan metrik credit spent dan top AI action di Finance.
- [x] Cleanup Funnel dari `Went Premium` ke `First Purchase`.
- [x] Pisahkan atau rapikan Funnel menjadi learning funnel dan monetization funnel.
- [ ] Tambahkan proxy/data checkout started jika dibutuhkan funnel payment.
- [x] Cleanup Users filter dari premium/free/expiring ke credit + bundle segments.
- [x] Ganti badge premium di Users menjadi paid/bundle/credit indicator.
- [x] Ganti kolom expiry di Users menjadi credit balance atau last purchase.
- [x] Cleanup User Detail dari premium toggle ke credit/bundle controls.
- [x] Tambahkan credit balance dan recent credit transactions di User Detail.
- [x] Tambahkan bundle purchases user di User Detail.
- [x] Ganti AI usage User Detail menjadi credit usage by transaction.
- [x] Cleanup At-Risk dari premium at-risk ke paid/bundle/low-credit at-risk.
- [x] Cleanup copy Retention dari kandidat premium ke bundle/top-up.
- [ ] Cleanup Settings dari Mayar Plus/Pro static links ke payment operational config.
- [ ] Putuskan Promo Codes: reuse untuk bundle/top-up atau dormant legacy.
- [ ] Audit API admin legacy premium setelah UI cleanup.
- [ ] Update sidebar jika ada menu legacy yang perlu disembunyikan atau diganti label.
