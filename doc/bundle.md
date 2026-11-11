# Plan Bundle Terminology dan Bundle Management

Dokumen ini merapikan arah perubahan produk setelah keputusan bahwa istilah **pack** dan **bundle** adalah hal yang sama. Targetnya: semua label dan pengalaman user-facing memakai istilah **Bundle**, sementara data yang tampil berasal dari bundle track yang sudah ada di sistem.

## Prinsip

- **Pack = Bundle**. Istilah `pack` hanya boleh tersisa jika masih berupa nama teknis internal lama yang belum aman diganti.
- FE user-facing harus memakai kata **Bundle**.
- Bundle dapat dibeli langsung dari flow belajar, terutama halaman `/learn`.
- Settings Billing fokus pada saldo credit dan paket top-up credit.
- Admin bundle harus punya area khusus, tidak lagi bercampur dengan halaman payment/config lain.

## Kondisi Saat Ini

- Halaman `/learn` masih memakai beberapa copy seperti `pack`, walaupun itemnya sudah memakai data bundle track.
- Landing masih perlu diselaraskan dari `pack` ke `bundle`.
- Settings Billing sudah diarahkan ke credit package dan bundle purchase dipindahkan ke `/learn`.
- Admin saat ini punya data/API payment, bundle purchases, track pricing/config, dan manual credit adjustment, tetapi pengelolaan bundle belum menjadi halaman CRUD khusus.

## Target Landing

### Navigation

Navbar landing harus mengganti label:

- `Pack` -> `Bundle`
- Anchor/section target ikut disesuaikan jika masih memakai id/nama `pack`.

### Section Bundle

Section yang sebelumnya menampilkan pack diubah menjadi section Bundle.

Aturan konten:

- Judul dan copy memakai istilah Bundle.
- Item yang ditampilkan berasal dari bundle yang ada di database.
- Jika belum ada data bundle, tampilkan state kosong yang tetap rapi.
- CTA bundle mengarah ke halaman login atau `/learn` sesuai status auth.

### Section Harga

Section harga tidak lagi menampilkan bundle.

Struktur baru:

- Tier mulai gratis.
- Paket credit dummy mengikuti paket di Settings Billing.
- Paket credit sementara:
  - 250 credits
  - 500 credits
  - 1.000 credits
  - 2.500 credits
  - 5.000 credits

Catatan: harga dihitung dari `credit_price_idr` agar tetap sinkron dengan admin/config.

## Target Halaman Setelah Login

### Halaman `/learn`

Pertahankan struktur saat ini, tetapi ubah semua istilah `pack` menjadi `bundle` pada UI.

Aturan:

- Search placeholder memakai istilah bundle.
- Filter/copy untuk item baru memakai Bundle.
- Item yang tampil adalah bundle track dari database.
- Card bundle di list menampilkan CTA `Lihat Bundle` dan mengarah ke halaman detail bundle.
- Bundle yang sudah dibeli menampilkan CTA `Lanjut Belajar` dari halaman detail bundle.
- Bundle yang belum dibeli menampilkan CTA `Beli Bundle` dari halaman detail bundle.
- Bundle gratis menampilkan CTA `Mulai Belajar` dari halaman detail bundle.
- Jangan arahkan user membeli bundle dari Settings Billing.

### Access Bundle, Free Bundle, dan Credit

Aturan akses bundle perlu dibedakan dari flow credit AI biasa.

Aturan bundle berbayar:

- Jika user sudah membeli bundle, seluruh generate materi untuk topik di bundle tersebut tidak memotong credit.
- Akses gratis setelah pembelian berlaku untuk materi bundle, karena user sudah membayar bundle di depan.
- Modul paid di dalam bundle berbayar tetap terkunci sampai user membeli bundle.
- CTA bundle berbayar yang belum dibeli tetap `Beli Bundle`.
- CTA bundle berbayar yang sudah dibeli menjadi `Lanjut Belajar` atau `Buka Bundle`.

Aturan bundle gratis:

- Bundle dapat diset gratis dari metadata bundle.
- Bundle gratis tidak memerlukan checkout.
- Di sisi user, card bundle gratis tetap `Lihat Bundle`; di halaman detail CTA-nya `Mulai Belajar`, bukan `Beli Bundle`.
- Bundle gratis belum dianggap mulai dipelajari hanya karena card diklik; user perlu masuk halaman detail bundle lalu klik `Mulai Belajar`.
- Flow sementara untuk bundle gratis masih memakai generate materi seperti sekarang.
- Generate materi pada bundle gratis tidak perlu memotong credit untuk sementara.
- Modul pada bundle gratis default `free`, tetapi admin tetap bisa mengubah beberapa modul menjadi `paid` jika dibutuhkan.
- Bundle gratis yang selesai harus tetap tercatat sebagai track selesai di public profile.
- Jika bundle gratis mengaktifkan sertifikat, certificate harus terbit setelah semua module assessment selesai.

Aturan modul free/paid:

- Saat bundle diset gratis, modul yang dibuat atau digenerate default `isFree = true`.
- Admin tetap bisa override status modul menjadi paid dari editor modul.
- Jika sebuah modul di bundle gratis diubah menjadi paid, rule akses mengikuti rule paid module yang berlaku.
- Perlu indikator UI admin agar jelas module mana yang free dan mana yang paid.

Catatan teknis:

- Helper pemotongan credit perlu mengenali konteks `track.type === BUNDLE`.
- Helper perlu cek apakah user sudah membeli bundle sebelum memotong credit `MATERIAL`.
- Untuk bundle gratis, helper perlu cek `track.isFree === true` atau sinyal gratis lain yang dipakai di metadata.
- Endpoint generate material harus menjadi titik utama perubahan agar aturan ini konsisten.
- Hindari membuat purchase dummy untuk bundle gratis kecuali nanti dibutuhkan untuk analytics/enrollment.
- Public profile perlu menghitung bundle selesai dari module assessment/enrollment bundle, bukan hanya dari track custom user atau purchase berbayar.
- Helper certificate perlu memastikan bundle gratis juga eligible selama `track.type === BUNDLE`, `hasCertificate === true`, dan semua module assessment sudah lulus.

### Optimasi Bundle di `/learn`

Tetap gunakan halaman `/learn` sebagai pusat track dan bundle user.

Optimasi yang dibutuhkan:

- Pagination untuk section bundle di `/learn`.
- Bundle gratis yang sudah mulai dipelajari harus masuk ke Track aktif/Sedang diikuti.
- Track aktif perlu membaca enrollment module bundle, bukan hanya track custom milik user.
- Bundle yang sudah masuk Track aktif sebaiknya tidak tampil dobel di Bundle tersedia.
- State kosong.
- State loading.
- State error.
- Status pembelian user.
- CTA list bundle menjadi `Lihat Bundle`.
- CTA detail bundle berbayar belum dibeli menjadi `Beli Bundle`.
- CTA detail bundle berbayar yang sudah dibeli menjadi `Lanjut Belajar`.
- CTA detail bundle gratis sebelum mulai menjadi `Mulai Belajar`.

### Detail Bundle User

User harus bisa membuka halaman detail bundle, termasuk bundle berbayar yang belum dibeli.

Aturan halaman detail:

- Route detail memakai halaman learn bundle yang sudah ada, misalnya `/learn/[slug]`.
- Bundle berbayar yang belum dibeli tetap bisa dilihat metadata, deskripsi, harga, dan daftar module/topik.
- Konten module paid tetap terkunci sampai bundle dibeli.
- Tombol utama di detail bundle berbayar belum dibeli adalah `Beli Bundle`.
- Setelah bundle berbayar dibeli, tombol utama menjadi `Lanjut Belajar`.
- Bundle gratis menampilkan tombol `Mulai Belajar` saat belum ada enrollment/progress.
- Setelah bundle gratis mulai dipelajari, tombol utama menjadi `Lanjut Belajar`.
- Icon pada card bundle dan CTA perlu disesuaikan dengan aksi: lihat detail, beli, mulai, atau lanjut.
- Klik card bundle dari `/learn` atau dashboard tidak langsung memulai belajar dan tidak langsung checkout; semua masuk detail dulu.

Catatan:

- Search/filter/order bisa tetap client-side untuk sementara selama jumlah bundle belum besar.
- Jika jumlah bundle mulai besar, pindahkan search/filter/order ke server memakai `searchParams`.
- Pagination bundle sebaiknya memakai query param agar URL bisa dibagikan, misalnya `/learn?bundlePage=2`.

## Target Admin

### Halaman Khusus Bundle Admin

Tambahkan halaman khusus untuk mengelola bundle.

Route yang disarankan:

```text
/bundles
```

atau jika ingin eksplisit:

```text
/content/bundles
```

Halaman ini tidak boleh bercampur dengan credit transaction, bundle purchase, atau payment config.

Fitur list:

- List item bundle lengkap.
- Pagination.
- Search.
- Sort/order.
- Filter.
- Status publish/aktif jika field tersedia.
- Harga.
- Jumlah modul.
- Sertifikat aktif/tidak.
- Total purchase jika tersedia.

Filter yang disarankan:

- Semua.
- Aktif.
- Draft/nonaktif.
- Ada sertifikat.
- Harga kosong.
- Harga terisi.

Sort yang disarankan:

- Terbaru.
- Nama A-Z.
- Harga termurah.
- Harga termahal.
- Jumlah modul.
- Jumlah pembelian.

### CRUD Bundle

Admin harus bisa:

- Membuat bundle baru.
- Edit metadata bundle.
- Hapus atau nonaktifkan bundle.
- Mengatur harga.
- Mengatur sertifikat.
- Mengatur modul/topik di dalam bundle.
- Preview bundle seperti yang dilihat user.

Field minimal:

- Title.
- Slug.
- Description.
- Icon.
- Price IDR.
- Certificate enabled.
- Order.
- Published/active status jika tersedia.

### Generate dan Edit Content

Saat admin membuat bundle, admin bisa generate konten awal dan tetap bisa mengedit hasilnya.

Flow yang disarankan:

1. Admin isi brief bundle: target user, goal, durasi, level, jumlah modul.
2. Admin klik generate.
3. Sistem membuat draft track bundle, modul, dan topik.
4. Admin review hasil generate.
5. Admin edit title, description, modul, topik, order, dan metadata.
6. Admin publish bundle saat sudah siap.

Catatan penting:

- Generate harus menghasilkan draft, bukan langsung publish.
- Admin harus bisa menyimpan perubahan manual setelah generate.
- Jika generate gagal, draft tidak boleh meninggalkan data setengah matang tanpa status jelas.

### Limitasi Brief Generate Bundle

Brief untuk generate bundle harus tetap berhubungan dengan **programming atau teknologi**.

Contoh brief yang valid:

- Web development, mobile development, backend, frontend, fullstack.
- Data, AI, machine learning, cloud, DevOps, security, database.
- Tooling developer seperti Git, Docker, CI/CD, testing, deployment.
- Produk digital atau sistem teknologi selama output belajarnya tetap teknis.

Namun validasi tidak boleh terlalu strict.

Masalah saat ini:

- Beberapa brief yang masih berhubungan dengan teknologi bisa ikut tertolak.
- Validasi keyword terlalu sempit dapat menghambat admin saat membuat bundle sah.

Aturan yang diinginkan:

- Tolak brief yang jelas tidak terkait programming/teknologi.
- Terima brief teknologi yang luas meskipun tidak memakai keyword programming yang eksplisit.
- Jika ragu, lebih baik beri warning atau minta admin memperjelas brief daripada langsung menolak.
- Pesan error harus menjelaskan bahwa brief perlu diarahkan ke skill programming/teknologi.
- Validasi sebaiknya mempertimbangkan konteks kalimat, bukan hanya keyword tunggal.

### Aturan Draft dan Publish

Bundle boleh dibuat dalam kondisi belum memiliki module.

Aturan:

- Bundle dengan `0` module harus tetap berstatus draft.
- Bundle dengan `0` module tidak boleh dipublish dari admin.
- Tombol publish di admin perlu disabled atau menampilkan error yang jelas jika module masih kosong.
- API publish perlu memvalidasi jumlah module agar publish tidak bisa ditembus dari request langsung.
- Preview bundle kosong tetap boleh dibuka admin untuk mengecek metadata, tetapi harus diberi indikator bahwa bundle belum siap publish.

Alasan:

- Bundle kosong masih berguna sebagai draft metadata awal.
- User tidak boleh melihat atau membeli bundle yang belum punya isi belajar.
- Validasi harus ada di UI dan API agar state data tetap aman.

## Risiko dan Catatan Teknis

- Rename istilah `pack` di UI aman dilakukan lebih dulu tanpa mengubah schema.
- Rename nama tipe/variable internal dari `pack` ke `bundle` perlu hati-hati agar tidak memperbesar scope perubahan.
- Halaman `/learn` sebaiknya mendukung pagination bundle agar tidak perlu render semua bundle sekaligus.
- Jika `Track` belum punya status publish/active, perlu tambah field sebelum admin CRUD lengkap.
- Jika bundle memakai track shared, jangan clone track per user saat pembelian.

## Urutan Implementasi Disarankan

1. Rapikan terminology FE dari `pack` ke `bundle` di landing dan `/learn`.
2. Pastikan section harga landing hanya menampilkan gratis dan paket credit.
3. Tambahkan pagination bundle di halaman `/learn`.
4. Tambahkan field status bundle jika dibutuhkan untuk draft/published.
5. Tambahkan API/data access admin khusus bundle.
6. Tambahkan halaman admin bundle list.
7. Tambahkan CRUD metadata bundle.
8. Tambahkan flow generate draft bundle.
9. Tambahkan editor modul/topik bundle.
10. Tambahkan preview dan publish flow.
11. Tambahkan rule akses credit untuk bundle berbayar dan bundle gratis.
12. Sesuaikan CTA user untuk bundle gratis dan bundle yang sudah dibeli.

## Checklist

- [x] Ubah navigation landing dari `Pack` menjadi `Bundle`.
- [x] Ubah section pack landing menjadi section Bundle.
- [x] Isi item section Bundle landing dari bundle yang ada.
- [x] Hilangkan bundle dari section harga landing.
- [x] Ubah section harga landing menjadi tier mulai gratis dan paket credit dummy.
- [x] Samakan paket credit landing dengan paket credit di Settings Billing.
- [x] Ubah copy `pack` menjadi `bundle` di halaman `/learn`.
- [x] Pastikan item bundle di `/learn` berasal dari bundle yang ada.
- [x] Pastikan pembelian bundle dilakukan langsung dari `/learn`.
- [x] Ubah rekomendasi buat kamu di dashboard jadi mengambil dari bundle
- [x] Tambahkan pagination bundle di halaman `/learn`.
- [x] Tambahkan halaman admin khusus mengelola bundle.
- [x] Pisahkan admin bundle dari halaman payment/config lain.
- [x] Tambahkan list bundle lengkap di admin.
- [x] Tambahkan pagination di admin bundle.
- [x] Tambahkan search di admin bundle.
- [x] Tambahkan order/sort di admin bundle.
- [x] Tambahkan filter di admin bundle.
- [x] Tambahkan CRUD metadata bundle di admin.
- [x] Tambahkan pengaturan harga bundle di admin CRUD.
- [x] Tambahkan pengaturan sertifikat bundle di admin CRUD.
- [x] Tambahkan generate draft bundle di admin.
- [x] Pastikan hasil generate bisa diedit admin.
- [x] Tambahkan editor modul/topik bundle di admin.
- [x] Tambahkan preview bundle sebelum publish.
- [x] Tambahkan publish/draft flow jika field status sudah tersedia.
- [x] Pastikan generate materi bundle yang sudah dibeli tidak memotong credit.
- [x] Pastikan bundle gratis tidak memerlukan checkout.
- [x] Ubah CTA bundle gratis di user menjadi `Belajar Sekarang`.
- [x] Pastikan generate materi bundle gratis sementara tidak memotong credit.
- [x] Set default module bundle gratis menjadi free saat dibuat manual.
- [x] Set default module bundle gratis menjadi free saat generate draft content.
- [x] Pastikan admin tetap bisa mengubah beberapa module bundle gratis menjadi paid.
- [x] Tambahkan indikator free/paid module yang jelas di admin bundle editor.
- [x] Pastikan bundle dengan `0` module tetap draft.
- [x] Cegah publish bundle jika belum memiliki module.
- [x] Tambahkan pesan/indikator admin saat bundle belum siap publish karena module kosong.
- [x] Pastikan brief generate bundle harus berhubungan dengan programming atau teknologi.
- [x] Longgarkan validasi brief agar topik teknologi yang sah tidak ikut tertolak.
- [x] Tambahkan pesan error/warning yang jelas saat brief generate bundle terlalu jauh dari programming atau teknologi.
- [x] Pastikan bundle gratis yang sudah dimulai masuk ke Track aktif/Sedang diikuti.
- [x] Hitung track aktif dari enrollment module bundle, bukan hanya track custom user.
- [x] Hindari menampilkan bundle aktif dobel di Bundle tersedia.
- [x] Pastikan bundle gratis yang selesai dihitung sebagai Track selesai di public profile.
- [x] Pastikan certificate bundle gratis terbit setelah semua module assessment lulus.
- [x] Pastikan public profile membaca completion bundle dari module assessment/enrollment, bukan hanya track custom user.
- [x] Izinkan user melihat detail bundle berbayar dari `/learn/[slug]` sebelum membeli.
- [x] Ubah CTA card bundle di `/learn` dan dashboard menjadi `Lihat Bundle`.
- [x] Sesuaikan icon CTA bundle untuk aksi lihat detail, beli, mulai, dan lanjut.
- [x] Pindahkan aksi `Beli Bundle` ke tombol utama halaman detail bundle berbayar.
- [x] Ubah tombol detail bundle berbayar yang sudah dibeli menjadi `Lanjut Belajar`.
- [x] Ubah tombol detail bundle gratis yang belum dimulai menjadi `Mulai Belajar`.
- [x] Pastikan klik card bundle gratis tidak langsung dianggap mulai belajar.
