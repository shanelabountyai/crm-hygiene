# Next

**Phase 1: scan, no writes.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

Done 2026-11-02: N1 teardown run (0 demo contacts left), and PRD questions 1 and 2 answered and ticked in the PRD (`docs/PHASE1_FINDINGS.md`). Q3 (rejected pair comes back on change) stays a default.

**Pick up here:**

1. `fixtures/build.py`: seeded mess plus labels (merge cases cover: conflicting values where the primary wins, a blank filled from the secondary, an extra email, and the untested case where the secondary has the later lifecycle stage; stale deals seeded by back-dating `hs_timestamp`), expected outcomes computed from `rules/*.json`. Commit the held-out pairs BEFORE their first run.
2. Seed and teardown workflows (teardown must also archive `[demo]` deals plus their notes and tasks; N1's teardown only covers contacts), three rule-only detectors, `proposals` tab, run log.

Decided 2026-11-02 (Shane), also in the PRD's Decisions section:
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.

Runtime (from N1): `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs need n8n stopped. Google OAuth (Testing mode) lapses every 7 days and was last reconnected 2026-10-29, so it is due: test with a CLI run before trusting the UI's "connected".

Loose ends in n8n (harmless): one parked execution of `n2DevProbeDeal001` resumes on the next `n8n start`, then 404s on records that are already archived (that workflow has no error handler, so no alert fires). Throwaway workflow `n2TmpCleanup0001` can be deleted in the editor. The demo contact left by the merge probe has `demo_record=true`, so the next teardown removes it.
