# Cara Menjalankan Project

Project ini memakai npm workspaces dengan dua aplikasi utama:

- `apps/web`: aplikasi user utama.
- `apps/admin`: aplikasi admin.

Jalankan semua perintah dari root repo.

## Persiapan Pertama

Install dependency:

```bash
npm install
```

Generate Prisma client:

```bash
npm run db:generate
```

Siapkan env sesuai kebutuhan:

- Web: `apps/web/.env.local`
- Admin: `apps/admin/.env.local`
- Prisma CLI: `packages/db/.env`

Pastikan cookie auth dipisahkan:

- Web: `AUTH_COOKIE_NAMESPACE=web`
- Admin: `AUTH_COOKIE_NAMESPACE=admin`

Contoh env ada di:

- `apps/web/.env.example`
- `apps/admin/.env.example`
- `packages/db/.env.example`

## Development

Jalankan aplikasi user:

```bash
npm run dev:web
```

URL default:

```text
http://localhost:3000
```

Jalankan aplikasi admin:

```bash
npm run dev:admin
```

URL default:

```text
http://localhost:3001
```

Shortcut:

```bash
npm run dev
```

Perintah ini sama dengan `npm run dev:web`.

## Production Build

Build aplikasi user:

```bash
npm run build:web
```

Build aplikasi admin:

```bash
npm run build:admin
```

Shortcut:

```bash
npm run build
```

Perintah ini sama dengan `npm run build:web`.

## Production Start

Start aplikasi user setelah build:

```bash
npm run build:web
npm run start
```

URL default:

```text
http://localhost:3000
```

Start aplikasi admin setelah build:

```bash
npm run build:admin
npm run start -w apps/admin
```

URL default:

```text
http://localhost:3001
```

## Redirect Admin Lama

Di aplikasi web, route lama admin diarahkan ke host admin:

- `/studio` -> `ADMIN_APP_URL`
- `/studio/:path*` -> `ADMIN_APP_URL/:path*`
- `/setup` -> `ADMIN_APP_URL/setup`

Untuk lokal, default `ADMIN_APP_URL` adalah:

```text
http://localhost:3001
```

Untuk production, set di env web:

```text
ADMIN_APP_URL=https://admin.kodevo.id
```

## Database

Generate Prisma client:

```bash
npm run db:generate
```

Push schema ke database:

```bash
npm run db:push
```

Jalankan migration development:

```bash
npm run db:migrate
```

Buka Prisma Studio:

```bash
npm run db:studio
```

## Catatan OAuth Admin

Jika admin memakai login Google atau GitHub, tambahkan callback berikut di dashboard provider:

```text
http://localhost:3001/api/auth/callback/google
http://localhost:3001/api/auth/callback/github
https://admin.kodevo.id/api/auth/callback/google
https://admin.kodevo.id/api/auth/callback/github
```
