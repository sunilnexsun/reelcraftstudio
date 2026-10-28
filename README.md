# reelcraftstudio

Monorepo for ReelCraft Studio.

| Folder | What it is |
| --- | --- |
| [`web/`](web/) | Public marketing site (Vite + React) |
| [`admin/`](admin/) | Admin panel: dashboard, CRM, projects, bookings, finance, reports (Vite + React + Supabase) |

Each app is self-contained. To run one:

```bash
cd web   # or admin
npm install
cp .env.example .env.local   # fill in values
npm run dev
```
