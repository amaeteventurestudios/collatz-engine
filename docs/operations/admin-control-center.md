# Admin Control Center — Operations Guide

Private operations console for The Collatz Engine. Phase 1 covers the monitoring foundation.

---

## How to log in

Navigate to `/admin/login`. Enter the username and password from your `.env.local`.

- Credentials are verified server-side only using a constant-time comparison.
- A signed HTTP-only session cookie (`__admin_sess`) is issued on success, valid for 24 hours.
- The cookie is HMAC-SHA256 signed and cannot be forged without the server secret.
- Wrong credentials redirect back to `/admin/login?error=invalid`.
- Logout is available via the sidebar and the top-right button.

---

## Required environment variables

Set these in `.env.local` (local) or Vercel project settings (production):

```
ADMIN_USERNAME=           # Admin login username
ADMIN_PASSWORD=           # Admin login password (keep strong)
```

Never commit real values. `.env.local` is git-ignored.

### Optional — Supabase metrics

```
SUPABASE_METRICS_ENABLED=false
SUPABASE_METRICS_USERNAME=
SUPABASE_METRICS_PASSWORD=
```

If unset, the admin dashboard falls back to table row-count estimates for storage monitoring. The dashboard still works.

### Optional — Cloudflare R2

```
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_ENDPOINT=
CLOUDFLARE_R2_PUBLIC_BASE_URL=
```

All R2 credentials are server-side only. They are never exposed to the browser.

---

## What the admin panel monitors (Phase 1)

### Engine Status
- Current number being processed
- Total numbers checked
- Engine status (running / paused / stopped)
- Throughput (numbers/second)
- Worker heartbeat age
- Highest peak and longest sequence

### Database Storage Monitor
- Estimated usage vs Supabase free-tier 2 GB limit
- Visual gauge and usage bar
- Storage threshold status (Safe / Watch / Warning / Critical / Pause Required)

### Table Size Estimates
Row counts and estimated byte sizes for:
- `collatz_results`
- `collatz_activity_logs`
- `collatz_range_summaries`
- `collatz_record_events`
- `collatz_archive_manifests`
- `collatz_engine_state`
- `collatz_engine_runtime_config`
- `collatz_integrity_runs`

Tables that haven't been created yet show "Not created" without crashing.

### Throughput Graph
SVG line chart of numbers/second history from `collatz_activity_logs`. Shows "No throughput history yet" if no data exists.

### Supabase Health
- Database connected / disconnected
- Last successful read timestamp
- Storage state
- Metrics panel status (configured or using estimates)

### Cloudflare R2 Panel
- R2 configured: yes/no
- Bucket name, endpoint, public base URL configured status
- Archive enabled, format, delete-after-upload setting

### Runtime Config Preview
Current engine configuration from environment variables:
- mode, batch_size, batch_delay_ms, log_interval_ms
- storage_mode, keep_recent_results, activity_log_retention_rows
- range_summary_interval, milestone_interval
- auto_throttle_enabled, pause_on_critical_storage

Mode preset cards: Recovery / Safe / Normal

### Archive / Retention
Configuration display for archive and retention settings.

### Health / Errors
Recent activity log entries from `collatz_activity_logs`.

### System Health Footer
Status indicators for: Supabase Database, Supabase Storage, Vercel Deployment, API Routes, Engine Worker, Cloudflare R2, Cron Schedules, Archive Pipeline.

---

## Phase 1 — what is NOT available yet

The following actions are shown as disabled buttons labeled with their phase:

| Action | Phase |
|---|---|
| Pause / Resume Engine | Phase 2 |
| Stop Engine | Phase 2 |
| Apply runtime config preset | Phase 2 |
| Test R2 Connection (live) | Phase 2 |
| Run Cleanup | Phase 2/3 |
| Run Archive Export | Phase 2/3 |
| Run Maintenance | Phase 2/3 |
| Integrity scan | Phase 2 |
| Worker restart from web | Requires local worker |

Phase 1 is read-only. No destructive actions run automatically.

---

## Storage thresholds

| Status | Estimated Usage | Action |
|---|---|---|
| Safe | < 1.2 GB | None required |
| Watch | 1.2 – 1.5 GB | Monitor closely |
| Warning | 1.5 – 1.8 GB | Consider cleanup |
| Critical | 1.8 – 1.9 GB | Prioritize cleanup |
| Pause Required | > 1.9 GB | Stop engine, archive, cleanup |

---

## Supabase / R2 safety notes

- `SUPABASE_SERVICE_ROLE_KEY` is used server-side only for admin metrics. It is never sent to the browser.
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` and all R2 credentials are server-side only.
- `ADMIN_PASSWORD` is never logged or returned in any API response.
- No destructive SQL runs automatically in Phase 1.
- `collatz_engine_state` is protected — it is never deleted or reset.

---

## No secrets committed

- `.env.local` is git-ignored.
- `.env.example` contains only placeholder values.
- Admin credentials are never hardcoded in source files.
- All privileged logic runs server-side in `lib/admin/` and `app/admin/actions.ts`.
