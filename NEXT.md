# Next

**Phase 1: scan, no writes.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

1. Tear down N1's leftover demo contacts first (`dev-teardown-hubspot` in speed-to-lead), or they show up as unlabelled duplicates.
2. Answer the PRD's open questions against the live portal: which values survive a contact merge (and the primary-record rule), and which property HubSpot fills for deal activity (`notes_last_updated` or `hs_last_sales_activity_timestamp`).
3. `fixtures/build.py`: seeded mess plus labels, expected outcomes computed from `rules/*.json`. Commit the held-out pairs BEFORE their first run.
4. Seed and teardown workflows, three rule-only detectors, `proposals` tab, run log.

Decided 2026-11-02 (Shane), also in the PRD's Decisions section:
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.

Runtime (from N1): `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs need n8n stopped. Google OAuth (Testing mode) lapses every 7 days and was last reconnected 2026-10-29, so it is due: test with a CLI run before trusting the UI's "connected".
