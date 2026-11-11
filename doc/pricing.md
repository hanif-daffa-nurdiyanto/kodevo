# Plan Credits Page dan Pricing Management

Dokumen ini merapikan arah perubahan pricing setelah credit/top-up tidak lagi cocok ditempatkan di Settings Billing. Targetnya: user punya menu khusus **Credits** di `/credits`, sementara admin punya halaman CRUD pricing untuk mengelola paket top-up dan biaya credit per aksi.

## Prinsip

- Settings fokus ke profil, password, visibility, dan koneksi akun.
- Semua fitur saldo credit, top-up credit, dan riwayat credit user pindah ke `/credits`.
- User-facing CTA top-up harus mengarah ke `/credits`, bukan `/settings?tab=billing`.
- Admin pricing harus bisa dikelola dari halaman khusus, bukan hardcoded di frontend.
- Pricing perlu tetap kompatibel dengan flow Mayar `credit_topup`.

## Kondisi Saat Ini

- Halaman Settings masih punya tab Billing dan komponen `BillingSection`.
- `BillingSection` menampilkan saldo credit dan 5 paket dummy top-up.
- Paket top-up masih hardcoded di `apps/web/src/app/(protected)/settings/billing-section.tsx`.
- Landing pricing juga memakai paket dummy hardcoded.
- Harga per credit dan cost per aksi AI tersimpan di `AppSetting`.
- Admin sudah punya halaman Payments untuk transaksi credit, bundle purchase, dan manual adjustment, tetapi belum ada CRUD pricing khusus.

## Target User

### Menu Credits

Tambahkan menu baru untuk user:

```text
/credits
```

Isi halaman:

- Saldo credit saat ini.
- Paket top-up credit.
- CTA checkout top-up credit.
- Ringkasan harga per credit.
- Riwayat transaksi credit user.
- State loading/error untuk checkout.
- Empty state jika belum ada transaksi.

### Pemindahan dari Settings Billing

Pindahkan fitur dari Settings Billing ke `/credits`.

Yang dipindahkan:

- Credit balance card.
- Paket top-up credit.
- Checkout top-up credit.
- Copy tentang penggunaan credit.

Yang sebaiknya tidak lagi berada di Settings:

- Tab Billing jika isinya hanya credit.
- CTA top-up di Settings.
- Paket pricing/top-up.

Opsi untuk Settings:

- Hapus tab Billing jika tidak ada konten billing lain.
- Atau ubah menjadi link kecil ke `/credits` jika masih ingin transisi halus.

### Navigasi User

Tambahkan link/menu Credits di user app.

Target area yang perlu dicek:

- Header/navbar protected.
- Mobile menu.
- CTA `Top-up Credit` dari dashboard, `/learn`, locked state, dan AI usage counter.
- Landing pricing CTA untuk user login.

Semua link lama:

```text
/settings?tab=billing
```

diganti menjadi:

```text
/credits
```

## Target Admin

### Halaman Pricing Admin

Tambahkan halaman khusus admin untuk pricing.

Route yang disarankan:

```text
/pricing
```

atau jika ingin dikelompokkan:

```text
/payments/pricing
```

Rekomendasi sementara: gunakan `/pricing` agar sejajar dengan `/bundles` dan mudah ditemukan.

### CRUD Paket Top-Up

Admin harus bisa mengelola paket top-up credit.

Field paket top-up:

- Label paket.
- Jumlah credit.
- Harga IDR.
- Deskripsi/catatan.
- Status aktif/nonaktif.
- Order.

Fitur list:

- Pagination.
- Search.
- Sort/order.
- Filter aktif/nonaktif.
- Preview harga per credit.

Catatan data:

- Paket top-up saat ini masih dummy hardcoded.
- Jika ingin CRUD sungguhan, perlu model/table baru, misalnya `CreditPackage`.
- Alternatif sementara: simpan JSON paket di `AppSetting`, tetapi ini kurang enak untuk CRUD, filter, dan audit.
- Rekomendasi: tambahkan table khusus agar admin CRUD rapi.

### CRUD Cost Per Action

Admin juga perlu mengelola biaya credit per aksi AI.

Item yang ada sekarang:

- `credit_cost_curriculum`
- `credit_cost_material`
- `credit_cost_quiz`
- `credit_cost_exercise_generate`
- `credit_cost_exercise_submit`
- `credit_cost_project`
- `credit_cost_chat`

Admin harus bisa:

- Melihat semua cost per action.
- Edit nominal credit per action.
- Reset ke default jika dibutuhkan.
- Validasi angka minimal 0.

Catatan:

- Cost per action saat ini sudah cocok disimpan di `AppSetting`.
- Untuk tahap awal, CRUD cost per action bisa tetap memakai `AppSetting`.
- Paket top-up lebih baik pindah ke table sendiri.

## Target API

### User API

Endpoint yang dipakai `/credits`:

```text
GET  /api/credit/balance
POST /api/credit/topup
GET  /api/credit/transactions
```

Catatan:

- `GET /api/credit/balance` sudah ada.
- `POST /api/credit/topup` sudah ada.
- `GET /api/credit/transactions` perlu ditambahkan jika belum ada.
- `POST /api/credit/topup` perlu menerima package id jika pricing sudah CRUD.

### Admin API

Endpoint admin yang disarankan:

```text
GET    /api/admin/pricing
PATCH  /api/admin/pricing/action-costs
POST   /api/admin/pricing/credit-packages
PATCH  /api/admin/pricing/credit-packages/[id]
DELETE /api/admin/pricing/credit-packages/[id]
```

Validasi:

- Hanya admin.
- `credits` harus integer positif.
- `priceIdr` harus integer positif atau 0 jika paket promo/free memang nanti diizinkan.
- Package aktif harus punya label, credits, price, dan order yang valid.

## Model Data yang Disarankan

Tambahkan model:

```prisma
model CreditPackage {
  id          String   @id @default(cuid())
  label       String
  description String?
  credits     Int
  priceIdr    Int
  isActive    Boolean  @default(true)
  order       Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive, order])
}
```

Pertimbangan:

- `priceIdr / credits` bisa dihitung untuk harga per credit.
- Untuk fase awal tidak perlu relasi ke transaksi karena Mayar webhook menyimpan transaksi sebagai `CreditTransaction`.
- Jika nanti perlu audit exact package, simpan `packageId` atau `packageSnapshot` di description/ref metadata pembayaran.

## Urutan Implementasi Disarankan

1. Buat route user `/credits`.
2. Pindahkan UI `BillingSection` menjadi komponen Credits page.
3. Tambahkan riwayat transaksi credit user.
4. Ganti semua CTA `/settings?tab=billing` menjadi `/credits`.
5. Rapikan Settings: hapus tab Billing atau ubah menjadi link ke Credits.
6. Tambahkan model `CreditPackage` dan seed 5 paket awal.
7. Refactor `POST /api/credit/topup` agar memakai package id.
8. Tambahkan halaman admin `/pricing`.
9. Tambahkan CRUD credit package di admin.
10. Tambahkan edit cost per action di admin.
11. Sinkronkan landing pricing agar mengambil paket aktif dari source pricing baru.

## Risiko dan Catatan Teknis

- Jangan memutus flow Mayar yang sudah berjalan.
- Hindari mengubah meaning `CreditTransaction.amount`; tetap jumlah credit, bukan rupiah.
- Saat migrasi dari paket hardcoded ke table, pastikan landing dan `/credits` membaca source yang sama.
- Jika package dihapus/nonaktif, transaksi lama tetap harus aman karena webhook berbasis description/ref id.
- Settings tab lama perlu redirect atau link transisi agar URL lama tidak terasa rusak.

## Checklist

- [x] Tambahkan halaman user `/credits`.
- [x] Pindahkan UI saldo credit dari Settings Billing ke `/credits`.
- [x] Pindahkan paket top-up credit dari Settings Billing ke `/credits`.
- [x] Tambahkan riwayat transaksi credit user di `/credits`.
- [x] Ganti CTA top-up credit dari `/settings?tab=billing` menjadi `/credits`.
- [x] Rapikan Settings agar tidak lagi memuat Billing credit dashboard.
- [x] Arahkan klik jumlah credit di dashboard ke halaman `/credits`.
- [x] Tambahkan model/table `CreditPackage`.
- [x] Seed 5 paket credit awal ke `CreditPackage`.
- [x] Refactor `POST /api/credit/topup` agar memakai package id.
- [x] Sinkronkan landing pricing dengan paket credit aktif.
- [x] Tambahkan halaman admin `/pricing`.
- [x] Tambahkan CRUD paket top-up credit di admin.
- [x] Tambahkan edit cost per action di admin.
- [x] Tambahkan validasi admin pricing.
