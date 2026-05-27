# Operational Monitoring

Phase 11 adds a worker health check, a public health API, a public status page,
and persisted full integrity runs. These commands are for operators only; do not
publish secrets or service credentials.

## Manual Health Check

```bash
cd /opt/collatz
npm run collatz:health
```

To also record a health event when the state changes, or when a critical
condition is observed:

```bash
npm run collatz:health:persist
```

Expected output examples:

```text
PASS Worker live, heartbeat 6s ago, catalog 831,000.
WARN Worker delayed, heartbeat 64s ago.
FAIL Worker stalled, heartbeat 241s ago.
INFO Worker stopped by status "stopped".
```

The health check observes and reports only. It does not restart the worker.

## Health Check Timer

`/etc/systemd/system/collatz-health.service`

```ini
[Unit]
Description=Collatz Engine worker health check
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/collatz
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run collatz:health:persist
```

`/etc/systemd/system/collatz-health.timer`

```ini
[Unit]
Description=Check Collatz Engine worker health every five minutes

[Timer]
OnCalendar=*:0/5
Persistent=true
Unit=collatz-health.service

[Install]
WantedBy=timers.target
```

Install:

```bash
sudo systemctl daemon-reload
sudo systemctl enable collatz-health.timer
sudo systemctl start collatz-health.timer
sudo systemctl status collatz-health.timer
systemctl list-timers | grep collatz
```

## Worker Logs

```bash
systemctl status collatz-worker
journalctl -u collatz-worker -n 100 --no-pager
```

## Integrity Run Logs

```bash
systemctl status collatz-integrity.timer
journalctl -u collatz-integrity -n 100 --no-pager
```

## Responding To A Stalled Worker

1. Inspect the public status page and health output.
2. Review recent worker logs:

```bash
systemctl status collatz-worker
journalctl -u collatz-worker -n 100 --no-pager
```

3. Confirm the worker command and environment are still correct.
4. Restart the worker only after checking logs:

```bash
sudo systemctl restart collatz-worker
systemctl status collatz-worker
npm run collatz:health
```

## Verification Commands

```bash
npm run collatz:verify
npm run collatz:verify:persist
```

Use `npm run collatz:verify` for a read-only full scan. Use
`npm run collatz:verify:persist` after the Phase 11 migration is applied and
service credentials are available to write the run summary.
