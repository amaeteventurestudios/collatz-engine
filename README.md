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

## Phase 4 Status — Complete

Phase 4 builds the autonomous batch runner foundation. The engine can now process ranges of numbers locally, summarize batches, detect records, detect near-escape candidates, and generate compact batch data.

**New library files — `lib/collatz/`:**
- `batch-types.ts` — `BatchInput`, `BatchSummary`, `RecordBreaker`, `NearEscapeCandidate`, `ResidueClassStats`, `TrajectorySample` types
- `batch-runner.ts` — `runBatch()` — processes a range, returns a compact `BatchSummary` without storing full sequences
- `batch-records.ts` — Running record tracking and final record extraction
- `near-escape.ts` — Configurable near-escape candidate detection with 4 flag types
- `residue-stats.ts` — Per-residue accumulation and finalization for any set of moduli
- `demo-batch.ts` — Cached demo batch result for range 1–1,000

**Updated library — `lib/collatz/engine.ts`:**
- Refactored shared inner loop (`runLoop`) used by both `computeCollatz` and the new `computeCollatzSummary`
- `computeCollatzSummary` — memory-efficient variant: same metrics as `computeCollatz` but no `full_sequence` or `compressed_odd_only_path` stored

**CLI script:**
```bash
npm run collatz:batch -- 1 10000
```
Example output for 1–1,000:
```
Numbers tested:          1,000
Duration:                14 ms
Avg steps to 1:          59.54
Max steps:               178  (n = 871)
Max peak:                250,504  (n = 703)
Max peak ratio:          356.34×  (n = 703)
Longest first descent:   132 steps  (n = 703)
Near-escape candidates:  250
Final record holders:    5
```

**Memory rules enforced:**
- Full sequences are NOT stored for every number in batch mode
- Full trajectories are only computed for final record holders and near-escape samples
- Batch summaries store only compact metrics per batch

**Near-escape default thresholds:**
| Threshold | Default |
|---|---|
| `min_peak_ratio` | 200 |
| `min_first_descent_step` | 70 |
| `min_odd_step_density` | 0.47 |
| `min_steps_to_1` | 100 |

**Residue class analysis moduli:** 3, 4, 6, 8, 12, 24, 36

**Dashboard wiring (Phase 4):**
- `StatusStrip` — Engine Library: Ready · Batch Runner: Ready · Demo Batch: 1–1,000 · Autonomous Cataloging: Phase 5/6
- `RecordsPreview` — Demo records from batch 1–1,000 (labeled as demo, not global records)
- `NearEscapeCandidates` — Top 8 candidates by peak ratio from demo batch
- `DiscoveryFeed` — 2 new events: batch runner available + demo batch generated
- `DataMethodology` — Updated to explain compact summaries and sequence storage policy

**Test suite:**
```bash
npm test
```
- 136 tests total (95 Phase 3 + 41 new Phase 4)
- Covers: engine refactor, batch range validation, known exact values (1–10), record detection, near-escape flagging, residue stats, sample limit, batch 1–1,000

**Note:** No data written to Supabase. Autonomous cataloging is NOT active in Phase 4. All computation is local and on-demand.

---

## Phase 3 Status — Complete

Phase 3 builds the core deterministic Collatz calculation engine and wires accurate local computation into the existing dashboard shell.

**Core engine — `lib/collatz/`:**
- `types.ts` — TypeScript interfaces for `CollatzResult` and `CollatzOptions`
- `engine.ts` — `computeCollatz(n)` with full metric output and defensive guards
- `examples.ts` — Pre-computed results for 11 seed examples with lazy caching and demo record helpers
- `format.ts` — Display formatting utilities (locale numbers, ratios, densities)

**What `computeCollatz` returns for any starting number:**
| Field | Description |
|---|---|
| `start_number` | Input as BigInt |
| `full_sequence` | Every value in the trajectory (BigInt[]) |
| `steps_to_1` | Total steps to reach 1 |
| `peak_value` | Maximum value reached |
| `peak_ratio` | peak_value / start_number |
| `first_descent_step` | Step when value first drops below start_number |
| `odd_steps` / `even_steps` | Counts of each rule application |
| `odd_step_density` / `even_step_density` | Ratios |
| `compressed_odd_only_path` | Only the odd values in the trajectory |
| `reached_one` | Boolean success flag |
| `cycle_detected` | Defensive cycle detection |
| `stopped_reason` | `reached_one` · `cycle_detected` · `max_steps_exceeded` · `invalid_input` |

**Input validation:** Rejects zero, negative numbers, decimals, non-numeric strings, and negative BigInts. Returns a result with `stopped_reason: "invalid_input"`.

**Known tested seed examples:**

| n | Steps to 1 | Peak value |
|---|---|---|
| 1 | 0 | 1 |
| 2 | 1 | 2 |
| 3 | 7 | 16 |
| 6 | 8 | 16 |
| 7 | 16 | 52 |
| 27 | 111 | 9,232 |
| 97 | 118 | 9,232 |
| 871 | 178 | — |
| 6,171 | 261 | — |
| 77,031 | 350 | — |
| 837,799 | 524 | — |

**Dashboard wiring:**
- `TrajectoryVisualizer` — SVG log-scale chart generated from real computed n=27 sequence (no hardcoded points)
- `SequenceTrace` — First 10 steps from engine output with accurate step/value/rule/result columns
- `RecordsPreview` — Longest path, highest peak, highest peak ratio, highest odd-step density from seed examples (labeled "Demo seed examples")
- `StatusStrip` — Updated to show "Engine Library: Ready" · "Demo Trajectory: n=27" · "Cataloging: Not Connected"

**Test suite:**
```bash
npm test
```
- 95 tests across: known values, metric invariants, sequence correctness, input validation, max-steps guard
- Framework: Vitest 4

**How to run checks:**
```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # Next.js production build
npm test           # Vitest test suite
```

**Note:** Autonomous cataloging does not start in Phase 3. The engine computes on demand for the 11 seed examples only. Supabase, GitHub Actions, admin auth, and AI notes are all Phase 4+.

---

## Phase 2B Status — Complete

Phase 2B completes the dashboard sections so the public homepage matches the approved mockup concept with all placeholder content in place before the engine connects in Phase 3.

**What changed in Phase 2B:**
- **Status Strip:** All `"—"` stats replaced with polished placeholder states ("Demo Mode", "Awaiting Engine", "Phase 2 Shell", "Not Yet Connected"). Dedicated LIVE status header row with "Demo Mode — Engine connects in Phase 3" badge.
- **Trajectory Visualizer:** Full SVG rewrite with actual pre-computed log-scale trajectory for n=27 (111 steps, peak 9,232 at step 77). Gradient line (teal→violet→green), area fill, peak marker, start/end markers, grid lines at log₁₀ levels. "Demo — n=27" overlay badge.
- **Records Preview:** All record values updated to "No records yet" / "Awaiting Engine Data". Record labels corrected. Subtle per-card color tints added.
- **AI Research Log:** "Hypotheses" tab renamed to "Observations for Review". Enhanced credibility notice with "Human review required" heading. First placeholder note tag updated to "System".
- **Pattern Views:** Visual CSS heatmap grid added — 8×20 2D array of intensity values mapped to Tailwind color classes (sky→teal→green→yellow→orange→red) with variable opacity. Y-axis "High/Low" labels, X-axis label, color legend strip.
- **DiscoveryFeed** (new): Discovery feed with 5 placeholder events covering Phase 2 initialization, engine connection pending, AI workflow status, and empty records/observations states.
- **NearEscapeCandidates** (new): Table with 4 columns (Number, Peak Ratio, First Descent Delay, Status) and polished empty state. Definition callout explaining what near-escape means without proof claims.
- **DataMethodology** (new): 4-card grid explaining what the engine catalogs, what data is stored, how AI observations work, and why no proof claim is made.
- **PriorWork** (new): Scope clarification notice, 4 focus-area cards, and a prior/related projects reference table citing Oliveira e Silva, BOINC, OEIS A006577, and the Lagarias bibliography.
- **page.tsx:** New 14-section order: Hero → Status → Visualizer → SequenceTrace → Records → AILog → PatternViews → NearEscape → DiscoveryFeed → About → DataMethodology → PriorWork → Contribute → Footer.
- **Admin layout + page:** "AI Notes Review" renamed to "Observations for Review" in sidebar, mobile nav, and admin dashboard card.

---

## Phase 2 Status — Complete

Phase 2 polishes the mobile-first design system so every page looks excellent on mobile, tablet, desktop, and ultrawide screens.

**What changed in Phase 2:**
- **Header:** Mobile layout rebuilt as a 3-column grid — hamburger | centred brand | theme toggle. No left-heavy mobile header. Desktop unchanged.
- **Hero:** Full-width CTA buttons on mobile (`w-full sm:w-auto`), improved spacing, scroll hint animation.
- **Status strip:** Redesigned with a dedicated "LIVE" status header row + 5-stat grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`). Updated stat labels to: Trajectories Catalogued, Current Catalog Range, Latest Batch Completed, Numbers Analyzed by This Engine, Records in This Dataset.
- **Trajectory Visualizer:** Scrollable tab row on mobile with `flex-shrink-0` tab buttons and 44px tap targets. Legend changed to 2-col grid on mobile. Placeholder copy updated ("Phase 3").
- **Sequence Trace:** Added "Current Rule" callout panel. Table wrapped in horizontal scroll container for narrow screens. Updated placeholder copy.
- **AI Research Log:** Added `"use client"` + active-tab state. Tabs changed to horizontal scroll row on mobile. Added human-review notice. Updated placeholder copy.
- **Pattern Views:** Added `"use client"` + active-tab state. Tabs horizontal scroll. Placeholder title reflects selected view. Updated copy.
- **Records Preview:** Added section heading with subtitle. Cards now show a subtle accent ring. Icon scaled up.
- **About Section:** Section heading centred with intro paragraph. Minor card spacing improvements.
- **Contribute Section:** Added section heading. Ko-fi button is `w-full` on mobile. Get-involved links have larger tap targets. Social links moved to contact row.
- **Footer:** Consistent centering on mobile. Social links added. Live status indicator.
- **Admin layout:** Added horizontally-scrollable mobile tab nav (visible below `lg`). Desktop sidebar unchanged. Content padding scaled to `lg:p-8`.
- **Admin pages:** Updated placeholder notices from "Phase 1" to "Phase 2". Updated footer note.
- **globals.css:** Added `.scroll-tabs`, `.tab-btn-active`, `.tab-btn-inactive`, `.no-scrollbar` component/utility classes. Added `scrollbar-gutter: stable` and `focus-visible` ring.

---

## Phase 1 Status — Complete

Phase 1 established the full app shell, brand foundation, and visual dashboard structure.

**Built in Phase 1:**
- Next.js 16 App Router with TypeScript
- Tailwind CSS v4 with dark/light theme toggle (dark default)
- Framer Motion animations
- Public homepage with all placeholder sections
- Admin shell at `/admin` and `/admin/login`
- Supabase client placeholder (env-gated, no keys committed)

---

## Responsive QA Notes

| Breakpoint | Layout behavior |
|---|---|
| `< 640px` (mobile) | Single-column stacking, centred brand in header, full-width buttons, horizontal-scroll tab rows, 2-col stats grid |
| `640px–1024px` (tablet) | 2–3 column grids, desktop header nav visible at `md` |
| `≥ 1024px` (desktop) | Full dashboard grids (up to 6 col), admin sidebar visible |
| `≥ 1280px` (ultrawide) | Max-width container (`max-w-7xl`) keeps content centred |

**Theme:**
- Default: dark mode
- Toggle: Sun/Moon icon in header (top-right on desktop, right cell on mobile)
- Persisted via `next-themes` with `attribute="class"`
- `suppressHydrationWarning` on `<html>` prevents flash

---

## Coming in Phase 3

- Live Collatz computation engine
- Real trajectory charts (Recharts / D3)
- Supabase schema and data persistence
- AI-assisted batch analysis notes (human-reviewed before publishing)
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
| Charts | Recharts / D3 (Phase 3) |
| Database | Supabase (Phase 3) |
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
