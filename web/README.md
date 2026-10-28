# Reel Craft Studio — Website

Single-page marketing site for **Reel Craft Studio** (video production, Instagram reels, product & promotional videos).
React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Lucide icons.

## Run it

> Opening the project's own `index.html` directly shows only a short help message: it's the source
> file. Use `npm run dev`, or `npm run build:local` and open `dist-local/index.html`.

```bash
npm install
npm run dev            # http://localhost:5173 — placeholder hints are visible in dev
npm run build          # type-check + production build → dist/
npm run preview        # serve dist/ locally
npm run build:local    # dist-local/ → double-click index.html to view without a server
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, S3, cPanel…).

## Pages

| Page | Address | Content lives in |
|---|---|---|
| Home | `/` | all sections, `src/sections/` |
| Services | `/services` | `src/data/services.ts` |
| Service details (×5) | `/services/<slug>` | `src/data/services.ts` |
| Portfolio | `/portfolio` | `src/data/portfolio.ts`, `src/pages/PortfolioPage.tsx` |
| About Us | `/about` | `src/data/about.ts` |
| Process | `/process` | `src/data/process.ts` |
| Contact & Book a Shoot | `/contact` | `src/data/site.ts`, `src/pages/ContactPage.tsx` |

Each menu item opens its own page. The home page still shows a summary of everything, with "View all" links into each page.

Pages use real URLs, so the host must send unknown paths to `index.html`.
`public/_redirects` (Netlify) and `vercel.json` (Vercel) are included. On Apache/cPanel add this `.htaccess`:

```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [L]
```

## Where to edit things

| What | File |
|---|---|
| Phone/WhatsApp, email, location, hours | `src/data/site.ts` → `contact` |
| Instagram / YouTube / Facebook / LinkedIn | `src/data/site.ts` → `socials` |
| Showreel video (hero "Watch Showreel") | `src/data/site.ts` → `showreel.url` |
| Stats strip (50+, 30+ …) | `src/data/site.ts` → `stats` |
| Services + service pages (text, images, steps) | `src/data/services.ts` |
| Portfolio projects, categories, videos | `src/data/portfolio.ts` |
| Testimonials | `src/data/testimonials.ts` |
| Colours, fonts, spacing tokens | `src/index.css` (`@theme`) |
| Page title, meta, Open Graph | `index.html` |

Empty values are **hidden** on the live site. In `npm run dev` (or with `VITE_SHOW_PLACEHOLDERS=true`) they show as
"Add … in src/data/site.ts" so nothing gets forgotten.

## ⚠️ Placeholders to replace before launch

Nothing below has been confirmed as real business information — it's intentionally left empty or labelled.

- **Contact details** — phone/WhatsApp (+91 79049 71847) and email (reelcraftstudio.media@gmail.com) are set.
  Location: Sivakasi, Tamil Nadu. The WhatsApp button builds `https://wa.me/917904971847`.
- **Social links** — Instagram and Facebook are set; add YouTube/LinkedIn in `site.ts` when ready.
- **Stats** — 15+ projects, 15+ clients, 2+ years, 100% creative focus (`site.ts`).
- **Portfolio** — 4 real reels (The Chennai Silks Expo, Srikumaran, Satya Mobiles, Gold Jewellery Showcase), compressed to
  720p MP4 in `public/videos/` with WebP posters. Check the titles/categories in `src/data/portfolio.ts` (the fourth reel's
  store name wasn't in the file name). Filter buttons only appear for categories that have projects.
  To add more: `ffmpeg -i in.mp4 -vf "scale=720:-2,fps=30" -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 96k -movflags +faststart public/videos/name.mp4`.
- **Testimonials** — three boxes; each shows "Client review coming soon" until you fill `name`, `role` and `quote` in
  `src/data/testimonials.ts`. Add only genuine, permitted reviews; ratings and photos render only when provided.
- **Imagery** — the hero uses the camera visual from the supplied design reference (upscaled from the mockup, so replace it with
  an original high-res photo when available: `src/assets/hero-camera.webp`, ~1600px wide WebP). The About section uses
  the supplied studio image (`src/assets/about-studio.webp`). Service images are stills from the studio's own reels (`src/assets/services/`).
- **Domain** — replace `https://www.example.com` in `index.html`, `public/robots.txt` and `public/sitemap.xml`.
- **Showreel** — empty; the modal says "Video coming soon" until `showreel.url` is set.

## Book a Shoot (enquiry form) — how bookings reach you

Bookings are emailed to **reelcraftstudio.media@gmail.com** through FormSubmit (free, no account needed).

**One-time setup after the site goes live:** submit one test booking from the live site. FormSubmit emails an
**"Activate Form"** link to that inbox — click it. From then on every booking arrives as an email with all the details
in a table, and replying goes straight to the customer when they gave an email address.
Until activation, visitors see "couldn't send" with a **Send via WhatsApp** button, so no booking is lost or falsely confirmed.

The form also offers "Send these details on WhatsApp" at all times.

## Connecting a different form service

The form validates on the client (required fields, phone/email format, no past dates) and **never shows a fake success**.

- **No endpoint configured (default):** after validation it says plainly that the enquiry was *not* sent and offers
  "Send via WhatsApp" / "Send via Email" with all the form details pre-filled (once a phone/email is configured).
- **With an endpoint:** copy `.env.example` to `.env.local` and set `VITE_FORM_ENDPOINT`. The form `POST`s JSON
  (`fullName, phone, email, business, service, shootDate, details`) and shows success **only on a 2xx response**.

Options for the endpoint:
1. **Formspree / Getform / Basin** — create a form, paste its URL into `VITE_FORM_ENDPOINT`. No server code.
2. **Your own serverless function** (Netlify/Vercel/Cloudflare) that emails the enquiry or stores it — keep SMTP/API keys
   in the function's server-side environment, never in `VITE_*` variables (those are public).

### Spam protection
Built in: a hidden honeypot field and a minimum fill time (3 s). For production also add a server-side check —
**Cloudflare Turnstile** (free) is recommended: render the widget in `ContactForm.tsx`, send its token with the payload, and
verify it in your endpoint. Formspree/Getform include their own spam filtering.

## Accessibility & performance notes
- One `<h1>`, ordered `h2`/`h3`, skip link, visible focus rings, `aria-current` nav state, `aria-pressed` filters,
  live-region announcements for filter results and form status.
- Video lightbox: `role="dialog"`, focus moved in and trapped, Escape/backdrop/close button, focus returned to the trigger.
- `prefers-reduced-motion` respected (Framer Motion `reducedMotion="user"`, CSS smooth-scroll and spin disabled).
- Fonts are self-hosted (latin subset), images are WebP and lazy-loaded below the fold.

## Structure
```
src/
  components/   Button, Logo, SectionHeading, Reveal, PlaceholderArt, ServiceCard, PortfolioCard,
                VideoModal, ContactForm, ContactInfoCard, SocialIcons, FilmReel, BackToTop
  sections/     Header, Hero, StatsBar, ServicesSection, PortfolioSection, AboutSection,
                ProcessSection, TestimonialsSection, ContactSection, Footer
  data/         site.ts, services.ts, portfolio.ts, testimonials.ts   ← edit content here
  hooks/        useScrollState.ts (sticky header, active section)
  lib/          links.ts (WhatsApp/mailto), video.ts (YouTube/Vimeo/MP4 parsing), env.ts
  assets/       logo (from the official artwork), hero image
public/         favicon, apple-touch-icon, og-image.jpg, robots.txt, sitemap.xml
```
