# Methodology and uncertainty

Quantities use kg. Dry equivalents use wet kg × (1 − moisture / 100). Compare dry equivalents when both are available, otherwise identical known bases with a moisture-variation caveat. Incompatible or unknown bases require reconciliation.

Absolute discrepancy = abs(pickup − intake); percentage = discrepancy / pickup × 100. The default 5% review flag is configurable through NEXT_PUBLIC_WEIGHT_REVIEW_THRESHOLD_PERCENT. It is an operational investigation threshold, not a scientific/regulatory limit.

Receipt matching uses NFKC, uppercase and separator removal, scoped to facility. Identical SHA-256 means identical bytes, not fraud. Same-plot pickups within 24 hours prompt investigation. Consolidated shipments require documented resolution. Invalid quantities are rejected; chronology and missing documents produce findings. Database uniqueness and transitions prevent a second completed pickup/intake for one source batch.

SoilSafe uses farmer estimates on the same mass basis. Missing totals produce INSUFFICIENT_INFORMATION. Available inputs request site-specific agronomic review; documented assessment produces REVIEW_COMPLETED. The 70% high-removal wording is an attention cue, not a safe/unsafe boundary. Review completion is recorded human judgment, not certification.

[USDA NRCS, Harvesting Crop Residue (Iowa, 2016)](https://www.nrcs.usda.gov/sites/default/files/2024-10/HarvestingCropResidueOctober2016.pdf) discusses nutrient removal, erosion and soil organic matter; regional observations are not universal thresholds. [FAO conservation agriculture](https://www.fao.org/conservation-agriculture/en/) provides soil-cover context.

No CO₂ or credit formula is implemented. Selected pathways do not establish avoided burning, additionality, permanence or lifecycle emissions. [Verra VM0044](https://verra.org/methodologies/vm0044-biochar-utilization-in-soil-and-non-soil-applications-v1-2/) is a reference, not claimed compliance. No field pilot, satellite result or certified credit is represented by the demo.
