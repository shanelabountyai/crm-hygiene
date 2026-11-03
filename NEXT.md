# Next

**Phase 1: scan, no writes.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

Done 2026-11-02: N1 teardown, PRD Q1/Q2 answered, `fixtures/build.py` + `rules/*.json` + `fixtures/n2-fixtures.json` (held-out pairs committed before any run). Details and three fixture decisions: `docs/PHASE1_FINDINGS.md` → Fixtures.

**Pick up here:**

Google OAuth verified 2026-11-03 (CLI run of `n2DevSheetHeaders1` wrote the `snapshots` and `run_log` headers; credential `McOy4auCNkFX0Os2`; n8n was stopped, start it again when needed). Tabs `proposals`, `snapshots`, `run_log` all exist with headers; `decision` dropdown done.

N2 sheet: https://docs.google.com/spreadsheets/d/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/edit (ID `1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw`), three tabs.

1. **Seed done 2026-11-03.** Portal holds 161 contacts (`demo_record=true`), 12 `[demo]` deals, 11 back-dated notes, company CO1 (Larkspur Analytics, 1 associated contact: M004, so contact->company type 1 works). The companies scope fix took effect once saved on key 55871605 (`labintelligence`). CO1 and M004 were added by a one-off run, so a clean re-seed is teardown then `workflows/seed.json`. `workflows/teardown.json` takes several minutes (3 passes, 20 s settles) and lacks tasks. Checked 2026-11-03: all 12 deals' `notes_last_updated` match `idle_days` (seed time 19:17Z); D10 has none, as intended.
2. (superseded: teardown is above)
3. **Detect workflow DONE 2026-11-03.** `node workflows/build-detect.js` builds `workflows/detect.json` (id `n2DetectScan0001`: 3 paginated HubSpot reads, existing proposal ids from the sheet, one Code node = `detect.js` + `rules/*.json`, append to `proposals` and `run_log`; no HubSpot writes). Scoped to `demo_record=true` contacts and `[demo]` deals (portal also holds real records). CLI run: 161 contacts, 12 deals, 74 proposals (64 merges: 21 sure incl. the 2 known_fail, 43 borderline; 3 fills, 3 missing_task, 4 stale_task). Rerun adds 0 rows (ids are the dedupe key). Gap vs fixtures: the two `lifecyclestage` missing_task proposals (M006, M007) cannot exist live because HubSpot auto-sets lifecyclestage on create. Sheet holds the 74 rows from that run; re-seeding changes HubSpot ids, so clear `proposals!A2:K` and `run_log!A2:L` first. **Dropdown + judge DONE 2026-11-03.** `workflows/dev-sheet-dropdown.json` (id `n2DevSheetDrop001`) put an accept/reject list on `proposals!J2:J` (one-off, already run). `node workflows/build-judge.js` builds `workflows/judge.json` (id `n2JudgeBorderln01`: reads proposals, HubSpot batch-reads the two contacts per borderline merge with no rationale, `claude-sonnet-5-5` via credential `iX5UtPD5bryOqgFt`, writes `verdict: reason` to column I; touches no HubSpot and not `decision`). CLI run filled 43 rows: 17 likely_duplicate, 19 likely_not_duplicate, 7 unsure. Rerun skips rows that already have a rationale. **Judge vs fixture labels (checked 2026-11-03, all 43 labelled):** 0 of 19 true non-duplicates called duplicate; 17 of 24 true duplicates called duplicate, 5 unsure, 2 missed as not-duplicate (both `married_name_phone`: T057/T058, T059/T060 — different last names, shared phone). Errors lean safe (unsure or miss, never a false merge). Remaining in Phase 1: copy the shared-phone decision into the PRD artifact, a schedule trigger if wanted. Phase 2 (apply accepted proposals with a `snapshots` before-image) is next after that.

Done 2026-11-02 (Shane decided): added the shared-phone case (father and son on one home line, two Nguyens on one office line) to `fixtures/build.py` as labelled not-duplicate pairs. This fails the gate on purpose until the sure rule also requires first name or email to match. Still to do: copy this decision into the PRD's Decisions section (artifact).

Decided 2026-11-02 (Shane), also in the PRD's Decisions section:
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.

Runtime (from N1): `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs need n8n stopped. Google OAuth (Testing mode) lapses every 7 days and was last reconnected 2026-10-29, so it is due: test with a CLI run before trusting the UI's "connected".

Loose ends in n8n (harmless): one parked execution of `n2DevProbeDeal001` resumes on the next `n8n start`, then 404s on already-archived records. Throwaway workflow `n2TmpCleanup0001` can be deleted in the editor. The merge probe's leftover demo contact has `demo_record=true`, so the next teardown removes it.
