# Next

**Phase 3 (Apply) DONE 2026-11-03. Next: Capstone.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

(The PRD numbers phases 1 Scan, 2 Borderline judging, 3 Apply, 4 Capstone; earlier notes called Apply "Phase 2".)

N2 sheet: https://docs.google.com/spreadsheets/d/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/edit (tabs `proposals` A:M, `snapshots` A:F, `run_log` A:R).

**Pick up here: Capstone** (PRD Phasing 4): one published nightly workflow = apply then scan then judge (PRD Flow), N1 error workflow attached, an error alert from a scheduled run, `scripts/eval.sh` (P0-10: teardown, seed, scan, score; tuned and held-out reported apart), SETUP.md, DEMO.md. Then the closure deliverables (CLAUDE.md: DEMO.md, exec brief, LinkedIn posts, cost review).

## Done 2026-11-03 (this session)
- **Sure tier is email-only (Shane decided).** Walter Brennan Sr/Jr share first, last and phone, so no phone rule can be sure. Shared phone now goes borderline; the judge called all 8 real phone pairs `likely_duplicate`, Walter `unsure`, the Nguyens `likely_not_duplicate`. `known_fail` is retired; `detect/check.js` has zero sure-tier false merges. PRD updated.
- **Apply:** `node workflows/build-apply.js` builds `workflows/apply.json` (id `n2ApplyAccepted1`). Logic in `detect/apply.js` (pure), gate `node detect/check-apply.js`. One proposal per loop pass: GET each record (a merged-away id answers with the survivor), decide (`stale_skipped` / `already_merged` / `guard_refused` / apply), full-property batch read, snapshot row, HubSpot write, status + applied_at. A snapshot append failure stops the run before the write. Tasks are subject `[demo] ...`, owner from the record or 95417437.
- **Stale check = fingerprint** in column M (`basis`), not `hs_lastmodifieddate` (decision in PRD). Detect upserts: reopens `stale_skipped` rows and rejected rows whose fingerprint changed; everything else is left alone.
- Judge chunks its HubSpot batch read (53 borderline pairs = 106 contacts broke the 100-id read).
- Teardown archives `[demo]` tasks first (regenerated from `fixtures/gen_seed.py`; not run since).
- **Live verification (CLI runs):** reset sheet, scan 74 rows (11 sure, 53 borderline), judge 53, rescan adds 0. Covering test set (`workflows/dev-mark-test.json`): apply run 1 = 9 applied (2 merges: Jonah Pierce, Dana Whitfield; 3 fills; 3 missing-field tasks; 1 stale-deal task), 1 stale_skipped (contact edited after scan by `dev-edit-stale.json`), 1 rejected, 11 snapshot rows each before its write. Run 2 after `dev-reopen-row2.json` = 1 already_merged, no writes. Rescan reopens the stale row with a new fingerprint and adds nothing (159 contacts).

## Portal state now
Two demo merges and 4 `[demo]` tasks are live; contact 584012675772's jobtitle was edited. A clean slate is teardown, then `workflows/seed.json`, then clear the sheet with `dev-sheet-reset.json` (re-seeding changes HubSpot ids).

## Known limits (ponytail notes in code)
- No accepted rows means apply writes no run_log row (the Capstone's single workflow logs every run).
- A fill's derived value is not in its fingerprint: if the source deal's owner changes after the scan, apply writes the old value.
- A write that succeeds but whose status write fails is retried as a new attempt next run (a task could be created twice).

## Runtime (from N1)
`PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs (`n8n import:workflow` then `n8n execute --id`) need n8n stopped. Google OAuth (Testing mode) lapses every 7 days: reconnected 2026-10-29, verified working by CLI runs 2026-11-03, so expect it to lapse around 2026-11-05.

## Decided (Shane), also in the PRD
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.
- Sure tier is email-only (2026-11-03).
