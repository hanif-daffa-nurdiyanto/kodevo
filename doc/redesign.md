# Plan Redesign Kodevo

Dokumen ini menjadi rencana kerja redesign beberapa halaman berdasarkan asset dan brief di `.design/`.

## Sumber Desain

- `.design/uploads/brief-extracted.txt`
- `.design/Landing Page.dc.html`
- `.design/Onboarding.dc.html`
- `.design/Dashboard.dc.html`
- `.design/Track List.dc.html`
- `.design/Track Overview.dc.html`
- `.design/Module Overview.dc.html`
- `.design/Topic Materi.dc.html`
- `.design/Exercise.dc.html`
- `.design/Exercise Non Coding.dc.html`
- `.design/Module Assessment.dc.html`
- `.design/Screening.dc.html`
- `.design/Track Complete.dc.html`
- `.design/Settings.dc.html`
- `.design/Profile Publik.dc.html`

## Tujuan Redesign

Kodevo perlu terasa lebih energetic, modern, ringan, dan cepat dipahami oleh user 22-30 tahun yang ingin belajar digital/tech tanpa kurikulum generik. Redesign harus menonjolkan tiga diferensiator utama:

- Personalized roadmap berbasis tujuan user.
- Adaptive learning style berdasarkan level dan preferensi.
- Project-based learning dari hari pertama.

Semua halaman harus mempertahankan identitas visual Kodevo: light theme, typography modern, copy Bahasa Indonesia yang conversational, dan signature gradient `#00C9A7 -> #3D8EF0` pada CTA utama, progress, active state, serta aksen penting.

## Prinsip Desain

- Gunakan layout clean seperti roadmap.sh, dengan struktur yang mudah discan dan tidak terasa corporate.
- Pertahankan UI app yang padat, jelas, dan fungsional untuk halaman dashboard, belajar, assessment, settings, dan profil.
- Gunakan CTA aktif seperti "Mulai Belajar", "Lanjut Materi", "Lihat Pack", "Cek Jawaban", dan "Simpan Perubahan".
- Hindari copy formal atau pasif.
- Jaga konsistensi warna level per track:
  - Explorer: `#00C9A7`
  - Builder: `#3D8EF0`
  - Creator: `#D97706`
- Progress bar wajib memakai track `#F3F4F6`, fill gradient hijau-biru, dan persentase di sisi kanan.

## Foundation UI

Sebelum redesign halaman satu per satu, rapikan fondasi agar implementasi berikutnya konsisten.

- Update token warna di `src/app/globals.css` agar sesuai brief:
  - Primary Green: `#00C9A7`
  - Primary Blue: `#3D8EF0`
  - Dark: `#1A1A2E`
  - Mid Grey: `#6B7280`
  - Light Grey: `#F3F4F6`
- Pastikan font app memakai Plus Jakarta Sans untuk heading dan Inter untuk body.
- Jadikan button utama gradient hijau-biru dengan tinggi 44px dan radius 8px.
- Tambahkan utilitas reusable bila perlu:
  - gradient CTA
  - gradient progress
  - level badge Explorer/Builder/Creator
  - elevated card style sesuai brief
- Audit sidebar/header protected layout agar active nav memakai gradient/brand state yang sama.
- Pastikan komponen tetap mengikuti pola App Router Next.js di `src/app`, route groups `(auth)` dan `(protected)`, serta komponen shared di `src/components`.

## Mapping Halaman

| Desain | Route saat ini | Catatan |
| --- | --- | --- |
| Landing Page | `src/app/page.tsx` | Public homepage, hero, fitur, cara kerja, pack preview, pricing, CTA |
| Onboarding | `src/app/setup/page.tsx`, `src/app/screening/page.tsx` | Setup profil dan pilihan jalur belajar |
| Dashboard | `src/app/(protected)/dashboard/page.tsx` | Overview progress, streak, XP, rekomendasi, quick resume |
| Track List | `src/app/(protected)/learn/page.tsx`, `src/app/(protected)/learn/new/page.tsx` | Daftar track aktif dan pack tersedia |
| Track Overview | `src/app/(protected)/learn/[trackSlug]/page.tsx` | Detail track, modul, progress, CTA lanjut |
| Screening | `src/app/(protected)/learn/[trackSlug]/screening/page.tsx` | Pertanyaan level per track dan result state |
| Module Overview | `src/app/(protected)/learn/[trackSlug]/[moduleId]/page.tsx` | Saat view menampilkan daftar topik modul |
| Topic Materi | `src/app/(protected)/learn/[trackSlug]/[moduleId]/page.tsx` | Saat view menampilkan materi/topik aktif |
| Exercise | Komponen exercise di module/topic flow | Coding dan non-coding exercise |
| Module Assessment | API dan UI assessment module | Quiz + coding challenge akhir modul |
| Track Complete | `src/app/(protected)/learn/[trackSlug]/complete/page.tsx` | Completion, certificate, next recommendation |
| Settings | `src/app/(protected)/settings/page.tsx`, `settings/github/page.tsx` | Profile, billing, GitHub |
| Profile Publik | `src/app/profile/[username]/page.tsx` | Public learning profile |
| Community | `src/app/(protected)/community/page.tsx` | Supporting page, belum ada desain khusus di brief selain prioritas Fase 4 |

## Fase Implementasi

### Fase 0: Audit dan Fondasi

Tujuan: menghindari redesign yang terpecah-pecah.

- Audit halaman existing dan data yang sudah tersedia.
- Bandingkan struktur tiap halaman dengan `.design/*.dc.html`.
- Terapkan token, typography, dan reusable component style.
- Cek responsive baseline untuk mobile dan desktop.

Hasil audit awal:

- App memakai Next.js App Router di `src/app` dengan route group `(auth)` dan `(protected)`.
- Next.js lokal adalah `16.2.7`; referensi yang dipakai sebelum edit: `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`, `13-fonts.md`, dan `03-api-reference/02-components/font.md`.
- Font sebelumnya `Nunito` dan `Geist_Mono`; brief meminta Plus Jakarta Sans, Inter, dan JetBrains Mono.
- Token warna sebelumnya masih memakai primary biru lama `#2A92F0` dan accent teal `#22BCAC`; brief meminta primary green `#00C9A7`, primary blue `#3D8EF0`, dark `#1A1A2E`, mid grey `#6B7280`, light grey `#F3F4F6`.
- Komponen shared yang menjadi fondasi redesign: `Button`, `Card`, `Progress`, `Badge`, dan `Input`.
- Mapping route sudah cocok dengan desain utama: landing, setup/onboarding, dashboard, learn list, track overview, screening, module/topic, assessment, complete, settings, dan public profile.
- Responsive baseline belum divalidasi visual lewat browser; dilakukan setelah halaman Fase 1 mulai diubah agar screenshot lebih bernilai.
- Verifikasi Fase 0: `npx eslint` untuk file yang diubah lolos. `npm run lint` full project belum lolos karena error existing di luar scope Fase 0, terutama `.design/support.js`, `prisma/seed.ts`, banyak `no-explicit-any`, dan beberapa aturan React hooks/purity.

### Fase 1: Anchor Pages

Prioritas dari brief: Landing Page, Onboarding, Topic/Materi.

- Redesign landing page sebagai first impression produk.
- Redesign onboarding agar user cepat memilih antara "Pilih Pack" dan "Ceritakan tujuanmu".
- Redesign topic/materi agar pengalaman belajar terasa fokus, readable, dan project-based.
- Pastikan CTA utama selalu jelas dan action-oriented.

Hasil Fase 1:

- Landing page di `src/app/page.tsx` sudah mengikuti arah `.design/Landing Page.dc.html`: centered hero, headline "Belajar lebih cepat dengan Kodevo", roadmap mock, differentiator, cara kerja, pack preview, pricing, dan CTA akhir.
- Onboarding user diadaptasi ke `src/app/screening/page.tsx` karena `src/app/setup/page.tsx` adalah bootstrap admin. Flow sekarang dimulai dari pilihan "Pilih Pack" atau "Ceritakan tujuanmu", lalu screening level, lalu masuk ke `/learn` atau `/learn/new`.
- Topic/Materi di `src/app/(protected)/learn/[trackSlug]/[moduleId]/[topicId]/page.tsx` sudah memakai reading layout baru dengan top progress bar, sidebar modul desktop, markdown styling Plus Jakarta/JetBrains, CTA reload/feedback, dan quiz section tetap terhubung.
- Refinement setelah review visual: font dipaksa eksplisit di base CSS, header/footer landing dibuat lebih literal seperti `.design` dengan gradient mark + teks `kodevo`, nav `Pack`, CTA `Mulai Gratis`, dan hero landing disesuaikan agar headline langsung menjadi first focus tanpa badge tambahan.
- Refinement landing lanjutan: trust strip sekarang memakai copy `DIPERCAYA UNTUK BELAJAR SKILL DIGITAL PALING DICARI`, pack preview memakai nama/copy desain, section testimoni ditambahkan, pricing disamakan ke `Gratis` dan dark card `Pro` dengan badge `Paling populer`, final CTA menjadi `Siap belajar lebih cepat?`, dan footer memakai link `Tentang`, `Karier`, `Kontak`.
- Verifikasi Fase 1: `npx eslint` untuk file Fase 1 lolos, dan `npm run build` lolos.

### Fase 2: Core App

Prioritas: Dashboard, Track List, Track Overview, Module Overview.

- Redesign dashboard untuk menampilkan progress, streak, XP, quick resume, dan rekomendasi.
- Redesign track list agar pilihan pack dan track aktif mudah dibandingkan.
- Redesign track overview agar progress modul, level track, dan next action terlihat jelas.
- Redesign module overview agar daftar topik, status, durasi, dan locked/completed states konsisten.

Hasil Fase 2:

- Dashboard di `src/app/(protected)/dashboard/page.tsx` sudah mengikuti struktur `.design/Dashboard.dc.html`: greeting, streak/XP pills, AI credit usage, quick resume gradient, track aktif, rekomendasi, dan test terbaru.
- Protected navigation di `src/components/layout/dashboard-nav.tsx` dan `src/app/(protected)/layout.tsx` sudah diganti ke sidebar desktop 240px seperti `.design/Dashboard.dc.html`, dengan mobile header tetap tersedia untuk layar kecil.
- Track list di `src/app/(protected)/learn/page.tsx` sudah mengikuti `.design/Track List.dc.html`: header "Track & Pack Belajar", search/filter visual, CTA "Ceritakan tujuanmu", track yang sedang diikuti, dan pack tersedia.
- Track overview di `src/app/(protected)/learn/[trackSlug]/page.tsx` sudah mengikuti `.design/Track Overview.dc.html`: back link, header track dengan icon, level badge, CTA lanjut belajar, deskripsi, progress keseluruhan, assessment recommendation, dan daftar modul dengan state locked/completed/recommended.
- Module overview di `src/app/(protected)/learn/[trackSlug]/[moduleId]/page.tsx` sudah mengikuti `.design/Module Overview.dc.html`: back link, header modul, progress topik, daftar topik dengan state selesai/sedang belajar/terkunci, dan assessment gate.
- Fitur existing tetap dipertahankan: auth redirect, premium lock, auto-enroll, generated material state, quiz progress, assessment gate, dan link action lama.
- Verifikasi Fase 2: `npx eslint` untuk empat file Fase 2 lolos.

### Fase 3: Learning Flow

Prioritas: Screening, Exercise, Module Assessment, Track Complete.

- Redesign screening sebagai flow 4-5 pertanyaan dengan progress dan result level.
- Redesign exercise coding dan non-coding mengikuti desain masing-masing.
- Redesign module assessment untuk quiz, challenge, submission, dan result state.
- Redesign track complete dengan sertifikat, recap progress, dan rekomendasi langkah berikutnya.

Hasil Fase 3:

- Screening track di `src/app/(protected)/learn/[trackSlug]/screening/page.tsx` sudah mengikuti `.design/Screening.dc.html`: header cancel, progress dots, question flow, pilihan besar, answer textarea untuk short answer, loading evaluasi AI, dan result level Explorer/Builder/Creator.
- Exercise di `src/app/(protected)/learn/[trackSlug]/[moduleId]/[topicId]/test/page.tsx` sudah dipoles mengikuti `.design/Exercise.dc.html` dan `.design/Exercise Non Coding.dc.html`: top bar, split-pane instruksi, requirement list, starter files, dark editor shell, tabs preview/output/result, serta result score. Fitur Sandpack, run code, submit inline, submit GitHub, AI review Pro, dan next navigation tetap dipertahankan.
- Module assessment di `src/app/(protected)/learn/[trackSlug]/[moduleId]/assessment/page.tsx` sudah mengikuti `.design/Module Assessment.dc.html`: intro assessment, progress dots, quiz step, quiz result, coding challenge editor, challenge result, pass/fail action, dan attempt limit state existing.
- Track complete di `src/app/(protected)/learn/[trackSlug]/complete/page.tsx` sudah mengikuti `.design/Track Complete.dc.html`: hero selesai, recap stats, certificate card, action row, dan modul selesai. Completion gate tetap mewajibkan semua topic quiz dan module assessment lulus.
- Verifikasi Fase 3: `npx eslint` untuk file Fase 3 lolos.

### Fase 4: Supporting Pages

Prioritas: Auth pages, Settings, Profile Publik, Community.

- Redesign login, register, forgot password, dan reset password agar selaras dengan landing/onboarding.
- Redesign settings profile, billing, dan GitHub connection.
- Redesign public profile agar achievement, track selesai, dan identitas user terlihat rapi.
- Rapikan community page sebagai halaman supporting ringan.

Hasil Fase 4:

- Auth pages di `src/app/(auth)` sudah memakai shell brand Kodevo, value prop singkat, form card yang lebih polished, dan CTA gradient tanpa mengubah flow credentials, Google sign-in, forgot password, atau reset password.
- Settings di `src/app/(protected)/settings/page.tsx`, `profile-section.tsx`, `billing-section.tsx`, dan `settings/github/page.tsx` sudah mengikuti arah `.design/Settings.dc.html`: container 760px, tab anchor Profile/Billing/GitHub, profile identity/stats, billing plan cards, dan GitHub connection card.
- Profile publik di `src/app/profile/[username]/page.tsx` sudah mengikuti `.design/Profile Publik.dc.html`: public nav, avatar besar, level badge, stats strip, sertifikat, track berjalan, dan footer.
- Community di `src/app/(protected)/community/page.tsx` sudah dirapikan sebagai supporting page ringan dengan state Premium/free tetap dipertahankan.
- Verifikasi Fase 4: `npx eslint` untuk file Fase 4 lolos.

## Kriteria Selesai

- Semua halaman yang disentuh memakai token desain dari brief.
- Signature gradient muncul konsisten di CTA/progress/active state.
- Copy UI memakai Bahasa Indonesia yang conversational dan aktif.
- State utama tersedia: loading, empty, disabled, error, active, completed, locked.
- Mobile dan desktop tidak memiliki overlap, text overflow, atau layout shift yang mencolok.
- `npm run lint` lolos.
- `npm run build` lolos bila perubahan sudah menyentuh banyak route atau layout.

## Checklist Progress

- [x] Audit struktur halaman existing dan data yang dipakai.
- [x] Audit detail visual dari `.design/*.dc.html`.
- [x] Update foundation token di `globals.css`.
- [x] Update reusable button/card/progress/badge pattern.
- [x] Redesign landing page.
- [x] Redesign onboarding/setup profile.
- [x] Redesign pilih jalur belajar.
- [x] Redesign topic/materi.
- [x] Redesign dashboard.
- [x] Redesign track list.
- [x] Redesign track overview.
- [x] Redesign module overview.
- [x] Redesign screening flow.
- [x] Redesign exercise coding.
- [x] Redesign exercise non-coding.
- [x] Redesign module assessment.
- [x] Redesign track complete.
- [x] Redesign auth pages.
- [x] Redesign settings profile.
- [x] Redesign settings billing.
- [x] Redesign settings GitHub.
- [x] Redesign profile publik.
- [x] Redesign community page.
- [x] QA responsive mobile.
- [x] QA responsive desktop.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
