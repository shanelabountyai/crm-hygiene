# Next

**Phase 1: scan, no writes.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

Done 2026-11-02: N1 teardown, PRD Q1/Q2 answered, `fixtures/build.py` + `rules/*.json` + `fixtures/n2-fixtures.json` (held-out pairs committed before any run). Details and three fixture decisions: `docs/PHASE1_FINDINGS.md` → Fixtures.

**Pick up here:**

N2 sheet created 2026-11-03: https://docs.google.com/spreadsheets/d/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/edit (ID `1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw`). One tab, `Sheet1`, header row only: rename it `proposals`, add `snapshots` and `run_log` tabs, add the accept/reject dropdown on `decision`.

1. **Seed done 2026-11-03.** Portal holds 161 contacts (`demo_record=true`), 12 `[demo]` deals, 11 back-dated notes, company CO1 (Larkspur Analytics, 1 associated contact: M004, so contact->company type 1 works). The companies scope fix took effect once saved on key 55871605 (`labintelligence`). CO1 and M004 were added by a one-off run, so a clean re-seed is teardown then `workflows/seed.json`. `workflows/teardown.json` takes several minutes (3 passes, 20 s settles) and lacks tasks. Checked 2026-11-03: all 12 deals' `notes_last_updated` match `idle_days` (seed time 19:17Z); D10 has none, as intended.
2. (superseded: teardown is above)
3. Rule-only detectors DONE (`detect/detect.js`, gate `node detect/check.js` green). Remaining: the n8n detect workflow, the `proposals` tab and the run log.

Done 2026-11-02 (Shane decided): added the shared-phone case (father and son on one home line, two Nguyens on one office line) to `fixtures/build.py` as labelled not-duplicate pairs. This fails the gate on purpose until the sure rule also requires first name or email to match. Still to do: copy this decision into the PRD's Decisions section (artifact).

Decided 2026-11-02 (Shane), also in the PRD's Decisions section:
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.

Runtime (from N1): `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs need n8n stopped. Google OAuth (Testing mode) lapses every 7 days and was last reconnected 2026-10-29, so it is due: test with a CLI run before trusting the UI's "connected".

Loose ends in n8n (harmless): one parked execution of `n2DevProbeDeal001` resumes on the next `n8n start`, then 404s on already-archived records. Throwaway workflow `n2TmpCleanup0001` can be deleted in the editor. The merge probe's leftover demo contact has `demo_record=true`, so the next teardown removes it.
