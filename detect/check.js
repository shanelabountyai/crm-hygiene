// Gate: runs detect.js over fixtures/n2-fixtures.json and compares with the labels. Usage: node detect/check.js
const fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.join(__dirname, ".."), rd = n => JSON.parse(fs.readFileSync(path.join(root, n), "utf8"));
const D = require("./detect.js"), fx = rd("fixtures/n2-fixtures.json");
const R = D.prep({ match: rd("rules/match.json"), nicknames: rd("rules/nicknames.json"), required_fields: rd("rules/required_fields.json"), stale: rd("rules/stale.json") });
const now = Date.now(), DAY = 86400000;
const contacts = fx.contacts.map(c => ({ ...c, id: c.key, associated_company: c.associated_company }));
const dups = D.duplicates(contacts, R), got = new Map(dups.map(d => [d.a + "/" + d.b, d]));
const bad = [];
let tp = {}, fp = {}, fn = {};
for (const p of fx.pairs) {
  const g = got.get(p.a + "/" + p.b), e = p.expected;
  if ((g ? g.tier : "none") !== e.tier || (g ? g.matched_on : "") !== e.matched_on) bad.push(`${p.case} ${p.a}/${p.b}: expected ${e.tier} ${e.matched_on}, got ${g ? g.tier + " " + g.matched_on : "none"}`);
  if (e.tier !== "borderline" || p.case.startsWith("known_miss")) continue;
  const k = p.set, hit = !!g && g.tier === "borderline";
  if (hit && p.same_person) tp[k] = (tp[k] || 0) + 1; else if (hit) fp[k] = (fp[k] || 0) + 1; else if (p.same_person) fn[k] = (fn[k] || 0) + 1;
}
const extra = [...got.keys()].filter(k => !fx.pairs.some(p => p.a + "/" + p.b === k));
if (extra.length) bad.push("unlabelled candidate pairs: " + extra.join(", "));
const sureWrong = fx.pairs.filter(p => got.get(p.a + "/" + p.b)?.tier === "sure" && !p.same_person).map(p => p.case);
assert(!sureWrong.length, "sure rule merges different people: " + sureWrong);
const deals = fx.deals.map(d => ({ ...d, id: d.key, last_activity: now - (d.idle_days ?? 0) * DAY - 3600000 }));
const props = [...D.fills(contacts, deals, fx.companies.map(c => ({ ...c, id: c.key })), R), ...D.stale(deals, R, now)];
const want = new Set(fx.proposals.filter(p => p.kind !== "merge").map(p => p.proposal_id)), have = new Set(props.map(p => p.id));
for (const id of want) if (!have.has(id)) bad.push("missing proposal " + id);
for (const id of have) if (!want.has(id)) bad.push("unexpected proposal " + id);
for (const s of ["tuned", "holdout"]) console.log(s, "borderline TP/FP/FN", tp[s] || 0, fp[s] || 0, fn[s] || 0);
console.log("sure-tier wrong merges: none");
console.log(bad.length ? "FAIL\n" + bad.join("\n") : "OK: tiers, matched_on and fill/missing/stale proposals all match the fixtures");
process.exit(bad.length ? 1 : 0);
