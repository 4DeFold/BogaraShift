import area from '@turf/area';
import pointInPolygon from '@turf/boolean-point-in-polygon';
import disjoint from '@turf/boolean-disjoint';
import lineIntersect from '@turf/line-intersect';
import {validPolygon} from './polygon.mjs';

const feature = geometry => ({type:'Feature',properties:{},geometry});
const poly = rings => feature({type:'Polygon',coordinates:rings});
const line = ring => feature({type:'LineString',coordinates:ring});
const point = coords => feature({type:'Point',coordinates:coords});

// Browser-side preliminary checks. A shared workspace must additionally use PostGIS ST_IsValid.
export function validateGeometry(geometry, {minAreaHa=0.1, maxVertices=2000}={}) {
 try {
  if(!geometry || !['Polygon','MultiPolygon'].includes(geometry.type) || !Array.isArray(geometry.coordinates)) return false;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  if(!polygons.length || polygons.length>100) return false;
  let vertices=0;
  for(const rings of polygons){
   if(!Array.isArray(rings)||!rings.length||rings.length>100) return false;
   for(const ring of rings){
    if(!Array.isArray(ring)||ring.length<4) return false;
    vertices+=ring.length-1;
    if(vertices>maxVertices||ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85))return false;
    if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])return false;
    if(ring.some((p,i)=>i>0&&Math.abs(p[0]-ring[i-1][0])>180))return false; // antimeridian is not supported
    if(!validPolygon(ring.slice(0,-1).map(([x,y])=>[y,x])))return false;
   }
   const shell=poly([rings[0]]);
   for(let i=1;i<rings.length;i++){
    if(!pointInPolygon(point(rings[i][0]),shell,{ignoreBoundary:true}) || lineIntersect(line(rings[0]),line(rings[i])).features.length) return false;
    for(let j=1;j<i;j++)if(!disjoint(poly([rings[i]]),poly([rings[j]])))return false;
   }
  }
  for(let i=0;i<polygons.length;i++)for(let j=0;j<i;j++)if(!disjoint(poly(polygons[i]),poly(polygons[j])))return false;
  const hectares=area(feature(geometry))/10000;
  return Number.isFinite(hectares)&&hectares>=minAreaHa;
 } catch {return false;}
}
export function geometryForCell(cell){
 if(cell?.geometry)return cell.geometry;
 let ring=Array.isArray(cell?.polygon)?cell.polygon:null;
 if(!ring&&[cell?.south,cell?.west,cell?.north,cell?.east].every(Number.isFinite))ring=[[cell.south,cell.west],[cell.north,cell.west],[cell.north,cell.east],[cell.south,cell.east]];
 if(!ring||ring.length<3)return null;
 const coords=ring.map(([lat,lon])=>[lon,lat]);
 if(coords[0][0]!==coords.at(-1)[0]||coords[0][1]!==coords.at(-1)[1])coords.push([...coords[0]]);
 return {type:'Polygon',coordinates:[coords]};
}
export function leafletGeometry(cell){
 const geometry=geometryForCell(cell);if(!geometry)return [];
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 return polygons.map(rings=>rings.map(ring=>ring.map(([lon,lat])=>[lat,lon])));
}
export function areaHa(cell){try{const geometry=geometryForCell(cell);return geometry&&validateGeometry(geometry,{minAreaHa:0})?area(feature(geometry))/10000:null;}catch{return null;}}
export function exportGeoJSON(fields){return {type:'FeatureCollection',features:fields.flatMap(f=>{const geometry=geometryForCell(f.cell);return geometry?[{type:'Feature',geometry,properties:{name:f.name,boundary_source:f.cell.source||'legacy',boundary_status:f.cell.boundaryStatus||'draft',area_ha_approx:areaHa(f.cell)}}]:[];})};}
export function importGeoJSON(data){
 const features=data?.type==='FeatureCollection'?data.features:data?.type==='Feature'?[data]:[{type:'Feature',geometry:data,properties:{}}];
 if(!Array.isArray(features)||!features.length||features.length>500)throw Error('features');
 return features.map((f,i)=>{
  if(f?.type!=='Feature'||!validateGeometry(f.geometry))throw Error('geometry');
  const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates[0];
  // A display centre only, not a claim about the centroid or field measurements.
  const ring=rings[0],lon=(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2,lat=(Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2;
  return {name:typeof f.properties?.name==='string'&&f.properties.name.trim()?f.properties.name.trim().slice(0,80):`Field ${i+1}`,cell:{id:crypto.randomUUID(),lat,lon,geometry:f.geometry,source:'imported',boundaryStatus:'draft'}};
 });
}

// Fingerprint prevents a server measurement being displayed after local geometry changes.
export function geometryFingerprint(geometry){let h=2166136261;for(const c of JSON.stringify(geometry))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);}
export function serverAreaHa(cell){const g=geometryForCell(cell);return g&&Number.isFinite(cell?.serverAreaHa)&&cell.serverAreaHa>=0&&cell.serverGeometryFingerprint===geometryFingerprint(g)?cell.serverAreaHa:null;}
