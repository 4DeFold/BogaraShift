'use client';
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import {tileUrl} from '../../lib/imagery.mjs';
import {cropLabel} from '../../lib/plan.mjs';
import {leafletGeometry} from '../../lib/geometry.mjs';
import {cropColor} from '../../lib/dashboard.mjs';

export default function PlanMap({fields,t,date,sensor,onOpen,onTileError,fitSignal=0}){
 const container=useRef(null),mapRef=useRef(null),layerRef=useRef(null),tilesRef=useRef(null),lastIds=useRef(''),lastFit=useRef(0),callbacks=useRef({});callbacks.current={onOpen,onTileError};
 useEffect(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const map=L.map(container.current,{center:[42.4,69.85],zoom:12,minZoom:3,maxZoom:18,preferCanvas:true,zoomSnap:.25,zoomDelta:.5,wheelDebounceTime:120,wheelPxPerZoomLevel:180,inertia:true,inertiaDeceleration:1800,easeLinearity:.25,zoomAnimation:!reduced,fadeAnimation:!reduced});mapRef.current=map;
  const tiles=L.tileLayer(tileUrl(sensor,date,'{z}','{y}','{x}'),{maxNativeZoom:12,maxZoom:18,crossOrigin:'anonymous',attribution:'<a href="https://earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs" target="_blank" rel="noreferrer">NASA GIBS / HLS · USGS / Copernicus Sentinel</a>'}).addTo(map);tilesRef.current=tiles;
  tiles.on('tileerror',()=>callbacks.current.onTileError?.(true));tiles.on('loading',()=>callbacks.current.onTileError?.(false));
  layerRef.current=L.layerGroup().addTo(map);const timer=setTimeout(()=>map.invalidateSize(),80);
  return ()=>{clearTimeout(timer);map.remove();mapRef.current=null;layerRef.current=null;tilesRef.current=null;lastIds.current='';lastFit.current=0;};
 },[]);
 useEffect(()=>{tilesRef.current?.setUrl(tileUrl(sensor,date,'{z}','{y}','{x}'));},[date,sensor]);
 useEffect(()=>{
  const layer=layerRef.current,map=mapRef.current;if(!layer||!map)return;
  const items=fields.flatMap(field=>{try{const points=leafletGeometry(field.cell),bounds=L.latLngBounds(points);return bounds.isValid()?[{field,points,bounds,center:bounds.getCenter()}]:[];}catch{return []}});
  const ids=fields.map(f=>f.cell.id).sort().join('|');
  if((ids!==lastIds.current||fitSignal!==lastFit.current)&&items.length){lastIds.current=ids;lastFit.current=fitSignal;const bounds=L.latLngBounds(items.map(item=>item.bounds));map.fitBounds(bounds,{padding:[60,60],maxZoom:15,animate:false});}else if(!items.length)lastIds.current='';
  const draw=()=>{
   layer.clearLayers();const viewport=map.getBounds().pad(.1),visible=items.filter(item=>viewport.intersects(item.bounds));
   if(map.getZoom()<10){
    const groups=new Map();visible.forEach(item=>{const p=map.latLngToContainerPoint(item.center),key=`${Math.floor(p.x/70)}:${Math.floor(p.y/70)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);});
    groups.forEach(group=>{const center=group[0].center;const marker=L.circleMarker(center,{radius:group.length>1?13:7,color:'#f2db75',fillColor:'#b5cf95',fillOpacity:.8,weight:2}).addTo(layer);marker.on('click',e=>{L.DomEvent.stopPropagation(e);if(group.length===1)callbacks.current.onOpen?.(group[0].field.cell.id);else map.fitBounds(L.latLngBounds(group.map(i=>i.bounds)),{padding:[50,50],maxZoom:15});});if(group.length>1){const label=L.marker(center,{interactive:false,icon:L.divIcon({className:'cluster-count',html:String(group.length),iconSize:[28,28],iconAnchor:[14,14]})}).addTo(layer);}});return;
   }
   const labels=[],occupied=[];
   visible.forEach(({field,points,bounds,center})=>{
    const polygon=L.polygon(points,{color:'#f2db75',weight:2,fillColor:cropColor(field.displayCrop),fillOpacity:.35,dashArray:field.cell.boundaryStatus==='confirmed'?null:'5 5'}).addTo(layer);
    polygon.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onOpen?.(field.cell.id);});
    if(map.getZoom()>=13&&labels.length<30){const p=map.latLngToContainerPoint(center),size=map.getSize();if(p.x>88&&p.x<size.x-88&&p.y>23&&p.y<size.y-23&&occupied.every(q=>Math.abs(q.x-p.x)>180||Math.abs(q.y-p.y)>50)){occupied.push(p);labels.push({field,center});}}
   });
   labels.forEach(({field,center})=>{const element=document.createElement('div');element.className='plan-map-label';const symbol=document.createElement('span');symbol.className='plan-map-label-icon';symbol.textContent='✳';const content=document.createElement('span');content.className='plan-map-label-text';const name=document.createElement('strong');name.textContent=field.name;const crop=document.createElement('small');crop.textContent=cropLabel(field.displayCrop,t);content.append(name,crop);element.append(symbol,content);const marker=L.marker(center,{icon:L.divIcon({className:'plan-marker',html:element,iconSize:[176,46],iconAnchor:[88,23]}),title:`${field.name}: ${cropLabel(field.displayCrop,t)}`,keyboard:true}).addTo(layer);marker.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onOpen?.(field.cell.id);});});
  };
  draw();map.on('zoomend moveend',draw);return()=>map.off('zoomend moveend',draw);
 },[fields,t,fitSignal]);
 return <div ref={container} className="plan-map" role="region" aria-label={t.overview}/>;
}
