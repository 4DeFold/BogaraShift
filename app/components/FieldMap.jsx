'use client';
import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import {tileUrl} from '../../lib/imagery.mjs';
import useLatestHls from './useLatestHls';
import {leafletGeometry} from '../../lib/geometry.mjs';

function outline(shape){return leafletGeometry(shape);}
export default function FieldMap({fields=[],active,focus,onDraft,onExisting,onTileError,onImagery,mini=false,labels,demoFields=null,onDemoSelect}) {
 const container=useRef(null),mapRef=useRef(null),groupRef=useRef(null),tileRef=useRef(null),callbacks=useRef({});
 const [position,setPosition]=useState(()=>mini?{lat:active.lat,lon:active.lon}:{lat:42.4,lon:69.85});const imagery=useLatestHls(position);
 callbacks.current={onDraft,onExisting,onTileError,onImagery,active,onDemoSelect,demoFields,imagery};
 useEffect(()=>{callbacks.current.onImagery?.(imagery);},[imagery]);
 useEffect(()=>{
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const map=L.map(container.current,{center:mini?[active.lat,active.lon]:[42.4,69.85],zoom:mini?15:13,minZoom:3,maxZoom:18,preferCanvas:true,zoomControl:!mini,attributionControl:!mini,scrollWheelZoom:!mini,dragging:!mini,keyboard:!mini,zoomAnimation:!reduce,fadeAnimation:!reduce,markerZoomAnimation:!reduce,zoomSnap:.25,zoomDelta:.5,wheelDebounceTime:120,wheelPxPerZoomLevel:180,inertia:true,inertiaDeceleration:1800,easeLinearity:.25});
  mapRef.current=map;
  groupRef.current=L.layerGroup().addTo(map);
  if(mini){const points=outline(active);if(points.length)map.fitBounds(points,{padding:[30,30],maxZoom:16,animate:false});}
  else if(demoFields?.length){const bounds=L.latLngBounds(demoFields.flatMap(f=>f.cell.polygon));if(bounds.isValid())map.fitBounds(bounds,{padding:[45,45],maxZoom:15,animate:false});}
  const click=e=>{
   if(mini||callbacks.current.demoFields)return;
   const state=callbacks.current,previous=state.active?.source==='manual'?state.active:null,points=previous?.polygon||[];
   const current=state.imagery.status==='ready'?state.imagery:null;
   const same=!previous||(previous.imageDate===current?.date&&previous.sensor===current?.sensor);
   state.onDraft?.({id:previous?.id||crypto.randomUUID(),lat:e.latlng.lat,lon:e.latlng.lng,polygon:[...points,[e.latlng.lat,e.latlng.lng]],source:'manual',imageDate:same?(previous?previous.imageDate:current?.date)||null:null,sensor:same?(previous?previous.sensor:current?.sensor)||null:null});
  };
  const moved=()=>{const p=map.getCenter();setPosition(old=>Math.abs(old.lat-p.lat)<.00001&&Math.abs(old.lon-p.lng)<.00001?old:{lat:p.lat,lon:p.lng});};map.on('moveend',moved);moved();
  map.on('click',click);const timer=setTimeout(()=>map.invalidateSize(),80);
  return ()=>{clearTimeout(timer);map.off('click',click);map.off('moveend',moved);map.remove();mapRef.current=null;groupRef.current=null;tileRef.current=null;};
 },[mini]);
 useEffect(()=>{const map=mapRef.current;if(!map)return;if(tileRef.current){map.removeLayer(tileRef.current);tileRef.current=null;}callbacks.current.onTileError?.(false);if(imagery.status!=='ready')return;
  const tiles=L.tileLayer(tileUrl(imagery.sensor,imagery.date,'{z}','{y}','{x}'),{maxNativeZoom:12,maxZoom:18,crossOrigin:'anonymous',attribution:'<a href="https://earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs" target="_blank" rel="noreferrer">NASA GIBS / HLS · USGS / Copernicus Sentinel</a>'});tileRef.current=tiles;tiles.on('tileerror',()=>callbacks.current.onTileError?.(true));tiles.addTo(map);tiles.bringToBack();return()=>{if(map.hasLayer(tiles))map.removeLayer(tiles);if(tileRef.current===tiles)tileRef.current=null;};
 },[imagery]);
 useEffect(()=>{
  const group=groupRef.current,map=mapRef.current;if(!group||!map)return;group.clearLayers();
  if(!mini&&!demoFields)fields.forEach(field=>{const points=outline(field.cell);if(!points.length)return;const poly=L.polygon(points,{color:'#aee881',weight:2,fillColor:'#94d582',fillOpacity:.2,dashArray:field.cell.polygon?null:'5 5'}).addTo(group);poly.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onExisting?.(field.cell);});});
  if(!mini&&demoFields){
   demoFields.forEach((field,index)=>{const points=outline(field.cell),added=fields.some(f=>f.cell.id===field.cell.id);if(!points.length)return;
    const poly=L.polygon(points,{color:added?'#8fe1a8':'#ffdf61',weight:3,fillColor:added?'#47ab76':'#ffdf61',fillOpacity:.38}).addTo(group);
    poly.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onDemoSelect?.(field)});
    const marker=L.marker([field.cell.lat,field.cell.lon],{title:field.name,keyboard:true,icon:L.divIcon({className:'demo-map-number',html:String(index+1),iconSize:[32,32],iconAnchor:[16,16]})}).addTo(group);
    marker.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onDemoSelect?.(field)});
   });
  }
  const points=outline(active);if(points.length){
   L.polygon(points,{color:'#ffdf61',weight:3,fillColor:'#ffdf61',fillOpacity:.18,interactive:false}).addTo(group);
  }
  if(active?.polygon?.length>1&&active.polygon.length<3)L.polyline(active.polygon,{color:'#ffdf61',weight:3,interactive:false}).addTo(group);
  if(!mini&&active?.polygon){active.polygon.forEach((point,index)=>{
   const marker=L.marker(point,{draggable:true,icon:L.divIcon({className:'boundary-vertex',iconSize:[13,13],iconAnchor:[6,6]}),keyboard:false}).addTo(group);
   marker.on('click',e=>L.DomEvent.stopPropagation(e));marker.on('dragend',()=>{const p=marker.getLatLng(),current=callbacks.current.active;if(!current?.polygon)return;const vertices=current.polygon.map((v,i)=>i===index?[p.lat,p.lng]:v);callbacks.current.onDraft?.({...current,polygon:vertices,edited:true});});
  });}
 },[fields,active,mini,demoFields]);
 useEffect(()=>{if(!mini&&focus&&mapRef.current)mapRef.current.flyTo([focus.lat,focus.lon],14,{duration:0.8});},[focus,mini]);
 return <div className={mini?'leaflet-mini':'leaflet-map'} ref={container} aria-label={labels.mapAria} role="region"/>;
}
