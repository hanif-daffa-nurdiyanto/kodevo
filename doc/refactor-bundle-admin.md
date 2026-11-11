# Plan Refactor Bundle Admin

Dokumen ini merapikan pengalaman admin saat membuat dan mengedit bundle. Tujuannya: field yang dikelola sistem tidak perlu tampil di form, flow create langsung masuk ke editor, dan konsep free/paid module hanya dipakai untuk bundle gratis.

## Prinsip

- Admin hanya mengelola field yang memang perlu keputusan manual.
- `slug` dan `order` dikelola sistem agar data konsisten.
- Bundle baru otomatis muncul paling atas di list admin.
- Harga dan status gratis harus menjadi satu keputusan yang jelas.
- Module free/paid hanya relevan untuk bundle gratis.
- Bundle berbayar otomatis tidak memotong credit user saat generate materi karena user sudah membeli bundle.

## New Bundle

Perubahan form `/bundles/new`:

- Hilangkan field `slug`.
- Hilangkan field `order`.
- Sistem membuat `slug` otomatis dari title.
- Sistem mengatur `order` otomatis agar bundle baru tampil paling atas.
- Pindahkan checkbox `Free bundle` dekat field `Price IDR`.
- Jika `Free bundle` dicentang, sembunyikan field `Price IDR`.
- Saat `Free bundle` dicentang, payload `priceIdr` harus `null`.
- Setelah create berhasil, redirect ke `/bundles/[id]/edit`.

Perubahan API `POST /api/admin/bundles`:

- Terima payload tanpa `slug`.
- Generate slug unik dari title.
- Terima payload tanpa `order`.
- Set `order` otomatis untuk bundle baru agar tampil paling atas.
- Jika `isFree === true`, paksa `priceIdr = null`.
- Jika `isFree === false`, validasi harga boleh kosong untuk draft, tapi publish tetap wajib punya harga.

## Edit Bundle

Perubahan form `/bundles/[id]/edit`:

- Hilangkan field `slug`.
- Hilangkan field `order`.
- Tetap tampilkan slug sebagai metadata read-only jika dibutuhkan di header/deskripsi, bukan field edit.
- Pindahkan checkbox `Free bundle` dekat field `Price IDR`.
- Jika `Free bundle` dicentang, sembunyikan field `Price IDR`.
- Saat bundle berubah menjadi gratis, submit harus mengirim `priceIdr: null`.
- Saat bundle berubah menjadi berbayar, harga bisa diisi ulang.

Perubahan API `PATCH /api/admin/bundles/[trackId]`:

- Abaikan perubahan `slug` dari client.
- Abaikan perubahan `order` dari client.
- Jika `isFree === true`, set `priceIdr = null`.
- Jika `isFree === false`, pertahankan validasi publish bahwa harga wajib ada sebelum publish.

## Module Editor

Konsep free/paid module:

- Untuk bundle gratis, admin boleh menentukan module `free` atau `paid`.
- `free` di module bundle gratis berarti generate materi tidak mengurangi/memerlukan credit user.
- `paid` di module bundle gratis berarti akses/generate mengikuti rule paid module yang berlaku.
- Untuk bundle berbayar, pilihan free/paid module tidak perlu tampil.
- Untuk bundle berbayar, semua module otomatis tidak memotong credit karena user sudah membeli bundle.

Perubahan UI module editor:

- Hilangkan input angka `order` untuk module dan topik/materi.
- Urutan module diatur dengan drag-and-drop.
- Urutan topik/materi di dalam module diatur dengan drag-and-drop.
- Setelah drag-and-drop, sistem menyimpan ulang field `order` secara otomatis.
- Jika `bundle.isFree === true`, tampilkan kontrol free/paid module.
- Jika `bundle.isFree === false`, sembunyikan kontrol free/paid module.
- Jika `bundle.isFree === false`, tampilkan helper text singkat bahwa akses module mengikuti pembelian bundle.
- Saat membuat module di bundle berbayar, backend boleh menyimpan `isFree` default apa pun yang paling aman, tetapi UI tidak perlu mengeksposnya.
- Saat membuat module di bundle gratis, default `isFree = true`.
- Saat generate draft content untuk bundle gratis, default module `isFree = true`.
- Saat generate draft content untuk bundle berbayar, tidak perlu menampilkan/menekankan status free/paid module.

## List Admin

Penyesuaian list `/bundles`:

- Pastikan sort default menampilkan bundle baru paling atas.
- Jika sistem memakai field `order`, update logic order agar create baru mendapat urutan paling prioritas.
- Pertahankan sort manual lain seperti harga, module count, atau nama.
- Hindari admin perlu mengisi order manual saat create/edit.

## Checklist

- [x] Hilangkan field `slug` dari form new bundle.
- [x] Hilangkan field `order` dari form new bundle.
- [x] Generate slug unik otomatis dari title saat create.
- [x] Set order otomatis agar bundle baru tampil paling atas.
- [x] Pindahkan checkbox `Free bundle` dekat field harga di form new.
- [x] Sembunyikan field harga saat `Free bundle` dicentang di form new.
- [x] Redirect setelah create berhasil ke `/bundles/[id]/edit`.
- [x] Hilangkan field `slug` dari form edit bundle.
- [x] Hilangkan field `order` dari form edit bundle.
- [x] Tampilkan slug sebagai metadata read-only jika masih dibutuhkan.
- [x] Pindahkan checkbox `Free bundle` dekat field harga di form edit.
- [x] Sembunyikan field harga saat `Free bundle` dicentang di form edit.
- [x] Paksa `priceIdr = null` saat bundle disimpan sebagai gratis.
- [x] Abaikan perubahan `slug` dan `order` dari client di API edit.
- [x] Hilangkan field/input angka `order` dari editor module.
- [x] Tambahkan drag-and-drop untuk mengubah urutan module.
- [x] Tambahkan drag-and-drop untuk mengubah urutan topik/materi di dalam module.
- [x] Simpan hasil reorder module ke field `order` secara otomatis.
- [x] Simpan hasil reorder topik/materi ke field `order` secara otomatis.
- [x] Sembunyikan pilihan free/paid module untuk bundle berbayar.
- [x] Tampilkan pilihan free/paid module hanya untuk bundle gratis.
- [x] Jelaskan di admin bahwa bundle berbayar otomatis tidak memotong credit setelah dibeli.
- [x] Pastikan create module bundle gratis default `isFree = true`.
- [x] Pastikan generate draft content bundle gratis default module `isFree = true`.
- [x] Pastikan generate material bundle berbayar yang sudah dibeli tetap tidak memotong credit.

## Saran Improvement

- Gunakan istilah yang lebih spesifik daripada `free/paid` untuk module bundle gratis, misalnya `Credit-free` dan `Butuh credit`, agar tidak rancu dengan harga bundle.
- Pertimbangkan mengganti field `order` manual dengan `createdAt desc` untuk list default admin. Jika `order` tetap dipakai untuk user-facing urutan bundle, pisahkan menjadi `featuredOrder` atau `sortOrder`.
- Untuk bundle gratis dengan beberapa module berbayar, tampilkan badge di detail user agar ekspektasi user jelas sebelum masuk module.
- Pertahankan validasi publish di API, bukan hanya UI, agar bundle berbayar tanpa harga tetap tidak bisa publish.
