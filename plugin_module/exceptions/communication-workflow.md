# Communication & Workflow
<!-- tier: strict -->

Mail bodies, workflow work items, broadcast records — contain PII in content and agent assignments. Blocked at `strict`.

| Table | Description | Why |
|-------|-------------|-----|
| SOOD / SOC3 / SOST / SOFM | SAPoffice / mail storage | Mail body PII |
| SWWWIHEAD / SWWCONT / SWWLOGHIST | Workflow work item data | Agent assignments + context |
| BCST_SR / BCST_CAM | Broadcast / message records | Communication content |
