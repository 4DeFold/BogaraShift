export const STORAGE='bogarashift-selectmap-v1';
export const LANGUAGE='bogarashift-selectmap-language';
export const CROPS=['wheat','chickpea','safflower','alfalfa','fallow'];
export const OBSERVATIONS={texture:['sandy','loamy','clay'],drainage:['standing','quick'],drying:['quick','long'],salinity:['yes','no'],terrain:['level','slope']};
export function observation(field,key,t){const i=OBSERVATIONS[key]?.indexOf(field[key])??-1;return i>=0?t[`${key}Options`][i]:t.unknown;}
export function cropLabel(crop,t){return CROPS.includes(crop)?t.cropNames[crop]:t.cropUnset;}
export function outline(shape){if(Array.isArray(shape?.polygon))return shape.polygon;if(Number.isFinite(shape?.south))return [[shape.south,shape.west],[shape.north,shape.west],[shape.north,shape.east],[shape.south,shape.east]];return [];}
