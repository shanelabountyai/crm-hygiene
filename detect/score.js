// Scores a live nightly run against the fixture labels (PRD P0-10). Input: CLI output of workflows/dev-eval-dump.json. Usage: node detect/score.js <dump.txt>
// Live HubSpot ids map back to fixture keys by email (deal name for deals); records sharing an email take the keys in id order. Merge ids compare unordered.
const fs = require("fs"), assert = require("assert");
const fx = JSON.parse(fs.readFileSync(__dirname + "/../fixtures/n2-fixtures.json", "utf8"));
const txt = fs.readFileSync(process.argv[2], "utf8");
const run = JSON.parse(txt.slice(txt.indexOf('{\n  "data"'), txt.lastIndexOf("}") + 1));
const { rows, contacts, deals } = run.data.resultData.runData.Dump[0].data.main[0][0].json.EVAL_DUMP;
const keyed = (live, fixed, by, what) => {
  assert.equal(live.length, fixed.length, `${what}: ${live.length} seeded in the portal, ${fixed.length} in the fixtures (a refused create? re-run teardown and seed)`);
  const left = new Map(); fixed.forEach(f => left.set(by(f), [...(left.get(by(f)) || []), f.key]));
  const out = new Map();
  for (const o of live.sort((a, b) => a.id - b.id)) { const k = left.get(by(o)); assert(k?.length, `${what} ${o.id} (${by(o)}) matches no fixture`); out.set(o.id, k.shift()); }
  return out;
};
const ck = keyed(contacts, fx.contacts.map(c => ({ ...c, email: c.email })), o => (o.email || "").toLowerCase(), "contacts");
const dk = keyed(deals, fx.deals, o => o.name || o.dealname, "deals");
const key = id => ck.get(id) || dk.get(id) || id;
// sheet columns: A id, C kind, D records, G matched_on, H tier, I rationale
const live = rows.map(r => ({ id: r[0].split(":")[0] + ":" + (r[2] === "merge" ? r[3].split(",").map(key).sort() : r[3].split(",").map(key)).join(":") + (r[4] ? ":" + r[4] : ""), kind: r[2], tier: r[7], rationale: r[8] || "" }));
const bad = [], liveIds = new Set(live.map(p => p.id));
// Merges are expected for every labelled pair that is not tier none (fixtures.proposals predates the email-only sure tier).
// A missing lifecyclestage never reaches the scan live: HubSpot fills it on create, so those two fixture tasks cannot appear (finding, not a detector fault).
const want = new Set([...fx.pairs.filter(p => p.expected.tier !== "none").map(p => `merge:${[p.a, p.b].sort().join(":")}`),
  ...fx.proposals.filter(p => p.kind !== "merge" && !p.proposal_id.endsWith(":lifecyclestage") || p.kind === "fill").map(p => p.proposal_id)]);
for (const id of want) if (!liveIds.has(id)) bad.push("missing proposal " + id);
for (const id of liveIds) if (!want.has(id)) bad.push("unexpected proposal " + id);
const tierOf = new Map(live.filter(p => p.kind === "merge").map(p => [p.id, p]));
const t = {}, sureWrong = [];
for (const p of fx.pairs) {
  const g = tierOf.get(`merge:${[p.a, p.b].sort().join(":")}`), e = p.expected.tier, s = t[p.set] ??= { tp: 0, fp: 0, fn: 0, judged: 0, judgeRight: 0 };
  if (g?.tier === "sure" && !p.same_person) sureWrong.push(p.case);
  if (e !== "borderline" || p.case.startsWith("known_miss")) continue;
  const hit = g?.tier === "borderline";
  if (hit && p.same_person) s.tp++; else if (hit) s.fp++; else if (p.same_person) s.fn++;
  if (hit && g.rationale) { s.judged++; const v = g.rationale.split(":")[0]; if ((v === "likely_duplicate") === p.same_person && v !== "unsure") s.judgeRight++; }
}
for (const [set, s] of Object.entries(t)) console.log(`${set.padEnd(8)} borderline TP ${s.tp} FP ${s.fp} FN ${s.fn} | judge decided ${s.judgeRight}/${s.judged} (unsure counts as not decided)`);
console.log("sure-tier wrong merges:", sureWrong.length ? sureWrong.join(", ") : "none");
if (sureWrong.length) bad.push("sure rule merged different people");
console.log(bad.length ? "EVAL FAIL\n" + bad.join("\n") : "EVAL PASS: every fixture proposal present, none extra");
process.exit(bad.length ? 1 : 0);
