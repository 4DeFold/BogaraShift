export const DEFAULT_DATE='2025-05-25';
export const LAYERS={s30:'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',l30:'HLS_L30_Nadir_BRDF_Adjusted_Reflectance'};
export function tileUrl(sensor,date,z,y,x){return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LAYERS[sensor]}/default/${date}/GoogleMapsCompatible_Level12/${z}/${y}/${x}.png`;}
