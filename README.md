# ReelCraft Studio

Source code for **ReelCraft Studio**, a video-production studio in Sivakasi, Tamil Nadu (Instagram reels, product and promotional videos, shoots, social media content, personal branding).

This repository holds two independent apps:

| Folder | App | Who uses it | Backend |
| --- | --- | --- | --- |
| [`web/`](web/) | Public marketing website | Prospective clients | None. Content lives in TypeScript data files; enquiries go out by email (FormSubmit) or WhatsApp |
| [`admin/`](admin/) | Studio admin panel | Owner and staff | Supabase (Postgres, Auth, Storage, Row Level Security). Runs in a browser-only demo mode when not configured |

Each app has its own `package.json`, lockfile, build and deployment. There is no shared code and no workspace tooling, so you `cd` into one folder and work there.

> Each app also has a detailed README of its own: [`web/README.md`](web/README.md) and [`admin/README.md`](admin/README.md). This file is the overview; those are the reference.

---

## Contents

- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Repository layout](#repository-layout)
- [The website (`web/`)](#the-website-web)
- [The admin panel (`admin/`)](#the-admin-panel-admin)
- [How the two apps relate](#how-the-two-apps-relate)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Known gaps and next steps](#known-gaps-and-next-steps)

---

## Tech stack

Both apps share the same foundation:

- **React 19** + **TypeScript 6**
- **Vite 8** for dev server and builds
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **Lucide** icons
- **oxlint** for linting

On top of that:

| | `web/` | `admin/` |
| --- | --- | --- |
| Routing | Small custom router (`src/lib/router.ts`) | React Router 7 |
| Animation | Framer Motion | — |
| Forms | Hand-written with client-side validation | React Hook Form + Zod |
| Charts | — | Recharts |
| Data | Static files in `src/data/` | Supabase JS client, or a localStorage demo store |
| Tests | Type-check only | Vitest unit tests + PGlite database tests |

## Prerequisites

- **Node.js 22 or 24 (LTS)**. Both apps build on Node 23 too, but the admin's test runner (Vitest 5) officially supports only `^22.12`, `^24` or `>=26`, so `npm install` prints an `EBADENGINE` warning on 23.
- **npm** (lockfiles are `package-lock.json`; use `npm ci` for a clean install).
- For the admin with a real backend: a **Supabase** project. Optionally, the Supabase CLI to apply migrations.

## Quick start

```bash
git clone https://github.com/sunilnexsun/reelcraftstudio.git
cd reelcraftstudio
```

**Website:**

```bash
cd web
npm ci
npm run dev        # http://localhost:5173
```

**Admin panel (demo mode, no backend needed):**

```bash
cd admin
npm ci
npm run dev        # http://localhost:5173
```

Both use port 5173 by default. If you run them together, Vite picks the next free port (5174) for the second one.

With no Supabase variables set, the admin runs in **demo mode**: sample data stored in your browser, a banner on every page, and a role picker instead of a login. See [Going live with Supabase](#going-live-with-supabase) to connect a real database.

## Repository layout

```
reelcraftstudio/
├── README.md                  ← you are here
├── web/                       public website
│   ├── index.html             page title, meta tags, Open Graph
│   ├── public/
│   │   ├── videos/            portfolio reels (720p MP4 + WebP posters, ~94 MB)
│   │   ├── robots.txt, sitemap.xml, og-image.jpg, favicons
│   │   └── _redirects         Netlify SPA routing
│   ├── src/
│   │   ├── data/              ← all editable site content
│   │   ├── pages/             one component per route
│   │   ├── sections/          home-page sections, header, footer
│   │   ├── components/        buttons, cards, contact form, video modal…
│   │   ├── lib/               router, WhatsApp/mailto links, video URL parsing, env
│   │   └── assets/            logo, hero, service images (WebP)
│   └── vercel.json            Vercel SPA rewrites
└── admin/                     admin panel
    ├── public/embed/          drop-in website form script (reelcraft-forms.js)
    ├── src/
    │   ├── features/<module>/ pages and forms per module
    │   ├── components/        ui/, layout/, dashboard/, calendar/, tables/, forms/
    │   ├── lib/domain/        pure business logic (invoices, bookings, reports, dates, money)
    │   ├── lib/data/          DataSource interface with Supabase and demo implementations
    │   ├── lib/auth.tsx       session and roles
    │   └── lib/permissions.ts UI mirror of the database's RLS rules
    ├── supabase/
    │   ├── migrations/        schema, functions/triggers, RLS, storage + public API
    │   └── tests/db-check.mjs database tests in an in-process Postgres
    └── vercel.json            SPA rewrites + security headers
```

---

## The website (`web/`)

A fast, mostly static site that presents the studio's services and work and collects shoot enquiries.

### Pages

| Page | URL | Content source |
| --- | --- | --- |
| Home | `/` | All sections, `src/sections/` |
| Services | `/services` | `src/data/services.ts` |
| Service detail (5) | `/services/<slug>` | `src/data/services.ts` |
| Portfolio | `/portfolio` | `src/data/portfolio.ts` |
| About | `/about` | `src/data/about.ts` |
| Process | `/process` | `src/data/process.ts` |
| Contact & Book a Shoot | `/contact` | `src/data/site.ts` |

The five services are `video-shooting-editing`, `instagram-reels`, `product-promotional-videos`, `social-media-content` and `personal-branding`.

### Editing content

Content is code, not a CMS. To change the site, edit a file in `web/src/data/` and redeploy.

| To change | Edit |
| --- | --- |
| Phone/WhatsApp, email, location, hours | `site.ts` → `contact` |
| Social links | `site.ts` → `socials` |
| Showreel video | `site.ts` → `showreel.url` |
| Stats strip | `site.ts` → `stats` |
| Services and their detail pages | `services.ts` |
| Portfolio projects and videos | `portfolio.ts` (15 projects, videos in `public/videos/`) |
| Testimonials | `testimonials.ts` |
| Colours, fonts, spacing | `src/index.css` (`@theme`) |
| Page title, SEO and social preview | `index.html` |

Empty values are hidden on the live site. In `npm run dev` they show as "Add … in src/data/site.ts" so nothing is forgotten. Set `VITE_SHOW_PLACEHOLDERS=true` to show those hints in a production build.

**Adding a portfolio video:** compress it to 720p first so the repo and page stay light:

```bash
ffmpeg -i in.mp4 -vf "scale=720:-2,fps=30" -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 96k -movflags +faststart public/videos/name.mp4
```

Then add a WebP poster next to it and an entry in `src/data/portfolio.ts`.

### How enquiries are delivered

The **Book a Shoot** form validates on the client (required fields, phone/email format, no past dates) and only reports success on a real 2xx response.

- **Default:** submissions are emailed to the address in `site.ts` through [FormSubmit](https://formsubmit.co). After the first deploy, send one test booking from the live site and click the **Activate Form** link FormSubmit emails to that inbox. Until then visitors get a **Send via WhatsApp** fallback, so no enquiry is silently lost.
- **Custom endpoint:** set `VITE_FORM_ENDPOINT` (Formspree, Getform, or your own serverless function). The form `POST`s JSON with `fullName, phone, email, business, service, shootDate, details`.
- **Spam protection:** a hidden honeypot field and a 3-second minimum fill time. For production, add a server-side check such as Cloudflare Turnstile.

### Build variants

| Command | Output | Use |
| --- | --- | --- |
| `npm run build` | `dist/` | Production. Upload to any static host |
| `npm run build:local` | `dist-local/` | Single-file build you can open by double-clicking `index.html`, no server |
| `vite build --mode artifact` | `dist-artifact/` | Relative-path build for hosted previews |

Opening `web/index.html` directly from the source tree only shows a help message. Use the dev server or one of the builds.

### Before launch

- Replace `https://www.example.com` in `index.html`, `public/robots.txt` and `public/sitemap.xml` with the real domain.
- Fill in testimonials (genuine, permitted reviews only), the showreel URL, and YouTube/LinkedIn links if wanted.
- Swap `src/assets/hero-camera.webp` for an original high-resolution photo.
- Activate FormSubmit as described above.

---

## The admin panel (`admin/`)

A dark, dashboard-style back office for running the studio day to day.

### Modules

| Module | What it does |
| --- | --- |
| **Overview** | KPI cards and charts for the selected date range |
| **Enquiries** | Leads from the website and manual entry; convert an enquiry into a client + project |
| **Projects** | Table and Kanban views, workflow stepper, deliverables, revisions, approvals, team, advances |
| **Bookings** | Month/week/day shoot calendar with crew and equipment clash prevention |
| **Clients** | Client records with their projects, invoices, bookings and communication history |
| **Portfolio** | Work shown on the website, with YouTube/Vimeo embeds |
| **Services** | Service catalogue shown on the website |
| **Testimonials** | Collect and approve client reviews |
| **Team** | Staff, linked to their logins |
| **Content Calendar** | Plan social posts (planning only; nothing is auto-posted) |
| **Invoices & Expenses** | Invoice editor with tax/discount, printable invoices, partial payments, expenses with receipts |
| **Reports** | Revenue, collections, expenses and profit over a date range |
| **Settings** | Studio details, invoice numbering, users and roles, demo data reset |

Every list supports search, filters, sorting, pagination and CSV export.

### Roles

Five roles: **Owner**, **Manager**, **Accounts**, **Editor** and **Videographer**. Access is enforced in Postgres with Row Level Security, and the UI hides what a role can't use. In short:

- **Owner:** everything, including users and roles.
- **Manager:** runs enquiries, projects, bookings and content; can view finance.
- **Accounts:** full finance (invoices, payments, expenses); views the rest.
- **Editor / Videographer:** edit only the projects they're assigned to. Budgets and dues are hidden from them.

The full matrix is in [`admin/README.md`](admin/README.md#roles--security).

### Demo mode vs. live mode

| | Demo mode | Live mode |
| --- | --- | --- |
| Triggered by | No `VITE_SUPABASE_*` variables | `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` set |
| Data | Sample data in browser localStorage | Your Supabase database |
| Login | Role picker | Supabase Auth (email + password) |
| Business rules | Emulated in the browser | Postgres triggers and RLS |

Demo data is never written to Supabase. You can force a mode with `VITE_DATA_MODE=demo` or `live`.

### Going live with Supabase

1. Create a Supabase project (an India region such as Mumbai `ap-south-1` is closest).
2. Apply the migrations in `admin/supabase/migrations/` in order, using `supabase db push` or by pasting each file into the SQL editor:
   1. `…_schema.sql`: tables, enums, indexes, constraints
   2. `…_functions.sql`: triggers and RPCs (invoice maths, booking conflicts, conversion, activity log)
   3. `…_rls.sql`: Row Level Security for every table
   4. `…_storage_public_api.sql`: storage buckets, policies and the public website API
3. In **Authentication → URL configuration**, set the Site URL to the admin's domain and add `https://<admin-domain>/update-password` as a redirect URL.
4. Copy `admin/.env.example` to `admin/.env.local` and fill in the project URL and **publishable** (anon) key.
5. Sign up. **The first account becomes the Owner.** Later sign-ups wait, inactive, until the Owner assigns a role in **Settings → Users & roles**.
6. Then, in **Authentication → Providers → Email**, disable public sign-ups and invite staff from the Supabase dashboard instead.

> **Never** put the Supabase service-role/secret key in a `VITE_` variable. Everything prefixed `VITE_` is shipped to the browser.

### Conventions

- Currency is **INR** with Indian digit grouping (₹2,45,000; compact ₹2.45L).
- All dates and times are **Asia/Kolkata (IST)**. The financial year runs April–March.
- Invoice numbers look like `RC-26-0001` (prefix, 2-digit year, sequence); the prefix is configurable in Settings.

---

## How the two apps relate

Today they are **not connected**. The website reads its content from its own data files and emails enquiries through FormSubmit. The admin manages its own services, portfolio and testimonials in Supabase.

The admin is built to become the website's backend when you want that. It exposes:

- **Public read access** (no login) to active services, published portfolio items and approved testimonials, via Supabase's REST API.
- Two **public RPCs**, `submit_enquiry` and `submit_booking_request`. They validate input, drop honeypot-filled bot submissions, rate-limit per IP and de-duplicate repeats. Submissions appear instantly in Enquiries and Bookings with a notification.
- A **drop-in form script** at `https://<admin-domain>/embed/reelcraft-forms.js` that renders both forms on any page.

To connect them, either replace the website's contact form with the embed script, or call the RPCs from `web/src/components/ContactForm.tsx`. To show admin-managed content on the site, read from the REST endpoints instead of `web/src/data/`. `admin/src/features/website/PublicSitePage.tsx` (live at `/site` in the admin) is a working React reference. See [`admin/README.md`](admin/README.md#website-integration) for the exact snippets.

---

## Environment variables

Copy each app's `.env.example` to `.env.local` (which git ignores) and fill it in. Only `VITE_*` variables reach the browser, and all of them are public.

| App | Variable | Required | Purpose |
| --- | --- | --- | --- |
| `web` | `VITE_FORM_ENDPOINT` | No | Custom form endpoint. Defaults to FormSubmit using the email in `site.ts` |
| `web` | `VITE_SHOW_PLACEHOLDERS` | No | `true` shows "Add …" hints for empty content in production |
| `admin` | `VITE_SUPABASE_URL` | For live mode | Supabase project URL |
| `admin` | `VITE_SUPABASE_PUBLISHABLE_KEY` | For live mode | Supabase publishable (anon) key. Safe in the browser because of RLS |
| `admin` | `VITE_DATA_MODE` | No | Force `demo` or `live` |

`web/.env.artifact` is committed on purpose. It only sets `VITE_SHOW_PLACEHOLDERS=true` for preview builds.

## Scripts

Run these inside the app's folder.

| Script | `web/` | `admin/` |
| --- | --- | --- |
| `npm run dev` | Dev server | Dev server |
| `npm run build` | Type-check + build to `dist/` | Type-check + build to `dist/` |
| `npm run preview` | Serve `dist/` locally | Serve `dist/` locally |
| `npm run typecheck` | Type-check only | Type-check only |
| `npm run lint` | oxlint | oxlint |
| `npm run build:local` | Single-file offline build | — |
| `npm test` | — | Vitest unit tests (invoice maths, booking conflicts, IST dates, CSV, reports, demo store rules) |
| `npm run test:db` | — | Runs all migrations in PGlite and checks triggers, RLS per role, storage policies and the public API |
| `npm run check` | — | Type-check, unit tests, DB tests and build: run before opening a PR |

## Deployment

Deploy each app as its **own** project on your host, pointing at its folder.

### Vercel (recommended)

1. Import this repository in Vercel **twice**, once per app.
2. Set **Root Directory** to `web` for one project and `admin` for the other. The framework is detected as Vite and each folder's `vercel.json` handles SPA routing (the admin's also adds security headers).
3. For the admin, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Environment Variables.
4. After the admin's first deploy, add its URL to Supabase **Authentication → URL configuration**.

### Other hosts

- **Netlify / Cloudflare Pages:** base directory `web` or `admin`, build command `npm run build`, publish directory `dist`. `public/_redirects` handles routing.
- **Apache / cPanel (website):** upload `web/dist/` and add this `.htaccess` so deep links work:

  ```apache
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^ index.html [L]
  ```

## Contributing

- `main` is the default branch. Don't commit to it directly: branch off it and open a pull request.
- Name branches `<type>/<short-description>`, for example `feat/booking-reminders`, `fix/invoice-rounding` or `docs/deploy-guide`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`.
- Before opening a PR, run `npm run build` in `web/` and `npm run check` in `admin/` (for any app you touched).
- Never commit `.env`, `.env.local` or any secret keys. `node_modules/` and `dist/` are git-ignored.
- Compress videos before adding them (see [Editing content](#editing-content)). GitHub rejects files over 100 MB.

## Known gaps and next steps

- **Website ↔ admin not wired up.** See [How the two apps relate](#how-the-two-apps-relate).
- **No CI.** Nothing runs on pull requests yet. A GitHub Actions workflow running `npm run build` (web) and `npm run check` (admin) would catch breakage before merge.
- **Migrations not yet run against hosted Supabase.** They are tested on Postgres 17 (PGlite) with stubbed auth/storage. Apply them to a staging project first.
- **Notifications are in-app only.** Email or WhatsApp alerts need an external provider (for example a Supabase Edge Function with Resend or the WhatsApp Business API).
- **Overdue invoices** refresh when an invoice changes. To flip untouched ones daily, schedule `select public.refresh_overdue_invoices();` with pg_cron.
- **Invoice PDFs** use the browser's print dialog, not server-side generation.
- **Website placeholders:** domain, testimonials and showreel (see [Before launch](#before-launch)).
