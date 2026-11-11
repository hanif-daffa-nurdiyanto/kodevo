# Admin Monorepo Migration Plan

Tujuan migrasi ini adalah memisahkan admin Studio dari aplikasi user utama tanpa memisahkan database, auth identity, atau domain bisnis. Hasil akhirnya adalah satu monorepo dengan dua aplikasi Next.js yang dapat dibuild dan dideploy terpisah:

- `apps/web`: aplikasi user utama, landing, auth, dashboard, learn, settings, API user/public/webhook/cron.
- `apps/admin`: aplikasi admin Studio, analytics, user ops, content ops, finance, settings admin.
- `packages/*`: kode shared untuk database, auth policy, utilitas, UI dasar, dan konfigurasi.

## Kondisi Saat Ini

Admin sekarang masih berada di aplikasi yang sama:

- Halaman admin: `src/app/studio/**`
- API admin: `src/app/api/admin/**`
- API studio tambahan: `src/app/api/studio/**`
- Guard admin: `src/lib/admin.ts`
- Shared auth: `src/lib/auth.ts`, `src/lib/auth.config.ts`
- Shared database: `src/lib/db.ts`, `prisma/schema.prisma`, `src/generated/prisma/**`
- Shared UI yang dipakai admin: `src/components/ui/**`, sebagian `src/lib/utils.ts`

Route admin utama adalah `/studio`. Akses dikunci oleh `requireAdmin()`, yang mengecek session lalu field `User.isAdmin`. Bootstrap admin pertama ada di `/setup` dan `POST /api/admin/bootstrap`, hanya aktif jika belum ada user admin.

## Target Struktur

Struktur monorepo yang disarankan:

```text
apps/
  web/
    src/app/
    src/components/
    next.config.ts
    package.json
  admin/
    src/app/
    src/components/
    next.config.ts
    package.json
packages/
  db/
    prisma/schema.prisma
    src/client.ts
    src/generated/
    package.json
  auth/
    src/config.ts
    src/server.ts
    src/admin.ts
    package.json
  email/
    src/index.ts
    package.json
  billing/
    src/stripe.ts
    src/mayar.ts
    package.json
  ui/
    src/
    package.json
  utils/
    src/
    package.json
package.json
tsconfig.base.json
eslint.config.mjs
```

Catatan: jangan memecah database menjadi dua dulu. Admin dan web tetap membaca database yang sama melalui `packages/db`.

## Keputusan Arsitektur

Gunakan npm workspaces karena project saat ini sudah memakai `package-lock.json`.

Root `package.json` nanti menjadi workspace manager:

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "npm run dev -w apps/web",
    "dev:admin": "npm run dev -w apps/admin",
    "build:web": "npm run build -w apps/web",
    "build:admin": "npm run build -w apps/admin",
    "lint": "npm run lint -ws --if-present",
    "db:generate": "npm run db:generate -w packages/db",
    "db:migrate": "npm run db:migrate -w packages/db",
    "db:studio": "npm run db:studio -w packages/db"
  }
}
```

Admin sebaiknya punya host terpisah, misalnya:

- Production web: `https://kodevo.id`
- Production admin: `https://admin.kodevo.id`
- Local web: `http://localhost:3000`
- Local admin: `http://localhost:3001`

Dengan host terpisah, admin app tidak perlu tetap memakai path `/studio`. Di admin app, Studio bisa menjadi root `/`. Jika butuh kompatibilitas sementara, tambahkan redirect dari `/studio` ke `/` di `apps/admin`.

## Auth dan Session

Prioritas paling aman: pertahankan NextAuth di kedua app, memakai database dan secret yang sama.

Shared package:

- `packages/auth/src/config.ts`: isi dari `src/lib/auth.config.ts`
- `packages/auth/src/server.ts`: isi dari `src/lib/auth.ts`, disesuaikan import DB/email
- `packages/auth/src/admin.ts`: isi dari `src/lib/admin.ts`, tetapi redirect target disesuaikan per app

Perlu diperhatikan:

- `AUTH_SECRET` harus sama untuk web dan admin.
- `AUTH_URL`/`NEXTAUTH_URL` berbeda per app sesuai host.
- OAuth callback URL Google/GitHub harus ditambahkan untuk host admin jika admin app menyediakan login sosial sendiri.
- Jika ingin SSO cookie lintas subdomain, perlu konfigurasi cookie domain `.kodevo.id`. Ini sebaiknya fase lanjutan, bukan syarat migrasi pertama.

Untuk fase pertama, alur yang cukup aman:

- Admin app punya halaman `/login` sendiri atau reuse auth pages dari web.
- Admin app login dengan provider yang sama.
- Setelah login, semua route admin wajib memanggil `requireAdmin()`.
- User non-admin diarahkan ke web `/dashboard`, bukan ke admin.

## Data dan Prisma

Pindahkan Prisma ke `packages/db`:

- `prisma/schema.prisma` -> `packages/db/prisma/schema.prisma`
- `src/generated/prisma/**` -> `packages/db/src/generated/**`
- `src/lib/db.ts` -> `packages/db/src/client.ts`

Update generator Prisma:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated"
}
```

Semua app/package harus import DB dari package, misalnya:

```ts
import { db } from "@kodevo/db"
```

Jangan duplikasi Prisma client di masing-masing app. Satu package DB mengurangi risiko generated client tidak sinkron.

## File yang Dipindahkan

Pindah ke `apps/admin`:

- `src/app/studio/**` -> `apps/admin/src/app/**`
- `src/app/api/admin/**` -> `apps/admin/src/app/api/admin/**`
- `src/app/api/studio/**` -> `apps/admin/src/app/api/studio/**`
- `src/app/setup/page.tsx` -> `apps/admin/src/app/setup/page.tsx`

Pindah atau ekstrak ke shared package:

- `src/lib/admin.ts` -> `packages/auth/src/admin.ts`
- `src/lib/db.ts` -> `packages/db/src/client.ts`
- `src/lib/auth.ts` dan `src/lib/auth.config.ts` -> `packages/auth/src/*`
- `src/lib/stripe.ts` dan `src/lib/mayar.ts` -> `packages/billing/src/*`
- `src/lib/email.ts` -> `packages/email/src/index.ts`
- `src/lib/settings.ts` -> bisa masuk `packages/db` atau `packages/utils`, pilih `packages/db` jika tetap sangat terkait `AppSetting`
- `src/lib/utils.ts` -> `packages/ui` atau `packages/utils`
- `src/components/ui/**` -> `packages/ui/src/**`

Tetap di `apps/web`:

- route user-facing: landing, auth, dashboard, learn, settings, profile, screening
- API user, quiz, AI, checkout, webhook, cron
- layout/navigation user

## Mapping Route Admin

Jika admin app memakai root `/`, mapping route menjadi:

```text
src/app/studio/page.tsx                    -> apps/admin/src/app/page.tsx
src/app/studio/funnel/page.tsx             -> apps/admin/src/app/funnel/page.tsx
src/app/studio/retention/page.tsx          -> apps/admin/src/app/retention/page.tsx
src/app/studio/users/page.tsx              -> apps/admin/src/app/users/page.tsx
src/app/studio/users/[id]/page.tsx         -> apps/admin/src/app/users/[id]/page.tsx
src/app/studio/at-risk/page.tsx            -> apps/admin/src/app/at-risk/page.tsx
src/app/studio/finance/page.tsx            -> apps/admin/src/app/finance/page.tsx
src/app/studio/promo-codes/page.tsx        -> apps/admin/src/app/promo-codes/page.tsx
src/app/studio/content/page.tsx            -> apps/admin/src/app/content/page.tsx
src/app/studio/curricula/page.tsx          -> apps/admin/src/app/curricula/page.tsx
src/app/studio/materials/page.tsx          -> apps/admin/src/app/materials/page.tsx
src/app/studio/materials/[id]/page.tsx     -> apps/admin/src/app/materials/[id]/page.tsx
src/app/studio/trends/page.tsx             -> apps/admin/src/app/trends/page.tsx
src/app/studio/engagement/page.tsx         -> apps/admin/src/app/engagement/page.tsx
src/app/studio/settings/page.tsx           -> apps/admin/src/app/settings/page.tsx
src/app/studio/debug/page.tsx              -> apps/admin/src/app/debug/page.tsx
```

Update semua link internal dari `/studio/...` menjadi `/...` di admin app.

Jika ingin migrasi lebih konservatif, pertahankan `/studio` di admin app untuk satu fase pertama. Namun untuk host `admin.kodevo.id`, root `/` lebih enak dipakai dan lebih jelas secara produk.

## API Ownership

Admin app mengambil alih endpoint berikut:

- `POST /api/admin/bootstrap`
- `GET/POST /api/admin/promo-codes`
- `PATCH/DELETE /api/admin/promo-codes/[id]`
- `GET/POST /api/admin/settings`
- `POST /api/admin/users/[id]/premium`
- `POST /api/studio/debug-material`
- `DELETE /api/studio/materials/[id]`
- `POST /api/studio/test-email`

Pastikan semua endpoint tetap memakai guard admin. Untuk endpoint admin yang sekarang memanggil `requireAdmin()`, tinggal update import. Untuk endpoint yang memakai `isAdmin()`, pastikan masih membaca session dari shared auth.

## Env Var

Root `.env.example` perlu dipecah atau diberi section:

- Shared: `DATABASE_URL`, `AUTH_SECRET`, provider OAuth, email provider
- Web-only: public app URL, checkout/webhook/cron vars, AI vars jika hanya dipakai web
- Admin-only: `ADMIN_BOOTSTRAP_SECRET`, Stripe secret untuk dashboard finance, Mayar config, test email target

Contoh lokal:

```text
apps/web/.env.local
apps/admin/.env.local
packages/db/.env
```

Untuk Prisma CLI, pastikan `DATABASE_URL` tersedia saat command dijalankan dari `packages/db`.

## Tahapan Eksekusi

### Fase 0: Audit

- Catat semua import `@/` di `src/app/studio/**`, `src/app/api/admin/**`, dan `src/app/api/studio/**`.
- Catat semua dependency admin-only dan shared.
- Pastikan tidak ada route user yang fetch `/api/admin` atau `/api/studio`.
- Pastikan semua halaman admin berjalan sebelum dipindah.

### Fase 1: Siapkan Workspace

- Ubah root `package.json` menjadi workspace.
- Buat `apps/web` dan pindahkan aplikasi saat ini ke sana secara mekanis.
- Pastikan `npm install`, `npm run dev:web`, `npm run build:web`, dan `npm run lint` masih berjalan.
- Pada fase ini belum membuat admin app terpisah.

### Fase 2: Ekstrak Shared Packages

- Buat `packages/db`, `packages/auth`, `packages/ui`, `packages/utils`.
- Pindahkan Prisma client, auth config, admin guard, utilitas, dan UI dasar.
- Update path alias dari `@/...` menjadi package import untuk kode shared.
- Jalankan generate Prisma dari package DB.
- Pastikan web masih build.

### Fase 3: Buat Admin App

- Buat `apps/admin` sebagai Next app dengan versi Next yang sama.
- Pindahkan `studio` pages, admin APIs, setup page, sidebar, dan admin components.
- Copy hanya asset yang dibutuhkan admin, terutama logo.
- Update route/link dari `/studio` ke `/` atau pertahankan `/studio` sementara.
- Tambahkan `apps/admin/src/app/api/auth/[...nextauth]/route.ts` jika admin login langsung dari host admin.
- Tambahkan middleware/proxy auth admin sesuai pola Next versi project.

### Fase 4: Bersihkan Web App

- Hapus `studio`, `setup`, `api/admin`, dan `api/studio` dari `apps/web`.
- Hapus admin nav/link dari web jika ada.
- Tambahkan redirect informatif jika `/studio` masih diakses di web production, misalnya ke `https://admin.kodevo.id`.
- Pastikan web tidak membawa dependency admin-only yang tidak diperlukan.

### Fase 5: Deploy

- Deploy `apps/web` dan `apps/admin` sebagai service berbeda.
- Set env masing-masing service.
- Tambahkan OAuth callback admin:
  - `https://admin.kodevo.id/api/auth/callback/google`
  - `https://admin.kodevo.id/api/auth/callback/github`
- Jalankan smoke test production.

## Checklist Verifikasi

Web:

- `/`, `/login`, `/register`, `/dashboard`, `/learn`, `/settings` berjalan.
- User non-admin tidak bisa mengakses admin route lama.
- Checkout/webhook/cron tetap berjalan.
- Build standalone tetap berhasil.

Admin:

- `/login` bisa login.
- Non-admin ditolak.
- Admin bisa buka overview, users, user detail, finance, promo codes, materials, settings, debug.
- Mutation admin berjalan: toggle premium, promo code create/update/delete, material delete, settings save, test email.
- Bootstrap admin pertama tetap hanya bisa dipakai saat belum ada admin.

Shared:

- `npm run db:generate` sukses.
- Generated Prisma client hanya punya satu sumber.
- `AUTH_SECRET` konsisten.
- Tidak ada import silang langsung dari `apps/admin` ke `apps/web` atau sebaliknya.

## Risiko dan Mitigasi

Risiko terbesar adalah auth lintas aplikasi. Mitigasinya: jangan langsung optimasi SSO lintas subdomain. Biarkan admin login sendiri dengan `AUTH_SECRET` dan database yang sama, lalu baru evaluasi cookie domain setelah deploy stabil.

Risiko kedua adalah import alias `@/` yang tersebar. Mitigasinya: pindahkan secara bertahap dan gunakan package import eksplisit untuk kode shared.

Risiko ketiga adalah Prisma generated client. Mitigasinya: jadikan `packages/db` satu-satunya tempat schema dan generated client.

Risiko keempat adalah endpoint admin yang tidak ikut pindah. Mitigasinya: audit semua fetch ke `/api/admin` dan `/api/studio` sebelum menghapus kode dari web.

## Definisi Selesai

Migrasi dianggap selesai jika:

- `apps/web` dan `apps/admin` bisa build terpisah.
- Admin dapat dideploy sebagai service/domain terpisah.
- Semua halaman dan mutation admin berjalan dari admin app.
- Web app tidak lagi memuat route admin.
- Database, auth user, dan role `isAdmin` tetap kompatibel tanpa migrasi data besar.

## Execution Checklist

- [x] Audit semua file admin di `src/app/studio/**`, `src/app/api/admin/**`, dan `src/app/api/studio/**`.
- [x] Audit semua import `@/` yang dipakai admin dan kelompokkan menjadi web-only, admin-only, atau shared.
- [x] Ubah root project menjadi npm workspaces.
- [x] Buat struktur `apps/web`, `apps/admin`, dan `packages/*`.
- [x] Pindahkan aplikasi saat ini ke `apps/web` tanpa mengubah behavior.
- [x] Pastikan `apps/web` bisa `dev`, `build`, dan `lint`.
- [x] Buat `packages/db` sebagai satu-satunya pemilik Prisma schema dan generated client.
- [x] Pindahkan `src/lib/db.ts` ke `packages/db`.
- [x] Update import database menjadi package import seperti `@kodevo/db`.
- [x] Jalankan dan verifikasi `npm run db:generate`.
- [x] Buat `packages/auth` untuk NextAuth config, server auth, dan admin guard.
- [x] Pindahkan `src/lib/auth.ts`, `src/lib/auth.config.ts`, dan `src/lib/admin.ts` ke `packages/auth`.
- [x] Buat shared package untuk UI/utilitas yang dipakai kedua app.
- [x] Pindahkan komponen UI dasar dan `cn`/utility shared.
- [x] Buat app Next baru di `apps/admin` dengan versi Next yang sama.
- [x] Pindahkan halaman `src/app/studio/**` ke `apps/admin/src/app/**`.
- [x] Pindahkan `src/app/setup/page.tsx` ke `apps/admin/src/app/setup/page.tsx`.
- [x] Pindahkan `src/app/api/admin/**` ke `apps/admin/src/app/api/admin/**`.
- [x] Pindahkan `src/app/api/studio/**` ke `apps/admin/src/app/api/studio/**`.
- [x] Update semua link admin dari `/studio/...` menjadi route admin baru.
- [x] Tambahkan route auth di admin app jika admin login langsung dari host admin.
- [x] Pastikan semua halaman admin memakai `requireAdmin()`.
- [x] Pastikan semua API admin memakai `requireAdmin()` atau `isAdmin()`.
- [x] Hapus route admin dari `apps/web`.
- [x] Tambahkan redirect dari route admin lama di web ke host admin jika diperlukan.
- [x] Pisahkan env var web, admin, dan shared.
- [ ] Tambahkan OAuth callback untuk host admin di dashboard provider. URL callback sudah dicatat di `apps/admin/.env.example`.
- [x] Jalankan smoke test web lokal.
- [x] Jalankan smoke test admin lokal.
- [ ] Verifikasi user non-admin ditolak dari admin app.
- [ ] Verifikasi admin bisa membuka semua menu Studio.
- [ ] Verifikasi mutation admin: premium toggle, promo code, material delete, settings save, test email.
- [ ] Deploy `apps/web` sebagai service web.
- [ ] Deploy `apps/admin` sebagai service admin.
- [ ] Jalankan smoke test production untuk web.
- [ ] Jalankan smoke test production untuk admin.
