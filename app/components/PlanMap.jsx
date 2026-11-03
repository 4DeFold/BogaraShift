'use client';
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import {tileUrl} from '../../lib/imagery.mjs';
import {cropLabel,outline} from '../../lib/plan.mjs';

export default function PlanMap({fields,t,date,sensor,onOpen,onTileError}){
 const container=useRef(null),mapRef=useRef(null),layerRef=useRef(null),tilesRef=useRef(null),lastIds=useRef(''),callbacks=useRef({});callbacks.current={onOpen,onTileError};
 useEffect(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const map=L.map(container.current,{center:[42.4,69.85],zoom:12,minZoom:3,maxZoom:18,zoomSnap:.25,zoomDelta:.5,wheelDebounceTime:120,wheelPxPerZoomLevel:180,inertia:true,inertiaDeceleration:1800,easeLinearity:.25,zoomAnimation:!reduced,fadeAnimation:!reduced});mapRef.current=map;
  const tiles=L.tileLayer(tileUrl(sensor,date,'{z}','{y}','{x}'),{maxNativeZoom:12,maxZoom:18,crossOrigin:'anonymous',attribution:'<a href="https://earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs" target="_blank" rel="noreferrer">NASA GIBS / HLS · USGS / Copernicus Sentinel</a>'}).addTo(map);tilesRef.current=tiles;
  tiles.on('tileerror',()=>callbacks.current.onTileError?.(true));tiles.on('loading',()=>callbacks.current.onTileError?.(false));
  layerRef.current=L.layerGroup().addTo(map);const timer=setTimeout(()=>map.invalidateSize(),80);
  return ()=>{clearTimeout(timer);map.remove();mapRef.current=null;layerRef.current=null;tilesRef.current=null;};
 },[]);
 useEffect(()=>{tilesRef.current?.setUrl(tileUrl(sensor,date,'{z}','{y}','{x}'));},[date,sensor]);
 useEffect(()=>{
  const layer=layerRef.current,map=mapRef.current;if(!layer||!map)return;
  const ids=fields.map(f=>f.cell.id).sort().join('|');
  const allPoints=fields.flatMap(field=>outline(field.cell));
  if(ids!==lastIds.current&&allPoints.length){lastIds.current=ids;map.fitBounds(allPoints,{padding:[80,80],maxZoom:15,animate:false});}else if(!allPoints.length)lastIds.current='';
  const draw=()=>{
   layer.clearLayers();const items=[];const occupied=[];const size=map.getSize(),halfW=88,halfH=23;
   fields.forEach((field,index)=>{
    const points=outline(field.cell);if(points.length<3)return;
    const polygon=L.polygon(points,{color:'#f2db75',weight:2,fillColor:['#c9bd68','#8ac595','#8eb8c7','#d89d76'][index%4],fillOpacity:.24,dashArray:field.cell.polygon?null:'5 5'}).addTo(layer);
    polygon.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onOpen?.(field.cell.id);});
    items.push({field,center:polygon.getBounds().getCenter()});
   });
   items.forEach(({field,center})=>{
    const point=map.latLngToContainerPoint(center);let placed=point;
    // Offset labels around nearby outlines to avoid hiding another field's crop name.
    const offsets=[[0,0],[0,-54],[0,54],[-180,0],[180,0],[-180,-54],[180,-54],[-180,54],[180,54],[0,-108],[0,108],[-180,-108],[180,-108],[-180,108],[180,108],[-360,0],[360,0],[-360,-54],[360,-54],[-360,54],[360,54]];
    const inBounds=(x,y)=>x-halfW>=3&&x+halfW<=size.x-3&&y-halfH>=3&&y+halfH<=size.y-3;
    const clear=(x,y)=>occupied.every(p=>Math.abs(x-p.x)>=halfW*2+4||Math.abs(y-p.y)>=halfH*2+4);
    const match=offsets.map(([x,y])=>L.point(point.x+x,point.y+y)).find(p=>inBounds(p.x,p.y)&&clear(p.x,p.y));if(match)placed=match;
    occupied.push(placed);
    const position=map.containerPointToLatLng(placed);if(placed.distanceTo(point)>5)L.polyline([center,position],{color:'#f2db75',weight:1,opacity:.8,interactive:false}).addTo(layer);
    const element=document.createElement('div');element.className='plan-map-label';const symbol=document.createElement('span');symbol.className='plan-map-label-icon';symbol.textContent='✳';const content=document.createElement('span');content.className='plan-map-label-text';const name=document.createElement('strong');name.textContent=field.name;const crop=document.createElement('small');crop.textContent=cropLabel(field.plannedCrop,t);content.append(name,crop);element.append(symbol,content);
    const marker=L.marker(position,{icon:L.divIcon({className:'plan-marker',html:element,iconSize:[176,46],iconAnchor:[88,23]}),title:`${field.name}: ${cropLabel(field.plannedCrop,t)}`,keyboard:true}).addTo(layer);
    marker.on('click',e=>{L.DomEvent.stopPropagation(e);callbacks.current.onOpen?.(field.cell.id);});
   });
  };
  draw();map.on('zoomend moveend',draw);return()=>map.off('zoomend moveend',draw);
 },[fields,t]);
 return <div ref={container} className="plan-map" role="region" aria-label={t.overview}/>;
}
