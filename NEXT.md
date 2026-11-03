# Next

**Capstone DONE 2026-11-03. Remaining: closure only.** PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg

N2 sheet: https://docs.google.com/spreadsheets/d/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/edit (tabs `proposals` A:M, `snapshots` A:F, `run_log` A:R).

## Done this session
- `workflows/nightly.json` (`n2Nightly0000001`, built by `build-nightly.js`): schedule 02:00 plus a manual trigger for CLI runs, then Apply, Detect, Judge as Execute Workflow nodes; `errorWorkflow: n1ErrorHandler01`. The three sub-workflows now start from an execute-workflow trigger (the CLI still runs them). Verified by CLI: all three steps succeed.
- `scripts/eval.sh` (live, n8n stopped): offline gates, teardown, seed, sheet reset, nightly, dump (`dev-eval-dump.json`), `detect/score.js`. Result: **EVAL PASS**, 74 proposals, sure tier has zero wrong merges, borderline tuned TP 24 / FP 15 / FN 0, held-out TP 8 / FP 6 / FN 0, judge decided 32/39 tuned and 10/14 held-out (unsure counts as undecided). The FPs are the shared-phone pairs by design; the judge is what separates them.
- SETUP.md.

## Left
1. **Error alert from a scheduled run: VERIFIED 2026-11-03.** A published every-minute throwaway with `errorWorkflow: n1ErrorHandler01` failed; the handler ran (success) and its "Alert owner" Gmail node executed (execution data). Mailbox receipt not checked. Throwaway deleted.
2. **DEMO.md DONE, apply step verified by hand-accepted rows 2026-11-03** (2 merges applied, 1 rejected; portal now holds those 2 merges; fresh slate = `scripts/eval.sh`). The dropdown on column J had to be re-applied once (`n2DevSheetDrop001`); consider adding it to `scripts/eval.sh` after the sheet reset.
3. **Closure** (CLAUDE.md): cost review DONE -> docs/COST_REVIEW.md (Anthropic spend per scan still unmeasured). Exec brief DONE 2026-11-03: **CRM Hygiene in Brief** https://claude.ai/artifact/HGD5yud5GTFUkPbrpaJBB6 (shared 2026-11-03). Remaining: LinkedIn posts in the Ledger (mine the Brennan sure-rule failure and the timestamp-vs-fingerprint stale check first).

## Artifacts
- PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg
- Exec brief: https://claude.ai/artifact/HGD5yud5GTFUkPbrpaJBB6

## Portal state now
Freshly seeded by eval.sh and scanned; the sheet holds 74 pending proposals with judge rationale; nothing applied.

## Known limits (ponytail notes in code)
- No accepted rows means apply writes no run_log row.
- A fill's derived value is not in its fingerprint: if the source deal's owner changes after the scan, apply writes the old value.
- A write that succeeds but whose status write fails is retried as a new attempt next run (a task could be created twice).

## Decided (Shane), also in the PRD
- Review surface = Sheet tab with an accept/reject dropdown; accepted proposals applied, merges included, after a before-image goes to `snapshots`.
- Rules find candidates; Claude judges only borderline pairs. Sure tier is email-only (2026-11-03).
- Same HubSpot portal as N1; n8n like N1, not a saas foundation clone; no web port.
