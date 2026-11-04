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

## Fixtures (`fixtures/build.py`, 2026-11-02)

171 contacts, 12 deals, 82 labelled pairs (62 tuned, 20 held-out), 58 expected proposals. **Now (2026-11-04): 161 contacts, 12 deals, 77 pairs, 55 expected proposals**, after the email-unique pairs were dropped. Two tuned pairs (`known_fail: sure_rule_shared_phone`: father and son on one home line, two Nguyens on one office line) fail the sure-tier gate on purpose; they stay failing until the sure rule also needs a first-name or email match (Shane, 2026-11-02). **Superseded 2026-11-03 (Shane):** a first-name rule still merges the Brennans, so the sure tier is now email-only and both pairs are borderline; `known_fail` is retired. Rules live in `rules/` (`match`, `nicknames`, `required_fields`, `stale`). The builder runs the detectors in Python over every seeded record and refuses to write the file if a sure-tier pair is labelled as two different people, or if two records from different cases would match each other.

- **Company name is a fourth blocking key.** The PRD named last name, phone and email domain. A first name plus company name match (Laura Kim / Laura Benson, both at Pinecrest Dental) tiers as borderline but shares none of those keys, so the detector would never compare the pair. The builder asserts that every tiered pair shares a blocking key.
- **The PRD's "same name, different company, different phone" row is not a candidate.** It has no second signal under the rule table, so it gets no proposal. That is still the right outcome, because the label is "different people".
- **Five tuned pairs depend on HubSpot accepting a second contact whose email matches one already stored**, ignoring case: the case-variant pairs and the shared `info@`/`sales@`/`hello@` inboxes (`seed_check: hubspot_email_unique`). If the seed step gets a 409, drop those pairs by a recorded decision. None of the held-out pairs depend on this.
- **Expected values that haven't been verified:** when the secondary record has the later lifecycle stage, the expected result follows HubSpot's documented "furthest stage wins" rule. Three merges carry `unverified` until a probe confirms it.
