# Audit / Security Logs
<!-- tier: strict -->

Application logs, system monitoring, short dumps, table-change audit — often contain inline PII in message variables. Blocked at `strict`.

| Table | Description | Why |
|-------|-------------|-----|
| BALDAT / BALHDR | Application log data | May contain PII in message vars |
| SLG1 / SLGD | Application log (transaction) | Same as above |
| RSAU_BUF_DATA | Security audit log buffer | Security events |
| SNAP | ABAP short dumps | User actions, variable dumps |
| SMONI | System monitoring | Performance + user data |
| SWNCMONI / SWNCT* | Workload monitor | User activity |
| STAD / STATTRACE | Statistical records | User activity trace |
| DBTABLOG | Table change logs | Field-level change audit |
