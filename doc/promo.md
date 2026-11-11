# Plan Promo Bundle dan Credit

Dokumen ini merapikan promo agar bekerja untuk pembelian bundle dan top-up credit. Flow user yang diinginkan: saat user klik beli bundle atau top-up credit, muncul modal ringkasan harga, user bisa input kode promo, lalu checkout memakai harga final.

## Kondisi Saat Ini

- Admin sudah punya halaman promo codes, tetapi tipe promo masih membawa konsep lama `FREE_PLUS` dan `FREE_PRO`.
- API `POST /api/promo/validate` sudah bisa validasi kode, tetapi belum menghitung harga final berdasarkan target checkout.
- `POST /api/credit/topup` langsung membuat Mayar payment dari `packageId`.
- `POST /api/bundles/[trackId]/checkout` langsung membuat Mayar payment dari harga bundle.
- Checkout user belum punya modal review harga dan input kode promo.
- `PromoRedemption` hanya unique per `(promoCodeId, userId)`, belum menyimpan konteks target promo, amount, atau transaksi payment.
- Audit awal: `FREE_PLUS` dan `FREE_PRO` masih dipakai oleh route legacy `POST /api/promo/redeem`, jadi enum lama dipertahankan dulu sampai flow premium lama benar-benar dihapus.

## Tujuan

- Promo dapat dipakai untuk `credit_topup`, `bundle`, atau keduanya.
- Admin bisa membuat, mengaktifkan, menonaktifkan, dan membatasi promo untuk target tertentu.
- User melihat detail harga sebelum lanjut bayar.
- User bisa memasukkan kode promo di modal checkout.
- Harga yang dikirim ke Mayar adalah harga final setelah promo.
- Promo redemption hanya dicatat setelah pembayaran berhasil dari webhook, bukan saat validasi.
- Validasi promo di frontend hanya preview; validasi final tetap dilakukan di endpoint checkout.

## Desain Data

Tambahan/penyesuaian yang disarankan:

- Tambahkan enum target promo:
  - `CREDIT`
  - `BUNDLE`
  - `ALL`
- Pertahankan tipe diskon:
  - `PERCENT_OFF`
  - `AMOUNT_OFF`
- Deprecate atau hapus konsep lama:
  - `FREE_PLUS`
  - `FREE_PRO`
- Tambahkan field opsional di `PromoCode`:
  - `target`
  - `minAmountIdr`
  - `maxDiscountIdr`
  - `creditPackageId`
  - `trackId`
- Tambahkan field audit di `PromoRedemption`:
  - `target`
  - `refId`
  - `discountAmountIdr`
  - `originalAmountIdr`
  - `finalAmountIdr`
  - `mayarTransactionId`

Catatan:

- `creditPackageId` dipakai jika promo hanya berlaku untuk paket credit tertentu.
- `trackId` dipakai jika promo hanya berlaku untuk bundle tertentu.
- Jika dua field itu kosong, promo berlaku untuk semua item sesuai `target`.

## Flow User

### Top-up Credit

1. User klik paket credit di `/credits`.
2. Tampilkan modal checkout.
3. Modal menampilkan:
   - nama paket credit
   - jumlah credit
   - harga awal
   - input kode promo
   - diskon jika valid
   - harga final
4. User klik `Bayar`.
5. Client memanggil `POST /api/credit/topup` dengan:
   - `packageId`
   - `promoCode`
6. API validasi ulang promo.
7. API membuat Mayar payment dengan amount final.
8. Webhook Mayar memproses top-up credit dan mencatat promo redemption jika pembayaran sukses.

### Bundle

1. User klik `Beli Bundle` di detail bundle.
2. Tampilkan modal checkout.
3. Modal menampilkan:
   - nama bundle
   - jumlah modul/topik
   - harga awal
   - input kode promo
   - diskon jika valid
   - harga final
4. User klik `Bayar`.
5. Client memanggil `POST /api/bundles/[trackId]/checkout` dengan:
   - `promoCode`
6. API validasi ulang promo.
7. API membuat Mayar payment dengan amount final.
8. Webhook Mayar membuat `BundlePurchase` dan mencatat promo redemption jika pembayaran sukses.

## Aturan Promo

- Promo inactive tidak bisa dipakai.
- Promo expired tidak bisa dipakai.
- Promo yang sudah mencapai `maxUses` tidak bisa dipakai.
- User tidak bisa memakai kode yang sama lebih dari sekali, kecuali model redemption nanti memang dibuat mendukung repeat usage.
- Promo `CREDIT` hanya valid untuk top-up credit.
- Promo `BUNDLE` hanya valid untuk bundle.
- Promo `ALL` valid untuk keduanya.
- Promo dengan `creditPackageId` hanya valid untuk package tersebut.
- Promo dengan `trackId` hanya valid untuk bundle tersebut.
- `PERCENT_OFF` menghitung diskon dari harga awal.
- `AMOUNT_OFF` mengurangi nominal tetap.
- Harga final tidak boleh negatif.
- Jika harga final menjadi `0`, checkout bisa langsung diproses tanpa Mayar atau dibuat flow khusus free checkout dengan idempotency.

## API

### `POST /api/promo/validate`

Request:

```json
{
  "code": "HEMAT20",
  "target": "bundle",
  "refId": "track_or_package_id"
}
```

Response sukses:

```json
{
  "valid": true,
  "code": "HEMAT20",
  "description": "Diskon launch",
  "originalAmountIdr": 199000,
  "discountAmountIdr": 39800,
  "finalAmountIdr": 159200
}
```

### `POST /api/credit/topup`

Tambahkan support:

```json
{
  "packageId": "credit_pkg_plus_1000",
  "promoCode": "HEMAT20"
}
```

### `POST /api/bundles/[trackId]/checkout`

Tambahkan support:

```json
{
  "promoCode": "HEMAT20"
}
```

## Webhook Mayar

Description Mayar perlu membawa metadata promo:

- `promoCode`
- `promoCodeId`
- `discountAmountIdr`
- `originalAmountIdr`
- `finalAmountIdr`

Saat webhook sukses:

- Untuk `credit_topup`, buat credit transaction seperti sekarang.
- Untuk `bundle`, buat bundle purchase seperti sekarang.
- Jika ada promo, buat `PromoRedemption`.
- Increment `PromoCode.usedCount`.
- Pastikan idempotency tetap aman berbasis `mayarTransactionId`.

## Admin

- Promo CRUD perlu disesuaikan dari premium/subscription menjadi bundle + credit.
- Tipe `FREE_PLUS` dan `FREE_PRO` tidak ditampilkan lagi.
- Admin bisa memilih target promo:
  - semua
  - credit
  - bundle
- Admin bisa memilih scope spesifik:
  - semua credit package
  - credit package tertentu
  - semua bundle
  - bundle tertentu
- Admin bisa mengisi:
  - kode
  - deskripsi
  - tipe diskon
  - persen atau nominal
  - minimum transaksi
  - maksimum diskon
  - max uses
  - expired date
  - status aktif
- List admin menampilkan:
  - target
  - scope
  - diskon
  - usage
  - revenue/discount impact
  - status

## UI User

- Buat komponen modal checkout reusable untuk bundle dan credit.
- Modal menampilkan loading state saat validasi promo.
- Modal menampilkan error jelas jika kode invalid/expired/habis.
- Modal menghitung ulang harga setelah promo valid.
- Tombol bayar disabled saat validasi berjalan.
- Jika promo dihapus dari input, harga kembali ke harga awal.
- Jika endpoint checkout menolak promo, tampilkan error di modal dan jangan redirect.

## Checklist

- [x] Audit schema promo lama `FREE_PLUS` dan `FREE_PRO`.
- [x] Tambahkan target promo untuk `CREDIT`, `BUNDLE`, dan `ALL`.
- [x] Tambahkan scope promo untuk package credit tertentu dan bundle tertentu.
- [x] Tambahkan field audit promo redemption untuk amount dan ref transaksi.
- [x] Buat migration promo bundle + credit.
- [x] Refactor admin promo CRUD agar tidak lagi menampilkan Plus/Pro.
- [x] Tambahkan target selector di form promo admin.
- [x] Tambahkan scope selector di form promo admin.
- [x] Tambahkan validasi admin promo untuk percent/amount/min/max discount.
- [x] Refactor `POST /api/promo/validate` agar menerima target dan refId.
- [x] Buat helper server untuk menghitung diskon promo secara konsisten.
- [x] Refactor `POST /api/credit/topup` agar menerima `promoCode`.
- [x] Refactor `POST /api/bundles/[trackId]/checkout` agar menerima `promoCode`.
- [x] Kirim metadata promo ke description Mayar.
- [x] Refactor webhook Mayar agar mencatat redemption promo untuk credit top-up.
- [x] Refactor webhook Mayar agar mencatat redemption promo untuk bundle purchase.
- [x] Pastikan redemption promo hanya dibuat setelah payment sukses.
- [x] Pastikan idempotency webhook tetap aman saat promo dipakai.
- [x] Buat modal checkout reusable untuk credit dan bundle.
- [x] Tampilkan detail harga paket credit di modal checkout.
- [x] Tampilkan detail harga bundle di modal checkout.
- [x] Tambahkan input kode promo di modal checkout.
- [x] Tambahkan preview diskon dan harga final di modal checkout.
- [x] Ganti tombol top-up credit agar membuka modal checkout.
- [x] Ganti tombol beli bundle agar membuka modal checkout.
- [x] Tangani promo invalid/expired/habis dengan pesan jelas.
- [x] Tangani harga final `0` jika promo membuat transaksi gratis.
- [ ] Tambahkan test/manual QA untuk promo credit.
- [ ] Tambahkan test/manual QA untuk promo bundle.
