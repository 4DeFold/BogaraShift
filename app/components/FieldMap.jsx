'use client';
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import {CELL_SIZE,cellFromIndex} from '../../lib/grid.mjs';

const DATE='2025-05-15';
const URL=`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
export default function FieldMap({fields=[],active,focus,onSelect,onError,onZoom,mini=false,labels}) {
 const container=useRef(null), mapRef=useRef(null), gridRef=useRef(null), callbacks=useRef({onSelect,onError,onZoom});
 callbacks.current={onSelect,onError,onZoom};
 useEffect(()=>{
  const map=L.map(container.current,{center:mini?[active.lat,active.lon]:[42.4,69.85],zoom:mini?14:13,minZoom:2,maxZoom:17,zoomControl:!mini,attributionControl:!mini,scrollWheelZoom:!mini,dragging:!mini,keyboard:!mini,zoomAnimation:false});
  mapRef.current=map;
  const tiles=L.tileLayer(URL,{maxNativeZoom:9,maxZoom:17,attribution:'<a href="https://earthdata.nasa.gov/data/imagery/global-imagery-browse-services-gibs" target="_blank" rel="noreferrer">NASA GIBS / MODIS Terra</a> · 2025-05-15'}).addTo(map);
  tiles.on('tileerror',()=>callbacks.current.onError?.(true));
  tiles.on('loading',()=>callbacks.current.onError?.(false));
  const grid=L.layerGroup().addTo(map);gridRef.current=grid;
  const refresh=()=>{map.fire('render-grid');callbacks.current.onZoom?.(map.getZoom()<13);};
  map.on('moveend zoomend',refresh);refresh();
  setTimeout(()=>map.invalidateSize(),50);
  return ()=>{map.off('moveend zoomend',refresh);map.remove();mapRef.current=null;gridRef.current=null;};
 },[mini]);
 useEffect(()=>{
  const map=mapRef.current,group=gridRef.current;if(!map||!group)return;
  const draw=()=>{
   group.clearLayers();
   if(mini) {if(active)L.rectangle([[active.south,active.west],[active.north,active.east]],{color:'#ffdd58',weight:3,fillOpacity:.22,interactive:false}).addTo(group);return;}
   if(map.getZoom()<13)return;
   const b=map.getBounds(); const south=Math.max(-85,b.getSouth()),north=Math.min(85,b.getNorth()),west=Math.max(-180,b.getWest()),east=Math.min(180,b.getEast());
   const minRow=Math.floor(south/CELL_SIZE),maxRow=Math.floor(north/CELL_SIZE),minCol=Math.floor(west/CELL_SIZE),maxCol=Math.floor(east/CELL_SIZE);
   if((maxRow-minRow+1)*(maxCol-minCol+1)>2500)return;
   const saved=new Set(fields.map(f=>f.cell.id));
   for(let row=minRow;row<=maxRow;row++) for(let col=minCol;col<=maxCol;col++){
    const cell=cellFromIndex(row,col),isSaved=saved.has(cell.id),isActive=active?.id===cell.id;
    const hue=['#79d3d2','#83bc8f','#eec674','#83b6de'][Math.abs((row*13+col*7)%4)];
    const rectangle=L.rectangle([[cell.south,cell.west],[cell.north,cell.east]],{color:isActive?'#ffdf61':isSaved?'#d5ff8b':hue,weight:isActive?3:isSaved?2:1,fillColor:isSaved?'#a0de7a':hue,fillOpacity:isActive?.36:isSaved?.31:.11,opacity:isSaved?1:.65}).addTo(group);
    rectangle.on('click',()=>callbacks.current.onSelect?.(cell));
   }
  };
  map.on('render-grid',draw);draw();return ()=>map.off('render-grid',draw);
 },[fields,active,mini]);
 useEffect(()=>{if(!mini&&focus&&mapRef.current)mapRef.current.setView([focus.lat,focus.lon],14);},[focus,mini]);
 return <div className={mini?'leaflet-mini':'leaflet-map'} ref={container} aria-label={labels.mapAria} role="region"/>;
}
export { DATE };
