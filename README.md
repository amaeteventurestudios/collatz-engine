# The Collatz Engine

**A public visual observatory for exploring one of mathematics' most famous unsolved problems.**

Created by [Amaete Umanah](https://github.com/amaeteventurestudios)

---

## About

The Collatz Conjecture asks a deceptively simple question: starting from any positive integer, if you repeatedly apply two rules — divide by 2 if the number is even, multiply by 3 and add 1 if it is odd — will you always eventually reach 1?

Despite decades of effort and billions of numbers tested by computers, this conjecture remains unproven.

**The Collatz Engine is a public exploration and visualization system.** It continuously catalogs Collatz trajectories, visualizes sequence behavior, flags unusual patterns, and generates AI-assisted observations for human review.

> **Important:** This project does not claim to prove the Collatz Conjecture. It is a public exploration, visualization, and cataloging system.

---

## Phase 1 Status — Complete

Phase 1 establishes the full app shell, brand foundation, and visual dashboard structure.

**What is built:**
- Next.js 16 App Router with TypeScript
- Tailwind CSS v4 with dark/light theme toggle (dark default)
- Framer Motion animations
- Mobile-first responsive layout
- Public homepage with all placeholder sections:
  - Hero / header with live engine badge
  - Live status strip
  - Trajectory Visualizer placeholder
  - Live Sequence Trace placeholder (demo: n=27)
  - Key Records preview
  - AI Research Log placeholder
  - Heatmaps & Pattern Views placeholder
  - Educational About section
  - Contribute / Support / Contact section
  - Footer
- Admin shell at `/admin` and `/admin/login` with placeholder cards for:
  - Engine Controls, AI Notes Review, Records Manager
  - Near-Escape Manager, Submission Inbox, Site Settings, Audit Log
- Supabase client placeholder (env-gated, no keys committed)

**Coming in Phase 2:**
- Live Collatz computation engine
- Real trajectory charts (Recharts / D3)
- Supabase schema and data persistence
- AI-assisted batch analysis notes
- Near-escape candidate tracking
- Full admin authentication

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Charts | Recharts / D3 (Phase 2) |
| Database | Supabase (Phase 2) |
| Theme | next-themes (dark default) |
| Icons | lucide-react |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Routes

| Route | Description |
|---|---|
| `/` | Public homepage — dashboard and observatory |
| `/admin` | Admin dashboard (placeholder) |
| `/admin/login` | Admin login (placeholder) |

---

## Environment Variables

See `.env.example` for required environment variables. No keys are committed to this repository.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## License

All code open source. All computations verified.

*The Collatz Engine — Created by Amaete Umanah*
