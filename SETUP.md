# Setup

Runs on the N1 n8n instance (`~/.n8n-speed-to-lead`), so the HubSpot, Google Sheets and Anthropic credentials and the N1 error workflow (`n1ErrorHandler01`, published) must already exist. Demo portal and fictional firm only.

1. **Runtime.** `PATH=$HOME/.n8n-runtime/node_modules/.bin:$PATH N8N_USER_FOLDER=$HOME/.n8n-speed-to-lead n8n start` (editor at http://localhost:5678). CLI runs (`n8n import:workflow`, `n8n execute --id=...`) need n8n stopped.
2. **Sheet.** One spreadsheet with tabs `proposals` (A:M), `snapshots` (A:F), `run_log` (A:R). Its id is hardcoded in the `workflows/build-*.js` files. Headers: `workflows/dev-sheet-reset.json` and `dev-sheet-headers.json`; the accept/reject dropdown: `dev-sheet-dropdown.json`.
3. **HubSpot.** A contact property `demo_record` (text) and the service key credential. Every detector and the teardown only touch records marked `demo_record=true` or named `[demo] ...`.
4. **Build and import.** `for b in apply detect judge nightly; do node workflows/build-$b.js; done`, then `n8n import:workflow --input=workflows/<name>.json` for each, then `n8n publish:workflow --id=n2ApplyAccepted1` (and `n2DetectScan0001`, `n2JudgeBorderln01`, `n2Nightly0000001`). The three steps must be published before the nightly can call them. Re-importing un-publishes, so publish again.
5. **Schedule.** `n2Nightly0000001` runs at 02:00 server time while n8n is running; failures go to N1's error workflow.
6. **Google OAuth** is in Testing mode and lapses every 7 days: reconnect it in the editor (Credentials, Google Sheets account).
7. **Verify.** `scripts/eval.sh` with n8n stopped: offline gates, teardown, seed, one live nightly run, scoring (tuned and held-out apart). It clears the `proposals` tab and rewrites the `[demo]` records.

Known portal behaviour: HubSpot appears to fill `lifecyclestage` on create, so the two fixture tasks for a missing lifecycle stage (M006, M007) never show live; `detect/score.js` leaves them out.
