# Next

**Phase 1: scan, no writes.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

Done 2026-11-02: N1 teardown, PRD Q1/Q2 answered, `fixtures/build.py` + `rules/*.json` + `fixtures/n2-fixtures.json` (held-out pairs committed before any run). Details and three fixture decisions: `docs/PHASE1_FINDINGS.md` → Fixtures.

**Pick up here:**

1. Seed workflow: **run once 2026-11-03, partial.** Portal now holds 165 contacts (`demo_record=true`), 12 `[demo]` deals, 11 notes. Failures: (a) company CO1 got 403, the service key lacks `crm.objects.companies.write` (Shane adds it; also needs `.read` for teardown), so M004 failed too; (b) HubSpot refuses a second contact whose email matches case-insensitively: T002, T004, T072, T088 refused; T085 (Lena, info@ballastcoffee) failed for an unknown reason while T086 (Marco) was created. Association ids 3/1/214 for deal->contact and note->deal worked (12 deals, 11 notes OK); contact->company untested. Next: scope added, teardown (item 2), full re-seed, and decide the 5 `seed_check` pairs (drop them; the shared-inbox and email-case cases cannot exist in HubSpot).
2. Teardown (decided 2026-11-03: find deals by the `[demo]` name prefix and companies by `*.example.com` domain; no `demo_record` on deals/companies): also archive `[demo]` deals and their notes and tasks, and demo companies (`*.example.com` domain).
3. Three rule-only detectors (port `tier`/`blocks` from build.py; blocking includes company name), the `proposals` tab, and the run log.

Done 2026-11-02 (Shane decided): added the shared-phone case (father and son on one home line, two Nguyens on one office line) to `fixtures/build.py` as labelled not-duplicate pairs. This fails the gate on purpose until the sure rule also requires first name or email to match. Still to do: copy this decision into the PRD's Decisions section (artifact).

Decided 2026-11-02 (Shane), also in the PRD's Decisions section:
- Review surface = Sheet tab with an accept/reject dropdown.
- Accepted proposals are applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs.
- Same HubSpot portal as N1, seeded mess behind the demo guard.
- n8n like N1, not a saas foundation clone; no web port claimed.

Runtime (from N1): `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start`, editor at http://localhost:5678. CLI runs need n8n stopped. Google OAuth (Testing mode) lapses every 7 days and was last reconnected 2026-10-29, so it is due: test with a CLI run before trusting the UI's "connected".

Loose ends in n8n (harmless): one parked execution of `n2DevProbeDeal001` resumes on the next `n8n start`, then 404s on already-archived records. Throwaway workflow `n2TmpCleanup0001` can be deleted in the editor. The merge probe's leftover demo contact has `demo_record=true`, so the next teardown removes it.
