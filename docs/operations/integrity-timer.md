# Daily Integrity Timer

Phase 11 adds a persisted full-catalog integrity run. The timer below runs the
verification once per day and stores the summary in `collatz_integrity_runs`.

Prerequisites:

- Apply `supabase/phase-11-operational-monitoring.sql`.
- Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` in the server environment used by the service.
- Confirm the repository is deployed at `/opt/collatz` or adjust the
  `WorkingDirectory` below.

## `/etc/systemd/system/collatz-integrity.service`

```ini
[Unit]
Description=Collatz Engine full integrity verification
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/collatz
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run collatz:verify:persist
```

## `/etc/systemd/system/collatz-integrity.timer`

```ini
[Unit]
Description=Run Collatz Engine full integrity verification daily

[Timer]
OnCalendar=*-*-* 03:00:00 UTC
Persistent=true
Unit=collatz-integrity.service

[Install]
WantedBy=timers.target
```

## Install And Inspect

```bash
sudo systemctl daemon-reload
sudo systemctl enable collatz-integrity.timer
sudo systemctl start collatz-integrity.timer
sudo systemctl status collatz-integrity.timer
systemctl list-timers | grep collatz
journalctl -u collatz-integrity -n 100 --no-pager
```

## Manual Run

```bash
cd /opt/collatz
npm run collatz:verify:persist
```

The service observes catalog state and writes only the integrity run summary. It
must not restart the worker or mutate catalog result rows.
