# Demo script: N2 CRM Hygiene

Tallgrass Advisory is fictional and every record is marked `[demo]` or `demo_record=true`. Nothing here touches a real contact.

## Before you start
- n8n **stopped** for CLI steps, **running** for editor steps. Start: `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start` (http://localhost:5678).
- Google OAuth lapses every 7 days (last reconnected 2026-10-29): if a Sheets node says unauthorized, reconnect it under Credentials.
- Sheet: https://docs.google.com/spreadsheets/d/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/edit . Credentials live in n8n (HubSpot service key, Google Sheets, Anthropic), none in the repo.
- Fresh slate, n8n stopped: `scripts/eval.sh` (teardown, seed, nightly run, scoring; about 10 minutes, ends `EVAL PASS`).

## Screens
1. **The mess (HubSpot).** Contacts filtered to `demo_record = true`: 161 seeded records, near-duplicates, missing owners and companies, 12 deals. Say: this is what a CRM looks like after two years.
2. **The proposals tab.** After a run, 74 rows, each with a kind (merge, fill, missing_task, stale_task), the records, a tier and a Claude rationale on borderline merges. Say: rules find candidates; Claude only judges the doubtful pairs; nothing has changed in HubSpot yet.
3. **The decision.** Set a few rows to `accept` (use the dropdown) and one to `reject`. Say: a person decides, including merges.
4. **Apply.** n8n stopped: `n8n execute --id=n2ApplyAccepted1`, or let the 02:00 nightly do it. Check `snapshots` (a before-image per record, written before every write), `proposals` columns K:L (status, applied_at) and the `[demo]` tasks in HubSpot.
5. **The nightly.** Editor, workflow "N2 nightly (apply, detect, judge)": apply, then scan, then judge. A rescan adds nothing for rows already handled; a record edited after the scan comes back as `stale_skipped` and is reopened with a new fingerprint.
6. **Failure path.** The nightly names N1's error workflow; a failing scheduled run sends the alert email (verified 2026-11-03 with a throwaway).
7. **The numbers.** `scripts/eval.sh` output: tuned and held-out reported apart; sure tier makes zero wrong merges; borderline recall 100% on both sets, with the shared-phone and same-company pairs as the false positives the judge exists to sort.

## Commands run and checked (2026-11-03)
`scripts/eval.sh` (EVAL PASS), `n8n execute --id=n2Nightly0000001` (exit 0, three steps succeeded), forced-failure alert path. **Not yet re-run for this script:** step 4 against rows accepted by hand in the sheet (it was verified earlier with a marked test set, see NEXT history).

## Concede before you're asked
- Synthetic data, one fictional firm, one HubSpot portal; not deployed (n8n runs on a laptop).
- Missing-lifecyclestage tasks never fire live: HubSpot appears to fill it on create (inferred, not proven).
- The judge answers `unsure` on a few pairs (32 of 39 decided on tuned, 10 of 14 held-out); a person still decides.
- Borderline false positives are by design; precision is the review queue's job.
- Google OAuth is in Testing mode and lapses weekly; a nightly with no accepted rows writes no apply log row.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| "n8n is running: stop it first" | CLI runs clash on port 5679; stop the server |
| Sheets node unauthorized | OAuth lapsed; reconnect in Credentials |
| Seed count mismatch in scoring | A create was refused (409); re-run `eval.sh` (teardown first) |
| Nightly step "not active" | Re-importing un-publishes; `n8n publish:workflow --id=<id>` |
