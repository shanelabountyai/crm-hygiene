// Builds workflows/dev-eval-dump.json: prints the proposals sheet plus the seeded contacts and deals (id order = seed order) for detect/score.js. Read-only. Usage: node workflows/build-eval-dump.js
const fs = require("fs"), path = require("path");
const SHEET = "https://sheets.googleapis.com/v4/spreadsheets/1vwwpyjgoN8xu1GPMPlgagbNIyd15KIvgQE7FtJsogRw/values/proposals!A2:M";
const page = { pagination: { pagination: { paginationMode: "responseContainsNextURL", nextURL: "={{ $response.body.paging?.next?.link }}", paginationCompleteWhen: "other", completeExpression: "={{ !$response.body.paging?.next?.link }}", limitPagesFetched: false } } };
const http = (name, url, cred, options, x) => ({ parameters: { url, authentication: "predefinedCredentialType", nodeCredentialType: Object.keys(cred)[0], options }, name, type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [x, 0], executeOnce: true, credentials: cred });
const hcred = { hubspotAppToken: { id: "u1WBi64R7zas6Zfn", name: "HubSpot Service Key account" } }, gcred = { googleSheetsOAuth2Api: { id: "McOy4auCNkFX0Os2", name: "Google Sheets account" } };
const pages = n => `[...new Map($("${n}").all().flatMap(i => i.json.results || []).map(o => [o.id, o])).values()]`;
const dump = `const contacts = ${pages("Contacts")}.filter(o => o.properties.demo_record === "true").map(o => ({ id: o.id, email: o.properties.email }));
const deals = ${pages("Deals")}.filter(o => (o.properties.dealname || "").startsWith("[demo]")).map(o => ({ id: o.id, name: o.properties.dealname }));
return [{ json: { EVAL_DUMP: { rows: $("Proposals").first().json.values || [], contacts, deals } } }];`;
const link = (a, b) => [a, { main: [[{ node: b, type: "main", index: 0 }]] }];
const wf = { id: "n2DevEvalDump001", name: "Dev: dump proposals + seeded ids for scoring (read-only)", active: false, settings: { executionOrder: "v1" }, pinData: {},
  nodes: [{ parameters: {}, name: "Run once", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [0, 0] },
    http("Proposals", SHEET, gcred, {}, 200),
    http("Contacts", "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,demo_record", hcred, page, 400),
    http("Deals", "https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname", hcred, page, 600),
    { parameters: { jsCode: dump }, name: "Dump", type: "n8n-nodes-base.code", typeVersion: 2, position: [800, 0] }],
  connections: Object.fromEntries([link("Run once", "Proposals"), link("Proposals", "Contacts"), link("Contacts", "Deals"), link("Deals", "Dump")]) };
fs.writeFileSync(path.join(__dirname, "dev-eval-dump.json"), JSON.stringify(wf, null, 2) + "\n");
