# Steel / Metals / Mill Products

## Business Characteristics
- **Characteristic-based inventory**: even for the same material, stock is managed separately by spec (thickness / width / length / grade)
- **Catch weight**: transactions by actual weight
- **Batch / Heat Number**, Coil Number-level traceability
- **Finishing operations**: cut-to-length, slit, shear
- Heavy logistics, special transport (crane, dedicated vehicles)
- Volatile raw material prices (iron ore, scrap, alloys)
- Custom-spec orders are common (MTO)

## Key Processes
- **Heat / Melt → Casting → Rolling → Finishing**
- **Coil tracking**: each coil has a unique ID and characteristic values
- **Order-to-mill gap**: allocation matching between order spec and stock spec
- **Cut-to-order**: processing to customer-specified length/width
- **Remnant management**: leftover pieces

## Master Data Specifics
- **Material + characteristics**: grade, thickness, width, coating, etc.
- **Batch with extensive classification**
- **Tolerance** management (spec allowance)
- **Catch weight** UoM

## Module Implications
- **PP-PI / mill-specific**: characteristic-based BOM/Routing
- **MM/SD**: batch characteristic search, allocation
- **WM**: coil storage, crane management
- **QM**: per-heat testing, Mill Certificate

## Common Customizations
- Characteristic-based allocation engine
- Mapping Coil ID to customer order
- Automatic Mill Certificate (CoA) generation
- Remnant reuse logic
- Weight ticket integration

## SAP Industry Solutions
- **SAP for Mill Products (IS-Mill)**
- **S/4HANA for Mill Products**

## Pitfalls / Anti-patterns
- Standard-only configuration without IS-Mill → no characteristic-based allocation
- Tracking only at material level without coil-level identity → order matching fails
- Skipping catch weight → weight errors accumulate
- Treating remnants only as scrap → lost recycling value
