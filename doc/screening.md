# Plan Screening Dinamis dan Rekomendasi Modul

Dokumen ini merapikan rencana perbaikan screening agar pertanyaan sesuai dengan pelajaran atau bundle yang sedang dibuka, serta memperbaiki bug rekomendasi level yang menunjuk modul terkunci.

## Masalah Saat Ini

- Pertanyaan screening track masih statis dan berulang.
- `getTrackScreeningQuestions(trackSlug)` hanya punya preset `web-dev`, `python`, lalu fallback generic programming.
- Bundle/track baru yang dibuat admin atau digenerate tidak otomatis punya pertanyaan screening yang sesuai materi.
- Evaluasi AI memakai prompt yang masih terlalu spesifik ke HTML/JS, sehingga kurang cocok untuk track non-web.
- Halaman detail track menentukan rekomendasi mulai dari level dengan heuristic posisi modul:
  - `BEGINNER` mulai sekitar awal.
  - `MID` mulai sekitar 1/3.
  - `ADVANCE` mulai sekitar 2/3.
- Bug UX: teks `Disarankan mulai dari ...` dan badge `Mulai di sini` bisa menunjuk modul yang masih terkunci oleh module assessment gate.

## Target

- Screening track/bundle membaca konteks pelajaran yang sedang dibuka.
- Pertanyaan tidak terasa itu-itu saja untuk semua track.
- Evaluasi level tetap menghasilkan `BEGINNER`, `MID`, atau `ADVANCE`, tetapi promptnya sadar konteks track.
- Rekomendasi modul tidak boleh menunjuk modul yang belum bisa diakses.
- Jika level user tinggi tetapi modul target terkunci oleh gate, UI harus menjelaskan alasan dan mengarahkan ke modul pertama yang bisa dibuka.

## Prinsip

- Screening harus tetap cepat dan ringan.
- Pertanyaan boleh digenerate dari konteks track, tetapi hasilnya perlu bisa fallback agar halaman tidak gagal saat AI bermasalah.
- Jangan membuat user diarahkan ke modul terkunci.
- Track/bundle paid yang belum dibeli tetap boleh dilihat detailnya, tetapi tidak perlu screening sampai user bisa mulai belajar.
- Untuk bundle gratis atau bundle sudah dibeli, screening boleh berjalan dan hasilnya dipakai untuk rekomendasi.

## Desain Pertanyaan Dinamis

Sumber konteks minimal:

- `Track.title`
- `Track.description`
- `Track.goal`
- daftar module:
  - `Module.title`
  - `Module.description`
  - daftar topic title jika diperlukan

Output pertanyaan:

- 6 pertanyaan total.
- Campuran:
  - 2 beginner
  - 2 mid
  - 2 advance
- Mayoritas `mcq`.
- Minimal 1 `analysis` untuk melihat reasoning.
- Setiap pertanyaan tetap memakai bentuk `ScreeningQuestion` saat ini:
  - `id`
  - `type`
  - `question`
  - `options`
  - `correctAnswer`
  - `targetLevel`

Fallback:

- Jika track mirip `web`, gunakan preset web.
- Jika track mirip `python`, gunakan preset python.
- Jika AI generate gagal, gunakan generic programming.
- Jika pertanyaan hasil AI tidak valid, fallback generic programming.

## Penyimpanan Pertanyaan

Tahap awal tanpa migration:

- Generate pertanyaan saat halaman screening dibuka dari API server.
- Tidak perlu simpan permanen dulu.
- Gunakan fallback static jika generate gagal.

Tahap lanjutan jika butuh konsistensi:

- Tambah model `TrackScreeningQuestionSet`.
- Simpan snapshot pertanyaan per track.
- Regenerate hanya saat admin klik generate ulang atau saat konten track berubah signifikan.

## Evaluasi Screening

Prompt `evaluateScreening` perlu menerima konteks track.

Input baru yang disarankan:

- `trackTitle`
- `trackDescription`
- ringkasan module/topic
- jawaban user

Prompt evaluasi harus berubah dari spesifik HTML/JS menjadi:

- `BEGINNER`: belum menguasai dasar topik track.
- `MID`: sudah paham dasar dan bisa mengikuti materi menengah.
- `ADVANCE`: siap masuk materi lanjutan pada track tersebut.

## Perbaikan Bug Rekomendasi Modul dan Gate

Masalah:

- `recommendedModule` dihitung hanya dari index berdasarkan level.
- Lock state dihitung terpisah dari:
  - akses bundle/paid module
  - gate assessment modul sebelumnya
- Akibatnya modul yang direkomendasikan bisa masih terkunci.

Rule baru:

- Hitung `levelPreferredModule` dari level seperti sekarang.
- Jika screening merekomendasikan mulai dari module tertentu, maka module tersebut dan semua module sebelumnya harus terbuka dari sisi **gate urutan belajar**.
- Gate yang dibuka oleh screening hanya gate navigasi/module sequence, bukan status paid/free.
- Status paid/free module tetap berlaku:
  - Module berbayar tetap membutuhkan akses bundle atau credit sesuai rule yang berlaku.
  - Module gratis tetap bisa dibuka tanpa credit.
  - Jika module sudah terbuka tetapi materi/generate di dalamnya membutuhkan credit dan saldo kurang, user tetap tidak bisa generate sampai top-up.
- `recommendedModule` final adalah module target level yang sudah dibuka oleh hasil screening.
- `firstAvailableModule` setelah screening harus mengarah ke module rekomendasi, bukan selalu module pertama.
- Jika tidak ada module yang valid, jangan tampilkan rekomendasi mulai.
- Teks UI cukup menyatakan `Disarankan mulai dari ...` selama gate rekomendasi sudah dibuat konsisten.

Catatan penting:

- Badge `Mulai di sini` boleh tampil di module rekomendasi yang gate-nya sudah dibuka oleh screening.
- Tombol utama `Lanjut Belajar` setelah screening harus menuju module rekomendasi.
- Jika module rekomendasi berbayar dan user belum punya akses paid/free yang diperlukan, tampilkan CTA akses yang sesuai, bukan memaksa masuk materi.
- Untuk bundle berbayar, user tetap harus membeli bundle dulu sebelum module paid bisa dipakai.
- Untuk bundle gratis dengan module paid override, screening boleh membuka gate sampai module rekomendasi, tetapi generate materi paid tetap mengikuti saldo credit.

## Catatan Implementasi Gate Screening

Saat ini schema `TrackAssessment` hanya menyimpan `level`, belum menyimpan module rekomendasi atau daftar module yang dibuka.

Opsi implementasi:

- Opsi ringan tanpa migration:
  - Hitung `recommendedModuleIndex` dari `assessment.level`.
  - Saat menghitung gate, anggap semua module dengan index `<= recommendedModuleIndex` tidak gate locked.
  - Module setelah rekomendasi tetap mengikuti gate assessment normal.
- Opsi lebih presisi dengan migration:
  - Tambah field `recommendedModuleId` atau `unlockedUntilModuleOrder` ke `TrackAssessment`.
  - Saat screening selesai, simpan module rekomendasi.
  - UI dan access helper memakai field ini sebagai dasar gate.

Rekomendasi tahap awal:

- Pakai opsi ringan dulu agar bug UX cepat selesai tanpa migrasi.
- Pertimbangkan migration jika nanti admin bisa mengatur level module secara eksplisit.

## Urutan Implementasi

1. Perbaiki gate rekomendasi modul lebih dulu.
2. Ubah prompt `evaluateScreening` agar menerima konteks track dan tidak hardcoded HTML/JS.
3. Tambah endpoint/server helper untuk membuat pertanyaan screening berdasarkan track.
4. Ubah halaman `/learn/[trackSlug]/screening` agar mengambil pertanyaan dari API, bukan static client helper.
5. Tambah fallback dan state loading/error pertanyaan screening.
6. Tambah log minimal untuk debugging hasil generate/evaluate screening.
7. Pertimbangkan penyimpanan snapshot pertanyaan jika pertanyaan dinamis terlalu berubah-ubah.

## Checklist

- [ ] Audit flow screening global `/screening` dan track `/learn/[trackSlug]/screening`.
- [x] Perbaiki gate rekomendasi agar module rekomendasi dan module sebelumnya terbuka.
- [x] Pastikan gate screening tidak membypass rule paid/free.
- [x] Pastikan module terbuka yang butuh credit tetap memblokir generate saat saldo credit kurang.
- [x] Pastikan badge `Mulai di sini` muncul di module rekomendasi hasil screening.
- [x] Pastikan tombol utama setelah screening menuju module rekomendasi.
- [x] Refactor `evaluateScreening` agar menerima konteks track.
- [x] Hilangkan hardcoded HTML/JS dari prompt evaluasi track screening.
- [x] Buat helper generate pertanyaan screening dari konteks track.
- [x] Tambah endpoint untuk mengambil pertanyaan screening track.
- [x] Ubah halaman screening track agar mengambil pertanyaan dari endpoint.
- [x] Tambahkan fallback pertanyaan generic jika generate gagal.
- [x] Tambahkan pesan error/loading yang rapi saat pertanyaan screening dimuat.
- [x] Tambahkan log debugging generate/evaluate screening.
- [ ] Pertimbangkan model snapshot pertanyaan screening per track jika dibutuhkan.
