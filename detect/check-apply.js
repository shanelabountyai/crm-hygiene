// Gate for the apply phase and the sheet upsert: node detect/check-apply.js
const assert = require("assert"), D = require("./detect.js"), A = require("./apply.js");
const c = (id, x = {}) => ({ id, properties: { demo_record: "true", firstname: "Ann", lastname: "Lee", email: "ann@x.example.com", ...x } });
const p = (kind, records, x = {}) => ({ id: kind + ":" + records.join(":"), kind, records, ...x });
const withBasis = (q, got) => ({ ...q, basis: D.basis(q.kind, got.map(g => g.properties), q.field) });
const now = Date.parse("2026-11-04T02:00:00Z");

// decide
const m = withBasis(p("merge", ["1", "2"]), [c("1"), c("2")]);
assert.equal(A.decide(m, [c("1"), c("2")]), "apply");
assert.equal(A.decide(m, [c("1"), c("2", { phone: "555" })]), "stale_skipped", "a changed field skips");
assert.equal(A.decide(m, [c("1", { hs_lastmodifieddate: "later" }), c("2")]), "apply", "a non-basis change does not skip");
assert.equal(A.decide(m, [c("9"), c("9")]), "already_merged");
assert.equal(A.decide(m, [c("9"), c("2")]), "stale_skipped", "primary merged into a third record");
assert.equal(A.decide(m, [c("1"), null]), "stale_skipped", "a gone record skips");
assert.equal(A.decide(m, [c("1"), c("2", { demo_record: null })]), "guard_refused");
const mt = withBasis(p("missing_task", ["1"], { field: "hubspot_owner_id" }), [c("1", { company: "" })]);
assert.equal(A.decide(mt, [c("1", { company: "Acme" })]), "apply", "a fill of another field on the same contact does not skip it");
assert.equal(A.decide(mt, [c("1", { hubspot_owner_id: "42" })]), "stale_skipped", "its own field now set skips it");
const deal = { id: "7", properties: { dealname: "[demo] Roof", dealstage: "contractsent", notes_last_updated: "2026-09-01T00:00:00Z" } };
const st = withBasis(p("stale_task", ["7"]), [deal]);
assert.equal(A.decide(st, [deal]), "apply");
assert.equal(A.decide(st, [{ ...deal, properties: { ...deal.properties, notes_last_updated: "2026-11-03T00:00:00Z" } }]), "stale_skipped", "new activity skips");
assert.equal(A.decide(st, [{ ...deal, properties: { ...deal.properties, dealname: "Roof" } }]), "guard_refused");

// request
assert.deepEqual(A.request(m, [c("1"), c("2")], now, "95"), { method: "POST", url: "https://api.hubapi.com/crm/v3/objects/contacts/merge", body: { primaryObjectId: "1", objectIdToMerge: "2" } });
assert.deepEqual(A.request(p("fill", ["1"], { field: "company", value: "Acme" }), [c("1")], now, "95").body, { properties: { company: "Acme" } });
const t = A.request(p("missing_task", ["1"], { field: "hubspot_owner_id" }), [c("1")], now, "95");
assert.equal(t.body.properties.hubspot_owner_id, "95", "an ownerless contact's task goes to the default owner");
assert(t.body.properties.hs_task_subject.startsWith("[demo] "), "teardown finds tasks by the [demo] subject");
assert.equal(t.body.associations[0].types[0].associationTypeId, 204);
const s = A.request(st, [{ ...deal, properties: { ...deal.properties, hubspot_owner_id: "42" } }], now, "95");
assert.equal(s.body.properties.hs_task_subject, "[demo] Follow up: Roof");
assert.equal(s.body.properties.hubspot_owner_id, "42");
assert.equal(s.body.associations[0].types[0].associationTypeId, 216);

// triage
const row = (id, decision, status, basis = "b") => [id, "run", "fill", "1", "company", "Acme", "", "", "", decision, status, "", basis];
const tr = A.triage([row("a", "accept", "pending"), row("b", "reject", "pending"), row("c", "accept", "applied"), row("d", "", "pending")]);
assert.deepEqual(tr.accept.map(x => [x.id, x.row]), [["a", 2]]);
assert.deepEqual(tr.reject, [{ range: "proposals!K3", values: [["rejected"]] }]);

// snapshots
const snap = A.snapshots(m, [c("1", { phone: null })], "run", now);
assert.deepEqual(JSON.parse(snap[0][4]), { demo_record: "true", firstname: "Ann", lastname: "Lee", email: "ann@x.example.com" });

// upsert
const f = (id, b) => ({ id, kind: "fill", records: ["1"], basis: b });
const rows = [row("open", "", "pending", "x"), row("st", "accept", "stale_skipped", "x"), row("rj", "reject", "rejected", "x"), row("rj2", "reject", "rejected", "x"), row("ap", "accept", "applied", "x")];
const u = D.upsert([f("new", "y"), f("open", "y"), f("st", "y"), f("rj", "x"), f("rj2", "y"), f("ap", "y")], rows, "run2");
assert.deepEqual(u.append.map(r => r[0]), ["new"]);
assert.deepEqual(u.rewrite.map(r => r.range), ["proposals!A3:M3", "proposals!A5:M5"], "stale_skipped and changed rejected rows reopen; unchanged rejected and applied stay");
assert.equal(u.rewrite[0].values[0][10], "pending");
assert.equal(u.append[0].length, D.COLS.length);
console.log("OK: apply decide/request/triage/snapshots and sheet upsert");
