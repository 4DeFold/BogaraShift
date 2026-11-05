import {geometryForCell,validateGeometry,geometryFingerprint} from './geometry.mjs';
const SOURCES=['manual','automatic','imported','legacy'];
// Files stay in the local browser; never put data URLs into database records.
export function prepareCloudFields(fields){
 if(!Array.isArray(fields)||fields.length>500)throw Error('INVALID_BATCH');
 const ids=new Set();
 return fields.map(field=>{
  const cell=field?.cell,geometry=geometryForCell(cell),source=SOURCES.includes(cell?.source)?cell.source:(cell?.polygon||cell?.geometry?'manual':'legacy');
  if(!cell||typeof cell.id!=='string'||!cell.id||ids.has(cell.id)||typeof field.name!=='string'||!field.name.trim()||!validateGeometry(geometry))throw Error('INVALID_FIELD');
  ids.add(cell.id);
  const {report,...withoutReport}=field;const {serverAreaHa,serverGeometryFingerprint,...cleanCell}=cell;
  return {...withoutReport,cell:{...cleanCell,geometry,source,boundaryStatus:source==='legacy'?'draft':cell.boundaryStatus==='confirmed'?'confirmed':'draft'}};
 });
}
export function hydrateCloudFields(rows){
 if(!Array.isArray(rows)||rows.length>500)throw Error('INVALID_RESPONSE');
 const ids=new Set();return rows.map(row=>{
  const f=row?.payload,c=f?.cell,g=row?.geometry;
  if(!Number.isFinite(row?.area_ha)||row.area_ha<0||!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof f.name!=='string'||!Number.isFinite(row.lat)||!Number.isFinite(row.lon)||!validateGeometry(g))throw Error('INVALID_RESPONSE');
  ids.add(c.id);return {...f,report:null,cell:{...c,geometry:g,source:row.source,boundaryStatus:row.status,lat:row.lat,lon:row.lon,serverAreaHa:row.area_ha,serverGeometryFingerprint:geometryFingerprint(g)}};
 });
}
