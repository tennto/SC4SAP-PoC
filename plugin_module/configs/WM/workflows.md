# WM - Warehouse Management Development Workflows
# WM - 창고 관리 개발 워크플로우

## Workflow 1: Automated Goods Receipt and Putaway (TO Creation)
### Steps
1. Goods receipt posted in MM (MIGO/BAPI_GOODSMVT_CREATE with mvt 101) triggers WM transfer requirement
2. Read generated TR: BAPI_WHSE_TR_GETDETAIL using LTBK number from MKPF
3. Determine putaway strategy from V_T334 (open storage, fixed bin, etc.)
4. Create TO from TR: BAPI_WHSE_TO_CREATE_TOREQ with source storage type = GR area (902), destination determined by strategy
5. Print TO for warehouse worker: use TO print program
6. After physical putaway: confirm TO: BAPI_WHSE_TO_CONFIRM with actual bin and quantity
7. Verify stock updated in LS26 (bin stock) and MMBE (plant stock)

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_WHSE_TO_CREATE_TOREQ interface
- mcp__mcp-abap-adt__GetTable — inspect LTAK, LTAP, LTBK, LTBP, LGPLA, LQUA
- mcp__mcp-abap-adt__CreateProgram — scaffold GR-to-putaway automation program

### Related Config
- Putaway Strategies: V_T334
- Movement Types (WM): V_T333 / OMBO
- Storage Types: OMLT / V_T301

---

## Workflow 2: RF-Based Picking Enhancement
### Steps
1. Delivery created in SD (VL01N): generates WM transfer order automatically
2. Implement custom RF transaction using LM00 framework or BSP application
3. Read open TOs for picker: BAPI_WHSE_TO_GETLIST filtered by storage type (picking area) and open status
4. Display TO items on RF device: show source bin, material, quantity
5. Scan bin barcode: validate against LGPLA (bin master); check LQUA for stock
6. Confirm TO item by item: BAPI_WHSE_TO_CONFIRM with scanned quantities
7. Handle short picks: create TO for partial quantity, flag rest as short pick exception
8. Final confirmation triggers goods issue in IM (MM) and delivery update in SD

### Required MCP Tools
- mcp__mcp-abap-adt__GetFunctionModule — read L_TO_CONFIRM_ONE_TE for item-level confirmation
- mcp__mcp-abap-adt__GetTable — inspect LTBK, LTBP, LQUA, LGPLA
- mcp__mcp-abap-adt__CreateProgram — build RF picking program
- mcp__mcp-abap-adt__CreateInterface — define RF screen interface

### Related Config
- Picking Strategies: V_T335
- Confirmation Requirements: V_T333K
- Picking Areas: V_T304

---

## Workflow 3: Bin-to-Bin Transfer with Custom Strategy
### Steps
1. Identify replenishment need: read fixed picking bins (V_T311 fixed bin) with low stock in LQUA
2. Determine source bulk storage bin: apply FIFO strategy (read oldest quant from LQUA-EINDT)
3. Create ad-hoc TO: BAPI_WHSE_TO_CREATE_STOCK specifying source bin, destination fixed bin, material, quantity
4. Print or send TO to RF device for execution
5. Worker confirms: BAPI_WHSE_TO_CONFIRM
6. Implement as background job: schedule Z-replenishment report hourly during shift

### Required MCP Tools
- mcp__mcp-abap-adt__GetTable — inspect LQUA, LGPLA, T311 (fixed bin config)
- mcp__mcp-abap-adt__GetFunctionModule — read BAPI_WHSE_TO_CREATE_STOCK
- mcp__mcp-abap-adt__CreateProgram — build replenishment control report

### Related Config
- Stock Removal Strategy: V_T336
- Bin Search Strategy: V_T311
- Storage Bin Types: V_T303
