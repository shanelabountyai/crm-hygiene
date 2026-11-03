// Builds workflows/detect.json: embeds detect/detect.js and rules/*.json into one Code node. Usage: node workflows/build-detect.js
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
const rd = n => fs.readFileSync(path.join(root, n), "utf8");
const rules = JSON.stringify({ match: JSON.parse(rd("rules/match.json")), nicknames: JSON.parse(rd("rules/nicknames.json")), required_fields: JSON.parse(rd("rules/required_fields.json")), stale: JSON.parse(rd("rules/stale.json")) });
const lib = rd("detect/detect.js").replace(/module\.exports = .*/, "");
const code = `${lib}
const R = prep(${rules});
const pages = n => [...new Map($(n).all().flatMap(i => i.json.results || []).map(o => [o.id, o])).values()];
const created = (a, b) => Date.parse(a.properties.createdate) - Date.parse(b.properties.createdate) || Number(a.id) - Number(b.id);
const first = (o, k) => o.associations?.[k]?.results?.[0]?.id;
// Demo guard: only seeded records are scanned; the portal also holds real contacts and deals.
const contacts = pages("Contacts").filter(o => o.properties.demo_record === "true").sort(created).map(o => ({ ...o.properties, id: o.id, associated_company: first(o, "companies") }));
const dealObjs = pages("Deals").filter(o => (o.properties.dealname || "").startsWith("[demo]"));
const deals = dealObjs.map(o => ({ ...o.properties, id: o.id, contact: first(o, "contacts"), last_activity: Date.parse(o.properties.notes_last_updated || o.properties.createdate) }));
const companies = pages("Companies").map(o => ({ id: o.id, name: o.properties.name }));
const found = [
  ...duplicates(contacts, R).map(d => ({ id: "merge:" + d.a + ":" + d.b, kind: "merge", records: [d.a, d.b], tier: d.tier, matched_on: d.matched_on })),
  ...fills(contacts, deals, companies, R), ...stale(deals, R, Date.now()),
];
const byId = new Map([...contacts, ...deals].map(o => [o.id, o]));
for (const p of found) p.basis = basis(p.kind, p.records.map(id => byId.get(id)), p.field);
const runId = "run-" + new Date().toISOString(), started = $("Run once").first().json.started || runId.slice(4);
const { append, rewrite } = upsert(found, $("Existing proposals").first().json.values || [], runId);
const n = k => found.filter(p => p.kind === k).length;
return [{ json: { proposals: append, rewrite, run: [runId, started, new Date().toISOString(), contacts.length, deals.length, append.length + rewrite.length, found.filter(p => p.tier === "sure").length, found.filter(p => p.tier === "borderline").length, n("fill"), n("missing_task"), n("stale_task"), "ok"] } }];`;
const hs = (name, obj, props, assoc, y) => ({
  parameters: { url: `https://api.hubapi.com/crm/v3/objects/${obj}?limit=100&properties=${props}${assoc ? "&associations=" + assoc : ""}`, authentication: "predefinedCredentialType", nodeCredentialType: "hubspotAppToken",
    options: { pagination: { pagination: { paginationMode: "responseContainsNextURL", nextURL: "={{ $response.body.paging?.next?.link }}", paginationCompleteWhen: "other", completeExpression: "={{ !$response.body.paging?.next?.link }}", limitPagesFetched: false } } } },
  name, type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [y, 0], executeOnce: name !== "Contacts", credentials: { hubspotAppToken: { id: "u1WBi64R7zas6Zfn", name: "HubSpot Service Key account" } } });
const SHEET = "https://sheets.googleapis.com/v4/spreadsheets/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/values/";
const gs = (name, extra, y) => ({ parameters: { authentication: "predefinedCredentialType", nodeCredentialType: "googleSheetsOAuth2Api", ...extra }, name, type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [y, 0], executeOnce: true, credentials: { googleSheetsOAuth2Api: { id: "McOy4auCNkFX0Os2", name: "Google Sheets account" } } });
const post = (tab, key) => ({ method: "POST", url: `${SHEET}${tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, sendBody: true, specifyBody: "json", jsonBody: `={{ JSON.stringify({ values: $('Detect').first().json.${key} }) }}` });
const link = (a, b) => [a, { main: [[{ node: b, type: "main", index: 0 }]] }];
const wf = {
  id: "n2DetectScan0001", name: "N2 detect (scan, no HubSpot writes)", active: false, settings: { executionOrder: "v1" }, pinData: {},
  nodes: [
    { parameters: { inputSource: "passthrough" }, name: "Run once", type: "n8n-nodes-base.executeWorkflowTrigger", typeVersion: 1.1, position: [0, 0] },
    hs("Contacts", "contacts", "firstname,lastname,email,phone,company,jobtitle,lifecyclestage,hubspot_owner_id,createdate,demo_record", "companies", 200),
    hs("Deals", "deals", "dealname,dealstage,hubspot_owner_id,notes_last_updated,createdate", "contacts", 400),
    hs("Companies", "companies", "name", "", 600),
    gs("Existing proposals", { url: SHEET + "proposals!A2:M" }, 800),
    { parameters: { jsCode: code }, name: "Detect", type: "n8n-nodes-base.code", typeVersion: 2, position: [1000, 0] },
    gs("Append proposals", post("proposals", "proposals"), 1200),
    gs("Reopen proposals", { method: "POST", url: SHEET.replace(/\/values\/$/, "/values:batchUpdate"), sendBody: true, specifyBody: "json", jsonBody: `={{ JSON.stringify({ valueInputOption: "RAW", data: $('Detect').first().json.rewrite }) }}` }, 1300),
    gs("Append run_log", { ...post("run_log"), jsonBody: "={{ JSON.stringify({ values: [$('Detect').first().json.run] }) }}" }, 1400),
  ],
  connections: Object.fromEntries([link("Run once", "Contacts"), link("Contacts", "Deals"), link("Deals", "Companies"), link("Companies", "Existing proposals"), link("Existing proposals", "Detect"), link("Detect", "Append proposals"), link("Append proposals", "Reopen proposals"), link("Reopen proposals", "Append run_log")]),
};
fs.writeFileSync(path.join(__dirname, "detect.json"), JSON.stringify(wf, null, 2) + "\n");
