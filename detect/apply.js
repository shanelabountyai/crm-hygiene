// Apply-phase decisions (PRD P0-6). Pure, like detect.js: build-apply.js embeds it in n8n Code nodes; check-apply.js tests it.
const { basis, objectOf } = require("./detect.js"); // stripped when embedded: detect.js is concatenated ahead of this file
// rows = proposals!A2:M. Accepted rows still pending are applied; rejected rows still pending are marked rejected.
function triage(rows) {
  const accept = [], reject = [];
  rows.forEach((r, i) => {
    if (r[10] !== "pending") return;
    if (r[9] === "reject") reject.push({ range: `proposals!K${i + 2}`, values: [["rejected"]] });
    if (r[9] === "accept") accept.push({ row: i + 2, id: r[0], kind: r[2], records: r[3].split(","), field: r[4], value: r[5], basis: r[12] || "" });
  });
  return { accept, reject };
}
// got[i] = the GET of p.records[i]: {id, properties} (HubSpot answers a merged-away id with the surviving record), or null when it is gone.
function decide(p, got) {
  if (got.some(g => !g)) return "stale_skipped";
  const demo = objectOf(p.kind) === "deal" ? g => (g.properties.dealname || "").startsWith("[demo]") : g => g.properties.demo_record === "true";
  if (!got.every(demo)) return "guard_refused";
  if (p.kind === "merge" && got[0].id === got[1].id) return "already_merged";
  if (got.some((g, i) => g.id !== p.records[i])) return "stale_skipped"; // merged into something else since the scan; the next scan re-proposes on the new id
  return basis(p.kind, got.map(g => g.properties)) === p.basis ? "apply" : "stale_skipped";
}
const API = "https://api.hubapi.com/crm/v3/objects/";
const task = (subject, body, owner, assocTo, typeId, now) => ({ method: "POST", url: API + "tasks", body: {
  properties: { hs_task_subject: subject, hs_task_body: body, hs_task_status: "NOT_STARTED", hs_timestamp: new Date(now + 86400000).toISOString(), hubspot_owner_id: owner },
  associations: [{ to: { id: assocTo }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: typeId }] }] } });
// Tasks carry '[demo]' in the subject so teardown finds them. A contact missing its owner gets the task on defaultOwner.
function request(p, got, now, defaultOwner) {
  const g = got[0].properties;
  switch (p.kind) {
    case "merge": return { method: "POST", url: API + "contacts/merge", body: { primaryObjectId: p.records[0], objectIdToMerge: p.records[1] } };
    case "fill": return { method: "PATCH", url: API + "contacts/" + p.records[0], body: { properties: { [p.field]: p.value } } };
    case "missing_task": return task(`[demo] Set ${p.field} on ${g.firstname} ${g.lastname}`, `CRM hygiene ${p.id}: ${p.field} is empty and nothing on the record says what it should be.`,
      g.hubspot_owner_id || defaultOwner, p.records[0], 204, now); // task -> contact
    case "stale_task": return task(`[demo] Follow up: ${(g.dealname || "").replace(/^\[demo\]\s*/, "")}`, `CRM hygiene ${p.id}: no activity since ${g.notes_last_updated || g.createdate}.`,
      g.hubspot_owner_id || defaultOwner, p.records[0], 216, now); // task -> deal
  }
  throw new Error("unknown kind " + p.kind);
}
// Before-image: every non-empty property of every touched record.
const snapshots = (p, full, runId, now) => full.map(o => [p.id, runId, objectOf(p.kind), o.id,
  JSON.stringify(Object.fromEntries(Object.entries(o.properties).filter(([, v]) => v !== null && v !== ""))), new Date(now).toISOString()]);
module.exports = { triage, decide, request, snapshots };
