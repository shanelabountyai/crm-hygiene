# CRM Hygiene (N2)

Second workflow in the n8n Automation track. Every night it scans the Tallgrass HubSpot portal for likely duplicate contacts, records missing required fields, and stale deals, and proposes one fix per finding. Nothing in HubSpot changes until a person accepts the proposal in the sheet.

- PRD: https://claude.ai/artifact/BQBBTKvzCcAysjsWzFdTFg
- Spine: [speed-to-lead (N1)](https://github.com/shanelabountyai/speed-to-lead) (same n8n instance, credentials, error handler, demo guard)
- Demo firm: Tallgrass Advisory (fictional). Demo data only; nothing here runs on real contacts.
- Stack: n8n (self-hosted), HubSpot, Google Sheets, Claude. Not a saas foundation clone.
