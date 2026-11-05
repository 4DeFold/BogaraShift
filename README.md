# BogaraShift — local planning prototype

A trilingual (RU/KK/EN) Next.js prototype for selecting outlines and preparing seasonal field plans. It is **not** a cadastral, agronomic or NASA product. It is a local draft, not the full authenticated Farm workspace described in the implementation specification.

```sh
npm ci
npm run dev   # http://localhost:3000/selectmap
npm test
npm run build
```

## What works now

- `/selectmap`: NASA GIBS HLS S30/L30 imagery with a date selector; draw/edit a new outline manually, or use the explicitly experimental RGB similarity tool. A user may separately confirm a valid outline after reviewing it. Confirmation is not cadastral verification. Legacy selection cells remain draft and are labelled as such.
- `/fieldplan`: one Leaflet map with Canvas, viewport filtering, low-zoom groups and capped labels; paginated cards use schematic SVG outlines rather than maps. Search, crop filters, season/scenario selection, and comparison of approximate areas are local. Synthetic browser testing with 300 fields verified one map and 50 cards per page, not a real-world performance guarantee.
- Polygon and MultiPolygon GeoJSON import (including holes), with coordinate, topology, size and vertex checks. Imported records start as drafts. Import allows up to 500 features / 2 MiB and 2,000 vertices per feature; antimeridian polygons and coordinates beyond ±85° latitude are not supported. Export GeoJSON, CSV for the selected season/scenario, printable field summary, and a JSON backup/restore are available. GeoJSON carries boundaries and names only. Protect JSON backups: they include all observations and attachments. Restore replaces local data after confirmation.
- Geodesic area uses Turf in the browser and is an **approximation**. It is not PostGIS or a surveyed area. Grid cells are excluded from scenario and economic totals; unknown areas do not become zero-area fields. Draft/unconfirmed outlines are included as approximate areas and identified as drafts.
- A crop can be assigned independently per harvest year and A/B/C scenario. Previous legacy `plannedCrop` values are retained separately and never silently assigned to a season. Occupancy dates are entered manually and checked for overlap within a scenario; a prior actual crop is recorded separately. A few transparent, preliminary checks are based solely on the explicitly provided values and are **not** recommendations. The economic tool uses user-supplied yield, price and variable costs; it does not predict revenue or verify a buyer. AI is not connected.
- NASA POWER can be requested from a field detail for the selected season. The browser sends a rounded grid coordinate to a fixed server endpoint; upstream requests use Next.js's 24-hour fetch cache where supported by the hosting platform. Only precipitation and daily maximum temperature are requested. Missing values are not zero; coverage is shown and gaps break dry spells. POWER is regional modelled context, not a field measurement. POWER requires no API key. The sandbox cannot reach NASA services, so real upstream responses and GIBS tiles must be verified in the deployed environment.

## Storage and limitations

Fields, plans, observations and optional PDF/JPG/PNG attachments (up to 1 MiB each) are saved **only in this browser's localStorage**. They are not synced, encrypted, backed up automatically, or protected from other users of the same browser. Browser clearing or device loss deletes them. The JSON backup can include sensitive location and soil data; store it securely. Saving reports as local data URLs is legacy behavior, not a private Supabase Storage implementation.

Not yet implemented: authenticated Supabase/PostGIS/RLS workspace or migration, private file storage, FTW jobs/worker or precomputed FTW dataset, satellite-band processing and NDVI, full agronomic rules engine, LLM, field geometry versioning, merge/split, or the full API and E2E/security suite from the specification. The POWER endpoint is a public prototype proxy, not production-grade: a shared platform-wide rate limiter (the in-memory throttle is per instance only), durable cache/observability, authentication and provider availability monitoring are still needed before production. No keys are stored in this repository or in the browser.

## Satellite imagery

The map uses open NASA GIBS HLS imagery via WMTS, without a NASA token. Choose `HLS_S30_Nadir_BRDF_Adjusted_Reflectance` (Sentinel-2) or `HLS_L30_Nadir_BRDF_Adjusted_Reflectance` (Landsat). Source products have a 30 m grid; GIBS Web Mercator level 12 is the highest native level and further zoom enlarges pixels. Coverage is not global on every day. The initial date, 25 May 2025, corresponds to NASA CMR granule HLS.S30.T42TWM.2025145T062321.v2.0 around Shymkent, but coverage at an exact point is not guaranteed. [NASA HLS](https://www.earthdata.nasa.gov/data/catalog/lpcloud-hlss30-2.0) · [NASA POWER](https://power.larc.nasa.gov/docs/) · [GIBS](https://www.earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs).

The optional experimental RGB region-growing tool is **not trained field detection**, FTW or a validated classifier. Adjacent fields can merge, clouds and gradients can interfere, and roads or vegetation can be selected. Inspect outlines carefully or draw/import them manually. No NDVI is calculated from RGB. The welcome image is an AI-generated illustration, not satellite imagery.
