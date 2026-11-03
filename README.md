# BogaraShift — Select Map

A demonstration with a field-selection page (`/selectmap`) and a field-plan page (`/fieldplan`) showing saved outlines, crop choices and field details. There is no account, server-side database, soil analysis, recommendation, cadastral boundary verification or NASA endorsement. Available in Russian, Kazakh and English.

## Run

```sh
npm ci
npm run dev    # http://localhost:3000/selectmap
npm test
npm run build
```

## Satellite imagery and field outlines

The map uses open NASA GIBS HLS imagery via WMTS, without a NASA token. Choose the date and either `HLS_S30_Nadir_BRDF_Adjusted_Reflectance` (Sentinel-2) or `HLS_L30_Nadir_BRDF_Adjusted_Reflectance` (Landsat). Both derive from HLS products with a 30 m grid; GIBS Web Mercator level 12 is the highest native level and further zoom enlarges pixels, not detail. Images are historical and **not global on every day**; gaps, cloud and unavailable tiles are possible. The initial date, 25 May 2025, corresponds to NASA CMR granule HLS.S30.T42TWM.2025145T062321.v2.0 around the initial Shymkent coordinates, but coverage/cloud at an exact point is not guaranteed. [NASA HLS](https://www.earthdata.nasa.gov/data/catalog/lpcloud-hlss30-2.0) · [GIBS](https://www.earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs) · [GIBS tile resolution](https://nasa-gibs.github.io/gibs-api-docs/access-advanced-topics/).

When a user clicks a point, a local experimental algorithm loads a small HLS GIBS image patch, grows the connected region with similar rendered RGB values, and traces its outer edge. It refuses missing, very bright, tiny or unbounded regions rather than producing a fictitious outline. This is **not trained field detection, parcel mapping or a validated agricultural classifier**: adjacent fields can look alike, clouds and gradients can interfere, and roads, vegetation or bare soil can be incorrectly selected. No accuracy estimate is claimed. Inspect and adjust the white vertices or draw a polygon manually; self-crossing and degenerate polygons are rejected. An automatic proposal is always a draft until the user checks and saves it. Polygons, source type, date and sensor are saved locally; existing old grid cells remain labelled as such. No area is inferred.

The app stores fields, answers and soil report files only in `localStorage` on the device, not on a server. Clearing browser data deletes them; another device/browser cannot access them. Up to one PDF/JPG/PNG up to 1 MiB per field is accepted; browser storage quota varies and errors are shown if saving fails. Unknowns stay unknown, and incomplete information is flagged; no confidence score or soil analysis is computed. Uploaded documents are not parsed. Saved items can be edited, downloaded or deleted.

The welcome image is an AI-generated illustration; it is not NASA satellite imagery.

## Field plan (interface prototype)

The second page displays the locally saved fields in a shared HLS map and a responsive two-column card layout. The map and cards open full-screen field details. A crop may be selected manually for demonstration and is stored in the same browser record; it is **not** a calculation or agronomic recommendation. Calculation and AI explanation panels are deliberately marked as not implemented, and unknown observations stay unknown. No AI request is made and no crop is assigned automatically.
