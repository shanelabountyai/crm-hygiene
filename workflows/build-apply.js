// Builds workflows/apply.json: applies accepted proposals (PRD P0-6). One proposal per loop pass: re-read its records, decide, snapshot, write, then status.
// Usage: node workflows/build-apply.js
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
const rd = n => fs.readFileSync(path.join(root, n), "utf8");
const lib = rd("detect/detect.js").replace(/module\.exports = .*/, "") + rd("detect/apply.js").replace(/^const \{ basis, objectOf \} = require.*$/m, "").replace(/module\.exports = .*/, "");
const OWNER = "95417437"; // the portal's only owner, as in fixtures/gen_seed.py
const SHEET = "https://sheets.googleapis.com/v4/spreadsheets/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/values";
const API = "https://api.hubapi.com/crm/v3/";
const hcred = { hubspotAppToken: { id: "u1WBi64R7zas6Zfn", name: "HubSpot Service Key account" } }, gcred = { googleSheetsOAuth2Api: { id: "McOy4auCNkFX0Os2", name: "Google Sheets account" } };
let x = 0;
const node = (name, type, parameters, extra = {}) => ({ parameters, name, type, typeVersion: type.endsWith("httpRequest") ? 4.2 : type.endsWith("code") ? 2 : 1, position: [(x += 200), 0], ...extra });
const code = (name, js, extra) => node(name, "n8n-nodes-base.code", { jsCode: js }, extra);
const http = (name, cred, params, extra = {}) => node(name, "n8n-nodes-base.httpRequest", { authentication: "predefinedCredentialType", nodeCredentialType: Object.keys(cred)[0], ...params }, { credentials: cred, ...extra });
const hs = (name, params, extra) => http(name, hcred, params, extra);
const gs = (name, params, extra) => http(name, gcred, params, extra);
const json = (method, url, body) => ({ method, url, sendBody: true, specifyBody: "json", jsonBody: `={{ JSON.stringify(${body}) }}` });

const triage = `${lib}
const runId = "apply-" + new Date().toISOString();
const t = triage($("Proposals").first().json.values || []);
return [{ json: { runId, started: runId.slice(6), ...t } }];`;
const items = `return $("Triage").first().json.accept.map(p => ({ json: p }));`;
const expand = `${lib}
const p = $input.first().json, obj = objectOf(p.kind);
const props = [...BASIS[obj], obj === "deal" ? "createdate" : "demo_record"].join(",");
return p.records.map(rid => ({ json: { p, rid, url: "${API}objects/" + obj + "s/" + rid + "?properties=" + props } }));`;
const decide = `${lib}
const p = $("Expand").first().json.p, obj = objectOf(p.kind);
const got = $input.all().map(r => r.json.id && !r.json.error ? { id: String(r.json.id), properties: r.json.properties } : null);
const status = decide(p, got), now = Date.now();
if (status !== "apply") return [{ json: { p, status } }];
const names = $("Props " + obj + "s").first().json.results.map(r => r.name);
return [{ json: { p, status, req: request(p, got, now, "${OWNER}"), full: { url: "${API}objects/" + obj + "s/batch/read", body: { properties: names, inputs: p.records.map(id => ({ id })) } } } }];`;
const snapshot = `${lib}
const { p } = $("Decide").first().json;
return [{ json: { values: snapshots(p, $input.first().json.results, $("Triage").first().json.runId, Date.now()) } }];`;
// Runs after the HubSpot write on the apply branch, or straight from "Apply?" on the skip branch.
const status = `const d = $("Decide").first().json;
let status = d.status, at = "";
if (status === "apply") { const r = $input.first().json; status = r.error ? "failed: " + String(r.error.message || JSON.stringify(r.error)).slice(0, 200) : "applied"; at = new Date().toISOString(); }
return [{ json: { id: d.p.id, row: d.p.row, status, at } }];`;
const tally = `const t = $("Triage").first().json, s = $input.all().map(i => i.json.status.split(":")[0]);
const n = k => s.filter(v => v === k).length;
return [{ json: { values: [[t.runId, t.started, new Date().toISOString(), "", "", "", "", "", "", "", "", "apply", n("applied"), n("stale_skipped"), n("already_merged"), n("failed"), n("guard_refused"), t.reject.length]] } }];`;

const nodes = [
  node("Run once", "n8n-nodes-base.executeWorkflowTrigger", { inputSource: "passthrough" }, { typeVersion: 1.1 }),
  gs("Proposals", { url: SHEET + "/proposals!A2:M" }, { executeOnce: true }),
  hs("Props contacts", { url: API + "properties/contacts" }, { executeOnce: true }),
  hs("Props deals", { url: API + "properties/deals" }, { executeOnce: true }),
  code("Triage", triage),
  gs("Mark rejected", json("POST", SHEET + ":batchUpdate", `{ valueInputOption: "RAW", data: $('Triage').first().json.reject }`), { executeOnce: true }),
  code("Accepted", items),
  node("Loop", "n8n-nodes-base.splitInBatches", { batchSize: 1, options: {} }, { typeVersion: 3 }),
  code("Expand", expand),
  // A merged-away id answers 200 with the surviving record; a 404 (archived) comes through as an error item and decides stale_skipped.
  hs("Get record", { url: "={{ $json.url }}" }, { onError: "continueRegularOutput" }),
  code("Decide", decide),
  node("Apply?", "n8n-nodes-base.if", { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, combinator: "and",
    conditions: [{ id: "apply", leftValue: "={{ $json.status }}", rightValue: "apply", operator: { type: "string", operation: "equals" } }] }, options: {} }, { typeVersion: 2.2 }),
  hs("Full read", json("POST", "={{ $json.full.url }}", "$json.full.body")),
  code("Snapshot", snapshot),
  // No onError here: a before-image that did not land stops the run before the HubSpot write.
  gs("Append snapshot", json("POST", SHEET + "/snapshots!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", "{ values: $json.values }")),
  hs("Write", { ...json("={{ $('Decide').first().json.req.method }}", "={{ $('Decide').first().json.req.url }}", "$('Decide').first().json.req.body") }, { onError: "continueRegularOutput" }),
  code("Status", status),
  gs("Write status", json("PUT", `={{ "${SHEET}/proposals!K" + $json.row + ":L" + $json.row + "?valueInputOption=RAW" }}`, "{ values: [[$json.status, $json.at]] }")),
  code("Next", `return $("Status").all();`),
  code("Tally", tally),
  gs("Append run_log", json("POST", SHEET + "/run_log!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", "{ values: $json.values }")),
];
const to = (...n) => ({ main: n.map(b => (Array.isArray(b) ? b : [b]).map(node => ({ node, type: "main", index: 0 }))) });
const connections = {
  "Run once": to("Proposals"), Proposals: to("Props contacts"), "Props contacts": to("Props deals"), "Props deals": to("Triage"), Triage: to("Mark rejected"), "Mark rejected": to("Accepted"), Accepted: to("Loop"),
  Loop: to("Tally", "Expand"), // output 0 = done, output 1 = next batch
  Expand: to("Get record"), "Get record": to("Decide"), Decide: to("Apply?"), "Apply?": to("Full read", "Status"),
  "Full read": to("Snapshot"), Snapshot: to("Append snapshot"), "Append snapshot": to("Write"), Write: to("Status"), Status: to("Write status"), "Write status": to("Next"), Next: to("Loop"),
  Tally: to("Append run_log"),
};
// ponytail: no accepted rows means the loop never runs and no apply run_log row is written; the Capstone's single nightly workflow logs every run.
const wf = { id: "n2ApplyAccepted1", name: "N2 apply (accepted proposals, HubSpot writes)", active: false, settings: { executionOrder: "v1" }, pinData: {}, nodes, connections };
fs.writeFileSync(path.join(__dirname, "apply.json"), JSON.stringify(wf, null, 2) + "\n");
