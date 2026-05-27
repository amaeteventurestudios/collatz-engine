# Operations Checklist

This checklist is for maintainers operating the public Collatz Engine. It is not
public dashboard copy.

## Daily Checks

- Open `/status` and confirm engine status is live or intentionally stopped.
- Run `npm run collatz:health`.
- Confirm the latest full integrity verification is recent.
- Check that the public dashboard heartbeat and catalog size are advancing.
- Review recent operational events for warnings or critical entries.

## Weekly Checks

- Run `npm run collatz:verify`.
- Run `npm run collatz:verify:persist` after confirming service credentials.
- Review `journalctl -u collatz-worker -n 100 --no-pager`.
- Review `journalctl -u collatz-integrity -n 100 --no-pager`.
- Confirm export endpoints still return bounded public samples.

## After Deployment

- Run `npm run lint`, `npm run typecheck`, and `npm run build`.
- Confirm `/api/collatz/health` returns public-safe JSON.
- Confirm `/api/collatz/integrity/latest` handles the latest run or empty state.
- Open `/status` and the dashboard in desktop and mobile widths.
- Check that public UI does not mention private infrastructure providers.

## If Worker Stalls

- Run `npm run collatz:health`.
- Inspect the worker service:

```bash
systemctl status collatz-worker
journalctl -u collatz-worker -n 100 --no-pager
```

- Confirm the engine state does not report a last error.
- Restart only after reviewing logs:

```bash
sudo systemctl restart collatz-worker
npm run collatz:health
```

## If Integrity Verification Fails

- Save the terminal output from `npm run collatz:verify`.
- Do not edit `collatz_results` or `collatz_engine_state` directly.
- Check which invariant failed: row count, duplicate values, missing ranges,
  state/catalog consistency, record consistency, or heartbeat freshness.
- Run the verification again after the worker completes any in-flight batch.
- If failure persists, pause worker processing before investigating data repair.

## If Duplicate Or Missing Ranges Are Detected

- Stop the worker before making any repair plan.
- Export the failure summary from the latest persisted integrity run.
- Identify the smallest affected range.
- Recompute only the affected range in a controlled environment.
- Re-run `npm run collatz:verify` before resuming the worker.

## If An API Endpoint Fails

- Check build output and server logs.
- Test the endpoint locally:

```bash
curl http://localhost:3000/api/collatz/health
curl http://localhost:3000/api/collatz/integrity/latest
curl http://localhost:3000/api/collatz/state
```

- Confirm required environment variables are present in the runtime.
- Confirm no response leaks stack traces or secrets.

## If Dashboard Shows A Stale Heartbeat

- Compare `/status`, `/api/collatz/health`, and `npm run collatz:health`.
- Inspect `systemctl status collatz-worker`.
- Check whether the worker is stopped intentionally.
- Restart the worker only if logs indicate it is safe to do so.
