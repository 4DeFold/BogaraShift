'use client';
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import {tileUrl} from '../../lib/imagery.mjs';
import {segmentRgb} from '../../lib/segment.mjs';
import {validPolygon} from '../../lib/polygon.mjs';
import {leafletGeometry} from '../../lib/geometry.mjs';

function outline(shape){return leafletGeometry(shape);}
function loadTile(url){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.src='';reject(new Error('timeout'));},12000);img.crossOrigin='anonymous';img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('image unavailable'));};img.src=url;});}
async function analyze(latlng,date,sensor){
 const z=12,center=L.CRS.EPSG3857.latLngToPoint(latlng,z),size=96,ox=Math.floor(center.x)-size/2,oy=Math.floor(center.y)-size/2;
 const minX=Math.floor(ox/256),maxX=Math.floor((ox+size-1)/256),minY=Math.floor(oy/256),maxY=Math.floor((oy+size-1)/256);
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const context=canvas.getContext('2d',{willReadFrequently:true});
 const tasks=[];for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
  if(x<0||y<0||x>=2**z||y>=2**z)continue;
  tasks.push(loadTile(tileUrl(sensor,date,z,y,x)).then(img=>context.drawImage(img,x*256-ox,y*256-oy,256,256)));
 }
 try{await Promise.all(tasks);const image=context.getImageData(0,0,size,size);const found=segmentRgb(image,Math.floor(center.x)-ox,Math.floor(center.y)-oy);if(found.error)return {error:found.error};
  let simplified=L.LineUtil.simplify(found.polygon.map(([x,y])=>L.point(x,y)),.8);
  if(simplified.length>80)simplified=L.LineUtil.simplify(simplified,1.5);
  const polygon=simplified.map(({x,y})=>{const p=L.CRS.EPSG3857.pointToLatLng(L.point(ox+x,oy+y),z);return [p.lat,p.lng];});
  if(polygon.length>80||!validPolygon(polygon))return {error:'uncertain'};
  return {polygon};
 }catch{return {error:'unavailable'};}
}
export default function FieldMap({fields=[],active,focus,onDraft,onExisting,onProblem,onTileError,onBusy,mode='detect',mini=false,labels,date,sensor}) {
 const container=useRef(null),mapRef=useRef(null),groupRef=useRef(null),tileRef=useRef(null),callbacks=useRef({}),generation=useRef(0);
 callbacks.current={onDraft,onExisting,onProblem,onTileError,onBusy,mode,date,sensor,active};
 useEffect(()=>{
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const map=L.map(container.current,{center:mini?[active.lat,active.lon]:[42.4,69.85],zoom:mini?15:13,minZoom:3,maxZoom:18,preferCanvas:true,zoomControl:!mini,attributionControl:!mini,scrollWheelZoom:!mini,dragging:!mini,keyboard:!mini,zoomAnimation:!reduce,fadeAnimation:!reduce,markerZoomAnimation:!reduce,zoomSnap:.25,zoomDelta:.5,wheelDebounceTime:120,wheelPxPerZoomLevel:180,inertia:true,inertiaDeceleration:1800,easeLinearity:.25});
  mapRef.current=map;
  const tiles=L.tileLayer(tileUrl(sensor,date,'{z}','{y}','{x}'),{maxNativeZoom:12,maxZoom:18,crossOrigin:'anonymous',attribution:'<a href="https://earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs" target="_blank" rel="noreferrer">NASA GIBS / HLS · USGS / Copernicus Sentinel</a>'}).addTo(map);tileRef.current=tiles;
  tiles.on('tileerror',()=>callbacks.current.onTileError?.(true));tiles.on('loading',()=>callbacks.current.onTileError?.(false));
  groupRef.current=L.layerGroup().addTo(map);
  if(mini){const points=outline(active);if(points.length)map.fitBounds(points,{padding:[30,30],maxZoom:16,animate:false});}
  const click=async e=>{
   if(mini)return;
   const state=callbacks.current;
   if(state.mode==='draw'){
    const points=state.active?.source==='manual'?state.active.polygon:[];
    state.onDraft?.({id:state.active?.source==='manual'?state.active.id:crypto.randomUUID(),lat:e.latlng.lat,lon:e.latlng.lng,polygon:[...points,[e.latlng.lat,e.latlng.lng]],source:'manual',imageDate:state.date,sensor:state.sensor});return;
   }
   const turn=++generation.current;state.onBusy?.(true);state.onProblem?.(null);
   const result=await analyze(e.latlng,state.date,state.sensor);
   if(turn!==generation.current)return;
   callbacks.current.onBusy?.(false);
   if(result.error){callbacks.current.onProblem?.(result.error==='no_data'?'noData':result.error);return;}
   callbacks.current.onDraft?.({id:crypto.randomUUID(),lat:e.latlng.lat,lon:e.latlng.lng,polygon:result.polygon,source:'automatic',imageDate:state.date,sensor:state.sensor});
  };
  map.on('click',click);const timer=setTimeout(()=>map.invalidateSize(),80);
  return ()=>{generation.current++;clearTimeout(timer);map.off('click',click);map.remove();mapRef.current=null;groupRef.current=null;tileRef.current=null;};
 },[mini]);
 useEffect(()=>{generation.current++;onBusy?.(false);},[date,sensor,mode]);
 useEffect(()=>{tileRef.current?.setUrl(tileUrl(sensor,date,'{z}','{y}','{x}'));},[date,sensor]);
 useEffect(()=>{
  const group=groupRef.current,map=mapRef.current;if(!group||!map)return;group.clearLayers();
  if(!mini)fields.forEach(field=>{const points=outline(field.cell);if(!points.length)return;const poly=L.polygon(points,{color:'#aee881',weight:2,fillColor:'#94d582',fillOpacity:.2,dashArray:field.cell.polygon?null:'5 5'}).addTo(group);poly.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onExisting?.(field.cell);});});
  const points=outline(active);if(points.length){
   L.polygon(points,{color:'#ffdf61',weight:3,fillColor:'#ffdf61',fillOpacity:.18,interactive:false}).addTo(group);
  }
  if(active?.polygon?.length>1&&active.polygon.length<3)L.polyline(active.polygon,{color:'#ffdf61',weight:3,interactive:false}).addTo(group);
  if(!mini&&active?.polygon){active.polygon.forEach((point,index)=>{
   const marker=L.marker(point,{draggable:true,icon:L.divIcon({className:'boundary-vertex',iconSize:[13,13],iconAnchor:[6,6]}),keyboard:false}).addTo(group);
   marker.on('click',e=>L.DomEvent.stopPropagation(e));marker.on('dragend',()=>{const p=marker.getLatLng(),current=callbacks.current.active;if(!current?.polygon)return;const vertices=current.polygon.map((v,i)=>i===index?[p.lat,p.lng]:v);callbacks.current.onDraft?.({...current,polygon:vertices,edited:true});});
  });}
 },[fields,active,mini]);
 useEffect(()=>{if(!mini&&focus&&mapRef.current)mapRef.current.flyTo([focus.lat,focus.lon],14,{duration:0.8});},[focus,mini]);
 return <div className={mini?'leaflet-mini':'leaflet-map'} ref={container} aria-label={labels.mapAria} role="region"/>;
}
