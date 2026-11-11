# Plan Improvement Generate Roadmap

Dokumen ini merapikan flow generate roadmap di `/learn/new`, halaman `/learn`, register, dan screening. Flow yang diinginkan: user baru tetap memilih mulai dari track siap pakai atau membuat roadmap sendiri, sedangkan screening selalu muncul setelah user mengisi prompt roadmap baru dan klik `Buatkan Roadmap`.

## Kondisi Saat Ini

- Halaman `/learn/new` sudah memakai `CurriculumGenerator`, tetapi tampilannya belum mengikuti hero di `/learn`.
- Halaman `/learn` punya hero "Ngga nemu bundle yang cocok?" dengan contoh input dan tombol `Buatkan Roadmap`.
- Contoh input di hero `/learn` belum terasa sebagai entry point seamless ke `/learn/new`.
- Register perlu mempertahankan pilihan mulai dari track atau buat roadmap sendiri.
- Register credentials dan Google masih mengarah ke `/screening`.
- Protected layout masih memaksa semua user `UNSCREENED` ke `/screening`.
- Screening global masih menanyakan pilihan pack atau goal, padahal screening hanya dibutuhkan untuk generate roadmap personal.
- User baru yang seharusnya melihat pack bisa terhalang redirect screening.

## Tujuan

- Redesign halaman `/learn/new` agar visual dan komponennya konsisten dengan hero di `/learn`.
- Buat input preview di hero `/learn` menjadi clickable dan mengarah seamless ke `/learn/new`.
- Jadikan screening hanya sebagai prasyarat generate roadmap.
- Hilangkan screening dari flow bundle dan register.
- Setelah user baru mendaftar, tampilkan pilihan mulai dari track atau buat roadmap sendiri.
- Pastikan user tetap bisa memilih pack yang sudah ada tanpa screening awal.
- Pastikan bundle/pack langsung mulai dari modul pertama yang tersedia.
- Pastikan setiap prompt roadmap baru melalui screening terlebih dahulu.
- Pastikan pertanyaan screening menyesuaikan tema materi dari prompt user.

## Flow Baru

### User Baru Register

1. User mengisi form register.
2. Setelah akun berhasil dibuat, user otomatis login.
3. User memilih mulai dari track atau buat roadmap sendiri.
4. Jika memilih track, user diarahkan ke `/learn?filter=bundle`.
5. Jika memilih roadmap sendiri, user diarahkan ke `/learn/new`.
6. User bisa memilih bundle tanpa melewati screening global.
7. Saat membuka detail bundle/pack, tombol mulai belajar langsung menuju modul pertama yang tersedia.

### User Baru Google

1. User klik daftar atau masuk dengan Google.
2. Callback diarahkan ke `/learn?filter=bundle`.
3. User melihat bundle yang tersedia.
4. Jika user ingin roadmap personal, user masuk ke `/learn/new`.

### Generate Roadmap

1. User klik input preview atau tombol `Buatkan Roadmap` di hero `/learn`.
2. User masuk ke `/learn/new`.
3. User mengisi prompt tujuan belajar.
4. Saat user klik `Buatkan Roadmap`, user selalu diarahkan ke `/screening` dengan prompt tersebut jika prompt itu belum baru saja discreening.
5. Screening memuat pertanyaan yang dibuat dari tema materi di prompt user.
6. Setelah screening selesai, user diarahkan kembali ke `/learn/new` dengan prompt terisi dan status screening prompt tersebut.
7. User klik generate untuk membuat roadmap personal.

## Perubahan Route dan Guard

### Protected Layout

File: `apps/web/src/app/(protected)/layout.tsx`

- Hapus redirect global untuk `dbUser.level === "UNSCREENED"`.
- Protected route tetap hanya memvalidasi user sudah login.
- Level user tetap dikirim ke komponen yang membutuhkan, seperti `TutorChat`.

### Halaman `/learn/new`

File: `apps/web/src/app/(protected)/learn/new/page.tsx`

- Ambil field `level` dari `db.user`.
- Tetap tampilkan halaman generator untuk semua user yang login.
- Saat user klik `Buatkan Roadmap`, arahkan ke `/screening` sambil membawa prompt jika prompt itu belum discreening.
- Jika user kembali dari screening dengan prompt yang sama, generator langsung membuat roadmap.
- Pertahankan guard login.

### Halaman `/screening`

File: `apps/web/src/app/screening/page.tsx`

- Hapus fase pilihan path `pack` atau `goal`.
- Hapus state `selectedPath` dan `goalText`.
- Screening mengambil pertanyaan dari API berdasarkan prompt roadmap.
- Pertanyaan level harus spesifik terhadap tema materi yang ingin dipelajari.
- Setelah selesai, CTA selalu menuju `/learn/new`.
- Copy disesuaikan agar jelas bahwa screening dipakai untuk menyesuaikan roadmap personal.

## Redesign UI

### Hero `/learn`

File: `apps/web/src/app/(protected)/learn/learn-filtered-content.tsx`

- Pertahankan gradient hero yang sudah ada.
- Ubah div contoh input di samping tombol `Buatkan Roadmap` menjadi elemen clickable.
- Gunakan `Link` ke `/learn/new` atau handler `router.push("/learn/new")`.
- Tambahkan hover/focus state:
  - cursor pointer
  - border atau background berubah halus
  - affordance visual bahwa input bisa diklik
- Pastikan accessible via keyboard.
- Pertahankan tombol `Top-up Credit` ketika user tidak bisa membuat roadmap.

### Halaman `/learn/new`

File: `apps/web/src/app/(protected)/learn/new/page.tsx`

- Samakan gaya dengan hero `/learn`:
  - gradient surface
  - label kecil dengan icon
  - headline roadmap personal
  - supporting copy singkat
  - input utama di dalam hero
- `AIUsageCounter` tetap terlihat, tetapi menyatu dengan layout baru.
- Back link ke `/learn` tetap ada untuk user yang sudah punya curriculum.
- Layout harus responsif untuk mobile dan desktop.

### Curriculum Generator

File: `apps/web/src/components/curriculum-generator.tsx`

- Sesuaikan styling input, button, loading, error, dan suggestion chips agar cocok dengan hero baru.
- Loading state tetap menampilkan progress copy.
- Error credit tetap menampilkan CTA top-up.
- Suggested chips tetap bisa langsung trigger generate.

## Register

File: `apps/web/src/app/(auth)/register/page.tsx`

- Pertahankan pilihan mulai dari track atau buat roadmap.
- Hapus input goal dari register.
- Setelah register credentials berhasil, tampilkan pilihan onboarding.
- Jika user memilih track, redirect ke `/learn?filter=bundle`.
- Jika user memilih roadmap sendiri, redirect ke `/learn/new`.
- Ubah Google callback URL dari `/screening` ke `/learn?filter=bundle`.
- Sesuaikan copy success jika success screen tetap dipakai.
- Hilangkan success screen lama yang menuju screening.

## Bundle dan Pack

- Bundle/pack siap pakai tidak melewati screening.
- Tombol mulai belajar di detail bundle langsung mengarah ke modul pertama yang tersedia.
- Jika user membuka URL screening bundle secara langsung, redirect kembali ke detail bundle.
- Screening track hanya dipakai untuk track non-bundle yang memang membutuhkan assessment level.

## Copy yang Perlu Dibersihkan

- Hapus teks yang menyiratkan bundle harus melewati screening.
- Hapus teks register "setelah screening" untuk pilihan pack.
- Ubah copy screening menjadi konteks roadmap personal.
- Cek email welcome jika masih mengarahkan user untuk screening sebagai langkah wajib.

## Risiko dan Catatan

- Menghapus guard global `UNSCREENED` bisa membuat user tanpa level masuk ke halaman protected lain; pastikan halaman tersebut tidak mengasumsikan level selalu sudah screening.
- `TutorChat` menerima level user; pastikan level `UNSCREENED` tetap aman ditangani.
- Screening track bundle sengaja dimatikan; pertahankan screening track hanya untuk non-bundle.

## Checklist

- [x] Baca dokumentasi App Router di `node_modules/next/dist/docs/` sebelum mengubah code.
- [x] Audit redirect `UNSCREENED` di protected layout.
- [x] Hapus redirect global `UNSCREENED` dari `apps/web/src/app/(protected)/layout.tsx`.
- [x] Pindahkan screening `UNSCREENED` agar terjadi setelah klik generate di `/learn/new`.
- [x] Redesign `/learn/new` agar konsisten dengan hero `/learn`.
- [x] Sesuaikan `CurriculumGenerator` dengan gaya hero baru.
- [x] Buat input preview di hero `/learn` clickable ke `/learn/new`.
- [x] Tambahkan hover dan focus state pada input preview `/learn`.
- [x] Pastikan tombol `Buatkan Roadmap` tetap mengarah ke `/learn/new`.
- [x] Pertahankan pilihan mulai dari track atau buat roadmap di register.
- [x] Ubah pilihan track di register agar redirect ke `/learn?filter=bundle`.
- [x] Ubah pilihan roadmap di register agar redirect ke `/learn/new`.
- [x] Ubah Google callback register ke `/learn?filter=bundle`.
- [x] Bersihkan state dan import register yang tidak terpakai.
- [x] Sederhanakan `/screening` agar khusus generate roadmap.
- [x] Buat pertanyaan screening berdasarkan tema materi dari prompt user.
- [x] Pastikan setiap prompt baru masuk screening setelah klik `Buatkan Roadmap`.
- [x] Ubah CTA hasil screening agar selalu menuju `/learn/new`.
- [x] Bersihkan copy yang menyebut bundle harus melewati screening.
- [x] Cek welcome email untuk instruksi screening wajib.
- [x] Hilangkan screening dari bundle/pack.
- [x] Arahkan bundle/pack langsung ke modul pertama yang tersedia.
- [x] Cegah akses langsung ke screening bundle.
- [ ] Manual QA user baru register credentials melihat pilihan track atau roadmap.
- [ ] Manual QA Google callback ke `/learn?filter=bundle`.
- [ ] Manual QA user `UNSCREENED` bisa melihat bundle.
- [ ] Manual QA user `UNSCREENED` bisa membuka `/learn/new`.
- [ ] Manual QA user `UNSCREENED` klik generate dari `/learn/new` diarahkan ke `/screening` dengan prompt.
- [ ] Manual QA selesai screening kembali ke `/learn/new` dengan prompt terisi.
- [ ] Manual QA pertanyaan screening sesuai tema prompt roadmap.
- [ ] Manual QA user yang sudah pernah screening tetap discreening lagi untuk prompt roadmap baru.
- [ ] Manual QA user screened bisa generate roadmap.
- [ ] Manual QA tampilan `/learn` dan `/learn/new` di mobile.
- [ ] Manual QA tampilan `/learn` dan `/learn/new` di desktop.
