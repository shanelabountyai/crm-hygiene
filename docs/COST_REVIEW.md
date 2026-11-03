# Cost review (closure, 2026-11-03)

Baseline: n8n runs locally; no Vercel, Neon, or hosted DB. Only metered spend is the Anthropic API (`claude-sonnet-5-5`, borderline pairs only). Token spend per scan is not yet measured; the call count is (53 on a fresh scan, 74-proposal seed).

| Item | Can bill? | Verdict | Restore note |
|---|---|---|---|
| `n2Nightly0000001` schedule, 02:00 | Only while n8n is running; steady state re-judges only new/changed pairs, so most nights make ~0 calls | **keep** (learning project, runs only when n8n is up) | n/a |
| Claude judge calls (fresh scan: 53) | Yes, per call | **keep**; sure tier is rules-only by design | Re-measure: check the Anthropic console usage for the 2026-11-03 eval day and record it here |
| `eval.sh` live runs | Yes, a fresh scan's 53 calls each run | **keep, run deliberately** | Not in CI; do not schedule it |
| Throwaway every-minute error-alert test | Deleted | **off** | n/a |
| N1 error handler (Gmail alert) | Free | **keep** | n/a |
| Google Sheet / HubSpot portal | Free tier / existing portal | **keep** | n/a |
| Vercel, Neon, cron, uptime pings | None exist | n/a | n/a |

Anything left to restore: nothing was slowed or turned off.
