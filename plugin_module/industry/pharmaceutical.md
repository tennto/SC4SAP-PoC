# Pharmaceutical

## Business Characteristics
- **GxP-regulated**: GMP, GDP, GLP, FDA 21 CFR Part 11, EU Annex 11
- **Electronic signature and audit trail** mandatory; computer system validation (CSV) required
- **Serialization / Track & Trace** (DSCSA, EU FMD, country-specific schemes)
- Full batch/lot traceability, shelf life, stability studies
- Long product lifecycle, but strong competition from patent expiry / generics
- Cold chain (for some biologics), controlled substances (narcotics)
- Separate processes for clinical trial supply

## Key Processes
- **Process Manufacturing**: Master Recipe, campaign production
- **QM Release Strategy**: no shipping without QA release
- **Serialization**: unit-level numbering, aggregation (carton / pallet)
- **eCTD / regulatory submission**
- **Recall / Withdrawal**
- **Sample / Clinical Supply** as separate streams

## Master Data Specifics
- **Batch** mandatory + **Batch Status Management** (Released / Restricted / Blocked)
- **Classification** — potency, assay, content test values
- **Recipe Version** — per regulatory filing
- **Material** — controlled substance flag, serialization-relevant flag

## Module Implications
- **PP-PI**: Master Recipe, process instructions, Electronic Batch Record (EBR)
- **QM**: mandatory inspection, usage decision, stability
- **MM/SD**: only available (released) batches are transactable
- **WM/EWM**: quarantine, storage types by release status
- **EHS**: Dangerous Goods, controlled substances
- **GTS**: import/export regulations

## Common Customizations
- Electronic signature UI on every change transaction
- Enhanced audit trail (change documents + custom log)
- Serialization numbering and aggregation via external L4 system integration
- Batch genealogy report
- Sample / retention sample management

## SAP Industry Solutions
- **SAP for Life Sciences (IS-ADEC / IS-Pharma family)**
- **S/4HANA for Life Sciences**
- **SAP Advanced Track and Trace for Pharmaceuticals (ATTP)**

## Pitfalls / Anti-patterns
- Allowing sales without QM release → regulatory violation
- Leaving Batch Status Management disabled → quarantine stock counted as available
- Missing electronic signature → CSV audit failure
- Handling serialization only via CRM/SD barcoding → aggregation impossible
- No batch genealogy → recall back-trace fails
