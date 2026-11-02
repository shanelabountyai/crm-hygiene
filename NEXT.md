# Next

**Phase 1: scan, no writes.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

Done 2026-11-02: N1 teardown, PRD Q1/Q2 answered, `fixtures/build.py` + `rules/*.json` + `fixtures/n2-fixtures.json` (held-out pairs committed before any run). Details and three fixture decisions: `docs/PHASE1_FINDINGS.md` → Fixtures.

**Pick up here:**

1. Seed workflow from `fixtures/n2-fixtures.json`: contacts in list order (a before b), `demo_owner` → config `hubspot_owner_id`, `demo_record=true`, company CO1 plus its association, `[demo]` deals with one note back-dated by `idle_days`. First check the 5 `seed_check: hubspot_email_unique` pairs; on a 409, drop them and record the decision.
2. Teardown: also archive `[demo]` deals and their notes and tasks, and demo companies (`*.example.com` domain).
3. Three rule-only detectors (port `tier`/`blocks` from build.py; blocking includes company name), the `proposals` tab, and the run log.

Open, for Shane: the sure rule (same phone and same last name) would merge a father and son on one home line, or two Nguyens on one office line. None of the fixtures cover that. Decide whether to add the case, which fails the gate by design until the rule changes.

Decided 2026-11-02 (Shane), also in the PRD's Decisions section:
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.

Runtime (from N1): `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs need n8n stopped. Google OAuth (Testing mode) lapses every 7 days and was last reconnected 2026-10-29, so it is due: test with a CLI run before trusting the UI's "connected".

Loose ends in n8n (harmless): one parked execution of `n2DevProbeDeal001` resumes on the next `n8n start`, then 404s on already-archived records. Throwaway workflow `n2TmpCleanup0001` can be deleted in the editor. The merge probe's leftover demo contact has `demo_record=true`, so the next teardown removes it.
