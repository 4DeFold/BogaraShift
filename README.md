# BogaraShift

Decision-support prototype for rainfed winter-wheat rotations in the Shymkent foothills. The interface is available in Russian, Kazakh and English. It compares a farmer-edited five-year sequence with two published example sequences; it does **not** recommend a winner, calculate yield or profit, or measure a particular field's soil water. The default current rotation is an editable demonstration, not a claim about local farms. The visuals are AI-generated illustrations, not satellite photographs.

## Run and test

```bash
npm ci
npm run dev       # http://localhost:3000
npm test          # analysis, API state and interface tests
npm run build
```

Node.js 20.9+ is required. NASA POWER and the ORNL MODIS web service do not require an API key for these requests. Data are fetched automatically through `/api/context` when coordinates change; settings and language are stored locally in the browser. If a service is unreachable, the UI reports it and does not substitute fabricated observations. Server network access to the NASA/ORNL domains is required.

## Comparison and interpretation

- Rotation metrics are computed from each actual sequence. Legumes include chickpea and alfalfa. Wheat repetition counts adjacent pairs **within** the five years; the unobserved year-5-to-year-1 boundary is not counted. Wheat-after-fallow/chickpea/safflower counts likewise exclude the unknown predecessor of year 1. Marketing flags are prompts to verify chickpea and safflower sales, not a complete market-risk assessment.
- Priority highlights relevant rows and a question rather than assigning scores or rankings. Identical sequences are marked and given identical qualitative descriptions. Climate windows are shared by all rotations at the same point; NASA data do not establish the effect of one predecessor or a field-specific recommendation.
- B (fallow → winter wheat → safflower → winter wheat → alfalfa establishment year) and C (chickpea in place of fallow) are examples in the Ministry of Agriculture of Kazakhstan / Southwest Research Institute recommendations, Sydyk et al. (2010), section 1.1, p. 6: https://www.slideshare.net/slideshow/ss-7483007/7483007. They are not validated for the user's field; five years omit the longer life cycle of alfalfa.
- Daily NASA POWER `PRECTOTCORR` (mm/day) and `T2M_MAX` (°C), AG community, 2005–2024: complete March–May, September–November and April–June rainfall sums and May–June count of days with Tmax ≥30 °C. Each window independently excludes incomplete years. The UI shows range, driest year, median, sample count and historical rows. For chickpea, safflower and alfalfa these are **preliminary broad calendar windows**, not locally verified growing seasons or predictions. Confirm local planting, crop stage and management with an agronomist.
- ORNL subsets for MOD13Q1 v061 and MOD16A2GF v061 cover 1 May–2 June 2025. The first good-quality NDVI observation and first same-date good-quality ET/PET pair are examples, **not used in comparing strategies**. NDVI is scaled by 0.0001 (unitless); ET and PET by 0.1 (kg/m² ≈ mm per 8-day composite). Only the center pixel is used; values outside product ranges or without same-date QC=0 are rejected. The UI distinguishes no usable pixel from an unavailable service; neither proves conditions on the ground.
- The source panel records coordinates, retrieval time, product identifiers, window definitions, quality filters, units and links to the exact POWER and MODIS API requests. POWER is an interpolated/reanalysis-based gridded estimate, not a field sensor; a MODIS pixel may cover several fields. NASA sources change and may be revised or unavailable.
- Print / Save PDF creates a compact report with the field, coordinates, priority, rotations, comparison, available NASA context, unknowns, questions, sources and date. Review the generated page before sharing; browser print settings can affect pagination.

This is a prototype for discussion with a local agronomist, not a substitute for soil measurements, local agronomy, market checks or professional advice. NASA data are public data; BogaraShift is not a NASA product.
