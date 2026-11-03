// Builds workflows/nightly.json: the one published workflow (PRD Flow). Apply what was accepted, then scan, then judge the new borderlines.
// A failure in any step fails the run and fires N1's error workflow. Usage: node workflows/build-nightly.js
const fs = require("fs"), path = require("path");
const step = (name, id, x) => ({ parameters: { source: "database", workflowId: { __rl: true, value: id, mode: "id" }, options: {} }, name, type: "n8n-nodes-base.executeWorkflow", typeVersion: 1.2, position: [x, 0], alwaysOutputData: true });
const nodes = [
  { parameters: { rule: { interval: [{ field: "days", daysInterval: 1, triggerAtHour: 2 }] } }, name: "Nightly 02:00", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [0, 0] },
  { parameters: {}, name: "Run once", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [0, 200] }, // CLI runs and eval can only start from a manual trigger
  step("Apply", "n2ApplyAccepted1", 200), step("Detect", "n2DetectScan0001", 400), step("Judge", "n2JudgeBorderln01", 600),
];
const link = (a, b) => [a, { main: [[{ node: b, type: "main", index: 0 }]] }];
// Apply goes first so a proposal accepted yesterday is written before the scan re-fingerprints its records.
const wf = { id: "n2Nightly0000001", name: "N2 nightly (apply, detect, judge)", active: false, settings: { executionOrder: "v1", errorWorkflow: "n1ErrorHandler01" }, pinData: {}, nodes,
  connections: Object.fromEntries([link("Nightly 02:00", "Apply"), link("Run once", "Apply"), link("Apply", "Detect"), link("Detect", "Judge")]) };
fs.writeFileSync(path.join(__dirname, "nightly.json"), JSON.stringify(wf, null, 2) + "\n");
