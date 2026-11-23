# OrthoCase — Orthopedic Surgical Case Management Platform

A private, user-centric surgical case management platform for orthopedic surgeons and medical professionals, built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL, and Better Auth.

## Core Principles

- **Personal Case Ownership**: Every surgical case belongs to exactly one doctor (`ownerId`) and is private by default.
- **Invitation-Only Registration**: Doctors join via cryptographically secure, single-use, expiring invitation tokens (stored as SHA-256 hashes). Joining creates an independent personal library with zero automatic access to another doctor's cases.
- **Explicit Selective Sharing**: Individual cases can be shared with specific colleagues as `VIEWER` or `EDITOR` without duplicating records or transferring ownership. Revoking access immediately removes application-level access.
- **Privacy First**: No patient names, national IDs, or phone numbers are collected. Medical attachments are stored in private object storage with short-lived signed URLs and EXIF stripping.

## Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and set `DATABASE_URL` and `BETTER_AUTH_SECRET`:
   ```bash
   cp .env.example .env
   ```

3. **Generate Prisma client & run database migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   > **Note**: Apply the partial unique index for active case shares (`WHERE "revokedAt" IS NULL`) included in `prisma/migrations/`.

4. **Bootstrap initial fictional doctor account (development only)**
   ```bash
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## Verification Commands

```bash
npm run typecheck
npm run lint
npm test
```

## Implementation Progress

- [x] **Phase 0** — Repository inspection, technical architecture, ERD, Prisma schema, security assessment, and phased roadmap
- [x] **Phase 1** — Foundation: Next.js 16 + Tailwind + Prisma schema, Better Auth (DB sessions, email verification, password reset), invitation-only registration, centralized authorization policy, audit logging, app shell, profile/settings/security/invitations UI, and unit tests
- [x] **Phase 2** — Core Case Management (Dashboard overview, My Cases library with search/filters/sorting/pagination/table & card views, 5-step Case Creation Wizard with local autosave & drafts, Case Details page with 8 permission-aware tabs, Case Editing, and status/archive/delete workflows)
- [x] **Phase 3** — Medical Documentation (Provider-agnostic S3 + dev signed-URL storage, magic-byte validation, JPEG/PNG EXIF stripping, multi-file drag-and-drop uploader with progress, categorized Image Gallery + zoom/pan Lightbox, PDF preview, Laboratory Results CRUD, chronological Follow-up Timeline, `/media`, and `/follow-ups`)
- [x] **Phase 4** — Collaboration (Selective Case Sharing modal with doctor search, Viewer/Editor grant/change/revoke, pending share-on-invite, `/shared`, `/shared-by-me`, `/activity`, notifications, and PostgreSQL partial unique index on active shares)
- [x] **Phase 5** — Advanced Features (Server-side PDF Case Export with selective image inclusion & captions via `pdf-lib`, personal Dashboard Analytics charts by procedure/classification/role/hospital/year, and authorized Case Comparison at `/cases/compare`)
- [x] **Phase 6** — Production Preparation (Security headers, centralized server-side authorization & IDOR tests, Neon Postgres pooled + direct URL configuration, PostgreSQL partial unique index, `.env.example`, and full verification suite)

## Privacy & Regulatory Notice

Do **not** use real patient records in development, testing, screenshots, or seed data. Before processing real clinical data in production, conduct a formal legal and security review for applicable Egyptian personal data protection requirements (Law No. 151 of 2020) and any cross-border hosting obligations.
