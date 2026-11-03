"""Generates workflows/seed.json from fixtures/n2-fixtures.json (rerun after build.py).
Running the workflow writes ~170 contacts, 12 deals and notes to the live portal; teardown removes them."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
fx = json.load(open(root / "fixtures/n2-fixtures.json"))
OWNER = "95417437"  # the portal's only owner (search_owners 2026-11-03); fixtures say demo_owner
CRED = {"hubspotAppToken": {"id": "u1WBi64R7zas6Zfn", "name": "HubSpot Service Key account"}}
D = lambda name, v: f"const {name} = {json.dumps(v, ensure_ascii=False)};\nconst OWNER = '{OWNER}';\n"
ASSOC = "const assoc = (id, t) => ({ to: { id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: t }] });\n"

COMPANIES = D("COMPANIES", fx["companies"]) + "return COMPANIES.map(c => ({ json: { key: c.key, body: { properties: { name: c.name, domain: c.domain } } } }));"
CONTACTS = D("CONTACTS", fx["contacts"]) + ASSOC + """const co = $('Create company').first().json.id;
return CONTACTS.map(c => {
  const p = { demo_record: 'true' };
  for (const [k, v] of Object.entries(c)) if (v && !['key', 'note', 'associated_company'].includes(k)) p[k] = k === 'hubspot_owner_id' ? OWNER : v;
  const body = { properties: p };
  if (c.associated_company) body.associations = [assoc(co, 1)]; // contact -> company
  return { json: { key: c.key, body } };
});"""
# Items come back from "Create contact" in input order (the node runs them one at a time); a refused create (409) has no id and its deal association is skipped.
DEALS = D("DEALS", fx["deals"]) + ASSOC + """const made = $('Create contact').all(), sent = $('Contacts').all();
const id = {}; sent.forEach((s, i) => { if (made[i].json.id) id[s.json.key] = made[i].json.id; });
return DEALS.map(d => {
  const body = { properties: { dealname: d.name, dealstage: d.dealstage, pipeline: 'default', hubspot_owner_id: OWNER } };
  if (d.contact && id[d.contact]) body.associations = [assoc(id[d.contact], 3)]; // deal -> contact
  return { json: { key: d.key, idle_days: d.idle_days, body } };
});"""
# One note per deal that has idle_days, back-dated from now; notes_last_updated follows the latest engagement's hs_timestamp (Q2).
NOTES = ASSOC + """const made = $('Create deal').all(), sent = $('Deals').all(), out = [];
sent.forEach((s, i) => {
  if (s.json.idle_days === null || !made[i].json.id) return;
  const ts = new Date(Date.now() - s.json.idle_days * 864e5).toISOString();
  out.push({ json: { key: s.json.key, body: { properties: { hs_note_body: '[demo] activity for ' + s.json.key, hs_timestamp: ts }, associations: [assoc(made[i].json.id, 214)] } } }); // note -> deal
});
return out;"""
REPORT = """const f = (n) => $(n).all().filter(i => !i.json.id);
return [{ json: { companies_failed: f('Create company').length, contacts_failed: f('Create contact').map(i => i.json.error?.message ?? i.json), deals_failed: f('Create deal').length, notes_failed: f('Create note').length,
  contacts: $('Create contact').all().length - f('Create contact').length, deals: $('Create deal').all().length - f('Create deal').length, notes: $('Create note').all().length - f('Create note').length } }];"""

nodes, conn, x = [], {}, 0
def add(name, typ, params, **kw):
    global x
    n = dict(name=name, type=typ, typeVersion=kw.pop("tv", 2), position=[x, 0], parameters=params, **kw); x += 220; nodes.append(n)
    if len(nodes) > 1: conn[nodes[-2]["name"]] = {"main": [[{"node": name, "type": "main", "index": 0}]]}
def code(name, js): add(name, "n8n-nodes-base.code", {"jsCode": js})
def post(name, obj):
    add(name, "n8n-nodes-base.httpRequest", {"method": "POST", "url": f"https://api.hubapi.com/crm/v3/objects/{obj}", "authentication": "predefinedCredentialType", "nodeCredentialType": "hubspotAppToken",
        "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.body) }}",
        "options": {"batching": {"batch": {"batchSize": 1, "batchInterval": 400}}}}, tv=4.2, credentials=CRED, onError="continueRegularOutput")
add("Run once", "n8n-nodes-base.manualTrigger", {}, tv=1)
code("Companies", COMPANIES); post("Create company", "companies")
code("Contacts", CONTACTS); post("Create contact", "contacts")
code("Deals", DEALS); post("Create deal", "deals")
code("Notes", NOTES); post("Create note", "notes")
code("Report", REPORT)
json.dump(dict(id="n2SeedDemo000001", name="N2 seed demo data", active=False, settings={"executionOrder": "v1"}, pinData={}, nodes=nodes, connections=conn), open(root / "workflows/seed.json", "w"), indent=2, ensure_ascii=False)
print(len(nodes), "nodes,", len(json.dumps(nodes)) // 1024, "KB")
