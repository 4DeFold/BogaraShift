# Farmer workflow — implementation assessment

Scope: the test branch, not a production agronomic system. Checks as of this change; the protected Vercel deployment and external NASA/Z.ai services still need real end-to-end verification.

| Workflow step | Current implementation | Important gap |
|---|---|---|
| Farmer marks fields | Manual drawing and GeoJSON import, validation, approximate area and local storage. RGB segmentation is experimental; cloud copy is optional. | No validated automatic field-boundary model, cadastral verification, merge/split, or robust cross-device/offline sync. |
| Farmer provides known information | Soil texture, drainage, drying, salinity, terrain, measured moisture, previous crop, history, buyer/equipment and optional soil-report attachment. Unknowns remain unknown. | Uploaded files are stored locally and **not parsed**. Report numbers are not extracted or used. Free text and moisture are not interpreted by the preliminary scenario rules. |
| System adds observations | HLS imagery loads as map background. NASA POWER daily precipitation and maximum temperature load automatically for the regional grid when opening field details. Coverage and missing days are shown. | Regional modelled climate is not a field measurement and is not used in the rules. Real external availability is not confirmed in the sandbox. No satellite time series, NDVI, field-scale remote sensing, moisture observations or FTW. |
| System calculates suitable scenarios | The selected year and A/B/C scenarios are independent. A preliminary screening shows five choices, flags a few deterministic rotation/fallow risks and explicitly lists missing data. The farmer can adopt a choice manually. | There is **no validated suitability model, ranking, automatic generation of agronomic plans, optimization, or multi-year rotation calculation**. The checks are not recommendations and may miss important risks. Agronomist review is mandatory. |
| Shows plan, risks and gaps | Field card, year/scenario, planned crop, rule flags, missing data, approximate area, date overlap checks, and user-supplied economic calculator. AI can explain limited structured observations without an account after the user requests it. | AI does not receive climate, uploaded reports or their contents, field name, coordinates or economics. It is an explanation only, not a calculator. Generation may fail due to provider availability or quota; explicitly labelled local rule text is shown instead. |
| Farmer discusses and corrects with an agronomist | Crop, history, calendar and economic inputs can be changed; CSV, GeoJSON, local JSON backup and printable summary are available. | No built-in sharing, comment threads, agronomist review workflow or approval/signature. Manual export/share is necessary. |

## Safety and next work

1. Validate a transparent local agronomic methodology and crop-specific constraints with regional agronomists before labeling any option suitable or producing rankings. Define evidence, missing-data handling, seasons, multi-year occupancy and uncertainties.
2. Add verified, user-confirmed extraction from soil files, with units, sampling date/depth, provenance, validation and private file storage. Do not silently trust OCR or use invented values.
3. Verify NASA POWER and imagery coverage on deployed infrastructure, cache by grid/date, show age and quality, and decide how validated climate signals should influence screening.
4. Add an agronomist-facing review and audit trail plus usable data sharing and conflict-safe storage.
5. Before public deployment, protect the anonymous quota reservation endpoint with a server-only reservation credential and a shared WAF/rate limiter. The public RPC can be called directly to exhaust the app quota. Test the live provider and enforce billing limits independently; uptime is not guaranteed.

The separate `/demo/*` pages use invented values, climate and a prewritten explanation. They are not evidence that any provider or real agronomic calculation is working.
