# BogaraShift — Select Map

A demonstration page for selecting a location and recording farmer observations. No account, server-side database, analysis, automatic parcel detection, crop recommendation or NASA endorsement is implied. Available in Russian, Kazakh and English.

## Run

```sh
npm ci
npm run dev    # http://localhost:3000/selectmap
npm test
npm run build
```

## Map and limitations

The basemap is NASA GIBS `MODIS_Terra_CorrectedReflectance_TrueColor` imagery for **15 May 2025**, retrieved directly by the browser via public WMTS (no key). It is not live; cloud cover, availability and network restrictions can limit its usefulness. Its image resolution is about 250 m, so zooming beyond native level 9 enlarges the image, not the detail. Individual fields and boundaries may not be visible. [NASA GIBS](https://www.earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs); [MODIS imagery resolution](https://www.earthdata.nasa.gov/data/instruments/modis/near-real-time-data).

Colored cells are a deterministic **0.005° × 0.005° regular selection grid**, not identified field polygons; colors have no agronomic meaning. Cells vary in ground dimensions with latitude. At zoom below 13, zoom in to see the grid. Users may alternatively enter coordinates to select the cell. Each saved field represents one cell; this is an approximate area, not a measured field boundary or area. A spatially detailed field-boundary data source or field drawing would be necessary for accurate delineation, neither is included in this demo.

The application stores fields, answers and soil report files only in `localStorage` on the device, not on a server. Browser data deletion deletes them; another device or browser cannot access them. Up to one PDF/JPG/PNG up to 1 MiB per field is accepted; browser storage quota varies and a saving error is shown if the quota is exceeded. Unknowns stay unknown, and incomplete information is visibly flagged; no confidence score or soil analysis is computed. Uploaded documents are not parsed. Saved items can be edited, downloaded or deleted.

The welcome image is an AI-generated illustration; it is not NASA satellite imagery. The map is the actual NASA imagery layer, subject to availability.
