#!/usr/bin/env bash
# The N2 eval, one command (PRD P0-10): offline gates, then teardown, seed, a live nightly run, and scoring against the fixture labels,
# tuned and held-out reported apart. Exits 1 on any failure. Live side effects: [demo] records in the portal and rows in the N2 sheet
# (the whole proposals tab is cleared), 53-ish Claude calls. n8n must be stopped (CLI runs clash with a server on port 5679).
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.n8n-runtime/node_modules/.bin:$PATH" N8N_USER_FOLDER="$HOME/.n8n-speed-to-lead"
if lsof -ti :5678 -ti :5679 > /dev/null; then echo "n8n is running: stop it first"; exit 2; fi
out=eval-out; mkdir -p "$out"
step() { echo "-- $1"; shift; "$@" > "$out/step.log" 2>&1 || { echo "FAILED: see $out/step.log"; grep -v PostHog "$out/step.log" | tail -20; exit 1; }; }
run() { echo "-- run $1"; n8n execute --id="$2" > "$out/$1.txt" 2>&1 || { echo "FAILED: see $out/$1.txt"; grep -v PostHog "$out/$1.txt" | tail -20; exit 1; }; }

step "offline gates" sh -c 'node detect/check.js && node detect/check-apply.js'
step "build workflows" sh -c 'for b in apply detect judge nightly eval-dump; do node workflows/build-$b.js; done'
for f in apply detect judge nightly dev-eval-dump dev-sheet-reset seed teardown; do step "import $f" n8n import:workflow --input="workflows/$f.json"; done
step "publish" sh -c 'for id in n2ApplyAccepted1 n2DetectScan0001 n2JudgeBorderln01 n2Nightly0000001; do n8n publish:workflow --id=$id; done'
run teardown n2TeardownDemo01
run seed n2SeedDemo000001
run sheet-reset n2DevSheetReset01
run nightly n2Nightly0000001
run dump n2DevEvalDump001
node detect/score.js "$out/dump.txt"
