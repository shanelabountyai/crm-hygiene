// Rule-only detectors (PRD rule tables). Pure: no I/O, so the same file runs in the n8n Code node and in check.js.
// rules = {match, nicknames, required_fields, stale} as in rules/*.json. Contacts: {id, firstname, lastname, email, phone, company, jobtitle, lifecyclestage, hubspot_owner_id, associated_company?}.
// Deals: {id, dealstage, hubspot_owner_id, last_activity (ms), contact?}. Companies: {id, name}.
const DAY = 86400000;
function prep(rules) {
  const M = Object.fromEntries(rules.match.map(r => [r.key, r.value.split("|")]));
  return {
    FREE: new Set(M.free_mail_domains), DOTLESS: new Set(M.dot_insensitive_domains), SHARED: new Set(M.shared_inbox_locals), SUFFIX: new Set(M.company_suffixes),
    NICK: rules.nicknames.map(r => new Set(r.names.split("|"))), REQ: rules.required_fields, STALE: Object.fromEntries(rules.stale.map(r => [r.stage, r])),
  };
}
const lc = s => (s || "").toLowerCase();
function make(R) {
  const nemail = e => { let [loc, dom] = lc(e).split("@"); loc = loc.split("+")[0]; return (R.DOTLESS.has(dom) ? loc.replace(/\./g, "") : loc) + "@" + dom; };
  const nphone = p => { const d = (p || "").replace(/\D/g, ""); return d.length === 11 && d[0] === "1" ? d.slice(1) : d; };
  const ncompany = s => { const t = lc(s).replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean); while (t.length && R.SUFFIX.has(t[t.length - 1])) t.pop(); return t.join(" "); };
  const domain = c => { const d = lc(c.email).split("@")[1] || ""; return R.FREE.has(d) ? "" : d; };
  const firstEq = (a, b) => { a = lc(a); b = lc(b); return a === b || R.NICK.some(s => s.has(a) && s.has(b)); };
  function tier(a, b) {
    const ea = nemail(a.email), eb = nemail(b.email), pa = nphone(a.phone), pb = nphone(b.phone);
    const sameLast = lc(a.lastname) === lc(b.lastname), samePhone = pa !== "" && pa === pb;
    if (ea === eb) return R.SHARED.has(ea.split("@")[0]) ? ["borderline", "shared_inbox"] : ["sure", "email"];
    // Email is the only sure signal (Shane 2026-11-03): a shared phone can be a household or office line, so it is borderline and judged.
    if (sameLast || firstEq(a.firstname, b.firstname)) {
      const ev = [];
      if (domain(a) !== "" && domain(a) === domain(b)) ev.push("company_domain");
      if (samePhone) ev.push("phone");
      if (ncompany(a.company) !== "" && ncompany(a.company) === ncompany(b.company)) ev.push("company_name");
      if (ev.length) return ["borderline", [sameLast ? "last_name" : "first_name", ...ev].join("+")];
    }
    return ["none", ""];
  }
  const blocks = c => [["last", lc(c.lastname)], ["phone", nphone(c.phone)], ["domain", lc(c.email).split("@")[1] || ""], ["company", ncompany(c.company)]]
    .filter(([k, v]) => v !== "").map(([k, v]) => k + ":" + v);
  return { tier, blocks, nemail, nphone, ncompany };
}
// Contacts are compared only inside a shared blocking key; ids are ordered so the older (lower position in input) record is the primary.
function duplicates(contacts, R) {
  const { tier, blocks } = make(R), idx = new Map();
  contacts.forEach((c, i) => blocks(c).forEach(k => (idx.get(k) || idx.set(k, []).get(k)).push(i)));
  const seen = new Set(), out = [];
  for (const ix of idx.values()) for (let x = 0; x < ix.length; x++) for (let y = x + 1; y < ix.length; y++) {
    const [i, j] = [ix[x], ix[y]], key = i + ":" + j;
    if (seen.has(key)) continue; seen.add(key);
    const [t, why] = tier(contacts[i], contacts[j]);
    if (t !== "none") out.push({ a: contacts[i].id, b: contacts[j].id, tier: t, matched_on: why });
  }
  return out;
}
function fills(contacts, deals, companies, R) {
  const co = new Map(companies.map(c => [c.id, c])), openDeals = new Map();
  for (const d of deals) if (d.contact && R.STALE[d.dealstage]?.closed === "false" && d.hubspot_owner_id) (openDeals.get(d.contact) || openDeals.set(d.contact, []).get(d.contact)).push(d);
  const out = [];
  for (const c of contacts) for (const r of R.REQ) {
    if (c[r.field]) continue;
    let val, src;
    if (r.derive === "open_deal_owner") { src = (openDeals.get(c.id) || [])[0]; val = src && src.hubspot_owner_id; }
    else if (r.derive === "associated_company_name" && c.associated_company) { src = co.get(c.associated_company); val = src && src.name; }
    out.push(val ? { id: `fill:${c.id}:${r.field}`, kind: "fill", records: [c.id], field: r.field, value: val, source: src.id }
                 : { id: `missing_task:${c.id}:${r.field}`, kind: "missing_task", records: [c.id], field: r.field });
  }
  return out;
}
function stale(deals, R, now) {
  return deals.filter(d => { const s = R.STALE[d.dealstage]; return s && s.closed === "false" && Math.floor((now - d.last_activity) / DAY) > Number(s.max_idle_days); })
    .map(d => ({ id: `stale_task:${d.id}`, kind: "stale_task", records: [d.id], owner: d.hubspot_owner_id }));
}
module.exports = { prep, make, duplicates, fills, stale };
