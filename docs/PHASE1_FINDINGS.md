# Phase 1 findings (live portal 246746597)

## Q1. Which values survive a contact merge? (probed 2026-11-02, `workflows/dev-probe-merge.json`)

Setup: A created first, B 3 s later, then A's `company` edited last. `POST /crm/v3/objects/contacts/merge` with A as primary.

| Field | A (primary, older) | B (secondary, newer) | After merge |
|---|---|---|---|
| firstname | Ann | Annie | **Ann** (primary wins over the newer value) |
| lead_score (custom) | 10 | 40 | **10** (primary wins) |
| company | Probe A Co (edited last) | Probe B Co | Probe A Co (edited last) |
| phone | 555-0101 | blank | 555-0101 |
| jobtitle | blank | CFO | **CFO** (blank on primary is filled from secondary) |
| email | probe-a@ | probe-b@ | probe-a@; probe-b@ moves to `hs_additional_emails` |
| lifecyclestage | opportunity | lead | opportunity |
| createdate | | | A's (older) |

**Rule:** the primary's value wins wherever it has one, whatever its age; the secondary only fills blanks. So choosing the primary decides which conflicting values are lost, and a proposal has to show those losing values before anyone accepts it. Default stays "older record is primary".

Not tested: lifecycle stage when the *secondary* is further down the funnel. HubSpot documents "furthest stage wins" for that field. Add it as a fixture case.

**Merge creates a new record id.** The response id (583298553583) is neither A's nor B's, and `hs_merged_object_ids` lists both of the old ids. A `GET` on either old id returns **200 with the new id**, not a 404. So:

- `already_merged` is detected as *returned id ≠ requested id*. A 404 check never fires.
- The stale check and the snapshot key on the id that comes back from the read, never on the id stored in the proposal.

## Q2. Which property measures deal activity?

The deal property is `notes_last_updated` ("Last Activity Date": note, call, email, meeting or task). `hs_last_sales_activity_timestamp` does not exist on deals in this portal (it is a contact property). `notes_last_contacted` ignores notes and tasks.

**Back-dating works** (probed 2026-11-02, `workflows/dev-probe-deal-activity.json`). The deal was created today, with an API note at `hs_timestamp` 2026-09-03 and a completed API task at 2026-09-18. Result: `notes_last_updated` = 2026-09-18T12:00:00Z, the latest engagement's `hs_timestamp` and not the time it was created. `num_notes` = 2, so both notes and tasks count. Fixtures can seed a stale deal by back-dating its engagements.

Two traps from the run:

- The N1 service key (HubSpot name `labintelligence`, id 55871605; n8n credential `HubSpot Service Key account`) had no deal scopes. `crm.objects.deals.read` and `crm.objects.deals.write` were added 2026-11-02. N1's SETUP.md lists the old scope set.
- `n8n execute` parks any Wait node over 65 s until a server resumes it, so the CLI run stops there and skips every node after it. Keep CLI waits at 60 s or less.
