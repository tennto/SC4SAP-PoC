# TM - Transportation Management Development Workflows
# TM - 운송 관리 개발 워크플로우

## Workflow 1: Freight Unit Building and Freight Order Creation
### Steps
1. SD delivery (LIKP/LIPS) triggers freight unit building via TM integration
2. Read delivery data: BAPI_OUTB_DELIVERY_GET_DETAIL for quantities, weights, destination
3. Create freight unit: /SCMTMS/CL_FU_BAPI=>CREATE with delivery reference, weight, volume, locations
4. Run planning: /SCMTMS/PLN_WKBK or programmatic call to VSR optimizer
5. Optimizer assigns freight units to freight orders based on route, capacity, time window
6. Create freight order: /SCMTMS/CL_FO_BAPI=>CREATE with carrier, vehicle, planned route
7. Execute tendering if carrier not pre-assigned: /SCMTMS/CL_TEND_BAPI=>EXECUTE
8. On carrier acceptance: confirm freight order; generate output (CMR, Bill of Lading)
9. Post tracking events as shipment progresses: /SCMTMS/CL_TTE_BAPI=>POST_EVENT

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — read /SCMTMS/CL_FO_BAPI class interface
- mcp__mcp-abap-adt__GetTable — inspect /SCMTMS/D_FO (freight order), /SCMTMS/D_FU (freight unit)
- mcp__mcp-abap-adt__CreateProgram — scaffold TM integration program

### Related Config
- Freight Order Types: V_TMFOT
- Freight Unit Building Rules: V_TMFUB
- Transportation Lanes: V_TMLANE

---

## Workflow 2: Carrier Tendering and Rate Comparison
### Steps
1. Identify freight order requiring carrier assignment: /SCMTMS/CL_FO_BAPI=>GET_LIST filtered by status "needs carrier"
2. Determine eligible carriers from transportation lane: /SCMTMS/CL_LANE_BAPI=>GET_LIST
3. Calculate freight charges per carrier: /SCMTMS/CL_FCC_BAPI=>CALCULATE for each carrier/agreement
4. Initiate tendering process: /SCMTMS/CL_TEND_BAPI=>EXECUTE — sends RFQ to carriers
5. Implement BAdI /SCMTMS/IF_EX_TEND for custom carrier ranking logic (cheapest + preferred carrier)
6. Receive carrier response (manual or automated via XML/IDoc)
7. Accept best offer: /SCMTMS/CL_TEND_BAPI=>ACCEPT
8. Update freight order with selected carrier; trigger booking confirmation

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect /SCMTMS/IF_EX_TEND BAdI interface
- mcp__mcp-abap-adt__CreateClass — implement carrier ranking BAdI
- mcp__mcp-abap-adt__GetTable — inspect /SCMTMS/D_TEND (tendering), /SCMTMS/D_FRG_AGR (freight agreements)

### Related Config
- Freight Agreement Types: V_TMFAG
- Carrier Profiles: V_TMCAR
- Tendering Settings: V_TMTEND

---

## Workflow 3: Real-Time Tracking Integration (GPS/Telematics)
### Steps
1. Receive GPS update from telematics provider via RFC or REST API call
2. Parse tracking message: extract freight order/shipment ID, current location (lat/long), timestamp, status
3. Determine TM location closest to GPS coordinates using /SCMTMS/CL_LOC_BAPI=>GET_DETAIL
4. Post tracking event: /SCMTMS/CL_TTE_BAPI=>POST_EVENT with event type (departure, arrival, delay), location, time
5. Check against expected events (V_TMEE): flag delays or missed checkpoints
6. Trigger alert workflow if delay detected: SAP Workflow or custom notification via BCS
7. Update freight order ETA: /SCMTMS/CL_FO_BAPI=>CHANGE with revised arrival time
8. Expose visibility data to customers via OData service

### Required MCP Tools
- mcp__mcp-abap-adt__GetClass — inspect /SCMTMS/CL_TTE_BAPI event posting interface
- mcp__mcp-abap-adt__CreateProgram — build GPS event receiver and processor
- mcp__mcp-abap-adt__CreateServiceDefinition — expose tracking OData service
- mcp__mcp-abap-adt__GetTable — inspect /SCMTMS/D_TTE (tracking events)

### Related Config
- TM-EM Integration: V_TMEM
- Tracking Events: V_TMTTE
- Expected Events: V_TMEE
